"""Policy: turns a Jev judgement into an intent. Code owns every threshold and size.

Gates (all must pass to open/increase):
  setup_quality >= 2, calibrated direction prob > 0.80, risk_state == safe
  (BOTH Jev's view and the code's own computed risk state), not toxic, not neutral,
  regime != crisis.
Escalation to Opus: calibrated direction prob < 0.60 or regime == crisis.
Sizing: fractional Kelly on calibrated p, capped at quarter Kelly, then clamped by
the risk layer (which can only shrink it).
"""
from __future__ import annotations

from dataclasses import dataclass

from .calibration import CalibrationMap
from .config import PolicyParams, RiskLimits
from .jev_client import JevDecision
from .state_engine import Snapshot


@dataclass(frozen=True)
class Intent:
    symbol: str
    action: str               # "open_long" | "open_short" | "flatten" | "hold"
    target_frac: float        # signed target position notional / equity
    p_cal: float
    escalate: bool
    reason: str


def code_risk_state(snap: Snapshot, limits: RiskLimits) -> str:
    """Deterministic risk state. Jev's opinion can only make this stricter."""
    if snap.drawdown >= 0.8 * limits.max_drawdown or snap.daily_pnl <= -0.8 * limits.max_daily_loss:
        return "reduce"
    if snap.drawdown >= 0.5 * limits.max_drawdown or snap.daily_pnl <= -0.5 * limits.max_daily_loss:
        return "near_limit"
    return "safe"


_STRICTNESS = {"safe": 0, "near_limit": 1, "reduce": 2}


def kelly_fraction(p: float, b: float) -> float:
    """Full Kelly for win prob p and payoff ratio b (win b units / lose 1 unit)."""
    return max(0.0, p - (1 - p) / b)


def decide(d: JevDecision | None, snap: Snapshot, params: PolicyParams, limits: RiskLimits,
           calib: CalibrationMap) -> Intent:
    sym = snap.symbol
    if d is None:
        return Intent(sym, "hold", snap.inv_frac, 0.0, False, "no valid Jev decision -> fail closed")

    p_cal = calib(d.direction_p)
    escalate = d.regime == "crisis" or p_cal < params.escalate_below_conf
    risk = max(code_risk_state(snap, limits), d.risk_state, key=_STRICTNESS.__getitem__)

    if d.regime == "crisis" or risk == "reduce":
        action = "flatten" if snap.inv_frac != 0 else "hold"
        return Intent(sym, action, 0.0, p_cal, escalate, f"regime={d.regime} risk={risk}: de-risk")

    # Code-owned exits for an open position: stop, take-profit, confident flip.
    stop_bps = max(params.stop_vol_mult * snap.rv_1h_bps * (60 ** 0.5), 10.0)
    if snap.inv_frac != 0:
        if snap.upnl_bps <= -stop_bps:
            return Intent(sym, "flatten", 0.0, p_cal, escalate, f"stop hit {snap.upnl_bps:.1f}<=-{stop_bps:.1f}bps")
        if snap.upnl_bps >= params.reward_risk * stop_bps:
            return Intent(sym, "flatten", 0.0, p_cal, escalate, f"take-profit {snap.upnl_bps:.1f}bps")
        held_long = snap.inv_frac > 0
        if (d.direction == "short" and held_long) or (d.direction == "long" and not held_long):
            if p_cal > params.min_direction_conf:
                return Intent(sym, "flatten", 0.0, p_cal, escalate, "confident opposite signal")

    blockers = []
    if d.setup_quality < params.min_setup_quality:
        blockers.append(f"quality {d.setup_quality}<{params.min_setup_quality}")
    if not p_cal > params.min_direction_conf:
        blockers.append(f"p_cal {p_cal:.3f}<={params.min_direction_conf}")
    if risk != "safe":
        blockers.append(f"risk={risk}")
    if d.toxic_flow:
        blockers.append("toxic_flow")
    if d.direction == "neutral":
        blockers.append("neutral")
    if snap.n_hist < 60:
        blockers.append("warm-up <60m history")
    if blockers:
        return Intent(sym, "hold", snap.inv_frac, p_cal, escalate, "; ".join(blockers))

    f_full = kelly_fraction(p_cal, params.reward_risk)
    f = min(params.kelly_fraction, params.kelly_cap) * f_full
    # Kelly f is fraction of equity RISKED; convert to notional via stop distance.
    notional_frac = f / (stop_bps / 1e4)
    notional_frac = min(notional_frac, limits.max_position_frac)
    sign = 1 if d.direction == "long" else -1
    return Intent(sym, "open_long" if sign > 0 else "open_short", sign * notional_frac, p_cal,
                  escalate, f"kelly_full={f_full:.3f} used={f:.4f} stop_bps={stop_bps:.1f}")
