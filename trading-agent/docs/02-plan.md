# Build plan — six phases, one operator gate each

**About Agenkit:** I could not verify that agenkit.xyz exists (no search hit, as of
2026-11-27) and did not install unverified software into this environment. The six-phase
discipline the spec asked for (spec → architecture → plan → test-first build → review →
ship, with an approval gate per phase) is implemented directly in this repo: each phase
has an artifact and a gate checklist. If you adopt Agenkit later, point it at
`docs/00-spec.md` — the phases map 1:1.

| # | Phase | Artifacts (exact paths) | Gate (operator signs) | Status |
|---|---|---|---|---|
| 1 | Spec | `docs/00-spec.md`, `docs/03-research.md` | Limits and universe accepted | done, awaiting sign-off |
| 2 | Architecture | `docs/01-architecture.md` | Brain/reflex split; no model touches limits | done, awaiting sign-off |
| 3 | Plan | `docs/02-plan.md` (this file) | Phase list + gates | done |
| 4 | Test-first build | `agent/config.py`, `agent/state_engine.py`, `agent/schema.py`, `agent/jev_client.py`, `agent/calibration.py`, `agent/policy.py`, `agent/risk.py`, `agent/broker.py`, `agent/escalation.py`, `agent/journal.py`, `agent/feeds.py`, `agent/loop.py`, `agent/review.py`, `agent/promote.py`, `schemas/v1.json`; tests in `tests/` | `python3 -m pytest` green (42 tests) | done |
| 5 | Review | `docs/04-final-check.md`; paper run ≥ 30 days; nightly reports in `state/review/` | See checklist below | **not started** (needs Jev key + live data) |
| 6 | Ship | exchange adapter in `agent/broker.py::LiveBroker`; `LIVE_TRADING_APPROVED` | Small capital, staged sizing | **blocked by design** |

## Phase 5 checklist (before any real money)
1. Confirm Jev's wire format against docs.typesafe.ai; add a recorded-response contract
   test for `_parse_answers`. Measure p50/p99 latency from your host.
2. Paper trade ≥ 30 days on live public books (allow the exchange host in the network
   policy). Need ≥ 300 labeled directional decisions per probability bin used for trading.
3. Nightly Brier must beat climatology (base-rate forecast) for 3 consecutive weeks.
   If it doesn't, Jev adds no information here — stop, don't tune thresholds to fit.
4. Net-of-cost PnL positive in paper with the fee/slippage model, AND with costs doubled.
5. Kill switch drill: `touch state/KILL` mid-run → no new orders, de-risking still works.
6. Escalation drill: force `regime=crisis` → symbol flattens and pauses; Opus failure → stays paused.

## Phase 6 staging
- Week 1–2: 1% of intended capital, `max_position_frac=0.02`. IOC limit orders only.
- Scale only if live slippage ≤ 1.5× paper model and Brier holds.
- API keys: trade-only, **withdrawals disabled**, IP-allowlisted.

## Runbook
```bash
cd trading-agent
python3 -m pytest -q                          # all gates/limits tested
python3 -m agent.loop --steps 600             # paper, synthetic feed, mock Jev
python3 -m agent.loop --feed coinbase --jev live   # paper, live books, real Jev (TYPESAFE_API_KEY)
python3 -m agent.review                       # nightly (cron 00:05 UTC)
python3 -m agent.promote state/review/<day>/schema_candidate.json \
   --brier-active X --brier-candidate Y --approve <INITIALS>
cp state/review/<day>/calibration.json state/calibration.json   # after reading report.md
touch state/KILL                              # emergency stop
```
