"""Hard deterministic risk layer. Runs before EVERY order. No model input reaches it.

- Armed kill switch: file-based (operator can `touch state/KILL`) + automatic trip on
  max drawdown or max daily loss. Once tripped it stays tripped until an operator
  resets it explicitly; only reduce-only orders pass while tripped.
- Max position, max gross exposure, max order size, stale data, price band, throttle.
"""
from __future__ import annotations

import time
from dataclasses import dataclass
from pathlib import Path

from .config import RiskLimits


@dataclass(frozen=True)
class Order:
    symbol: str
    qty: float           # signed units
    limit_price: float
    reduce_only: bool = False


@dataclass(frozen=True)
class RiskVerdict:
    ok: bool
    reason: str
    order: Order | None = None


class KillSwitch:
    def __init__(self, path: str):
        self.path = Path(path)
        self.tripped_reason: str | None = None

    def armed_and_clear(self) -> bool:
        if self.path.exists():
            self.tripped_reason = self.tripped_reason or f"kill file {self.path} present"
        return self.tripped_reason is None

    def trip(self, reason: str) -> None:
        if self.tripped_reason is None:
            self.tripped_reason = reason
            self.path.parent.mkdir(parents=True, exist_ok=True)
            self.path.write_text(f"{time.time()} {reason}\n")

    def operator_reset(self, confirm: str) -> None:
        if confirm != "I-HAVE-REVIEWED-THE-INCIDENT":
            raise PermissionError("reset requires explicit operator confirmation string")
        if self.path.exists():
            self.path.unlink()
        self.tripped_reason = None


class RiskManager:
    def __init__(self, limits: RiskLimits, kill: KillSwitch | None = None, clock=time.time):
        self.limits = limits
        self.kill = kill or KillSwitch(limits.kill_switch_file)
        self._last_order_t: dict[str, float] = {}
        self.clock = clock

    def update_equity(self, equity: float, peak: float, day_start: float) -> None:
        dd = 1 - equity / peak if peak > 0 else 0.0
        dl = 1 - equity / day_start if day_start > 0 else 0.0
        if dd >= self.limits.max_drawdown:
            self.kill.trip(f"max drawdown {dd:.3%} >= {self.limits.max_drawdown:.0%}")
        if dl >= self.limits.max_daily_loss:
            self.kill.trip(f"max daily loss {dl:.3%} >= {self.limits.max_daily_loss:.0%}")

    def check(self, order: Order, *, mid: float, snapshot_age_ms: int, equity: float,
              positions: dict[str, float], prices: dict[str, float]) -> RiskVerdict:
        L = self.limits
        cur = positions.get(order.symbol, 0.0)
        new = cur + order.qty
        is_reducing = abs(new) < abs(cur) and (new == 0 or (new > 0) == (cur > 0))

        if order.reduce_only and not is_reducing:
            return RiskVerdict(False, "reduce_only order would not reduce")
        if not self.kill.armed_and_clear() and not is_reducing:
            return RiskVerdict(False, f"KILL SWITCH: {self.kill.tripped_reason}")
        if equity <= 0 or mid <= 0 or order.qty == 0:
            return RiskVerdict(False, "invalid equity/mid/qty")
        if snapshot_age_ms > L.max_snapshot_age_ms:
            return RiskVerdict(False, f"stale data {snapshot_age_ms}ms")
        dev_bps = abs(order.limit_price / mid - 1) * 1e4
        if dev_bps > L.max_price_deviation_bps:
            return RiskVerdict(False, f"limit price {dev_bps:.1f}bps from mid")
        if is_reducing:
            return RiskVerdict(True, "reducing", order)   # always allow de-risking

        now = self.clock()
        if now - self._last_order_t.get(order.symbol, -1e18) < L.min_order_interval_s:
            return RiskVerdict(False, "throttled")
        if abs(order.qty * mid) / equity > L.max_order_frac + 1e-12:
            return RiskVerdict(False, "order too large")
        if abs(new * mid) / equity > L.max_position_frac + 1e-12:
            return RiskVerdict(False, "position limit")
        gross = sum(abs(q * prices.get(s, mid)) for s, q in positions.items() if s != order.symbol)
        gross += abs(new * mid)
        if gross / equity > L.max_gross_exposure_frac + 1e-12:
            return RiskVerdict(False, "gross exposure limit")
        return RiskVerdict(True, "ok", order)

    def record_sent(self, symbol: str) -> None:
        self._last_order_t[symbol] = self.clock()
