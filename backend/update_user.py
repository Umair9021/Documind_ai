import sqlite3
from pathlib import Path

db_path = Path("data/documind.db")
if db_path.exists():
    conn = sqlite3.connect(str(db_path))
    conn.execute("UPDATE users SET full_name = 'Muhammad Umair' WHERE email = 'demo@documind.ai' OR id = 'user_demo_001'")
    conn.commit()
    row = conn.execute("SELECT id, full_name, email FROM users WHERE id = 'user_demo_001'").fetchone()
    print("Updated user:", row)
    conn.close()
