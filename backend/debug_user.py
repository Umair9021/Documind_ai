import sqlite3
from pathlib import Path
import json

db_path = Path("data/documind.db")
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row

rows = conn.execute("SELECT * FROM users").fetchall()
for r in rows:
    print(dict(r))

conn.close()
