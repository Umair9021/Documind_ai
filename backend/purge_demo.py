import sqlite3
import shutil
from pathlib import Path

try:
    from backend.config import DATA_DIR, UPLOAD_DIR
    from backend.services.vector_store import VectorStoreManager
except ModuleNotFoundError:
    from config import DATA_DIR, UPLOAD_DIR
    from services.vector_store import VectorStoreManager

print("=== PURGING DEMO USER & ASSOCIATED CONTENT ===")

# 1. Purge from SQLite
db_path = DATA_DIR / "documind.db"
if db_path.exists():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Find any demo sources
    demo_sources = cursor.execute("SELECT id FROM sources WHERE user_id = 'user_demo_001' OR kb_id = 'kb_generative_ai_001'").fetchall()
    print(f"Found {len(demo_sources)} demo sources to remove.")

    # Delete records
    cursor.execute("DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id = 'user_demo_001')")
    cursor.execute("DELETE FROM conversations WHERE user_id = 'user_demo_001'")
    cursor.execute("DELETE FROM sources WHERE user_id = 'user_demo_001' OR kb_id = 'kb_generative_ai_001'")
    cursor.execute("DELETE FROM knowledge_bases WHERE user_id = 'user_demo_001' OR id = 'kb_generative_ai_001'")
    cursor.execute("DELETE FROM user_settings WHERE user_id = 'user_demo_001'")
    cursor.execute("DELETE FROM users WHERE email = 'demo@documind.ai' OR id = 'user_demo_001'")

    conn.commit()
    conn.close()
    print("Database purged successfully.")

# 2. Purge ChromaDB collection
try:
    vstore = VectorStoreManager()
    vstore.delete_kb_collection("kb_generative_ai_001")
    print("ChromaDB vector collection 'kb_generative_ai_001' deleted.")
except Exception as e:
    print("ChromaDB deletion note:", e)

# 3. Purge disk files
for target in [UPLOAD_DIR / "kb_generative_ai_001", UPLOAD_DIR / "user_demo_001"]:
    if target.exists():
        shutil.rmtree(target, ignore_errors=True)
        print(f"Deleted upload folder: {target}")

print("=== DEMO CREDENTIALS AND ALL CONTENT COMPLETELY REMOVED ===")
