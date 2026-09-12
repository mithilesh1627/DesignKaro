# ADR-005: Socratic AI Senior Engineer Mentor Architecture

## Status
Accepted

## Context
Generic chatbots immediately output completed solutions, destroying the learning process. The core philosophy of DesignKaro is: "Don't memorize architectures. Learn how to think about architectures."

## Decision
We implement a **Socratic AI Senior Engineer Mentor** utilizing:
1. **4-Tier Progressive Hint Ladder**:
   - Level 1: Conceptual hint
   - Level 2: Architectural direction
   - Level 3: Specific component suggestion
   - Level 4: Detailed trade-off explanation
2. **Deterministic Pre-flight Rule Evaluation**:
   The LLM does not perform naive graph traversal. Instead, the backend rule engine evaluates SPOFs and bottlenecks first and feeds structured metrics into the LLM context.
3. **Pluggable Provider Abstraction**:
   Supports OpenAI, Anthropic Claude, Google Gemini, or local models (Ollama/vLLM) via a unified interface without vendor lock-in.

## Consequences
### Positive
- Encourages deep architectural thinking rather than rote answer-copying.
- Drastically reduced token costs by preventing bloated repetitive completions.
- Defends against hallucinations by grounding responses in deterministic rule outputs.
