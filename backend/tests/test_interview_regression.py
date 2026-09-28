import pytest
from backend.app.schemas.interview import InterviewStartRequest, InterviewTurnRequest
from backend.app.services.interview_engine import interview_engine


@pytest.fixture
def interview_session():
    req = InterviewStartRequest(
        interview_slug="url-shortener-tinyurl",
        target_role="Staff Systems Architect",
    )
    res = interview_engine.start_interview(req)
    return res.session_id


def test_vague_one_sentence_answer_is_rejected_without_advancing(interview_session):
    """Regression test for P1 bug: Socratic Interview Mode accepts vague one-sentence answers and gives shallow praise."""
    # Candidate gives a superficial 1-sentence answer without numbers, metrics, or trade-offs
    vague_msg = "We need high availability and low latency."
    turn = interview_engine.process_turn(
        interview_session,
        InterviewTurnRequest(message=vague_msg, current_stage=1),
    )

    # 1. Must NOT advance to stage 2
    assert turn.next_stage_ready is False, "Vague one-sentence answer should not advance to next stage!"
    assert turn.current_stage == 1, f"Expected to remain on stage 1, but got stage {turn.current_stage}"

    # 2. Must NOT receive hire or high score
    assert turn.hiring_signal in ("Needs Work", "No Hire")
    assert turn.feedback_notes is not None
    assert "vague" in turn.feedback_notes.lower() or "quantitative" in turn.feedback_notes.lower()

    # 3. Must provide Socratic architectural pushback rather than shallow praise
    reply_lower = turn.interviewer_reply.lower()
    assert "spot-on" not in reply_lower
    assert "outstanding" not in reply_lower
    assert "qps" in reply_lower or "sla" in reply_lower or "latency" in reply_lower or "concrete" in reply_lower


def test_gibberish_is_strictly_rejected(interview_session):
    """Verify nonsensical or empty responses are rejected with No Hire."""
    turn = interview_engine.process_turn(
        interview_session,
        InterviewTurnRequest(message="asdfghjkl", current_stage=1),
    )

    assert turn.next_stage_ready is False
    assert turn.current_stage == 1
    assert turn.hiring_signal == "No Hire"
    assert "cannot evaluate" in turn.interviewer_reply.lower()


def test_staff_caliber_answer_advances_with_high_score(interview_session):
    """Verify a rigorous response with concrete numbers, SLAs, and parameters passes to next stage."""
    strong_msg = "We need URL shortening with 7 chars, HTTP 301/302 redirects, and 99.99% availability with sub-50ms p99 read latency."
    turn = interview_engine.process_turn(
        interview_session,
        InterviewTurnRequest(message=strong_msg, current_stage=1),
    )

    assert turn.next_stage_ready is True
    assert turn.current_stage == 2
    assert turn.hiring_signal == "Strong Hire"
    assert "Capacity" in turn.stage_name


def test_socratic_probe_followed_by_defense_advances(interview_session):
    """Verify candidate who is initially probed for more depth can defend their architecture and advance."""
    # First advance past stage 1 with a solid answer
    interview_engine.process_turn(
        interview_session,
        InterviewTurnRequest(
            message="We need URL shortening with 7 chars, HTTP 301/302 redirects, and 99.99% availability.",
            current_stage=1,
        ),
    )

    # In stage 2, candidate provides a vague capacity answer
    vague_turn = interview_engine.process_turn(
        interview_session,
        InterviewTurnRequest(
            message="We need a lot of QPS and memory.",
            current_stage=2,
        ),
    )
    assert vague_turn.next_stage_ready is False
    assert vague_turn.current_stage == 2

    # Candidate responds with first-principles derivation
    defended_turn = interview_engine.process_turn(
        interview_session,
        InterviewTurnRequest(
            message="At 50M DAU with 10 actions/user, that is 500M daily actions / 86400s = 5,800 avg QPS and 15,000 peak QPS.",
            current_stage=2,
        ),
    )
    assert defended_turn.next_stage_ready is True
    assert defended_turn.current_stage == 3
    assert defended_turn.hiring_signal in ("Hire", "Strong Hire")


def test_finish_interview_scorecard_penalizes_vague_answers(interview_session):
    """Verify candidate who provided vague answers does NOT receive Strong Hire on scorecard."""
    interview_engine.process_turn(
        interview_session,
        InterviewTurnRequest(
            message="Just make it fast with databases.",
            current_stage=1,
        ),
    )

    scorecard = interview_engine.finish_interview(interview_session)
    assert scorecard.hiring_decision in ("No Hire", "Needs Work", "Leaning Hire")
    assert scorecard.overall_score < 65
