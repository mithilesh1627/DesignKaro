import json
import logging
from collections.abc import AsyncIterator

from backend.app.schemas.mentor import (
    MentorChatRequest,
    MentorChatResponse,
    MentorHintRequest,
    MentorHintResponse,
)
from backend.app.services.llm.interface import BaseLLMProvider
from backend.app.services.llm.models import ChatMessage
from backend.app.services.llm.service import llm_service

logger = logging.getLogger("designkaro.mentor")


from backend.app.services.llm.parser import (
    create_heuristic_mentor_response,
    extract_json_payload,
    normalize_mentor_response,
    render_mentor_response_to_markdown,
)


class SeniorEngineerMentorService:
    """
    Staff / Principal Distributed Systems Architect Mentor.
    Delivers multi-tier Socratic guidance with first-principles trade-off analysis.
    Works reliably both with real LLMs (Ollama dev / BYOK prod) and with offline deterministic heuristics.
    """

    def generate_heuristic_response(self, request: MentorChatRequest) -> MentorChatResponse:
        """
        Deterministic, offline Socratic heuristics.
        Analyzes canvas graph topology and keyword patterns with zero external API calls.
        """
        user_msg = ""
        for m in reversed(request.messages):
            if m.role == "user":
                user_msg = m.content
                break

        structured = create_heuristic_mentor_response(user_msg, request.graph_data, request.messages)
        markdown_reply = render_mentor_response_to_markdown(structured)

        followups = []
        if structured.next_question:
            followups.append(structured.next_question)

        q_lower = (user_msg or "").lower()
        if "envoy" in q_lower or "gateway" in q_lower:
            followups.extend([
                "How does Envoy compare to Nginx for ingress routing?",
                "What happens if our API Gateway crashes under peak load?",
            ])
        elif "little" in q_lower or "concurrency" in q_lower or "calculate" in q_lower:
            followups.extend([
                "What latency SLA should we target for p99 requests?",
                "How does queuing theory apply to thread pool saturation?",
            ])
        elif "redis" in q_lower or "cache" in q_lower:
            followups.extend([
                "How does Probabilistic Early Expiration (XFetch) prevent cache stampedes?",
                "Should we deploy PgBouncer or Redis to reduce database read pressure?",
            ])
        elif "10 million" in q_lower or "10m" in q_lower or "scale" in q_lower:
            followups.extend([
                "How do we partition our database across multiple shards?",
                "Where should we place our caching layer for 10M users?",
            ])
        elif "spof" in q_lower or "failure" in q_lower:
            followups.extend([
                "How do we configure active-active multi-AZ replication?",
                "What is our blast radius if our primary database fails?",
            ])
        else:
            followups.extend([
                "What read/write ratio are we optimizing for?",
                "What is our strict latency budget for the critical path?",
            ])

        return MentorChatResponse(
            reply=markdown_reply,
            structured_response=structured,
            suggested_followups=followups[:3],
            dimension_focus=structured.title,
            llm_provider="heuristic-engine",
            fallback_used=True,
        )

    def generate_chat_response(self, request: MentorChatRequest) -> MentorChatResponse:
        """Synchronous wrapper for backward compatibility and test execution."""
        return self.generate_heuristic_response(request)

    async def generate_chat_response_async(
        self,
        request: MentorChatRequest,
        provider: BaseLLMProvider | None = None,
    ) -> MentorChatResponse:
        """
        Asynchronously generates a structured Socratic mentoring response.
        If the LLM is offline or fails, seamlessly falls back to the deterministic heuristic engine.
        """
        # Convert messages to ChatMessage objects
        messages = [
            ChatMessage(
                role="assistant" if m.role == "assistant" else "user" if m.role == "user" else "system",
                content=m.content,
            )
            for m in request.messages
        ]

        heuristic = self.generate_heuristic_response(request)
        user_msg = ""
        for m in reversed(request.messages):
            if m.role == "user":
                user_msg = m.content
                break

        try:
            llm_resp = await llm_service.generate_mentor_chat(
                messages=messages,
                graph_data=request.graph_data,
                user_skill_level=request.user_skill_level,
                provider=provider,
                fallback_fn=lambda: heuristic.reply,
            )

            # If fallback was used by LLM service directly
            if llm_resp.fallback_used:
                return heuristic

            parsed_json = extract_json_payload(llm_resp.content)
            structured = normalize_mentor_response(
                data=parsed_json,
                user_query=user_msg,
                graph_data=request.graph_data,
                history=request.messages,
                fallback_fn=lambda: heuristic.structured_response,
            )
            markdown_reply = render_mentor_response_to_markdown(structured)

            followups = heuristic.suggested_followups
            if structured.next_question:
                followups = [structured.next_question] + [f for f in followups if f != structured.next_question]

            return MentorChatResponse(
                reply=markdown_reply,
                structured_response=structured,
                suggested_followups=followups[:3],
                dimension_focus=structured.title,
                llm_provider=llm_resp.provider,
                fallback_used=False,
            )
        except Exception as exc:
            logger.warning("LLM mentor chat failed, using deterministic heuristic fallback: %s", exc)
            return heuristic

    async def stream_chat_response_async(
        self,
        request: MentorChatRequest,
        provider: BaseLLMProvider | None = None,
    ) -> AsyncIterator[str]:
        """
        Streams Socratic mentoring tokens via Server-Sent Events (SSE).
        Accumulates raw tokens, normalizes structured response, and delivers clean presentation.
        """
        messages = [
            ChatMessage(
                role="assistant" if m.role == "assistant" else "user" if m.role == "user" else "system",
                content=m.content,
            )
            for m in request.messages
        ]

        heuristic = self.generate_heuristic_response(request)
        active_provider = provider or llm_service.get_default_provider()
        user_msg = ""
        for m in reversed(request.messages):
            if m.role == "user":
                user_msg = m.content
                break

        try:
            accumulated_chunks = []
            async for chunk in llm_service.stream_mentor_chat(
                messages=messages,
                graph_data=request.graph_data,
                user_skill_level=request.user_skill_level,
                provider=active_provider,
                fallback_fn=lambda: heuristic.reply,
            ):
                if chunk.delta:
                    accumulated_chunks.append(chunk.delta)
                    # Stream raw progress delta
                    payload = {
                        "delta": chunk.delta,
                        "provider": active_provider.provider_name,
                        "finish_reason": None,
                    }
                    yield f"data: {json.dumps(payload)}\n\n"

            raw_full_content = "".join(accumulated_chunks)
            parsed_json = extract_json_payload(raw_full_content)
            structured = normalize_mentor_response(
                data=parsed_json,
                user_query=user_msg,
                graph_data=request.graph_data,
                history=request.messages,
                fallback_fn=lambda: heuristic.structured_response,
            )
            markdown_reply = render_mentor_response_to_markdown(structured)

            # Send final structured completion event
            final_payload = {
                "delta": "",
                "provider": active_provider.provider_name,
                "finish_reason": "stop",
                "structured": structured.model_dump(),
                "rendered_markdown": markdown_reply,
            }
            yield f"data: {json.dumps(final_payload)}\n\n"

        except Exception as exc:
            logger.warning("Stream failed, streaming fallback heuristic: %s", exc)
            fallback_payload = {
                "delta": heuristic.reply,
                "provider": "heuristic-engine",
                "finish_reason": "stop",
                "fallback_used": True,
                "structured": heuristic.structured_response.model_dump() if heuristic.structured_response else None,
                "rendered_markdown": heuristic.reply,
            }
            yield f"data: {json.dumps(fallback_payload)}\n\n"

    def generate_hint(self, request: MentorHintRequest) -> MentorHintResponse:
        level = request.target_level

        hints_db = {
            1: {
                "title": "Level 1: Socratic Nudge",
                "content": "Before adding components, state your primary constraint: Is this system read-heavy or write-heavy? What is the strict latency budget allowed for the primary user flow?",
                "trade_offs": "Optimizing for write throughput (LSM-trees) inherently degrades random read performance compared to B-Tree indexes.",
            },
            2: {
                "title": "Level 2: Quantitative Constraint Analysis",
                "content": "Calculate the concurrency using Little's Law: L = Throughput * Latency. If you have 50,000 QPS with 200ms latency, you must support 10,000 active concurrent in-flight connections simultaneously.",
                "trade_offs": "Maintaining 10,000 open connections requires non-blocking async event loops (epoll/kqueue) or Goroutines rather than one-thread-per-connection thread pools.",
            },
            3: {
                "title": "Level 3: Architectural Trade-off Breakdown",
                "content": "Decouple synchronous read paths from asynchronous ingestion. Put an API Gateway in front, serve reads from a replicated memory cache with 90%+ hit target, and enqueue mutations to a partitioned log broker.",
                "trade_offs": "Synchronous writes give immediate consistency; asynchronous queue ingestion gives instant response but eventual read visibility.",
            },
            4: {
                "title": "Level 4: Concrete Production Blueprint",
                "content": "Complete Blueprint: Clients -> Cloudflare Edge Anycast -> L7 Envoy Gateway -> Stateless Microservices (HPA autoscaling) -> Redis Cluster (LRU eviction) -> ScyllaDB (partition key = user_id) + Kafka Event Stream -> Async Workers.",
                "trade_offs": "Zero single point of failure. Multi-AZ active-active deployment guarantees 99.99% availability.",
            },
        }

        hint_info = hints_db.get(level, hints_db[1])
        return MentorHintResponse(
            level=level,
            title=hint_info["title"],
            content=hint_info["content"],
            trade_off_analysis=hint_info["trade_offs"],
        )


mentor_service = SeniorEngineerMentorService()
