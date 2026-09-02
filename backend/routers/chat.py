from fastapi import APIRouter, HTTPException, Depends, status
from typing import List, Optional

try:
    from backend.models import (
        QueryRequest,
        QueryResponse,
        ConversationResponse,
        MessageResponse,
        Citation
    )
    from backend.database import (
        db_get_kb,
        db_get_or_create_conversation,
        db_add_message,
        db_clear_conversation,
        db_list_user_conversations,
        db_delete_conversation,
        db_get_user_profile
    )
    from backend.routers.auth import get_current_user_id
    from backend.services.rag_service import RAGService
except ModuleNotFoundError:
    from models import (
        QueryRequest,
        QueryResponse,
        ConversationResponse,
        MessageResponse,
        Citation
    )
    from database import (
        db_get_kb,
        db_get_or_create_conversation,
        db_add_message,
        db_clear_conversation,
        db_list_user_conversations,
        db_delete_conversation,
        db_get_user_profile
    )
    from routers.auth import get_current_user_id
    from services.rag_service import RAGService

router = APIRouter(prefix="/chat", tags=["Chat & Conversational RAG"])
rag_service = RAGService()

@router.get("/conversations")
def list_conversations(current_user_id: str = Depends(get_current_user_id)):
    """Returns all conversations for the authenticated user across all knowledge bases"""
    return db_list_user_conversations(current_user_id)

@router.delete("/conversations/{conversation_id}")
def delete_user_conversation(conversation_id: str, current_user_id: str = Depends(get_current_user_id)):
    ok = db_delete_conversation(conversation_id, current_user_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Conversation not found or access denied.")
    return {"status": "deleted", "id": conversation_id}

@router.get("/conversations/{kb_id}", response_model=ConversationResponse)
def get_conversation(kb_id: str, current_user_id: str = Depends(get_current_user_id)):
    kb = db_get_kb(kb_id, current_user_id)
    if not kb:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Knowledge Base not found or private access denied."
        )
    conv = db_get_or_create_conversation(kb_id, current_user_id)
    
    msg_responses = []
    for m in conv.get("messages", []):
        msg_responses.append(MessageResponse(
            id=m["id"],
            conversation_id=m["conversation_id"],
            role=m["role"],
            content=m["content"],
            citations=[Citation(**c) for c in m.get("citations", [])],
            retrieval_strategy=m.get("retrieval_strategy"),
            created_at=m["created_at"]
        ))

    return ConversationResponse(
        id=conv["id"],
        kb_id=conv["kb_id"],
        title=conv["title"],
        created_at=conv["created_at"],
        updated_at=conv["updated_at"],
        messages=msg_responses
    )

@router.post("/query", response_model=QueryResponse)
def query_knowledge_base(query_in: QueryRequest, current_user_id: str = Depends(get_current_user_id)):
    kb = db_get_kb(query_in.kb_id, current_user_id)
    if not kb:
        from datetime import datetime
        from database import get_db_connection
        try:
            conn = get_db_connection()
            now = datetime.now().isoformat()
            conn.execute(
                "INSERT OR IGNORE INTO knowledge_bases (id, user_id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                (query_in.kb_id, current_user_id, "Knowledge Base", "", now, now)
            )
            conn.commit()
            conn.close()
        except Exception:
            pass

    conv = db_get_or_create_conversation(query_in.kb_id, current_user_id)
    conv_id = conv["id"]

    db_add_message(
        conversation_id=conv_id,
        role="user",
        content=query_in.query
    )

    user_prof = db_get_user_profile(current_user_id)
    user_name = user_prof.get("full_name", "Scholar") if user_prof else "Scholar"

    rag_result = rag_service.answer_query(
        kb_id=query_in.kb_id,
        query=query_in.query,
        strategy=query_in.retrieval_strategy.value if query_in.retrieval_strategy else "hybrid_rrf",
        top_k=query_in.top_k or 4,
        similarity_threshold=query_in.similarity_threshold or 0.0,
        filters=query_in.filters,
        user_name=user_name
    )

    db_add_message(
        conversation_id=conv_id,
        role="assistant",
        content=rag_result["answer"],
        citations=rag_result["citations"],
        strategy=rag_result["retrieval_strategy"]
    )

    citations_list = [Citation(**c) for c in rag_result["citations"]]

    return QueryResponse(
        answer=rag_result["answer"],
        citations=citations_list,
        retrieval_strategy=rag_result["retrieval_strategy"],
        execution_time_ms=rag_result["execution_time_ms"],
        is_grounded=rag_result["is_grounded"]
    )

@router.delete("/conversations/{conversation_id}/clear")
def clear_chat_history(conversation_id: str, current_user_id: str = Depends(get_current_user_id)):
    db_clear_conversation(conversation_id, current_user_id)
    return {"message": "Chat history cleared successfully."}
