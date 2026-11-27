"""Calibration map fitted nightly from realized outcomes (Brier/reliability).

Raw Jev probabilities are passed through this map before ANY gate or Kelly sizing.
With no data, the map is the identity but shrunk toward 0.5 (we do not trust an
uncalibrated model at face value).
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

BINS = (0.5, 0.6, 0.7, 0.8, 0.9, 1.0001)


@dataclass
class CalibrationMap:
    # bin lower edge -> (empirical hit rate, n)
    bins: dict[float, tuple[float, int]] = field(default_factory=dict)
    prior_shrink: float = 0.5   # weight of the raw prob when a bin has no data
    min_n: int = 30

    def __call__(self, p: float) -> float:
        for lo, hi in zip(BINS[:-1], BINS[1:]):
            if lo <= p < hi:
                rate, n = self.bins.get(lo, (None, 0))
                if rate is None or n < self.min_n:
                    return 0.5 + (p - 0.5) * self.prior_shrink
                w = n / (n + self.min_n)  # shrink toward raw by sample size
                return w * rate + (1 - w) * (0.5 + (p - 0.5) * self.prior_shrink)
        return 0.5 + (p - 0.5) * self.prior_shrink  # p < 0.5: never a trade anyway

    def to_json(self) -> str:
        return json.dumps({"bins": {str(k): v for k, v in self.bins.items()},
                           "prior_shrink": self.prior_shrink, "min_n": self.min_n}, indent=2)

    @classmethod
    def load(cls, path: str | Path) -> "CalibrationMap":
        p = Path(path)
        if not p.exists():
            return cls()
        d = json.loads(p.read_text())
        return cls({float(k): (v[0], int(v[1])) for k, v in d["bins"].items()},
                   d.get("prior_shrink", 0.5), d.get("min_n", 30))
