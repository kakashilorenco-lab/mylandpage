import pytest
from agent.calibration import CalibrationMap
from agent.config import PolicyParams, RiskLimits
from agent.policy import decide, kelly_fraction
from helpers import dec, snap

P, L = PolicyParams(), RiskLimits()
TRUST = CalibrationMap(prior_shrink=1.0)  # identity for gate tests


def test_fires_when_all_gates_pass():
    i = decide(dec(), snap(), P, L, TRUST)
    assert i.action == "open_long" and i.target_frac > 0


@pytest.mark.parametrize("kw,why", [
    (dict(setup_quality=1), "quality"),
    (dict(direction_p=0.80), "p_cal"),          # must be strictly > 0.80
    (dict(risk_state="near_limit"), "risk"),
    (dict(toxic_flow=True), "toxic"),
    (dict(direction="neutral"), "neutral"),
])
def test_each_gate_blocks(kw, why):
    i = decide(dec(**kw), snap(), P, L, TRUST)
    assert i.action == "hold" and why in i.reason


def test_jev_saying_safe_cannot_override_code_risk_state():
    i = decide(dec(risk_state="safe"), snap(drawdown=0.13), P, L, TRUST)
    assert i.action in ("hold", "flatten") and not i.action.startswith("open")


def test_none_decision_fails_closed():
    assert decide(None, snap(), P, L, TRUST).action == "hold"


def test_crisis_flattens_and_escalates():
    i = decide(dec(regime="crisis"), snap(inv_frac=0.05), P, L, TRUST)
    assert i.action == "flatten" and i.target_frac == 0 and i.escalate


def test_low_confidence_escalates():
    assert decide(dec(direction_p=0.55), snap(), P, L, TRUST).escalate


def test_uncalibrated_default_shrinks_confidence():
    # default map shrinks 0.95 -> 0.725, so the 0.80 gate blocks it until calibration data exists
    i = decide(dec(direction_p=0.95), snap(), P, L, CalibrationMap())
    assert i.action == "hold"


def test_kelly_capped_at_quarter_and_position_limit():
    assert kelly_fraction(0.9, 1.5) == pytest.approx(0.9 - 0.1 / 1.5)
    i = decide(dec(direction_p=0.99), snap(rv_1h_bps=0.01), P, L, TRUST)
    assert abs(i.target_frac) <= L.max_position_frac + 1e-12


def test_quarter_kelly_hard_cap_in_config():
    from agent.config import AgentConfig
    with pytest.raises(ValueError):
        AgentConfig(policy=PolicyParams(kelly_cap=0.5, kelly_fraction=0.5))
    with pytest.raises(ValueError):
        AgentConfig(risk=RiskLimits(max_drawdown=0.3))


def test_stop_loss_exit():
    i = decide(dec(), snap(inv_frac=0.05, upnl_bps=-500), P, L, TRUST)
    assert i.action == "flatten" and "stop" in i.reason


def test_warmup_blocks():
    assert decide(dec(), snap(n_hist=10), P, L, TRUST).action == "hold"
