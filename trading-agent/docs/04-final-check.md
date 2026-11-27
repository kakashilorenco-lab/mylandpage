# Final check (before shipping)

**Is the edge organic or incentive-driven?** The reflex strategy's "edge" is unproven.
Order-book imbalance and short-horizon momentum are well-known and heavily competed;
at 1-minute candles on Coinbase spot a retail-latency system is the slowest participant.
HYPE's value accrual is organic (fee-funded buybacks), but that is a slow thesis, not a
1-minute edge.

**Is the catalyst priced in?** Record ETF outflows and the new cycle low are public, so
"bearish regime" is priced. Unlock dates are public and usually front-run.

**Does value accrue to the token?** BTC/ETH: n/a. HYPE: yes, via buybacks — pro-cyclical
though. UNI: partially since fee switch. AAVE: unresolved [CONFLICT].

**Does it survive costs and slippage?** Unknown until paper data exists. The review
scores a hit only if the move beats 12bps round trip. The demo run with the mock judge
shows *Brier worse than climatology* — the review flagged it correctly. That is the
expected result for a judge with no information, and it is the bar the real Jev must clear.

**Is any hard limit delegated to the model?** No. Limits live in frozen dataclasses,
checked in `risk.py` before every order; Jev's `risk_state` can only make things stricter;
Opus verdicts are clamped to pause/shrink; promotion needs a human.

## WHAT COULD I BE WRONG ABOUT?

1. **Jev may add no signal here.** It was announced 2026-09-15; latency/accuracy
   claims are self-reported by TypeSafe and not independently reproduced. A calibrated
   "I don't know" (p≈base rate) is the likely outcome on 1-minute crypto books. The
   system is built to discover that cheaply (Brier vs climatology), not to assume an edge.
2. **The Jev wire format in `jev_client.py` is inferred** from secondary docs; the docs
   hosts were blocked from this environment. It fails closed, but it needs verification.
3. **Agenkit could not be verified**, so the six-phase harness is plain repo discipline,
   not that tool.
4. **Research numbers conflict** (ETF outflows $4.7B vs $5.4B; stablecoins $244B vs $280B;
   HYPE price snapshots €55–$83 over November). Regime call is robust to those; any
   position sizing based on them would not be.
5. **Nightly self-rewriting is a classic overfitting machine.** Rewriting criteria every
   night on one day of fills chases noise. Mitigations: calibration bins need n ≥ 30 and
   are shrunk; promotion requires out-of-sample Brier improvement and a human. Even so,
   weekly cadence is probably better than nightly.
6. **Kelly on a miscalibrated p is dangerous.** Quarter Kelly helps, but if calibration
   drifts after a regime change, sizes are wrong exactly when it hurts. Position caps
   (10%) are the real protection, not Kelly.
7. **Paper ≠ live.** The fill model walks a snapshot book; real books move during
   latency, queue position matters, and Coinbase's REST L2 has no exchange timestamp
   (receive time is used). Expect live slippage worse than paper.
8. **Operational risk dominates in crypto:** exchange outages, API key compromise,
   stablecoin depegs, venue insolvency. Use withdrawal-disabled keys and keep most
   capital off-exchange.
9. **The bias toward holding may simply mean the system rarely trades.** That's the
   intended failure mode: a system that survives and does little beats one that looks
   profitable in backtests and blows up.
