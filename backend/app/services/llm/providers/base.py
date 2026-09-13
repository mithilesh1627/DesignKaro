import time
from backend.app.services.llm.interface import BaseLLMProvider
from backend.app.services.llm.models import ChatMessage, LLMRequest


class CommonLLMProvider(BaseLLMProvider):
    """Common functionality for HTTP-based LLM providers."""

    def prepare_messages_list(self, request: LLMRequest) -> list[ChatMessage]:
        """Combines system_prompt, prompt, and messages into an ordered list of ChatMessage."""
        messages: list[ChatMessage] = []

        if request.system_prompt and request.system_prompt.strip():
            messages.append(ChatMessage(role="system", content=request.system_prompt.strip()))

        for m in request.messages:
            messages.append(m)

        if request.prompt and request.prompt.strip():
            # If user prompt is provided separately from messages, append it
            messages.append(ChatMessage(role="user", content=request.prompt.strip()))

        return messages

    @staticmethod
    def estimate_tokens(text: str | None) -> int:
        """Approximates token count based on 4 characters per token average."""
        if not text:
            return 0
        return max(1, len(text) // 4)

    @staticmethod
    def calculate_latency_ms(start_time: float) -> float:
        """Calculates elapsed time in milliseconds."""
        return round((time.perf_counter() - start_time) * 1000, 2)
