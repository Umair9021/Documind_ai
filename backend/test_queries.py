import urllib.request
import json
import time

time.sleep(2)

def query(q):
    p = json.dumps({
        "kb_id": "kb_generative_ai_001",
        "query": q,
        "retrieval_strategy": "hybrid_rrf",
        "top_k": 6,
        "similarity_threshold": 0.0
    }).encode("utf-8")
    req = urllib.request.Request("http://127.0.0.1:8000/api/v1/chat/query", data=p, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            d = json.loads(r.read().decode("utf-8"))
            ans = d.get("answer", "")
            safe_ans = ans.encode("ascii", "ignore").decode("ascii")
            print(f"=== QUERY: '{q}' ===")
            print("STATUS:", r.status)
            print("CITATIONS COUNT:", len(d.get("citations", [])))
            print("ANSWER:", safe_ans[:200])
            print()
    except Exception as e:
        print(f"ERROR ON '{q}':", e)

query("i am back now")
query("I'm back, let's continue")
query("just came back, where were we?")
query("oka great bye")
query("what is HNSW?")
