# trading-agent

24/7 crypto trading agent: **code owns every limit, size and side effect; models only judge.**

- REFLEX: Jev (TypeSafe System One) answers 5 typed questions per symbol per candle.
- BRAIN: Claude Opus 5.5 handles escalations (crisis / low confidence) and nightly schema proposals.
- Hard risk layer + armed kill switch run before every order. Paper mode by default; live is an operator gate.

Start here: `docs/00-spec.md` → `docs/01-architecture.md` → `docs/02-plan.md` → `docs/03-research.md` → `docs/04-final-check.md`.

```bash
python3 -m pytest -q
python3 -m agent.loop --steps 600     # paper, synthetic data, mock Jev
python3 -m agent.review
```
Not financial advice. Nothing here has a demonstrated edge yet.
