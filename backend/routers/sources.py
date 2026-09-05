import shutil
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, status

try:
    from backend.models import SourceResponse, SourceType, SourceStatus
    from backend.database import (
        db_get_kb,
        db_create_source,
        db_update_source_status,
        db_list_sources,
        db_get_source,
        db_delete_source,
        db_get_user_storage_bytes
    )
    from backend.routers.auth import get_current_user_id
    from backend.services.document_loader import DocumentLoader
    from backend.services.chunker import TextChunker
    from backend.services.vector_store import VectorStoreManager
    from backend.config import UPLOAD_DIR, SYSTEM_LIMITS
except ModuleNotFoundError:
    from models import SourceResponse, SourceType, SourceStatus
    from database import (
        db_get_kb,
        db_create_source,
        db_update_source_status,
        db_list_sources,
        db_get_source,
        db_delete_source,
        db_get_user_storage_bytes
    )
    from routers.auth import get_current_user_id
    from services.document_loader import DocumentLoader
    from services.chunker import TextChunker
    from services.vector_store import VectorStoreManager
    from config import UPLOAD_DIR, SYSTEM_LIMITS

router = APIRouter(prefix="/sources", tags=["Sources"])
vector_store = VectorStoreManager()
chunker = TextChunker()

@router.get("/kb/{kb_id}", response_model=List[SourceResponse])
def list_sources(kb_id: str, current_user_id: str = Depends(get_current_user_id)):
    kb = db_get_kb(kb_id, current_user_id)
    if not kb:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Knowledge Base not found or private access denied."
        )
    sources = db_list_sources(kb_id, current_user_id)
    return [SourceResponse(**s) for s in sources]

@router.post("/upload", response_model=List[SourceResponse])
async def upload_documents(
    kb_id: str = Form(...),
    files: List[UploadFile] = File(...),
    current_user_id: str = Depends(get_current_user_id)
):
    kb = db_get_kb(kb_id, current_user_id)
    if not kb:
        from datetime import datetime
        from database import get_db_connection
        try:
            conn = get_db_connection()
            now = datetime.now().isoformat()
            conn.execute(
                "INSERT OR IGNORE INTO knowledge_bases (id, user_id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                (kb_id, current_user_id, "Knowledge Base", "", now, now)
            )
            conn.commit()
            conn.close()
        except Exception:
            pass

    max_storage_bytes = SYSTEM_LIMITS.get("max_storage_mb_per_user", 50) * 1024 * 1024
    used_storage_bytes = db_get_user_storage_bytes(current_user_id)

    responses = []

    for file in files:
        filename = file.filename
        ext = filename.split(".")[-1].lower() if "." in filename else "txt"
        
        try:
            source_type = SourceType(ext)
        except ValueError:
            source_type = SourceType.TXT

        # User-isolated upload directory
        user_upload_dir = UPLOAD_DIR / current_user_id / kb_id
        user_upload_dir.mkdir(parents=True, exist_ok=True)
        file_path = user_upload_dir / filename

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        file_size = file_path.stat().st_size

        # Enforce strict 50 MB storage quota
        if used_storage_bytes + file_size > max_storage_bytes:
            if file_path.exists():
                file_path.unlink()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Storage quota exceeded. Free tier limit is {SYSTEM_LIMITS.get('max_storage_mb_per_user', 50)} MB per user. Please delete existing files to upload new ones."
            )

        used_storage_bytes += file_size

        source_record = db_create_source(
            kb_id=kb_id,
            user_id=current_user_id,
            name=filename,
            source_type=source_type.value,
            file_path=str(file_path),
            file_size_bytes=file_size
        )
        source_id = source_record["id"]

        try:
            db_update_source_status(source_id, "processing")
            segments = DocumentLoader.load_file(file_path, filename, source_type.value)

            chunks = chunker.chunk_segments(
                segments=segments,
                source_id=source_id,
                kb_id=kb_id,
                source_name=filename,
                source_type=source_type.value
            )

            vector_store.add_chunks(kb_id=kb_id, chunks=chunks)
            db_update_source_status(source_id, "ready", chunk_count=len(chunks))
            updated_source = db_get_source(source_id, current_user_id)
            responses.append(SourceResponse(**updated_source))

        except Exception as e:
            db_update_source_status(source_id, "failed", error_message=str(e))
            failed_source = db_get_source(source_id, current_user_id)
            responses.append(SourceResponse(**failed_source))

    return responses

