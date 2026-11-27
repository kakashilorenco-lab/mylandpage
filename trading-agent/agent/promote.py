"""Operator gate for shipping a new schema / calibration map.

A candidate is promoted only if:
  1. its replay Brier on held-out labeled states is <= the active schema's Brier
     (measured by the caller with the same decider on the same states), AND
  2. the operator passes --approve with their initials.
Nothing promotes itself.
"""
from __future__ import annotations

import argparse
import shutil
from pathlib import Path


def promote(candidate: Path, schema_dir: Path, brier_active: float, brier_candidate: float,
            approver: str | None) -> str:
    if not approver:
        raise PermissionError("operator approval (--approve INITIALS) required")
    if not (brier_candidate <= brier_active):
        raise ValueError(f"candidate Brier {brier_candidate:.4f} worse than active {brier_active:.4f}")
    import json
    v = json.loads(candidate.read_text())["version"]
    dest = schema_dir / f"v{v}.json"
    shutil.copy(candidate, dest)
    (schema_dir / "ACTIVE").write_text(dest.name + "\n")
    (schema_dir / "CHANGELOG.md").open("a").write(
        f"- v{v} promoted by {approver}: brier {brier_active:.4f} -> {brier_candidate:.4f}\n")
    return dest.name


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("candidate")
    ap.add_argument("--schemas", default="schemas")
    ap.add_argument("--brier-active", type=float, required=True)
    ap.add_argument("--brier-candidate", type=float, required=True)
    ap.add_argument("--approve")
    a = ap.parse_args()
    print(promote(Path(a.candidate), Path(a.schemas), a.brier_active, a.brier_candidate, a.approve))


if __name__ == "__main__":
    main()
