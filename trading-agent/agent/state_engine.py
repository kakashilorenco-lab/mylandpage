"""Deterministic state engine.

Turns the live order book (+ portfolio) into ONE compact numeric snapshot that is the
only thing Jev sees. All math lives here, never in the model.

Causality: every input carries an exchange timestamp. A snapshot is built "as of" a
time T; any input with ts > T raises CausalityError (no future leakage), and history
buffers only ever contain events with ts <= T.
"""
from __future__ import annotations

import math
from collections import deque
from dataclasses import dataclass

TOKEN_BUDGET = 400


class CausalityError(RuntimeError):
    pass


@dataclass(frozen=True)
class BookUpdate:
    symbol: str
    ts_ms: int                                  # exchange timestamp
    bids: tuple[tuple[float, float], ...]       # (price, size) best first
    asks: tuple[tuple[float, float], ...]


@dataclass(frozen=True)
class PortfolioView:
    position_units: float
    equity: float
    peak_equity: float
    day_start_equity: float
    avg_entry: float = 0.0


@dataclass(frozen=True)
class Snapshot:
    symbol: str
    as_of_ms: int
    book_age_ms: int
    mid: float
    spread_bps: float
    imbalance5: float          # (bid5 - ask5)/(bid5 + ask5) in [-1, 1]
    microprice_bps: float      # microprice offset from mid
    depth5_usd: float
    ret_5m_bps: float
    ret_1h_bps: float
    rv_1h_bps: float           # realized vol of 1m returns over 1h, per-1m, in bps
    rv_ratio: float            # rv_15m / rv_4h  (vol regime shift)
    trend_z: float             # 1h return / (rv_1m * sqrt(60))
    inv_frac: float            # position notional / equity (signed)
    upnl_bps: float
    drawdown: float            # from peak, fraction
    daily_pnl: float           # fraction of day start
    n_hist: int                # minutes of history available (warm-up honesty)

    def to_compact(self) -> str:
        """Compact key=value line. This is the entire world Jev gets."""
        f = (
            f"sym={self.symbol} t={self.as_of_ms} age_ms={self.book_age_ms} "
            f"mid={self.mid:.6g} spr_bps={self.spread_bps:.2f} imb5={self.imbalance5:+.3f} "
            f"micro_bps={self.microprice_bps:+.2f} depth5_usd={self.depth5_usd:.0f} "
            f"r5m_bps={self.ret_5m_bps:+.1f} r1h_bps={self.ret_1h_bps:+.1f} "
            f"rv1h_bps={self.rv_1h_bps:.2f} rv_ratio={self.rv_ratio:.2f} trend_z={self.trend_z:+.2f} "
            f"inv={self.inv_frac:+.3f} upnl_bps={self.upnl_bps:+.1f} dd={self.drawdown:.3f} "
            f"dpnl={self.daily_pnl:+.4f} hist_min={self.n_hist}"
        )
        return f

    def token_estimate(self) -> int:
        # Conservative: numeric-heavy text tokenizes ~2.5 chars/token.
        return math.ceil(len(self.to_compact()) / 2.5)


