import sqlite3

conn = sqlite3.connect("data/documind.db")
kbs = conn.execute("SELECT id, name FROM knowledge_bases").fetchall()
print("KBS:", kbs)

sources = conn.execute("SELECT id, kb_id, name, source_type FROM sources").fetchall()
print("\nSOURCES:")
for s in sources:
    print(s)
conn.close()
