import urllib.request
import json
import os
from config import GROQ_API_KEY, GROQ_MODEL_ID

headers = {
    "Authorization": f"Bearer {GROQ_API_KEY}",
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0"
}

payload = json.dumps({
    "model": GROQ_MODEL_ID or "llama-3.3-70b-versatile",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 10
}).encode("utf-8")
req = urllib.request.Request("https://api.groq.com/openai/v1/chat/completions", data=payload, headers=headers, method="POST")
try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        print("RESP:", resp.read().decode("utf-8"))
except urllib.error.HTTPError as e:
    print("CODE:", e.code)
    print("BODY:", e.read().decode("utf-8"))
