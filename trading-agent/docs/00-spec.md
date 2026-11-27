# Spec

**Goal:** a 24/7 crypto agent that trades a small universe automatically, under hard
limits enforced in code, and improves its judgement nightly. The operator approves gates
(spec, architecture, schema promotion, going live, kill-switch reset).

**Universe (v1):** BTC-USD, ETH-USD spot (paper). HYPE as research finalist only.

**Hard limits (agent/config.py, frozen, validated at startup):**
max drawdown 15% (kill) · max daily loss 3% (kill) · max position 10% of equity per symbol
· max gross 30% · max order 5% · stale data > 2s → no order · limit price within 50bps of
mid · 30s per-symbol throttle · quarter-Kelly cap.

**Decision contract:** Jev answers regime (trending/mean_reverting/high_vol/crisis),
direction (long/short/neutral), toxic_flow (bool), setup_quality (0–3), risk_state
(safe/near_limit/reduce) in one call per symbol per candle. Code fires only if
quality ≥ 2, calibrated p > 0.80, risk safe (stricter of Jev and code), not toxic.
Escalate to Opus 5.5 if calibrated p < 0.60 or regime = crisis.

**Non-goals:** leverage, shorting via perps in v1, alt-coin value longs as reflex trades,
any model-controlled limit.
