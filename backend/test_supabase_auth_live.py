import urllib.request
import urllib.error
import json
import os
from config import SUPABASE_URL, SUPABASE_ANON_KEY

headers = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    "Content-Type": "application/json"
}

# Test signup
print("1. Testing Supabase Signup...")
signup_url = f"{SUPABASE_URL}/auth/v1/signup"
payload = json.dumps({
    "email": "test@example.com",
    "password": "Password123!",
    "data": { "full_name": "Test User" }
}).encode("utf-8")

req = urllib.request.Request(signup_url, data=payload, headers=headers, method="POST")
try:
    with urllib.request.urlopen(req) as r:
        print("SIGNUP SUCCESS:", r.status, json.loads(r.read().decode("utf-8")))
except urllib.error.HTTPError as e:
    print("SIGNUP ERROR:", e.code, e.read().decode("utf-8"))
except Exception as e:
    print("ERROR:", e)
