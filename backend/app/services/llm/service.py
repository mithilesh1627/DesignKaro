import logging
from collections.abc import AsyncIterator, Callable
from typing import Any

from backend.app.schemas.design import GraphData
from backend.app.services.llm.context_builder import (
    build_mentor_context,
    build_system_architect_context,
    retrieve_relevant_rag_snippets,
)
from backend.app.services.llm.exceptions import LLMError, ProviderUnavailableError
from backend.app.services.llm.interface import BaseLLMProvider
from backend.app.services.llm.models import (
    ChatMessage,
    LLMRequest,
    LLMResponse,
    LLMStreamChunk,
    ProviderHealthStatus,
)
from backend.app.services.llm.prompts.interview import (
    INTERVIEWER_SYSTEM_PROMPT,
    format_interview_turn_prompt,
)
from backend.app.services.llm.prompts.mentor import (
    MENTOR_SYSTEM_PROMPT,
    format_mentor_user_prompt,
)
from backend.app.services.llm.prompts.review import (
    REVIEW_SYSTEM_PROMPT,
    format_review_prompt,
)
from backend.app.services.llm.providers.factory import create_provider_instance

logger = logging.getLogger("designkaro.llm.service")


class LLMService:
    """
    Central LLM Orchestration Service for DesignKaro.
    Provides uniform prompt execution, streaming, and seamless fallback
    to deterministic heuristics whenever the LLM is unreachable.
    """

    def __init__(self, default_provider: BaseLLMProvider | None = None):
        self._default_provider = default_provider or create_provider_instance("ollama")

    def get_default_provider(self) -> BaseLLMProvider:
        return self._default_provider

    async def generate(
        self,
        request: LLMRequest,
        provider: BaseLLMProvider | None = None,
        fallback_fn: Callable[[], str] | None = None,
    ) -> LLMResponse:
        """
        Executes a completion request against the specified or default provider.
        If the provider fails or is unreachable, invokes fallback_fn (if provided)
        or raises LLMError.
        """
        active_provider = provider or self._default_provider

        try:
            return await active_provider.generate(request)
        except (LLMError, Exception) as exc:
            logger.warning(
                "LLM generation failed on provider '%s': %s",
                active_provider.provider_name,
                exc,
            )
            if fallback_fn is not None:
                fallback_content = fallback_fn()
                return LLMResponse(
                    content=fallback_content,
                    model="deterministic-fallback",
                    provider="heuristic-engine",
                    fallback_used=True,
                )
            raise

    async def stream(
        self,
        request: LLMRequest,
        provider: BaseLLMProvider | None = None,
        fallback_fn: Callable[[], str] | None = None,
    ) -> AsyncIterator[LLMStreamChunk]:
        """
        Streams tokens from the specified or default provider.
        If the provider fails or is unreachable, yields tokens from fallback_fn if provided.
        """
        active_provider = provider or self._default_provider

        try:
            async for chunk in active_provider.stream(request):
                yield chunk
        except (LLMError, Exception) as exc:
            logger.warning(
                "LLM streaming failed on provider '%s': %s",
                active_provider.provider_name,
                exc,
            )
            if fallback_fn is not None:
                fallback_content = fallback_fn()
                # Yield entire fallback content as a single chunk
                yield LLMStreamChunk(delta=fallback_content, finish_reason="stop")
            else:
                raise

    async def generate_mentor_chat(
        self,
        messages: list[ChatMessage],
        graph_data: GraphData | dict[str, Any] | None = None,
        scale_metadata: dict[str, Any] | None = None,
        user_skill_level: str = "intermediate",
        provider: BaseLLMProvider | None = None,
        fallback_fn: Callable[[], str] | None = None,
    ) -> LLMResponse:
        """
        Orchestrates Socratic Senior Engineer Mentor response with canvas graph context.
        """
        last_user_content = ""
        user_turn_count = 0
        prior_messages: list[ChatMessage] = []
        for m in messages:
            if m.role == "user":
                last_user_content = m.content
                user_turn_count += 1
            prior_messages.append(m)

        rag_snippets = retrieve_relevant_rag_snippets(last_user_content)
        arch_context = build_mentor_context(
            graph_data=graph_data,
            scale_metadata=scale_metadata,
            user_skill_level=user_skill_level,
            rag_snippets=rag_snippets,
        )

        is_initial_turn = user_turn_count <= 1
        formatted_last_prompt = format_mentor_user_prompt(
            user_message=last_user_content,
            architecture_context=arch_context,
            is_initial_turn=is_initial_turn,
            history=prior_messages,
        )

        # Replace last user message with contextual prompt
        request_messages: list[ChatMessage] = []
        if prior_messages:
            for m in prior_messages[:-1]:
                request_messages.append(m)
            request_messages.append(ChatMessage(role="user", content=formatted_last_prompt))
        else:
            request_messages.append(ChatMessage(role="user", content=formatted_last_prompt))

        request = LLMRequest(
            system_prompt=MENTOR_SYSTEM_PROMPT,
            messages=request_messages,
            temperature=0.3,
            max_tokens=800,
        )

        return await self.generate(request, provider=provider, fallback_fn=fallback_fn)

    async def stream_mentor_chat(
        self,
        messages: list[ChatMessage],
        graph_data: GraphData | dict[str, Any] | None = None,
        scale_metadata: dict[str, Any] | None = None,
        user_skill_level: str = "intermediate",
        provider: BaseLLMProvider | None = None,
        fallback_fn: Callable[[], str] | None = None,
    ) -> AsyncIterator[LLMStreamChunk]:
        """
        Streams Socratic Senior Engineer Mentor response with canvas context.
        """
        last_user_content = ""
        user_turn_count = 0
        prior_messages: list[ChatMessage] = []
        for m in messages:
            if m.role == "user":
                last_user_content = m.content
                user_turn_count += 1
            prior_messages.append(m)

        rag_snippets = retrieve_relevant_rag_snippets(last_user_content)
        arch_context = build_mentor_context(
            graph_data=graph_data,
            scale_metadata=scale_metadata,
            user_skill_level=user_skill_level,
            rag_snippets=rag_snippets,
        )

        is_initial_turn = user_turn_count <= 1
        formatted_last_prompt = format_mentor_user_prompt(
            user_message=last_user_content,
            architecture_context=arch_context,
            is_initial_turn=is_initial_turn,
            history=prior_messages,
        )

        request_messages: list[ChatMessage] = []
        if prior_messages:
            for m in prior_messages[:-1]:
                request_messages.append(m)
            request_messages.append(ChatMessage(role="user", content=formatted_last_prompt))
        else:
            request_messages.append(ChatMessage(role="user", content=formatted_last_prompt))

        request = LLMRequest(
            system_prompt=MENTOR_SYSTEM_PROMPT,
            messages=request_messages,
            temperature=0.3,
            max_tokens=800,
            stream=True,
        )

        async for chunk in self.stream(request, provider=provider, fallback_fn=fallback_fn):
            yield chunk

    async def generate_interview_turn(
        self,
        stage: int,
        stage_name: str,
        candidate_message: str,
        scenario_prompt: str,
        turn_history: list[dict] | None = None,
        provider: BaseLLMProvider | None = None,
        fallback_fn: Callable[[], str] | None = None,
    ) -> LLMResponse:
        """
        Generates dynamic conversational interview response for the current stage.
        """
        prompt = format_interview_turn_prompt(
            stage=stage,
            stage_name=stage_name,
            candidate_message=candidate_message,
            scenario_prompt=scenario_prompt,
            turn_history=turn_history,
        )

        request = LLMRequest(
            system_prompt=INTERVIEWER_SYSTEM_PROMPT,
            prompt=prompt,
            temperature=0.3,
            max_tokens=512,
        )

        return await self.generate(request, provider=provider, fallback_fn=fallback_fn)

    async def generate_review_summary(
        self,
        graph_data: GraphData | dict[str, Any] | None,
        scale_metadata: dict[str, Any] | None,
        violations: list[Any],
        rubric_scores: list[Any],
        overall_score: int,
        grade: str,
        provider: BaseLLMProvider | None = None,
        fallback_fn: Callable[[], str] | None = None,
    ) -> LLMResponse:
        """
        Generates production-grade executive summary and recommendations grounded on
        deterministic 9-dimension scores and invariant checks.
        """
        arch_context = build_system_architect_context(
            graph_data=graph_data,
            scale_metadata=scale_metadata,
            violations=violations,
            rubric_scores=rubric_scores,
        )

        prompt = format_review_prompt(
            architecture_context=arch_context,
            overall_score=overall_score,
            grade=grade,
        )

        request = LLMRequest(
            system_prompt=REVIEW_SYSTEM_PROMPT,
            prompt=prompt,
            temperature=0.2,
            max_tokens=1024,
        )

        return await self.generate(request, provider=provider, fallback_fn=fallback_fn)

    async def check_health(self, provider: BaseLLMProvider | None = None) -> ProviderHealthStatus:
        """Checks health of the specified or default provider."""
        active_provider = provider or self._default_provider
        return await active_provider.health_check()


# Global singleton instance
llm_service = LLMService()
