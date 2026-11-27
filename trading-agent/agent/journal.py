"""Append-only JSONL journal of every snapshot, decision, intent, risk verdict and fill."""
from __future__ import annotations

import json
from dataclasses import asdict, is_dataclass
from pathlib import Path


class Journal:
    def __init__(self, path: str | Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def write(self, kind: str, **payload) -> None:
        rec = {"kind": kind}
        for k, v in payload.items():
            v = asdict(v) if is_dataclass(v) else v
            if isinstance(v, dict):
                v = {kk: vv for kk, vv in v.items() if kk != "raw"}
            rec[k] = v
        with self.path.open("a") as f:
            f.write(json.dumps(rec, default=str) + "\n")

    def read(self) -> list[dict]:
        if not self.path.exists():
            return []
        return [json.loads(line) for line in self.path.read_text().splitlines() if line.strip()]
