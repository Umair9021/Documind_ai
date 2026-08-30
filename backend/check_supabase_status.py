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

# Test resending to registered email
url = f"{SUPABASE_URL}/auth/v1/resend"
payload = json.dumps({
    "type": "signup",
    "email": "test@example.com"
}).encode("utf-8")

req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
try:
    with urllib.request.urlopen(req) as r:
        print("RESEND HTTP STATUS:", r.status)
        print("RESEND BODY:", r.read().decode("utf-8"))
except urllib.error.HTTPError as e:
    print("HTTP ERROR:", e.code, e.read().decode("utf-8"))
except Exception as e:
    print("ERROR:", e)
