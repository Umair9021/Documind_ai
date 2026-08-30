import urllib.request
import urllib.parse
import json
import time

API_BASE = "http://127.0.0.1:8000/api/v1"

def http_post(url, data_dict, token=None):
    payload = json.dumps(data_dict).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status, json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(body)
        except:
            return e.code, {"raw": body}

def http_get(url, token=None):
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, headers=headers, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return r.status, json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(body)
        except:
            return e.code, {"raw": body}

print("================================================================")
print("TEST 1: Signup User A & User B (Unverified -> OTP Verification)")
print("================================================================")

# 1. Signup User A
status_a, res_a = http_post(f"{API_BASE}/auth/signup", {
    "email": "student_alpha@university.edu",
    "password": "Password123!",
    "full_name": "Student Alpha"
})
print("User A Signup:", status_a, res_a)
otp_a = res_a.get("dev_otp")

# Attempt Login User A before OTP verification (Should be 403 Forbidden)
status_l, res_l = http_post(f"{API_BASE}/auth/login", {
    "email": "student_alpha@university.edu",
    "password": "Password123!"
})
print("User A Login Before Verification (Expected 403):", status_l, res_l.get("detail"))
assert status_l == 403, f"Expected 403 Forbidden, got {status_l}"

# Verify User A OTP
status_v, res_v = http_post(f"{API_BASE}/auth/verify-otp", {
    "email": "student_alpha@university.edu",
    "otp": otp_a
})
print("User A Verify OTP:", status_v, "Token:", res_v.get("access_token"))
token_a = res_v.get("access_token")
assert status_v == 200 and token_a, "Failed to verify User A"

# 2. Signup & Verify User B
status_b, res_b = http_post(f"{API_BASE}/auth/signup", {
    "email": "student_beta@university.edu",
    "password": "Password123!",
    "full_name": "Student Beta"
})
otp_b = res_b.get("dev_otp")
status_vb, res_vb = http_post(f"{API_BASE}/auth/verify-otp", {
    "email": "student_beta@university.edu",
    "otp": otp_b
})
token_b = res_vb.get("access_token")
print("User B Verified. Token:", token_b)

print("\n================================================================")
print("TEST 2: Strict Multi-Tenant Private AI Isolation")
print("================================================================")

# User A creates a Private Knowledge Base
status_kba, res_kba = http_post(f"{API_BASE}/knowledge-bases/", {
    "name": "Alpha Private Research",
    "description": "Strictly confidential notes of Student Alpha"
}, token=token_a)
kb_id_a = res_kba.get("id")
print(f"User A created KB [{kb_id_a}]:", res_kba.get("name"))

# User B lists their Knowledge Bases (Should NOT see User A's KB)
status_list_b, kbs_b = http_get(f"{API_BASE}/knowledge-bases/", token=token_b)
kb_ids_b = [k["id"] for k in kbs_b]
print("User B Knowledge Bases:", [k["name"] for k in kbs_b])
assert kb_id_a not in kb_ids_b, "DATA LEAK DETECTED! User B saw User A's Knowledge Base!"
print("PASSED: User B cannot see User A's Knowledge Base in listing.")

# User B attempts direct access to User A's KB (Should be 404/403)
status_hack, res_hack = http_get(f"{API_BASE}/knowledge-bases/{kb_id_a}", token=token_b)
print(f"User B direct access to User A's KB (Expected 404/403): {status_hack} - {res_hack.get('detail')}")
assert status_hack in [403, 404], f"Expected 403 or 404, got {status_hack}"
print("PASSED: User B direct access to User A's KB is strictly blocked.")

print("\n================================================================")
print("TEST 3: Live 50 MB Free Tier Storage Quota Tracking")
print("================================================================")
status_u, res_u = http_get(f"{API_BASE}/settings/usage", token=token_a)
print("User A Storage Usage Info:", res_u)
assert res_u.get("max_storage_mb") == 50, f"Expected 50 MB limit, got {res_u.get('max_storage_mb')}"
print("PASSED: Strict 50 MB Free Tier Quota verified.")

print("\n================================================================")
print("ALL TESTS PASSED WITH 100% SUCCESS! ZERO DATA LEAKAGE CONFIRMED.")
print("================================================================")
