from fastapi import APIRouter, HTTPException, Depends, status
from typing import List

try:
    from backend.models import KnowledgeBaseCreate, KnowledgeBaseResponse, KnowledgeBaseUpdate
    from backend.database import db_create_kb, db_list_kbs, db_get_kb, db_delete_kb, db_update_kb
    from backend.routers.auth import get_current_user_id
    from backend.services.vector_store import VectorStoreManager
    from backend.config import SYSTEM_LIMITS
except ModuleNotFoundError:
    from models import KnowledgeBaseCreate, KnowledgeBaseResponse, KnowledgeBaseUpdate
    from database import db_create_kb, db_list_kbs, db_get_kb, db_delete_kb, db_update_kb
    from routers.auth import get_current_user_id
    from services.vector_store import VectorStoreManager
    from config import SYSTEM_LIMITS

router = APIRouter(prefix="/knowledge-bases", tags=["Knowledge Bases"])
vector_store = VectorStoreManager()

@router.post("/", response_model=KnowledgeBaseResponse)
def create_knowledge_base(kb_in: KnowledgeBaseCreate, current_user_id: str = Depends(get_current_user_id)):
    existing_kbs = db_list_kbs(current_user_id)
    max_kbs = SYSTEM_LIMITS.get("max_knowledge_bases_per_user", 5)
    if len(existing_kbs) >= max_kbs:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Limit reached: You can create a maximum of {max_kbs} Knowledge Bases."
        )
    kb = db_create_kb(current_user_id, kb_in.name, kb_in.description or "")
    return KnowledgeBaseResponse(**kb)

@router.get("/", response_model=List[KnowledgeBaseResponse])
def list_knowledge_bases(current_user_id: str = Depends(get_current_user_id)):
    kbs = db_list_kbs(current_user_id)
    return [KnowledgeBaseResponse(**k) for k in kbs]

@router.get("/{kb_id}", response_model=KnowledgeBaseResponse)
def get_knowledge_base(kb_id: str, current_user_id: str = Depends(get_current_user_id)):
    kb = db_get_kb(kb_id, current_user_id)
    if not kb:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Knowledge Base not found or private access denied."
        )
    return KnowledgeBaseResponse(**kb)

@router.put("/{kb_id}", response_model=KnowledgeBaseResponse)
def update_knowledge_base(kb_id: str, kb_in: KnowledgeBaseUpdate, current_user_id: str = Depends(get_current_user_id)):
    kb = db_get_kb(kb_id, current_user_id)
    if not kb:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Knowledge Base not found or access denied."
        )
    updated_kb = db_update_kb(kb_id, current_user_id, name=kb_in.name, description=kb_in.description)
    return KnowledgeBaseResponse(**updated_kb)

@router.delete("/{kb_id}")
def delete_knowledge_base(kb_id: str, current_user_id: str = Depends(get_current_user_id)):
    kb = db_get_kb(kb_id, current_user_id)
    if not kb:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Knowledge Base not found or access denied."
        )
    db_delete_kb(kb_id, current_user_id)
    vector_store.delete_kb_collection(kb_id)
    return {"message": "Knowledge Base and all associated vector embeddings deleted successfully."}
