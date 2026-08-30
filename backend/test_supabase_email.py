import urllib.request
import json
import os
from config import SUPABASE_URL, SUPABASE_ANON_KEY

# Test resend signup OTP / confirmation email
resend_url = f"{SUPABASE_URL}/auth/v1/resend"
payload = json.dumps({
    "type": "signup",
    "email": "test@example.com"
}).encode("utf-8")

headers = {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
    "Content-Type": "application/json"
}

req = urllib.request.Request(resend_url, data=payload, headers=headers, method="POST")
try:
    with urllib.request.urlopen(req) as r:
        print("SUPABASE RESEND STATUS:", r.status)
        print("RESEND RESPONSE:", r.read().decode("utf-8"))
except urllib.error.HTTPError as e:
    print("SUPABASE RESEND ERROR:", e.code, e.read().decode("utf-8"))
except Exception as e:
    print("ERROR:", e)
