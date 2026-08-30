import urllib.request
import json
import time

def test_query(kb_id, q):
    p = json.dumps({
        "kb_id": kb_id,
        "query": q,
        "retrieval_strategy": "hybrid_rrf",
        "top_k": 6,
        "similarity_threshold": 0.0
    }).encode("utf-8")

    req = urllib.request.Request("http://127.0.0.1:8000/api/v1/chat/query", data=p, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            d = json.loads(r.read().decode("utf-8"))
            print(f"=== QUERY: '{q}' ===")
            print("STATUS:", r.status)
            c_names = list(set([c.get("source_name") for c in d.get("citations", [])]))
            print("MATCHED CITATIONS SOURCES:", c_names)
            print("\n--- ANSWER ---")
            print(d.get("answer").encode("ascii", "ignore").decode("ascii"))
            print("="*60 + "\n")
    except Exception as e:
        print(f"ERROR ON '{q}':", e)

# Test: "summarize the video Escaped in a paragraph"
test_query("kb_generative_ai_001", "summarize the video Escaped in a paragraph")
