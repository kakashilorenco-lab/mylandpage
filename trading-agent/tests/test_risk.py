import pytest
from agent.config import RiskLimits
from agent.risk import KillSwitch, Order, RiskManager


@pytest.fixture
def rm(tmp_path):
    t = [1000.0]
    r = RiskManager(RiskLimits(), KillSwitch(str(tmp_path / "KILL")), clock=lambda: t[0])
    r._t = t
    return r


def chk(rm, qty, pos=None, mid=100.0, age=100, limit=None, reduce_only=False):
    return rm.check(Order("X", qty, limit or mid, reduce_only), mid=mid, snapshot_age_ms=age,
                    equity=100_000, positions=pos or {}, prices={"X": mid})


def test_ok_order(rm):
    assert chk(rm, 40).ok   # 4% of equity


def test_order_too_large(rm):
    assert not chk(rm, 60).ok


def test_position_limit(rm):
    v = chk(rm, 40, pos={"X": 80})
    assert not v.ok and "position" in v.reason


def test_gross_limit(rm):
    v = rm.check(Order("X", 40, 100), mid=100, snapshot_age_ms=0, equity=100_000,
                 positions={"A": 130, "B": 130, "X": 0}, prices={"A": 100, "B": 100, "X": 100})
    assert v.ok  # 30% gross exactly is allowed
    v = rm.check(Order("X", 50, 100), mid=100, snapshot_age_ms=0, equity=100_000,
                 positions={"A": 130, "B": 130, "X": 0}, prices={"A": 100, "B": 100, "X": 100})
    assert not v.ok


def test_stale_and_price_band(rm):
    assert "stale" in chk(rm, 10, age=10_000).reason
    assert "mid" in chk(rm, 10, limit=101).reason


def test_drawdown_trips_kill_and_blocks_new_risk_but_allows_reduction(rm):
    rm.update_equity(84_000, 100_000, 100_000)
    assert rm.kill.tripped_reason
    assert "KILL" in chk(rm, 10).reason
    assert chk(rm, -10, pos={"X": 50}, reduce_only=True).ok


def test_daily_loss_trips(rm):
    rm.update_equity(96_900, 100_000, 100_000)
    assert "daily" in rm.kill.tripped_reason


def test_kill_file_halts(rm, tmp_path):
    (tmp_path / "KILL").write_text("operator")
    assert not chk(rm, 10).ok


def test_reset_requires_confirmation(rm):
    rm.kill.trip("x")
    with pytest.raises(PermissionError):
        rm.kill.operator_reset("yes")
    rm.kill.operator_reset("I-HAVE-REVIEWED-THE-INCIDENT")
    assert chk(rm, 10).ok


def test_throttle(rm):
    assert chk(rm, 10).ok
    rm.record_sent("X")
    assert "throttled" in chk(rm, 10).reason
    rm._t[0] += 31
    assert chk(rm, 10).ok


def test_reduce_only_cannot_flip(rm):
    assert not chk(rm, -100, pos={"X": 50}, reduce_only=True).ok
