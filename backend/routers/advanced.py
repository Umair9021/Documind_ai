import time
from fastapi import APIRouter, HTTPException, status
from typing import List, Dict, Any

try:
    from backend.models import (
        PlaygroundRequest,
        PlaygroundResponse,
        RetrievedChunkItem,
        InspectorTrace,
        InspectorStep,
        EvaluationRequest,
        EvaluationResult,
        Citation
    )
    from backend.database import db_get_kb
    from backend.services.retriever_factory import RetrieverFactory
    from backend.services.rag_service import RAGService
    from backend.services.evaluator import RAGEvaluator
except ModuleNotFoundError:
    from models import (
        PlaygroundRequest,
        PlaygroundResponse,
        RetrievedChunkItem,
        InspectorTrace,
        InspectorStep,
        EvaluationRequest,
        EvaluationResult,
        Citation
    )
    from database import db_get_kb
    from services.retriever_factory import RetrieverFactory
    from services.rag_service import RAGService
    from services.evaluator import RAGEvaluator

router = APIRouter(prefix="/advanced", tags=["Advanced RAG Tools"])
retriever_factory = RetrieverFactory()
rag_service = RAGService()
evaluator = RAGEvaluator()
DEFAULT_USER_ID = "user_demo_001"

@router.post("/playground", response_model=PlaygroundResponse)
def run_playground_test(req: PlaygroundRequest):
    kb = db_get_kb(req.kb_id, DEFAULT_USER_ID)
    if not kb:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Knowledge Base not found."
        )

    t0 = time.time()
    chunks, _ = retriever_factory.retrieve(
        kb_id=req.kb_id,
        query=req.query,
        strategy=req.strategy.value,
        top_k=req.top_k,
        similarity_threshold=req.similarity_threshold,
        filters=req.filters
    )
    elapsed_ms = round((time.time() - t0) * 1000, 2)

    chunk_items = []
    for c in chunks:
        meta = c.get("metadata", {})
        chunk_items.append(RetrievedChunkItem(
            chunk_id=c.get("id", "chk_unknown"),
            source_id=meta.get("source_id", "src_unknown"),
            source_name=meta.get("source_name", "Unknown Source"),
            source_type=meta.get("source_type", "txt"),
            content=c.get("content", ""),
            score=c.get("score", 0.0),
            metadata=meta
        ))

    return PlaygroundResponse(
        query=req.query,
        strategy=req.strategy.value,
        retrieved_chunks=chunk_items,
        total_retrieved=len(chunk_items),
        execution_time_ms=elapsed_ms
    )

@router.post("/inspector", response_model=InspectorTrace)
def inspect_query_trace(req: PlaygroundRequest):
    kb = db_get_kb(req.kb_id, DEFAULT_USER_ID)
    if not kb:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Knowledge Base not found."
        )

    rag_result = rag_service.answer_query(
        kb_id=req.kb_id,
        query=req.query,
        strategy=req.strategy.value,
        top_k=req.top_k,
        similarity_threshold=req.similarity_threshold,
        filters=req.filters
    )

    steps = [InspectorStep(**s) for s in rag_result.get("trace_steps", [])]
    citations = [Citation(**c) for c in rag_result.get("citations", [])]

    return InspectorTrace(
        query=req.query,
        strategy=req.strategy.value,
        steps=steps,
        final_context=rag_result.get("raw_context", ""),
        prompt_sent_to_llm=rag_result.get("prompt_sent", ""),
        llm_response=rag_result.get("answer", ""),
        citations_extracted=citations,
        execution_time_ms=rag_result.get("execution_time_ms", 0.0)
    )

@router.post("/evaluation", response_model=EvaluationResult)
def run_rag_evaluation(req: EvaluationRequest):
    kb = db_get_kb(req.kb_id, DEFAULT_USER_ID)
    if not kb:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Knowledge Base not found."
        )

    strategies_str = [s.value for s in req.strategies_to_compare]
    eval_output = evaluator.evaluate_kb(
        kb_id=req.kb_id,
        test_queries=req.test_queries,
        strategies=strategies_str
    )
    return EvaluationResult(**eval_output)