@router.post("/upload/stream")
async def upload_documents_stream(
    kb_id: str = Form(...),
    files: List[UploadFile] = File(...),
    current_user_id: str = Depends(get_current_user_id)
):
    from fastapi.responses import StreamingResponse
    import json

    async def event_generator():
        kb = db_get_kb(kb_id, current_user_id)
        if not kb:
            from datetime import datetime
            from database import get_db_connection
            try:
                conn = get_db_connection()
                now = datetime.now().isoformat()
                conn.execute(
                    "INSERT OR IGNORE INTO knowledge_bases (id, user_id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                    (kb_id, current_user_id, "Knowledge Base", "", now, now)
                )
                conn.commit()
                conn.close()
            except Exception:
                pass

        max_storage_bytes = SYSTEM_LIMITS.get("max_storage_mb_per_user", 50) * 1024 * 1024
        used_storage_bytes = db_get_user_storage_bytes(current_user_id)

        for file in files:
            filename = file.filename
            ext = filename.split(".")[-1].lower() if "." in filename else "txt"
            
            try:
                source_type = SourceType(ext)
            except ValueError:
                source_type = SourceType.TXT

            user_upload_dir = UPLOAD_DIR / current_user_id / kb_id
            user_upload_dir.mkdir(parents=True, exist_ok=True)
            file_path = user_upload_dir / filename

            yield f"data: {json.dumps({'stage': 'uploading', 'fileName': filename, 'progress': 20, 'message': f'Saving {filename} to isolated storage...'})}\n\n"

            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            file_size = file_path.stat().st_size

            if used_storage_bytes + file_size > max_storage_bytes:
                if file_path.exists():
                    file_path.unlink()
                max_mb = SYSTEM_LIMITS.get("max_storage_mb_per_user", 50)
                err_payload = {
                    "stage": "error",
                    "fileName": filename,
                    "progress": 100,
                    "message": f"Storage quota exceeded (Free tier: {max_mb} MB)."
                }
                yield f"data: {json.dumps(err_payload)}\n\n"
                continue

            used_storage_bytes += file_size

            source_record = db_create_source(
                kb_id=kb_id,
                user_id=current_user_id,
                name=filename,
                source_type=source_type.value,
                file_path=str(file_path),
                file_size_bytes=file_size
            )
            source_id = source_record["id"]

            try:
                db_update_source_status(source_id, "processing")
                yield f"data: {json.dumps({'stage': 'parsing', 'fileName': filename, 'progress': 45, 'message': f'Extracting text & layout structures from {filename}...'})}\n\n"
                segments = DocumentLoader.load_file(file_path, filename, source_type.value)

                yield f"data: {json.dumps({'stage': 'chunking', 'fileName': filename, 'progress': 70, 'message': f'Generating semantic chunks for {filename}...'})}\n\n"
                chunks = chunker.chunk_segments(
                    segments=segments,
                    source_id=source_id,
                    kb_id=kb_id,
                    source_name=filename,
                    source_type=source_type.value
                )

                yield f"data: {json.dumps({'stage': 'indexing', 'fileName': filename, 'progress': 90, 'message': f'Indexing {len(chunks)} vector embeddings in ChromaDB...'})}\n\n"
                vector_store.add_chunks(kb_id=kb_id, chunks=chunks)
                db_update_source_status(source_id, "ready", chunk_count=len(chunks))
                updated_source = db_get_source(source_id, current_user_id)
                yield f"data: {json.dumps({'stage': 'complete', 'fileName': filename, 'progress': 100, 'message': f'{filename} ready ({len(chunks)} chunks indexed)', 'source': updated_source})}\n\n"

            except Exception as e:
                db_update_source_status(source_id, "failed", error_message=str(e))
                yield f"data: {json.dumps({'stage': 'error', 'fileName': filename, 'progress': 100, 'message': f'Error indexing {filename}: {str(e)}'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"}
    )

@router.get("/{source_id}/preview")
def get_source_preview(source_id: str, current_user_id: str = Depends(get_current_user_id)):
    source = db_get_source(source_id, current_user_id)
    if not source:
        raise HTTPException(status_code=404, detail="Source not found or access denied.")
    kb_id = source["kb_id"]
    chunks = vector_store.get_all_kb_chunks(kb_id)
    src_chunks = [c for c in chunks if c.get("metadata", {}).get("source_id") == source_id]
    
    src_chunks = sorted(src_chunks, key=lambda x: x.get("metadata", {}).get("chunk_index", 0))
    preview_text = "\n\n".join([c["content"] for c in src_chunks[:6]]) if src_chunks else "Document processed and indexed into vector database."

    return {
        "source_id": source_id,
        "name": source["name"],
        "chunk_count": len(src_chunks) or source.get("chunk_count", 0),
        "page_count": source.get("page_count"),
        "preview_text": preview_text,
        "chunks": [{"id": c["id"], "content": c["content"], "metadata": c.get("metadata", {})} for c in src_chunks[:10]]
    }

@router.delete("/{source_id}")
def delete_source(source_id: str, current_user_id: str = Depends(get_current_user_id)):
    source = db_get_source(source_id, current_user_id)
    if not source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source not found or access denied."
        )
    kb_id = source["kb_id"]
    db_delete_source(source_id, current_user_id)
    vector_store.delete_source_chunks(kb_id, source_id)
    return {"message": "Source and all corresponding vector chunks removed successfully."}
