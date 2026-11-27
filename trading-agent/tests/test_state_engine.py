import pytest
from agent.state_engine import BookUpdate, CausalityError, PortfolioView, StateEngine, TOKEN_BUDGET

PF = PortfolioView(0.0, 100_000, 100_000, 100_000)


def book(ts, mid=100.0, bsz=1.0, asz=1.0):
    return BookUpdate("X", ts, tuple((mid - 0.01 - i * 0.01, bsz) for i in range(5)),
                      tuple((mid + 0.01 + i * 0.01, asz) for i in range(5)))


def test_basic_fields_computed_in_code():
    e = StateEngine("X")
    for m in range(70):
        e.on_book(book(m * 60_000, 100 + m * 0.1))
    s = e.snapshot(69 * 60_000 + 500, PF)
    assert s.mid == pytest.approx(106.9)
    assert s.spread_bps == pytest.approx(0.02 / 106.9 * 1e4)
    assert s.imbalance5 == 0
    assert s.ret_1h_bps > 0 and s.n_hist == 69 and s.book_age_ms == 500


def test_imbalance_sign():
    e = StateEngine("X"); e.on_book(book(0, bsz=3, asz=1))
    assert e.snapshot(0, PF).imbalance5 == pytest.approx(0.5)


def test_future_book_rejected():
    e = StateEngine("X"); e.on_book(book(60_000))
    with pytest.raises(CausalityError):
        e.snapshot(59_999, PF)


def test_out_of_order_rejected():
    e = StateEngine("X"); e.on_book(book(60_000))
    with pytest.raises(CausalityError):
        e.on_book(book(1_000))


def test_history_excludes_future_minutes():
    e = StateEngine("X")
    for m in range(10):
        e.on_book(book(m * 60_000, 100 + m))
    # As-of minute 9 sees 10 closes; nothing after exists. Book ts must be <= as_of.
    s = e.snapshot(9 * 60_000, PF)
    assert s.n_hist == 9


def test_crossed_book_ignored():
    e = StateEngine("X"); e.on_book(book(0, 100))
    e.on_book(BookUpdate("X", 1, ((101, 1),), ((100, 1),)))
    assert e.snapshot(1, PF).mid == pytest.approx(100)


def test_token_budget():
    e = StateEngine("X")
    for m in range(300):
        e.on_book(book(m * 60_000, 50_000 + (m % 7)))
    pf = PortfolioView(-1.2345, 98_765.43, 123_456.78, 99_999.99, 50_001.23)
    s = e.snapshot(299 * 60_000, pf)
    assert s.token_estimate() < TOKEN_BUDGET
