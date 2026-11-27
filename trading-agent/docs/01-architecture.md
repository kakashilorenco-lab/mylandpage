# Architecture

```
          exchange L2 book (public)                 nightly (00:05 UTC)
                  │                                         │
          agent/feeds.py                            agent/review.py ── Brier, reliability,
                  │                                         │           misses, calibration.json,
          agent/state_engine.py  (code: mid, spread,        │           schema_candidate.json
                  │   imbalance, RV, inventory, DD)         │
                  │   causal, <400 tokens                   ▼
                  ▼                                  agent/promote.py ── operator gate
     ┌── REFLEX: Jev (agent/jev_client.py) ──┐
     │   5 typed questions, 1 call/symbol    │
     └───────────────┬───────────────────────┘
                     ▼
          agent/policy.py  (code: calibration map → gates → exits → quarter Kelly)
                     │ low conf / crisis ──► BRAIN: Opus 5.5 (agent/escalation.py)
                     │                          async; verdict can only pause/shrink
                     ▼
          agent/risk.py  (code: kill switch FIRST, then every limit) ◄── state/KILL
                     ▼
          agent/broker.py  (paper: book walk + fees + impact; live: gated)
                     ▼
          agent/journal.py  (append-only JSONL of everything)
```

Invariants (each has a test):
1. Nothing a model returns can raise a limit or size (`test_jev_saying_safe_cannot_override_code_risk_state`,
   `test_escalation_can_only_shrink`).
2. Any malformed Jev output → hold (`test_parse_answers_strict`, `test_none_decision_fails_closed`).
3. No future data in a snapshot (`test_future_book_rejected`, `test_out_of_order_rejected`).
4. Kill switch blocks new risk but always allows de-risking (`test_drawdown_trips_kill_...`).
5. Uncalibrated probabilities are shrunk toward 0.5, so the 0.80 gate cannot fire on day
   one on raw model confidence (`test_uncalibrated_default_shrinks_confidence`).
6. New schemas need better Brier AND operator initials (`test_promote_gate`).
