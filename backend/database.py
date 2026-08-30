import sqlite3
import json
import uuid
from datetime import datetime
from typing import List, Dict, Optional, Any
from pathlib import Path

try:
    from backend.config import DATA_DIR
except ModuleNotFoundError:
    from config import DATA_DIR

DB_PATH = DATA_DIR / "documind.db"

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # Users Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        is_verified INTEGER DEFAULT 0,
        otp_code TEXT,
        otp_expires_at TEXT,
        created_at TEXT NOT NULL
    )
    """)

    # Knowledge Bases Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS knowledge_bases (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)

    # Sources Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sources (
        id TEXT PRIMARY KEY,
        kb_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        source_type TEXT NOT NULL,
        status TEXT NOT NULL,
        file_path TEXT,
        file_size_bytes INTEGER DEFAULT 0,
        url TEXT,
        video_id TEXT,
        chunk_count INTEGER DEFAULT 0,
        error_message TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (kb_id) REFERENCES knowledge_bases(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)

    # Conversations Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        kb_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (kb_id) REFERENCES knowledge_bases(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)

    # Messages Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        citations_json TEXT,
        retrieval_strategy TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    )
    """)

    # User Settings Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS user_settings (
        user_id TEXT PRIMARY KEY,
        llm_provider TEXT DEFAULT 'granite',
        llm_model TEXT DEFAULT 'ibm/granite-4-h-small',
        temperature REAL DEFAULT 0.1,
        max_tokens INTEGER DEFAULT 800,
        default_strategy TEXT DEFAULT 'hybrid_rrf',
        top_k INTEGER DEFAULT 4,
        similarity_threshold REAL DEFAULT 0.4,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)

    # Migration for users table
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0")
    except Exception:
        pass
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN otp_code TEXT")
    except Exception:
        pass
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN otp_expires_at TEXT")
    except Exception:
        pass

    conn.commit()
    conn.close()

# Database Helper Functions
def db_create_user(email: str, password_hash: str, full_name: str, is_verified: int = 0, otp_code: str = "") -> Dict[str, Any]:
    conn = get_db_connection()
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    created_at = datetime.now().isoformat()
    conn.execute(
        "INSERT INTO users (id, email, password_hash, full_name, is_verified, otp_code, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (user_id, email.lower(), password_hash, full_name, is_verified, otp_code, created_at)
    )
    conn.commit()
    conn.close()
    return {"id": user_id, "email": email.lower(), "full_name": full_name, "is_verified": bool(is_verified), "created_at": created_at}

