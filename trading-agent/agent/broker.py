"""Execution. Paper broker with fees + slippage; live broker is gated behind the operator."""
from __future__ import annotations

import os
from dataclasses import dataclass, field

from .config import CostModel
from .risk import Order
from .state_engine import BookUpdate


@dataclass(frozen=True)
class Fill:
    symbol: str
    qty: float
    price: float
    fee: float
    ts_ms: int


@dataclass
class PaperBroker:
    costs: CostModel
    cash: float
    positions: dict[str, float] = field(default_factory=dict)
    avg_entry: dict[str, float] = field(default_factory=dict)

    def execute(self, order: Order, book: BookUpdate) -> Fill | None:
        """Taker fill walking the visible book, plus an impact haircut. Respects limit."""
        levels = book.asks if order.qty > 0 else book.bids
        remaining, cost, filled = abs(order.qty), 0.0, 0.0
        for px, sz in levels:
            if (order.qty > 0 and px > order.limit_price) or (order.qty < 0 and px < order.limit_price):
                break
            take = min(sz, remaining)
            cost += take * px
            filled += take
            remaining -= take
            if remaining <= 0:
                break
        if filled == 0:
            return None
        depth = sum(s for _, s in levels[:5]) or filled
        impact = self.costs.impact_coeff_bps * (filled / depth) / 1e4
        vwap = cost / filled * (1 + impact if order.qty > 0 else 1 - impact)
        sign = 1 if order.qty > 0 else -1
        q = sign * filled
        fee = abs(q) * vwap * self.costs.taker_fee_bps / 1e4
        self.cash -= q * vwap + fee
        old = self.positions.get(order.symbol, 0.0)
        new = old + q
        if old == 0 or (old > 0) != (q > 0):
            if abs(q) > abs(old):
                self.avg_entry[order.symbol] = vwap
        else:
            self.avg_entry[order.symbol] = (self.avg_entry.get(order.symbol, vwap) * abs(old) + vwap * abs(q)) / abs(new)
        self.positions[order.symbol] = new
        if abs(new) < 1e-12:
            self.positions[order.symbol] = 0.0
            self.avg_entry.pop(order.symbol, None)
        return Fill(order.symbol, q, vwap, fee, book.ts_ms)

    def equity(self, marks: dict[str, float]) -> float:
        return self.cash + sum(q * marks.get(s, 0.0) for s, q in self.positions.items())


class LiveBroker:
    """Intentionally not wired. Going live is an operator gate, not a code default.

    To enable: implement an exchange adapter (e.g. via the exchange's official SDK) with
    IOC limit orders only, set LIVE_TRADING_APPROVED=<date+operator initials>, and pass
    the Phase-5 review checklist in docs/02-plan.md.
    """

    def __init__(self) -> None:
        if not os.environ.get("LIVE_TRADING_APPROVED"):
            raise PermissionError("live trading not approved by operator (LIVE_TRADING_APPROVED unset)")
        raise NotImplementedError("exchange adapter not implemented yet; see docs/02-plan.md Phase 6")
