# ADR-006: Hybrid RAG Pipeline (Qdrant + BM25) for Grounded Architecture Knowledge

## Status
Accepted

## Context
System design involves canonical engineering literature (e.g., Google Spanner, DynamoDB, Kafka paper, Designing Data-Intensive Applications, real-world engineering blogs). The AI assistant must not hallucinate numbers or proprietary details, and must cite concrete design principles.

## Decision
We implement a **Hybrid RAG Pipeline**:
1. **Dense Vector Search**: Qdrant vector database indexing semantic chunks.
2. **Sparse Lexical Search**: BM25 indexing exact technical keywords, acronyms (CAP, ACID, Raft, Paxos, p99, NVMe), and error codes.
3. **Reciprocal Rank Fusion (RRF)**: Merges dense and sparse candidates before passing the top results to the LLM.
4. **Mandatory Citations**: LLM responses must attribute principles to indexed documentation.

## Consequences
### Positive
- Superior retrieval accuracy for exact engineering terminology compared to dense-only embeddings.
- High defensibility during AI interview simulations.
- Offline chunk ingestion independent of client request cycle.
