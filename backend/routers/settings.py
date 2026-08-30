from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import Optional, Dict, Any

try:
    from backend.database import (
        db_get_user_profile,
        db_update_user_profile,
        db_get_user_settings,
        db_update_user_settings,
        db_get_user_usage,
        db_get_user_storage_bytes,
        db_list_kbs
    )
    from backend.routers.auth import get_current_user_id
    from backend.config import SYSTEM_LIMITS
except ModuleNotFoundError:
    from database import (
        db_get_user_profile,
        db_update_user_profile,
        db_get_user_settings,
        db_update_user_settings,
        db_get_user_usage,
        db_get_user_storage_bytes,
        db_list_kbs
    )
    from routers.auth import get_current_user_id
    from config import SYSTEM_LIMITS

router = APIRouter(prefix="/settings", tags=["Settings & Profile"])

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None

class SettingsUpdate(BaseModel):
    llm_provider: Optional[str] = None
    llm_model: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    default_strategy: Optional[str] = None
    top_k: Optional[int] = None
    similarity_threshold: Optional[float] = None

@router.get("/profile")
def get_profile(current_user_id: str = Depends(get_current_user_id)):
    return db_get_user_profile(current_user_id)

@router.put("/profile")
def update_profile(data: ProfileUpdate, current_user_id: str = Depends(get_current_user_id)):
    return db_update_user_profile(
        current_user_id,
        full_name=data.full_name,
        email=data.email,
        password=data.password,
    )

@router.get("/")
def get_settings(current_user_id: str = Depends(get_current_user_id)):
    return db_get_user_settings(current_user_id)

@router.put("/")
def update_settings(data: SettingsUpdate, current_user_id: str = Depends(get_current_user_id)):
    return db_update_user_settings(current_user_id, data.model_dump(exclude_unset=True))

@router.get("/usage")
def get_usage(current_user_id: str = Depends(get_current_user_id)):
    kbs = db_list_kbs(current_user_id)
    storage_bytes = db_get_user_storage_bytes(current_user_id)
    storage_mb = round(storage_bytes / (1024 * 1024), 2)
    max_storage_mb = SYSTEM_LIMITS.get("max_storage_mb_per_user", 50)
    
    total_docs = sum(k.get("document_count", 0) for k in kbs)
    total_yt = sum(k.get("youtube_count", 0) for k in kbs)

    return {
        "user_id": current_user_id,
        "knowledge_bases": len(kbs),
        "max_knowledge_bases": SYSTEM_LIMITS.get("max_knowledge_bases_per_user", 5),
        "documents": total_docs,
        "max_documents": SYSTEM_LIMITS.get("max_documents_per_user", 50),
        "youtube_videos": total_yt,
        "max_youtube_videos": SYSTEM_LIMITS.get("max_youtube_videos_per_month", 20),
        "storage_mb": storage_mb,
        "max_storage_mb": max_storage_mb,
        "storage_used_bytes": storage_bytes,
        "storage_percent": round((storage_mb / max_storage_mb) * 100, 1) if max_storage_mb > 0 else 0
    }
