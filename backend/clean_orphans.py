import sqlite3
from pathlib import Path

db_path = Path("data/documind.db")
if db_path.exists():
    conn = sqlite3.connect(db_path)
    # Clear test users that were created locally without Supabase verification
    conn.execute("DELETE FROM users WHERE email LIKE '%student_%' OR email LIKE '%unsure%'")
    conn.commit()
    conn.close()
    print("CLEANED NON-SUPABASE ORPHAN USERS")
