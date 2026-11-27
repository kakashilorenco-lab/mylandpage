"""Hard limits and policy thresholds.

Frozen dataclasses: nothing at runtime (and nothing a model returns) can mutate them.
Changing a limit is a code change that goes through review + the operator gate.
"""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class RiskLimits:
    max_drawdown: float = 0.15            # peak-to-trough equity, trips kill switch
    max_daily_loss: float = 0.03          # fraction of start-of-day equity, trips kill switch
    max_position_frac: float = 0.10       # |notional| per symbol / equity
    max_gross_exposure_frac: float = 0.30 # sum |notional| / equity
    max_order_frac: float = 0.05          # single order notional / equity
    max_snapshot_age_ms: int = 2_000      # stale data -> no orders
    max_price_deviation_bps: float = 50.0 # limit price vs mid sanity band
    min_order_interval_s: float = 30.0    # per symbol throttle
    kill_switch_file: str = "state/KILL"  # touch this file to halt everything


@dataclass(frozen=True)
class PolicyParams:
    min_setup_quality: int = 2
    min_direction_conf: float = 0.80      # strictly greater than
    escalate_below_conf: float = 0.60
    kelly_cap: float = 0.25               # quarter Kelly, hard cap
    kelly_fraction: float = 0.25          # fraction actually used (<= cap)
    reward_risk: float = 1.5              # take-profit distance / stop distance
    stop_vol_mult: float = 2.0            # stop = k * realized vol over horizon
    escalation_cooldown_s: float = 900.0


@dataclass(frozen=True)
class CostModel:
    taker_fee_bps: float = 5.0
    maker_fee_bps: float = 1.0
    impact_coeff_bps: float = 10.0        # extra bps per 100% of visible top-5 depth consumed


@dataclass(frozen=True)
class AgentConfig:
    symbols: tuple[str, ...] = ("BTC-USD", "ETH-USD")
    candle_seconds: int = 60
    mode: str = "paper"                   # "paper" | "live" (live needs operator gate)
    risk: RiskLimits = field(default_factory=RiskLimits)
    policy: PolicyParams = field(default_factory=PolicyParams)
    costs: CostModel = field(default_factory=CostModel)

    def __post_init__(self) -> None:
        if self.policy.kelly_fraction > self.policy.kelly_cap:
            raise ValueError("kelly_fraction may not exceed kelly_cap (quarter Kelly)")
        if self.policy.kelly_cap > 0.25:
            raise ValueError("kelly_cap is hard-capped at 0.25")
        if self.risk.max_drawdown > 0.15:
            raise ValueError("max_drawdown is hard-capped at 15%")
        if self.mode not in ("paper", "live"):
            raise ValueError("mode must be paper or live")
