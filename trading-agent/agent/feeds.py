"""Market data feeds. Every update carries the exchange/feed timestamp for causality."""
from __future__ import annotations

import json
import math
import random
import time
import urllib.request
from typing import Iterator

from .state_engine import BookUpdate


class SyntheticFeed:
    """Random-walk books with vol bursts. For tests and dry-runs only; contains no edge."""

    def __init__(self, symbols=("BTC-USD",), start_px=None, seed=0, step_ms=60_000, start_ms=0):
        self.rng = random.Random(seed)
        self.px = {s: (start_px or {}).get(s, 60_000.0 if s.startswith("BTC") else 1_700.0) for s in symbols}
        self.t = start_ms
        self.step_ms = step_ms
        self.vol = 0.0008

    def __iter__(self) -> Iterator[list[BookUpdate]]:
        while True:
            self.t += self.step_ms
            if self.rng.random() < 0.01:
                self.vol = 0.004 if self.vol < 0.002 else 0.0008
            out = []
            for s in self.px:
                self.px[s] *= math.exp(self.rng.gauss(0, self.vol))
                mid = self.px[s]
                half = mid * 0.5e-4
                bids = tuple((mid - half - i * mid * 1e-4, self.rng.uniform(0.2, 3)) for i in range(5))
                asks = tuple((mid + half + i * mid * 1e-4, self.rng.uniform(0.2, 3)) for i in range(5))
                out.append(BookUpdate(s, self.t, bids, asks))
            yield out


class CoinbasePublicFeed:
    """Polls Coinbase Exchange public L2 book (no key). Uses local receive time as ts,
    because this endpoint returns no exchange timestamp; staleness checks still apply."""

    URL = "https://api.exchange.coinbase.com/products/{}/book?level=2"

    def __init__(self, symbols, interval_s: float = 60.0):
        self.symbols, self.interval_s = symbols, interval_s

    def _book(self, sym: str) -> BookUpdate:
        req = urllib.request.Request(self.URL.format(sym), headers={"User-Agent": "trading-agent/0.1"})
        with urllib.request.urlopen(req, timeout=5) as r:
            d = json.loads(r.read())
        ts = int(time.time() * 1000)
        bids = tuple((float(p), float(s)) for p, s, *_ in d["bids"][:10])
        asks = tuple((float(p), float(s)) for p, s, *_ in d["asks"][:10])
        return BookUpdate(sym, ts, bids, asks)

    def __iter__(self) -> Iterator[list[BookUpdate]]:
        while True:
            t0 = time.time()
            batch = []
            for s in self.symbols:
                try:
                    batch.append(self._book(s))
                except Exception:
                    pass  # missing data -> no snapshot -> no trade
            yield batch
            time.sleep(max(0.0, self.interval_s - (time.time() - t0)))
