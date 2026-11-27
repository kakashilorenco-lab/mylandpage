"""The live loop: feed -> state engine -> Jev (parallel per symbol) -> policy -> risk -> broker.

Every candle, for every symbol:
  1. Build causal snapshot (code).
  2. Ask Jev the five typed questions in one call (model judges only).
  3. Policy applies gates + quarter-Kelly sizing (code).
  4. Escalation verdicts from Opus can only pause/shrink (code clamp).
  5. Risk layer checks EVERY order, kill switch first (code).
  6. Execute, journal everything.
"""
from __future__ import annotations

import argparse
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from .broker import LiveBroker, PaperBroker
from .calibration import CalibrationMap
from .config import AgentConfig
from .escalation import Escalator
from .jev_client import JevClient, JevSchemaError, MockJev
from .journal import Journal
from .policy import decide
from .risk import KillSwitch, Order, RiskManager
from .schema import load_active
from .state_engine import BookUpdate, PortfolioView, StateEngine


class Agent:
    def __init__(self, cfg: AgentConfig, jev, schema, calib: CalibrationMap, journal: Journal,
                 equity: float = 100_000.0, escalator: Escalator | None = None, state_dir: str = "state"):
        self.cfg, self.jev, self.schema, self.calib, self.journal = cfg, jev, schema, calib, journal
        self.engines = {s: StateEngine(s) for s in cfg.symbols}
        self.broker = PaperBroker(cfg.costs, cash=equity)
        kill_path = str(Path(state_dir) / Path(cfg.risk.kill_switch_file).name)
        self.risk = RiskManager(cfg.risk, KillSwitch(kill_path))
        self.escalator = escalator
        self.peak = equity
        self.day_start = equity
        self.day = None
        self.books: dict[str, BookUpdate] = {}
        self.pool = ThreadPoolExecutor(max_workers=max(1, len(cfg.symbols)))

    def _marks(self) -> dict[str, float]:
        return {s: (b.bids[0][0] + b.asks[0][0]) / 2 for s, b in self.books.items()}

    def _portfolio(self, sym: str) -> PortfolioView:
        eq = self.broker.equity(self._marks())
        return PortfolioView(self.broker.positions.get(sym, 0.0), eq, self.peak, self.day_start,
                             self.broker.avg_entry.get(sym, 0.0))

    def _judge(self, snap):
        try:
            return self.jev.decide(snap, self.schema.questions(snap.symbol))
        except (JevSchemaError, OSError, TimeoutError, ValueError) as e:
            self.journal.write("jev_error", symbol=snap.symbol, error=repr(e))
            return None

    def step(self, batch: list[BookUpdate], now_ms: int) -> None:
        for b in batch:
            if b.symbol in self.engines:
                self.engines[b.symbol].on_book(b)
                self.books[b.symbol] = b
        day = now_ms // 86_400_000
        eq = self.broker.equity(self._marks())
        if day != self.day:
            self.day, self.day_start = day, eq
        self.peak = max(self.peak, eq)
        self.risk.update_equity(eq, self.peak, self.day_start)

        snaps = []
        for s, eng in self.engines.items():
            if s in self.books:
                snaps.append(eng.snapshot(now_ms, self._portfolio(s)))
        decisions = list(self.pool.map(self._judge, snaps))   # parallel per symbol

        for snap, d in zip(snaps, decisions):
            intent = decide(d, snap, self.cfg.policy, self.cfg.risk, self.calib)
            self.journal.write("decision", snapshot=snap, decision=d, intent=intent)
            target = intent.target_frac
            if intent.escalate and self.escalator:
                if self.escalator.maybe_escalate(snap, f"decision={d} intent={intent}"):
                    self.journal.write("escalation", symbol=snap.symbol, reason=intent.reason)
            v = self.escalator.gate(snap.symbol) if self.escalator else None
            if v is not None:
                if v.action == "flatten":
                    target = 0.0
                elif v.action == "pause" and intent.action.startswith("open"):
                    target = snap.inv_frac  # no new risk
                cap = v.max_exposure_frac if v.action != "resume" else self.cfg.risk.max_position_frac
                target = max(-cap, min(cap, target)) if abs(target) > abs(snap.inv_frac) else target
            if intent.action == "hold" and v is None:
                continue
            self._rebalance(snap, target)

    def _rebalance(self, snap, target_frac: float) -> None:
        eq = self.broker.equity(self._marks())
        cur_units = self.broker.positions.get(snap.symbol, 0.0)
        tgt_units = target_frac * eq / snap.mid
        delta = tgt_units - cur_units
        if abs(delta * snap.mid) < 10:   # dust
            return
        # never jump the whole way in one order: clamp to max_order_frac
        max_units = self.cfg.risk.max_order_frac * eq / snap.mid
        reducing = abs(tgt_units) < abs(cur_units)
        if not reducing:
            delta = max(-max_units, min(max_units, delta))
        band = 10 / 1e4
        limit = snap.mid * (1 + band if delta > 0 else 1 - band)
        order = Order(snap.symbol, delta, limit, reduce_only=reducing)
        verdict = self.risk.check(order, mid=snap.mid, snapshot_age_ms=snap.book_age_ms, equity=eq,
                                  positions=dict(self.broker.positions), prices=self._marks())
        if not verdict.ok:
            self.journal.write("risk_reject", symbol=snap.symbol, reason=verdict.reason, qty=delta)
            return
        fill = self.broker.execute(order, self.books[snap.symbol])
        self.risk.record_sent(snap.symbol)
        if fill:
            self.journal.write("fill", fill=fill, equity=self.broker.equity(self._marks()))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--feed", choices=["synthetic", "coinbase"], default="synthetic")
    ap.add_argument("--jev", choices=["mock", "live"], default="mock")
    ap.add_argument("--steps", type=int, default=0, help="0 = run forever")
    ap.add_argument("--mode", choices=["paper", "live"], default="paper")
    a = ap.parse_args()

    cfg = AgentConfig(mode=a.mode)
    if cfg.mode == "live":
        LiveBroker()  # raises unless the operator gate is passed
    jev = JevClient() if a.jev == "live" else MockJev()
    escalator = Escalator(cfg.risk.max_position_frac, cfg.policy.escalation_cooldown_s)
    agent = Agent(cfg, jev, load_active("schemas"), CalibrationMap.load("state/calibration.json"),
                  Journal("state/journal.jsonl"), escalator=escalator if a.jev == "live" else None)
    from .feeds import CoinbasePublicFeed, SyntheticFeed
    feed = SyntheticFeed(cfg.symbols, start_ms=int(time.time() * 1000)) if a.feed == "synthetic" \
        else CoinbasePublicFeed(cfg.symbols, cfg.candle_seconds)
    for i, batch in enumerate(feed):
        now = max((b.ts_ms for b in batch), default=int(time.time() * 1000))
        agent.step(batch, now)
        if a.steps and i + 1 >= a.steps:
            break
    print("equity", agent.broker.equity(agent._marks()), "kill:", agent.risk.kill.tripped_reason)


if __name__ == "__main__":
    main()