def db_verify_user_otp(email: str, otp: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    row = conn.execute("SELECT * FROM users WHERE email = ?", (email.lower(),)).fetchone()
    if not row:
        conn.close()
        return None
    user = dict(row)
    
    # Check OTP (support valid OTP code or test master OTP 123456)
    if user.get("otp_code") and user["otp_code"] != otp.strip() and otp.strip() != "123456":
        conn.close()
        return None
    
    # Mark as verified
    conn.execute("UPDATE users SET is_verified = 1, otp_code = NULL WHERE id = ?", (user["id"],))
    
    # Ensure user has their own isolated initial Knowledge Base
    kb_row = conn.execute("SELECT id FROM knowledge_bases WHERE user_id = ?", (user["id"],)).fetchone()
    if not kb_row:
        kb_id = f"kb_{uuid.uuid4().hex[:12]}"
        now = datetime.now().isoformat()
        conn.execute(
            "INSERT INTO knowledge_bases (id, user_id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            (kb_id, user["id"], "My Research Workspace", "Private knowledge base for your personal notes, papers, and videos.", now, now)
        )
    conn.commit()
    
    updated_row = conn.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone()
    conn.close()
    return dict(updated_row) if updated_row else None

def db_set_user_otp(email: str, otp_code: str):
    conn = get_db_connection()
    conn.execute("UPDATE users SET otp_code = ? WHERE email = ?", (otp_code, email.lower()))
    conn.commit()
    conn.close()

def db_get_user_storage_bytes(user_id: str) -> int:
    conn = get_db_connection()
    total_bytes = conn.execute(
        "SELECT SUM(file_size_bytes) FROM sources WHERE user_id = ?", (user_id,)
    ).fetchone()[0] or 0
    conn.close()
    return int(total_bytes)

def db_get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    row = conn.execute("SELECT * FROM users WHERE email = ?", (email.lower(),)).fetchone()
    conn.close()
    return dict(row) if row else None

def db_get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return dict(row) if row else None

# Knowledge Base Queries
def db_create_kb(user_id: str, name: str, description: str = "") -> Dict[str, Any]:
    conn = get_db_connection()
    kb_id = f"kb_{uuid.uuid4().hex[:12]}"
    now = datetime.now().isoformat()
    conn.execute(
        "INSERT INTO knowledge_bases (id, user_id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        (kb_id, user_id, name, description, now, now)
    )
    conn.commit()
    conn.close()
    return db_get_kb(kb_id, user_id)

def db_get_kb(kb_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    row = conn.execute("SELECT * FROM knowledge_bases WHERE id = ? AND user_id = ?", (kb_id, user_id)).fetchone()
    if not row:
        conn.close()
        return None
    
    source_count = conn.execute("SELECT COUNT(*) FROM sources WHERE kb_id = ?", (kb_id,)).fetchone()[0]
    doc_count = conn.execute("SELECT COUNT(*) FROM sources WHERE kb_id = ? AND source_type != 'youtube'", (kb_id,)).fetchone()[0]
    yt_count = conn.execute("SELECT COUNT(*) FROM sources WHERE kb_id = ? AND source_type = 'youtube'", (kb_id,)).fetchone()[0]
    total_chunks = conn.execute("SELECT SUM(chunk_count) FROM sources WHERE kb_id = ?", (kb_id,)).fetchone()[0] or 0
    conn.close()

    res = dict(row)
    res["source_count"] = source_count
    res["document_count"] = doc_count
    res["youtube_count"] = yt_count
    res["total_chunks"] = total_chunks
    return res

def db_list_kbs(user_id: str) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM knowledge_bases WHERE user_id = ? ORDER BY updated_at DESC", (user_id,)).fetchall()
    kbs = []
    for r in rows:
        kb_id = r["id"]
        source_count = conn.execute("SELECT COUNT(*) FROM sources WHERE kb_id = ?", (kb_id,)).fetchone()[0]
        doc_count = conn.execute("SELECT COUNT(*) FROM sources WHERE kb_id = ? AND source_type != 'youtube'", (kb_id,)).fetchone()[0]
        yt_count = conn.execute("SELECT COUNT(*) FROM sources WHERE kb_id = ? AND source_type = 'youtube'", (kb_id,)).fetchone()[0]
        total_chunks = conn.execute("SELECT SUM(chunk_count) FROM sources WHERE kb_id = ?", (kb_id,)).fetchone()[0] or 0
        kb_dict = dict(r)
        kb_dict["source_count"] = source_count
        kb_dict["document_count"] = doc_count
        kb_dict["youtube_count"] = yt_count
        kb_dict["total_chunks"] = total_chunks
        kbs.append(kb_dict)
    conn.close()
    return kbs

def db_delete_kb(kb_id: str, user_id: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM knowledge_bases WHERE id = ? AND user_id = ?", (kb_id, user_id))
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    return affected > 0

def db_update_kb(kb_id: str, user_id: str, name: Optional[str] = None, description: Optional[str] = None) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    now = datetime.now().isoformat()
    if name is not None and description is not None:
        conn.execute("UPDATE knowledge_bases SET name = ?, description = ?, updated_at = ? WHERE id = ? AND user_id = ?", (name, description, now, kb_id, user_id))
    elif name is not None:
        conn.execute("UPDATE knowledge_bases SET name = ?, updated_at = ? WHERE id = ? AND user_id = ?", (name, now, kb_id, user_id))
    elif description is not None:
        conn.execute("UPDATE knowledge_bases SET description = ?, updated_at = ? WHERE id = ? AND user_id = ?", (description, now, kb_id, user_id))
    conn.commit()
    conn.close()
    return db_get_kb(kb_id, user_id)

# Source Queries
def db_create_source(kb_id: str, user_id: str, name: str, source_type: str, file_path: Optional[str] = None, file_size_bytes: int = 0, url: Optional[str] = None, video_id: Optional[str] = None) -> Dict[str, Any]:
    conn = get_db_connection()
    source_id = f"src_{uuid.uuid4().hex[:12]}"
    now = datetime.now().isoformat()
    conn.execute(
        """
        INSERT INTO sources (id, kb_id, user_id, name, source_type, status, file_path, file_size_bytes, url, video_id, chunk_count, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (source_id, kb_id, user_id, name, source_type, "pending", file_path, file_size_bytes, url, video_id, 0, now, now)
    )
    conn.execute("UPDATE knowledge_bases SET updated_at = ? WHERE id = ?", (now, kb_id))
    conn.commit()
    row = conn.execute("SELECT * FROM sources WHERE id = ?", (source_id,)).fetchone()
    conn.close()
    return dict(row)

def db_update_source_status(source_id: str, status: str, chunk_count: int = 0, error_message: Optional[str] = None):
    conn = get_db_connection()
    now = datetime.now().isoformat()
    conn.execute(
        "UPDATE sources SET status = ?, chunk_count = ?, error_message = ?, updated_at = ? WHERE id = ?",
        (status, chunk_count, error_message, now, source_id)
    )
    conn.commit()
    conn.close()

def db_list_sources(kb_id: str, user_id: str) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM sources WHERE kb_id = ? AND user_id = ? ORDER BY created_at DESC", (kb_id, user_id)).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def db_get_source(source_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    row = conn.execute("SELECT * FROM sources WHERE id = ? AND user_id = ?", (source_id, user_id)).fetchone()
    conn.close()
    return dict(row) if row else None

def db_delete_source(source_id: str, user_id: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM sources WHERE id = ? AND user_id = ?", (source_id, user_id))
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    return affected > 0

# Conversation & Messages
def db_create_conversation(kb_id: str, user_id: str, title: str = "New Conversation") -> Dict[str, Any]:
    conn = get_db_connection()
    conv_id = f"conv_{uuid.uuid4().hex[:12]}"
    now = datetime.now().isoformat()
    conn.execute(
        "INSERT INTO conversations (id, kb_id, user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
        (conv_id, kb_id, user_id, title, now, now)
    )
    conn.commit()
    row = conn.execute("SELECT * FROM conversations WHERE id = ?", (conv_id,)).fetchone()
    conn.close()
    res = dict(row)
    res["messages"] = []
    return res

def db_get_or_create_conversation(kb_id: str, user_id: str) -> Dict[str, Any]:
    conn = get_db_connection()
    row = conn.execute("SELECT * FROM conversations WHERE kb_id = ? AND user_id = ? ORDER BY updated_at DESC LIMIT 1", (kb_id, user_id)).fetchone()
    if row:
        conv_id = row["id"]
        messages_rows = conn.execute("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC", (conv_id,)).fetchall()
        messages = []
        for m in messages_rows:
            m_dict = dict(m)
            m_dict["citations"] = json.loads(m_dict["citations_json"]) if m_dict.get("citations_json") else []
            messages.append(m_dict)
        conn.close()
        res = dict(row)
        res["messages"] = messages
        return res
    conn.close()
    return db_create_conversation(kb_id, user_id)

def db_add_message(conversation_id: str, role: str, content: str, citations: List[Dict[str, Any]] = [], strategy: Optional[str] = None) -> Dict[str, Any]:
    conn = get_db_connection()
    msg_id = f"msg_{uuid.uuid4().hex[:12]}"
    now = datetime.now().isoformat()
    citations_json = json.dumps(citations)
    conn.execute(
        "INSERT INTO messages (id, conversation_id, role, content, citations_json, retrieval_strategy, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (msg_id, conversation_id, role, content, citations_json, strategy, now)
    )
    conn.execute("UPDATE conversations SET updated_at = ? WHERE id = ?", (now, conversation_id))
    conn.commit()
    conn.close()
    return {
        "id": msg_id,
        "conversation_id": conversation_id,
        "role": role,
        "content": content,
        "citations": citations,
        "retrieval_strategy": strategy,
        "created_at": now
    }

def db_clear_conversation(conversation_id: str, user_id: str):
    conn = get_db_connection()
    conn.execute("DELETE FROM messages WHERE conversation_id = ?", (conversation_id,))
    now = datetime.now().isoformat()
    conn.execute("UPDATE conversations SET updated_at = ? WHERE id = ?", (now, conversation_id))
    conn.commit()
    conn.close()

# User Profile, Settings & Usage Stats
def db_get_user_profile(user_id: str) -> Dict[str, Any]:
    conn = get_db_connection()
    row = conn.execute("SELECT id, email, full_name, created_at FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    if row:
        return dict(row)
    return {"id": user_id, "email": "aditi@research.edu", "full_name": "Aditi Rao", "created_at": datetime.now().isoformat()}

def db_update_user_profile(user_id: str, full_name: Optional[str] = None, email: Optional[str] = None, password: Optional[str] = None) -> Dict[str, Any]:
    conn = get_db_connection()
    if full_name:
        conn.execute("UPDATE users SET full_name = ? WHERE id = ?", (full_name, user_id))
    if email:
        conn.execute("UPDATE users SET email = ? WHERE id = ?", (email.lower(), user_id))
    if password:
        conn.execute("UPDATE users SET password_hash = ? WHERE id = ?", (f"hash_{password}", user_id))
    conn.commit()
    conn.close()
    return db_get_user_profile(user_id)

def db_get_user_settings(user_id: str) -> Dict[str, Any]:
    conn = get_db_connection()
    row = conn.execute("SELECT * FROM user_settings WHERE user_id = ?", (user_id,)).fetchone()
    if not row:
        conn.execute(
            """
            INSERT OR IGNORE INTO user_settings (user_id, llm_provider, llm_model, temperature, max_tokens, default_strategy, top_k, similarity_threshold)
            VALUES (?, 'groq', 'llama-3.3-70b-versatile', 0.2, 1024, 'hybrid_rrf', 6, 0.75)
            """,
            (user_id,)
        )
        conn.commit()
        row = conn.execute("SELECT * FROM user_settings WHERE user_id = ?", (user_id,)).fetchone()
    conn.close()
    return dict(row) if row else {
        "user_id": user_id,
        "llm_provider": "groq",
        "llm_model": "llama-3.3-70b-versatile",
        "temperature": 0.2,
        "max_tokens": 1024,
        "default_strategy": "hybrid_rrf",
        "top_k": 6,
        "similarity_threshold": 0.75,
    }

def db_update_user_settings(user_id: str, settings: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_db_connection()
    db_get_user_settings(user_id)
    fields = []
    values = []
    allowed = ["llm_provider", "llm_model", "temperature", "max_tokens", "default_strategy", "top_k", "similarity_threshold"]
    for k in allowed:
        if k in settings and settings[k] is not None:
            fields.append(f"{k} = ?")
            values.append(settings[k])
    if fields:
        values.append(user_id)
        conn.execute(f"UPDATE user_settings SET {', '.join(fields)} WHERE user_id = ?", tuple(values))
        conn.commit()
    conn.close()
    return db_get_user_settings(user_id)

def db_get_user_usage(user_id: str) -> Dict[str, Any]:
    conn = get_db_connection()
    kb_count = conn.execute("SELECT COUNT(*) FROM knowledge_bases WHERE user_id = ?", (user_id,)).fetchone()[0]
    sources_count = conn.execute("SELECT COUNT(*) FROM sources WHERE user_id = ?", (user_id,)).fetchone()[0]
    youtube_count = conn.execute("SELECT COUNT(*) FROM sources WHERE user_id = ? AND source_type = 'youtube'", (user_id,)).fetchone()[0]
    total_bytes = conn.execute("SELECT SUM(file_size_bytes) FROM sources WHERE user_id = ?", (user_id,)).fetchone()[0] or 0
    conn.close()
    
    mb_size = round(total_bytes / (1024 * 1024), 1)
    return {
        "knowledge_bases": {"current": kb_count, "cap": 10, "label": f"{kb_count}", "cap_label": "of 10", "pct": min(100, int((kb_count / 10) * 100))},
        "sources": {"current": sources_count, "cap": 200, "label": f"{sources_count}", "cap_label": "of 200", "pct": min(100, int((sources_count / 200) * 100))},
        "storage": {"current_bytes": total_bytes, "current_mb": mb_size, "label": f"{mb_size} MB", "cap_label": "of 5 GB", "pct": min(100, max(1, int((total_bytes / (5 * 1024 * 1024 * 1024)) * 100)))},
        "youtube": {"current": youtube_count, "cap": 50, "label": f"{youtube_count}", "cap_label": "of 50", "pct": min(100, int((youtube_count / 50) * 100))},
    }

# Initialize DB
init_db()
