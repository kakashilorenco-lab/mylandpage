"""Escalation to the BRAIN (Claude Opus 5.5) for a deep re-read.

Triggered by the policy when calibrated confidence < 0.60 or regime == crisis.
Runs off the hot path (background thread); the reflex keeps HOLDING meanwhile.

The answer can only make the system MORE conservative: it may pause a symbol or cap
its exposure below the hard limit, never raise any limit. That clamp is in code
(`apply_verdict`), not in the prompt.
"""
from __future__ import annotations

import json
import threading
import time
from dataclasses import dataclass

from .state_engine import Snapshot

MODEL = "claude-opus-5-5"

VERDICT_SCHEMA = {
    "type": "object",
    "properties": {
        "action": {"type": "string", "enum": ["resume", "pause", "flatten"]},
        "max_exposure_frac": {"type": "number"},
        "pause_minutes": {"type": "integer"},
        "rationale": {"type": "string"},
    },
    "required": ["action", "max_exposure_frac", "pause_minutes", "rationale"],
    "additionalProperties": False,
}

SYSTEM = (
    "You are the slow, deliberate supervisor of an automated crypto trading system. "
    "A fast classifier flagged low confidence or a crisis regime. Read the numeric state "
    "and recent decisions and decide whether the symbol should resume normal operation, "
    "pause new entries, or be flattened. You cannot raise any risk limit. When evidence "
    "is ambiguous, prefer pause. Keep rationale under 80 words."
)


@dataclass(frozen=True)
class Verdict:
    action: str
    max_exposure_frac: float
    pause_until: float
    rationale: str


def apply_verdict(raw: dict, hard_max_position_frac: float, now: float) -> Verdict:
    action = raw.get("action") if raw.get("action") in ("resume", "pause", "flatten") else "pause"
    cap = float(raw.get("max_exposure_frac", 0.0))
    cap = max(0.0, min(cap, hard_max_position_frac))           # can only shrink
    mins = max(0, min(int(raw.get("pause_minutes", 60)), 24 * 60))
    if action != "resume":
        mins = max(mins, 15)
    return Verdict(action, cap, now + mins * 60 if action != "resume" else now, str(raw.get("rationale", ""))[:600])


class Escalator:
    def __init__(self, hard_max_position_frac: float, cooldown_s: float = 900.0, client=None):
        self.hard_cap = hard_max_position_frac
        self.cooldown_s = cooldown_s
        self._client = client
        self._last: dict[str, float] = {}
        self.verdicts: dict[str, Verdict] = {}
        self._lock = threading.Lock()

    def _get_client(self):
        if self._client is None:
            import anthropic  # lazy: only needed when escalation actually fires
            self._client = anthropic.Anthropic()
        return self._client

    def maybe_escalate(self, snap: Snapshot, context: str) -> bool:
        now = time.time()
        with self._lock:
            if now - self._last.get(snap.symbol, -1e18) < self.cooldown_s:
                return False
            self._last[snap.symbol] = now
            # Until the brain answers, pause new entries on this symbol.
            self.verdicts[snap.symbol] = Verdict("pause", 0.0, now + self.cooldown_s, "awaiting escalation")
        threading.Thread(target=self._run, args=(snap, context), daemon=True).start()
        return True

    def _run(self, snap: Snapshot, context: str) -> None:
        try:
            raw = self.ask(snap, context)
        except Exception as e:  # any failure -> stay paused (fail closed)
            raw = {"action": "pause", "max_exposure_frac": 0.0, "pause_minutes": 60,
                   "rationale": f"escalation failed: {type(e).__name__}"}
        with self._lock:
            self.verdicts[snap.symbol] = apply_verdict(raw, self.hard_cap, time.time())

    def ask(self, snap: Snapshot, context: str) -> dict:
        client = self._get_client()
        resp = client.beta.messages.create(
            model=MODEL,
            max_tokens=4000,
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
            output_config={"effort": "high", "format": {"type": "json_schema", "schema": VERDICT_SCHEMA}},
            system=SYSTEM,
            messages=[{"role": "user", "content": f"STATE: {snap.to_compact()}\n\nCONTEXT:\n{context}"}],
        )
        if resp.stop_reason == "refusal":
            return {"action": "pause", "max_exposure_frac": 0.0, "pause_minutes": 60, "rationale": "refusal"}
        text = next(b.text for b in resp.content if b.type == "text")
        return json.loads(text)

    def gate(self, symbol: str) -> Verdict | None:
        with self._lock:
            v = self.verdicts.get(symbol)
        if v and v.action != "resume" and time.time() >= v.pause_until:
            return None
        return v
