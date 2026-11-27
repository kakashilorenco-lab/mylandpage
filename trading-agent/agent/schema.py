"""Typed Jev decision schema.

Each finalist (from docs/03-research.md) compiles into the same five typed questions,
with criteria text specialised by the finalist's thesis and invalidation rules.
All five questions go to Jev in ONE request and are answered in one parallel pass.

Schemas are versioned JSON files in schemas/. The nightly review proposes vN+1; only
the operator gate (agent/promote.py) can make it active.
"""
from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from pathlib import Path

REGIMES = ("trending", "mean_reverting", "high_vol", "crisis")
DIRECTIONS = ("long", "short", "neutral")
RISK_STATES = ("safe", "near_limit", "reduce")


@dataclass(frozen=True)
class FinalistSpec:
    symbol: str
    thesis: str
    long_when: str
    short_when: str
    invalidation: str
    quality_notes: str = ""


@dataclass
class JevSchema:
    version: int
    finalists: dict[str, FinalistSpec] = field(default_factory=dict)

    def questions(self, symbol: str) -> dict:
        f = self.finalists[symbol]
        return {
            "regime": {
                "type": "choice",
                "criteria": {
                    "trending": "trend_z magnitude persistently > 1.5 with rv_ratio near or below 1.2",
                    "mean_reverting": "|trend_z| < 1, returns oscillate, imbalance flips sign frequently",
                    "high_vol": "rv_ratio > 1.5 or rv1h_bps well above its usual level without a clean trend",
                    "crisis": "rv_ratio > 2.5 with a large |r1h_bps|, spread blowing out, or depth collapsing; "
                              "also any snapshot where drawdown is close to its limit",
                },
            },
            "direction": {
                "type": "choice",
                "criteria": {
                    "long": f"Order-flow and short-term state support upside now. Thesis context: {f.long_when}",
                    "short": f"Order-flow and short-term state support downside now. Thesis context: {f.short_when}",
                    "neutral": "No clear edge after costs (spread + ~5bps fee), conflicting signals, "
                               f"or invalidation present: {f.invalidation}",
                },
            },
            "toxic_flow": {
                "type": "bool",
                "criteria": {
                    "true": "Book looks adversely selected: one-sided sweep, microprice far from mid, "
                            "spread widening while imbalance spikes, or depth vanishing on one side",
                    "false": "Two-sided, stable book with normal spread and depth",
                },
            },
            "setup_quality": {
                "type": "score",
                "min": 0,
                "max": 3,
                "criteria": {
                    "0": "No setup",
                    "1": "Weak: one signal, likely eaten by costs",
                    "2": "Valid: multiple aligned signals, expected move clearly exceeds round-trip cost",
                    "3": f"Excellent: strong alignment, clean book, thesis-consistent. {f.quality_notes}",
                },
            },
            "risk_state": {
                "type": "choice",
                "criteria": {
                    "safe": "inv, dd and dpnl comfortably inside limits (dd < 0.08, |dpnl| < 0.015)",
                    "near_limit": "dd between 0.08 and 0.12 or dpnl below -0.015",
                    "reduce": "dd above 0.12, dpnl below -0.025, or inventory against a strong move",
                },
            },
        }

    # --- persistence -----------------------------------------------------
    def to_json(self) -> str:
        return json.dumps(
            {"version": self.version, "finalists": {k: asdict(v) for k, v in self.finalists.items()}},
            indent=2, sort_keys=True,
        )

    @classmethod
    def from_json(cls, text: str) -> "JevSchema":
        d = json.loads(text)
        return cls(version=int(d["version"]),
                   finalists={k: FinalistSpec(**v) for k, v in d["finalists"].items()})

    @classmethod
    def load(cls, path: str | Path) -> "JevSchema":
        return cls.from_json(Path(path).read_text())

    def save(self, path: str | Path) -> None:
        Path(path).write_text(self.to_json())


def load_active(schema_dir: str | Path = "schemas") -> JevSchema:
    d = Path(schema_dir)
    pointer = d / "ACTIVE"
    name = pointer.read_text().strip() if pointer.exists() else "v1.json"
    return JevSchema.load(d / name)
