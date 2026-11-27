from agent.state_engine import Snapshot
from agent.jev_client import JevDecision


def snap(**kw):
    base = dict(symbol="BTC-USD", as_of_ms=10_000_000, book_age_ms=100, mid=60_000.0, spread_bps=1.0,
                imbalance5=0.3, microprice_bps=0.2, depth5_usd=1e6, ret_5m_bps=5, ret_1h_bps=20,
                rv_1h_bps=5.0, rv_ratio=1.0, trend_z=1.0, inv_frac=0.0, upnl_bps=0.0, drawdown=0.0,
                daily_pnl=0.0, n_hist=120)
    base.update(kw)
    return Snapshot(**base)


def dec(**kw):
    base = dict(regime="trending", regime_p=0.8, direction="long", direction_p=0.95, toxic_flow=False,
                toxic_p=0.9, setup_quality=2, risk_state="safe", latency_ms=80.0)
    base.update(kw)
    return JevDecision(**base)