class StateEngine:
    """One instance per symbol. Feed book updates in time order; call snapshot(as_of)."""

    def __init__(self, symbol: str, history_minutes: int = 240):
        self.symbol = symbol
        self._last_book: BookUpdate | None = None
        self._last_ts = -1
        # (minute_bucket_end_ms, mid) closes, causal
        self._closes: deque[tuple[int, float]] = deque(maxlen=history_minutes + 1)

    def on_book(self, upd: BookUpdate) -> None:
        if upd.symbol != self.symbol:
            raise ValueError(f"wrong symbol {upd.symbol} for engine {self.symbol}")
        if upd.ts_ms < self._last_ts:
            raise CausalityError(f"out-of-order book update {upd.ts_ms} < {self._last_ts}")
        if not upd.bids or not upd.asks:
            return
        if upd.bids[0][0] >= upd.asks[0][0]:
            return  # crossed/locked book: ignore, never trade on it
        self._last_ts = upd.ts_ms
        self._last_book = upd
        mid = (upd.bids[0][0] + upd.asks[0][0]) / 2
        minute = upd.ts_ms // 60_000
        if self._closes and self._closes[-1][0] == minute:
            self._closes[-1] = (minute, mid)
        else:
            self._closes.append((minute, mid))

    @staticmethod
    def _rv(rets: list[float]) -> float:
        if len(rets) < 2:
            return 0.0
        m = sum(rets) / len(rets)
        return math.sqrt(sum((r - m) ** 2 for r in rets) / (len(rets) - 1))

    def snapshot(self, as_of_ms: int, pf: PortfolioView) -> Snapshot:
        b = self._last_book
        if b is None:
            raise RuntimeError("no book yet")
        if b.ts_ms > as_of_ms:
            raise CausalityError(f"book ts {b.ts_ms} is after as_of {as_of_ms}")
        as_of_min = as_of_ms // 60_000
        closes = [c for (mnt, c) in self._closes if mnt <= as_of_min]
        bid, ask = b.bids[0][0], b.asks[0][0]
        mid = (bid + ask) / 2
        spread_bps = (ask - bid) / mid * 1e4
        bsz = sum(s for _, s in b.bids[:5])
        asz = sum(s for _, s in b.asks[:5])
        imb = (bsz - asz) / (bsz + asz) if (bsz + asz) > 0 else 0.0
        b1, a1 = b.bids[0][1], b.asks[0][1]
        micro = (bid * a1 + ask * b1) / (a1 + b1) if (a1 + b1) > 0 else mid
        depth_usd = sum(p * s for p, s in b.bids[:5]) + sum(p * s for p, s in b.asks[:5])

        rets = [math.log(closes[i] / closes[i - 1]) for i in range(1, len(closes))]

        def ret_over(n: int) -> float:
            if len(closes) <= n:
                return 0.0
            return math.log(closes[-1] / closes[-1 - n]) * 1e4

        rv1h = self._rv(rets[-60:]) * 1e4
        rv15 = self._rv(rets[-15:])
        rv4h = self._rv(rets[-240:])
        rv_ratio = rv15 / rv4h if rv4h > 0 else 1.0
        r1h = ret_over(60)
        trend_z = (r1h / (rv1h * math.sqrt(60))) if rv1h > 0 else 0.0

        notional = pf.position_units * mid
        inv_frac = notional / pf.equity if pf.equity > 0 else 0.0
        upnl_bps = 0.0
        if pf.position_units and pf.avg_entry > 0:
            upnl_bps = math.copysign(1, pf.position_units) * (mid / pf.avg_entry - 1) * 1e4
        dd = max(0.0, 1 - pf.equity / pf.peak_equity) if pf.peak_equity > 0 else 0.0
        dpnl = pf.equity / pf.day_start_equity - 1 if pf.day_start_equity > 0 else 0.0

        snap = Snapshot(
            symbol=self.symbol, as_of_ms=as_of_ms, book_age_ms=as_of_ms - b.ts_ms,
            mid=mid, spread_bps=spread_bps, imbalance5=imb,
            microprice_bps=(micro / mid - 1) * 1e4, depth5_usd=depth_usd,
            ret_5m_bps=ret_over(5), ret_1h_bps=r1h, rv_1h_bps=rv1h, rv_ratio=rv_ratio,
            trend_z=trend_z, inv_frac=inv_frac, upnl_bps=upnl_bps, drawdown=dd,
            daily_pnl=dpnl, n_hist=max(0, len(closes) - 1),
        )
        if snap.token_estimate() >= TOKEN_BUDGET:
            raise RuntimeError(f"snapshot over token budget: {snap.token_estimate()}")
        return snap
