"""Jev (TypeSafe AI System One model) client + a deterministic mock.

Jev only JUDGES. It returns typed answers with probabilities; it never sizes, never
places orders, never sees limits it could argue with.

!! UNVERIFIED WIRE FORMAT !!
Public secondary sources (Nov 2026) describe: POST https://api.typesafe.ai/v1/systemone,
model "jev-latest", body = {state, questions} with question types bool/choice/score
and per-option `criteria`. The exact response shape was NOT verifiable from this
environment (docs hosts blocked). `_parse_answers` is deliberately strict: any shape it
does not understand raises JevSchemaError and the policy fails CLOSED (hold).
Confirm against docs.typesafe.ai before enabling, and update the contract test.
"""
from __future__ import annotations

import json
import os
import time
import urllib.request
from dataclasses import dataclass

from .schema import DIRECTIONS, REGIMES, RISK_STATES
from .state_engine import Snapshot


class JevSchemaError(RuntimeError):
    pass


@dataclass(frozen=True)
class JevDecision:
    regime: str
    regime_p: float
    direction: str
    direction_p: float
    toxic_flow: bool
    toxic_p: float
    setup_quality: int
    risk_state: str
    latency_ms: float
    raw: dict | None = None

    def validate(self) -> "JevDecision":
        if self.regime not in REGIMES or self.direction not in DIRECTIONS or self.risk_state not in RISK_STATES:
            raise JevSchemaError(f"out-of-domain answer: {self}")
        if not (0 <= self.setup_quality <= 3):
            raise JevSchemaError("setup_quality out of range")
        for p in (self.regime_p, self.direction_p, self.toxic_p):
            if not (0.0 <= p <= 1.0):
                raise JevSchemaError("probability out of range")
        return self


def _top(ans: dict) -> tuple[str, float]:
    """Accepts {"value": x, "probabilities": {opt: p}} or {"value": x, "confidence": p}."""
    if "value" not in ans:
        raise JevSchemaError(f"answer missing value: {ans}")
    v = ans["value"]
    if isinstance(ans.get("probabilities"), dict):
        p = float(ans["probabilities"].get(str(v).lower(), ans["probabilities"].get(v, -1)))
    elif "confidence" in ans:
        p = float(ans["confidence"])
    else:
        raise JevSchemaError(f"answer missing probability: {ans}")
    return v, p


def _parse_answers(body: dict, latency_ms: float) -> JevDecision:
    answers = body.get("answers")
    if not isinstance(answers, dict):
        raise JevSchemaError("response has no answers object")
    try:
        regime, rp = _top(answers["regime"])
        direction, dp = _top(answers["direction"])
        toxic, tp = _top(answers["toxic_flow"])
        quality, _ = _top(answers["setup_quality"])
        risk, _ = _top(answers["risk_state"])
    except KeyError as e:
        raise JevSchemaError(f"missing answer {e}") from e
    toxic_b = toxic if isinstance(toxic, bool) else str(toxic).lower() == "true"
    return JevDecision(str(regime), rp, str(direction), dp, toxic_b, tp,
                       int(round(float(quality))), str(risk), latency_ms, body).validate()


class JevClient:
    def __init__(self, api_key: str | None = None,
                 url: str = "https://api.typesafe.ai/v1/systemone",
                 model: str = "jev-latest", timeout_s: float = 1.5):
        self.api_key = api_key or os.environ.get("TYPESAFE_API_KEY")
        if not self.api_key:
            raise RuntimeError("TYPESAFE_API_KEY not set (get one at console.typesafe.ai)")
        self.url, self.model, self.timeout_s = url, model, timeout_s

    def decide(self, snap: Snapshot, questions: dict) -> JevDecision:
        payload = {"model": self.model, "state": snap.to_compact(), "questions": questions}
        req = urllib.request.Request(
            self.url, data=json.dumps(payload).encode(), method="POST",
            headers={"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"},
        )
        t0 = time.perf_counter()
        with urllib.request.urlopen(req, timeout=self.timeout_s) as r:
            body = json.loads(r.read())
        return _parse_answers(body, (time.perf_counter() - t0) * 1e3)


class MockJev:
    """Deterministic stand-in for tests and paper dry-runs. NOT a strategy."""

    def decide(self, snap: Snapshot, questions: dict) -> JevDecision:
        t0 = time.perf_counter()
        if snap.rv_ratio > 2.5 or snap.drawdown > 0.12:
            regime, rp = "crisis", 0.85
        elif abs(snap.trend_z) > 1.5:
            regime, rp = "trending", 0.7
        elif snap.rv_ratio > 1.5:
            regime, rp = "high_vol", 0.65
        else:
            regime, rp = "mean_reverting", 0.6
        score = 0.6 * snap.imbalance5 + 0.4 * max(-1, min(1, snap.trend_z / 3))
        if abs(score) < 0.15:
            direction, dp = "neutral", 0.6
        else:
            direction = "long" if score > 0 else "short"
            dp = min(0.97, 0.55 + abs(score) * 0.5)
        toxic = abs(snap.microprice_bps) > 3 * max(snap.spread_bps, 0.1)
        quality = 0 if direction == "neutral" else (3 if abs(score) > 0.6 else 2 if abs(score) > 0.35 else 1)
        risk = "reduce" if snap.drawdown > 0.12 else "near_limit" if snap.drawdown > 0.08 else "safe"
        return JevDecision(regime, rp, direction, dp, toxic, 0.7, quality, risk,
                           (time.perf_counter() - t0) * 1e3).validate()
