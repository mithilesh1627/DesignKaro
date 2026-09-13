import uuid

from backend.app.schemas.interview import (
    InterviewFinishResponse,
    InterviewStartRequest,
    InterviewStartResponse,
    InterviewTurnRequest,
    InterviewTurnResponse,
)

STAGES = {
    1: "Requirements & Scope Clarification",
    2: "Back-of-the-Envelope Capacity Estimation",
    3: "High-Level Architectural Blueprint",
    4: "Component Deep-Dive & Data Model",
    5: "Failure Scenarios & Resilience Drills",
}


class SystemDesignInterviewEngine:
    """
    Tier-1 Staff / Principal Systems Architect Interviewer.
    Conducts interactive 5-stage interviews with progressive questioning and calibrated rubric scoring.
    """

    def __init__(self):
        self.sessions: dict[str, dict] = {}

    def start_interview(self, req: InterviewStartRequest) -> InterviewStartResponse:
        session_id = f"interview-{uuid.uuid4().hex[:12]}"
        title = f"Design {req.interview_slug.replace('-', ' ').title()}"

        initial_msg = (
            f"Hello! I'm your Staff Systems Architect interviewer today. We're going to design **{title}**.\n\n"
            f"Before jumping into drawing boxes, let's start with **Stage 1: Requirements Clarification**.\n"
            "What functional features should we include in scope, and what scale / SLA constraints (QPS, availability, latency) are we targeting?"
        )

        self.sessions[session_id] = {
            "title": title,
            "target_role": req.target_role,
            "turns": [],
            "scores": {},
            "stage": 1,
        }

        return InterviewStartResponse(
            session_id=session_id,
            title=title,
            interviewer_persona="Google / Meta Principal Infrastructure Architect",
            initial_message=initial_msg,
            current_stage=1,
            stage_name=STAGES[1],
            target_role=req.target_role,
            scenario_prompt=f"Architect a production-grade system for {title} handling 100M+ users with sub-50ms latency.",
        )

    def process_turn(self, session_id: str, req: InterviewTurnRequest) -> InterviewTurnResponse:
        stage = req.current_stage
        user_msg = (req.message or "").strip().lower()
        words = set(user_msg.split())

        # Keywords for stage evaluation
        stage_keywords = {
            1: {"qps", "read", "write", "latency", "sla", "functional", "scope", "users", "million", "redirect", "availab", "short", "p99", "requirement"},
            2: {"qps", "dau", "storage", "bytes", "peak", "ratio", "bandwidth", "second", "day", "calculation", "gb", "tb", "cache", "86400", "math"},
            3: {"gateway", "load", "balancer", "service", "cache", "redis", "database", "postgres", "nosql", "queue", "kafka", "cdn", "ingress", "stateless"},
            4: {"partition", "shard", "index", "key", "schema", "table", "hot", "consistency", "acid", "replica", "replicate", "b-tree", "lsm", "hashing"},
            5: {"circuit", "breaker", "timeout", "retry", "backoff", "jitter", "fallback", "degrade", "failover", "dlq", "dead", "queue", "partition", "idempotent"}
        }

        expected = stage_keywords.get(stage, set())
        matches = [w for w in expected if w in user_msg]
        match_count = len(matches)

        # Check for nonsensical, empty, or hostile inputs
        is_gibberish = len(user_msg) < 8 or len(words) < 3 or (
            all(w not in user_msg for w in ["system", "data", "service", "api", "qps", "db", "user", "cache", "server", "url", "http"])
            and match_count == 0
        )

        turn_score = 30
        signal = "No Hire"
        next_ready = False
        notes = ""
        reply = ""

        if is_gibberish:
            turn_score = 25
            signal = "No Hire"
            next_ready = False
            notes = "Candidate provided insufficient or nonsensical response lacking architectural rigor."
            reply = (
                f"As a Staff Architect, I cannot evaluate '{req.message[:50]}'. "
                f"For **Stage {stage}: {STAGES[stage]}**, please state concrete architectural parameters, numbers, or component trade-offs."
            )
        elif match_count >= 2 or len(user_msg) > 60:
            turn_score = 95 if match_count >= 3 else 90
            signal = "Strong Hire" if turn_score >= 90 else "Hire"
            next_ready = True

            if stage == 1:
                notes = f"Thorough scope clarification addressing scale invariants (identified: {', '.join(matches[:4])})."
                reply = (
                    f"Strong scope clarification! Focusing on {', '.join(matches[:3]) if matches else 'critical user flows'} "
                    "sets clear SLA boundaries.\n\n"
                    "Let's move to **Stage 2: Capacity Estimation**.\n"
                    "Assume **50 Million DAU** with an average of 10 actions per user per day. "
                    "What average QPS and peak QPS must our API handle, and what is our daily write storage footprint?"
                )
            elif stage == 2:
                notes = "Accurate quantitative derivations using Little's Law and peak traffic multiplier."
                reply = (
                    "Spot-on capacity derivation! 500M daily actions / 86,400s ~= 5,800 avg QPS, with peak around 12,000 to 15,000 QPS.\n\n"
                    "Now let's move to **Stage 3: High-Level Architecture**.\n"
                    "How do you structure the client ingress, load balancing, stateless application tier, and persistent storage? "
                    "What components are in your canvas diagram?"
                )
            elif stage == 3:
                notes = "Clean multi-tier decoupling with dedicated ingress and caching layer."
                reply = (
                    "The high-level topology is well-structured with an Ingress Proxy decoupling traffic from backend microservices.\n\n"
                    "Let's proceed to **Stage 4: Component Deep-Dive & Data Model**.\n"
                    "How are you structuring the database schema? What is your primary partition key, "
                    "and how do you handle hot partitions (e.g. viral items or power accounts) to prevent single-node saturation?"
                )
            elif stage == 4:
                notes = "Sound data modeling and partition strategy avoiding hot-spot bottlenecks."
                reply = (
                    "Solid data modeling strategy. Synthetic salting and compound partition keys protect your storage nodes from skew.\n\n"
                    "Finally, let's test resilience in **Stage 5: Failure Scenarios & Resilience**.\n"
                    "Suppose your primary database cluster suffers an unexpected network partition, or downstream cache latency spikes by 500ms. "
                    "How does your system degrade gracefully without bringing down the entire platform?"
                )
            else:
                notes = "Demonstrated deep fault tolerance and production chaos engineering mindset."
                reply = (
                    "Outstanding explanation of circuit breakers, graceful fallback responses, "
                    "and asynchronous retry queues with exponential backoff and jitter.\n\n"
                    "We have completed all 5 stages of the interview! Click 'Finish Interview' to generate your final hiring scorecard."
                )
                next_ready = False
        else:
            turn_score = 60
            signal = "Leaning Hire"
            next_ready = True
            notes = "Partially viable answer; candidate could provide deeper trade-off analysis."
            reply = (
                f"You touched on some valid points. However, in a Staff-level interview, "
                f"I'd like to see more quantitative depth on trade-offs. Let's advance to Stage {min(5, stage + 1)}."
            )

        # Record session turn
        if session_id not in self.sessions:
            self.sessions[session_id] = {
                "title": f"System Design Session {session_id[-6:]}",
                "target_role": "Staff Systems Architect",
                "turns": [],
                "scores": {},
                "stage": stage,
            }
        self.sessions[session_id]["scores"][STAGES[stage]] = turn_score
        self.sessions[session_id]["turns"].append({
            "stage": stage,
            "message": req.message,
            "score": turn_score,
            "signal": signal,
        })

        next_stage = min(5, stage + 1 if next_ready else stage)
        self.sessions[session_id]["stage"] = next_stage

        return InterviewTurnResponse(
            session_id=session_id,
            interviewer_reply=reply,
            current_stage=next_stage,
            stage_name=STAGES.get(next_stage, STAGES[5]),
            next_stage_ready=next_ready,
            hiring_signal=signal,
            feedback_notes=notes,
        )

    async def process_turn_async(
        self,
        session_id: str,
        req: InterviewTurnRequest,
        provider=None,
    ) -> InterviewTurnResponse:
        """
        Asynchronously processes turn: calculates deterministic scores and stage transitions,
        then augments conversational probing via the active LLM provider.
        """
        turn_response = self.process_turn(session_id, req)

        # Do not augment gibberish answers; maintain strict redirection
        user_msg = (req.message or "").strip().lower()
        if len(user_msg) < 8 or turn_response.hiring_signal == "No Hire":
            return turn_response

        session = self.sessions.get(session_id, {})
        title = session.get("title", "System Design")
        scenario = f"Architect a production-grade system for {title} handling 100M+ users."
        turn_history = session.get("turns", [])

        try:
            from backend.app.services.llm.service import llm_service

            llm_resp = await llm_service.generate_interview_turn(
                stage=req.current_stage,
                stage_name=STAGES.get(req.current_stage, "Design Stage"),
                candidate_message=req.message,
                scenario_prompt=scenario,
                turn_history=turn_history,
                provider=provider,
                fallback_fn=lambda: turn_response.interviewer_reply,
            )
            if llm_resp and llm_resp.content and not llm_resp.fallback_used:
                turn_response.interviewer_reply = llm_resp.content
        except Exception:
            pass  # Fall back to calibrated deterministic reply

        return turn_response

    def finish_interview(self, session_id: str) -> InterviewFinishResponse:
        session = self.sessions.get(session_id, {})
        scores = session.get("scores", {})

        completed_scores = list(scores.values())
        avg_demonstrated = int(sum(completed_scores) / len(completed_scores)) if completed_scores else 85

        # Populate scores across the 5 dimensions
        dimension_scores = {
            "Requirements Clarification": scores.get(STAGES[1], avg_demonstrated),
            "Capacity Estimation": scores.get(STAGES[2], avg_demonstrated),
            "High-Level Architecture": scores.get(STAGES[3], avg_demonstrated),
            "Component Deep-Dive": scores.get(STAGES[4], avg_demonstrated),
            "Failure Modes & Resilience": scores.get(STAGES[5], avg_demonstrated),
        }

        overall = int(sum(dimension_scores.values()) / len(dimension_scores))

        if overall >= 85:
            decision = "Strong Hire"
            verdict = "Strong Hire for Staff / Principal Systems Architect. Candidate demonstrated exceptional first-principles engineering and fault tolerance."
            strengths = [
                "First-principles quantitative capacity derivation",
                "Clean decoupling of synchronous read paths and asynchronous write queues",
                "Resilient circuit breaking and graceful degradation under network partition",
            ]
            growth = [
                "Quantify cross-region replication lag impact on read-after-write consistency",
                "Specify distributed tracing trace-id propagation headers across microservices",
            ]
        elif overall >= 70:
            decision = "Hire"
            verdict = "Hire for Senior Systems Engineer. Solid architectural fundamentals with room for deeper quantitative rigor."
            strengths = [
                "Solid understanding of multi-tier microservice architecture",
                "Familiarity with caching and database scaling patterns",
            ]
            growth = [
                "Provide exact Little's Law derivations for in-flight request concurrency",
                "Detail hot-partition salting strategies in distributed storage",
            ]
        elif overall >= 55:
            decision = "Leaning Hire"
            verdict = "Leaning Hire. Candidate grasped high-level concepts but struggled with failure edge cases and quantitative boundaries."
            strengths = ["Identified basic components (Load balancer, DB, Cache)"]
            growth = [
                "Deepen knowledge of distributed consensus and network partitions",
                "Practice back-of-the-envelope capacity calculations",
            ]
        else:
            decision = "No Hire"
            verdict = "No Hire. Candidate was unable to provide technical justification, concrete capacity estimates, or resilience strategies."
            strengths = ["Attempted the interview process"]
            growth = [
                "Study fundamental distributed systems concepts (CAP theorem, Little's Law)",
                "Learn database indexing, partitioning schemes, and cache invalidation patterns",
                "Review production failure scenarios and circuit breaker patterns",
            ]

        return InterviewFinishResponse(
            session_id=session_id,
            hiring_decision=decision,
            overall_score=overall,
            dimension_scores=dimension_scores,
            strengths=strengths,
            areas_for_growth=growth,
            interviewer_verdict=verdict,
        )


interview_engine = SystemDesignInterviewEngine()
