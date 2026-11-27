"""Nightly review: read every decision, fill and miss; measure calibration; propose vN+1.

Outputs (in state/review/<date>/):
  report.md          human-readable session review
  calibration.json   new calibration map (applied next session; can only be fitted from data)
  schema_candidate.json  proposed schema vN+1 (NOT active until promote.py + operator)

Outcome label for a directional decision at time t with horizon H:
  hit = 1 if the mid moved in the predicted direction by more than round-trip cost.
"""
from __future__ import annotations

import argparse
import bisect
import json
import time
from collections import defaultdict
from pathlib import Path

from .calibration import BINS, CalibrationMap
from .schema import load_active


def brier(pairs: list[tuple[float, int]]) -> float:
    if not pairs:
        return float("nan")
    return sum((p - y) ** 2 for p, y in pairs) / len(pairs)


def label_decisions(records: list[dict], horizon_ms: int, cost_bps: float) -> list[dict]:
    """Attach forward outcome to each directional decision. Uses only later snapshots."""
    mids: dict[str, list[tuple[int, float]]] = defaultdict(list)
    for r in records:
        if r["kind"] == "decision":
            s = r["snapshot"]
            mids[s["symbol"]].append((s["as_of_ms"], s["mid"]))
    for v in mids.values():
        v.sort()
    out = []
    for r in records:
        if r["kind"] != "decision" or r.get("decision") is None:
            continue
        d, s = r["decision"], r["snapshot"]
        if d["direction"] not in ("long", "short"):
            continue
        series = mids[s["symbol"]]
        ts = [t for t, _ in series]
        i = bisect.bisect_left(ts, s["as_of_ms"] + horizon_ms)
        if i >= len(series):
            continue  # outcome not yet known: never guess
        fwd_bps = (series[i][1] / s["mid"] - 1) * 1e4
        signed = fwd_bps if d["direction"] == "long" else -fwd_bps
        out.append({"symbol": s["symbol"], "t": s["as_of_ms"], "p": d["direction_p"],
                    "p_cal": r.get("intent", {}).get("p_cal", d["direction_p"]),
                    "quality": d["setup_quality"], "regime": d["regime"],
                    "hit": int(signed > cost_bps), "signed_bps": signed,
                    "acted": r.get("intent", {}).get("action", "hold").startswith("open")})
    return out


def fit_calibration(labeled: list[dict], min_n: int = 30) -> CalibrationMap:
    bins: dict[float, list[int]] = defaultdict(list)
    for x in labeled:
        for lo, hi in zip(BINS[:-1], BINS[1:]):
            if lo <= x["p"] < hi:
                bins[lo].append(x["hit"])
    return CalibrationMap({lo: (sum(v) / len(v), len(v)) for lo, v in bins.items() if v}, min_n=min_n)


def reliability_table(labeled: list[dict], key: str = "p") -> list[tuple[str, int, float, float]]:
    rows = []
    for lo, hi in zip(BINS[:-1], BINS[1:]):
        xs = [x for x in labeled if lo <= x[key] < hi]
        if xs:
            rows.append((f"[{lo:.1f},{min(hi,1):.1f})", len(xs),
                         sum(x[key] for x in xs) / len(xs), sum(x["hit"] for x in xs) / len(xs)))
    return rows


def run_review(journal_path: Path, out_root: Path, schema_dir: Path,
               horizon_ms: int = 15 * 60_000, cost_bps: float = 12.0) -> Path:
    records = [json.loads(l) for l in journal_path.read_text().splitlines() if l.strip()]
    labeled = label_decisions(records, horizon_ms, cost_bps)
    fills = [r for r in records if r["kind"] == "fill"]
    rejects = [r for r in records if r["kind"] == "risk_reject"]
    escalations = [r for r in records if r["kind"] == "escalation"]

    day = time.strftime("%Y-%m-%d", time.gmtime())
    out = out_root / day
    out.mkdir(parents=True, exist_ok=True)

    raw_b = brier([(x["p"], x["hit"]) for x in labeled])
    cal_b = brier([(x["p_cal"], x["hit"]) for x in labeled])
    base = sum(x["hit"] for x in labeled) / len(labeled) if labeled else float("nan")
    clim_b = brier([(base, x["hit"]) for x in labeled]) if labeled else float("nan")
    acted = [x for x in labeled if x["acted"]]
    misses = sorted([x for x in labeled if x["hit"] == 0 and x["p"] >= 0.8], key=lambda x: -x["p"])[:20]
    missed_opps = sorted([x for x in labeled if not x["acted"] and x["hit"] == 1 and x["signed_bps"] > 3 * cost_bps],
                         key=lambda x: -x["signed_bps"])[:20]

    calib = fit_calibration(labeled)
    (out / "calibration.json").write_text(calib.to_json())

    lines = [f"# Nightly review {day}", "",
             f"- labeled directional decisions: {len(labeled)} (horizon {horizon_ms//60000}m, cost {cost_bps}bps)",
             f"- Brier raw: {raw_b:.4f} | calibrated: {cal_b:.4f} | climatology (base rate {base:.3f}): {clim_b:.4f}",
             f"- skill vs climatology: {'YES' if raw_b < clim_b else 'NO - model adds no information'}",
             f"- trades acted: {len(acted)}, hit rate {sum(x['hit'] for x in acted)/len(acted):.3f}" if acted else "- trades acted: 0",
             f"- fills: {len(fills)}, fees paid: {sum(f['fill']['fee'] for f in fills):.2f}",
             f"- risk rejects: {len(rejects)}, escalations: {len(escalations)}", "",
             "## Reliability (raw p)", "| bin | n | mean p | hit rate |", "|---|---|---|---|"]
    lines += [f"| {b} | {n} | {mp:.3f} | {hr:.3f} |" for b, n, mp, hr in reliability_table(labeled)]
    lines += ["", "## High-confidence misses (p>=0.8, wrong)"]
    lines += [f"- {x['symbol']} t={x['t']} p={x['p']:.2f} q={x['quality']} regime={x['regime']} moved {x['signed_bps']:+.1f}bps"
              for x in misses] or ["- none"]
    lines += ["", "## Missed opportunities (held, move > 3x cost)"]
    lines += [f"- {x['symbol']} t={x['t']} p={x['p']:.2f} q={x['quality']} moved {x['signed_bps']:+.1f}bps"
              for x in missed_opps] or ["- none"]
    by_regime = defaultdict(list)
    for x in labeled:
        by_regime[x["regime"]].append((x["p"], x["hit"]))
    lines += ["", "## Brier by regime"] + [f"- {k}: n={len(v)} brier={brier(v):.4f}" for k, v in by_regime.items()]
    (out / "report.md").write_text("\n".join(lines) + "\n")

    # Candidate schema vN+1: same structure, version bumped; criteria edits are proposed
    # by the brain (Opus) from report.md in Phase "self-improve" and reviewed by a human.
    active = load_active(schema_dir)
    active.version += 1
    (out / "schema_candidate.json").write_text(active.to_json())
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--journal", default="state/journal.jsonl")
    ap.add_argument("--out", default="state/review")
    ap.add_argument("--schemas", default="schemas")
    a = ap.parse_args()
    print(run_review(Path(a.journal), Path(a.out), Path(a.schemas)))


if __name__ == "__main__":
    main()
