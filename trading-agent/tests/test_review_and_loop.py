import json
import pytest
from agent.calibration import CalibrationMap
from agent.config import AgentConfig
from agent.escalation import apply_verdict
from agent.feeds import SyntheticFeed
from agent.jev_client import JevSchemaError, MockJev, _parse_answers
from agent.journal import Journal
from agent.loop import Agent
from agent.promote import promote
from agent.review import brier, run_review
from agent.schema import load_active


def test_brier():
    assert brier([(1.0, 1), (0.0, 0)]) == 0
    assert brier([(0.5, 1), (0.5, 0)]) == pytest.approx(0.25)


def test_parse_answers_strict():
    with pytest.raises(JevSchemaError):
        _parse_answers({"foo": 1}, 1)
    ok = {"answers": {
        "regime": {"value": "trending", "probabilities": {"trending": 0.7}},
        "direction": {"value": "long", "confidence": 0.9},
        "toxic_flow": {"value": False, "confidence": 0.8},
        "setup_quality": {"value": 2, "confidence": 0.6},
        "risk_state": {"value": "safe", "confidence": 0.9}}}
    d = _parse_answers(ok, 81)
    assert d.direction_p == 0.9 and d.setup_quality == 2
    ok["answers"]["direction"]["value"] = "moon"
    with pytest.raises(JevSchemaError):
        _parse_answers(ok, 1)


def test_escalation_can_only_shrink():
    v = apply_verdict({"action": "resume", "max_exposure_frac": 5.0, "pause_minutes": 0}, 0.10, 0)
    assert v.max_exposure_frac == 0.10
    v = apply_verdict({"action": "yolo"}, 0.10, 0)
    assert v.action == "pause" and v.pause_until >= 15 * 60


@pytest.mark.parametrize("seed", range(5))
def test_paper_loop_never_breaches_limits(tmp_path, seed):
    cfg = AgentConfig()
    j = Journal(tmp_path / "j.jsonl")
    ag = Agent(cfg, MockJev(), load_active("schemas"), CalibrationMap(prior_shrink=1.0), j,
               state_dir=str(tmp_path))
    feed = SyntheticFeed(cfg.symbols, seed=seed)
    for i, batch in enumerate(feed):
        ag.step(batch, batch[0].ts_ms)
        eq = ag.broker.equity(ag._marks())
        for s, q in ag.broker.positions.items():
            assert abs(q * ag._marks()[s]) / eq <= cfg.risk.max_position_frac * 1.05
        if i > 1500:
            break
    assert eq / ag.peak >= 1 - cfg.risk.max_drawdown - 0.02
    out = run_review(tmp_path / "j.jsonl", tmp_path / "rev", __import__("pathlib").Path("schemas"))
    assert (out / "report.md").exists()
    assert json.loads((out / "schema_candidate.json").read_text())["version"] == 2


def test_promote_gate(tmp_path):
    cand = tmp_path / "c.json"
    cand.write_text(json.dumps({"version": 2, "finalists": {}}))
    with pytest.raises(PermissionError):
        promote(cand, tmp_path, 0.2, 0.19, None)
    with pytest.raises(ValueError):
        promote(cand, tmp_path, 0.2, 0.21, "OP")
    assert promote(cand, tmp_path, 0.2, 0.19, "OP") == "v2.json"
