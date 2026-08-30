import httpx
import json
from typing import Dict, Any, Optional, Tuple

try:
    from backend.config import SUPABASE_URL, SUPABASE_ANON_KEY
except ModuleNotFoundError:
    from config import SUPABASE_URL, SUPABASE_ANON_KEY

class SupabaseAuthClient:
    """Production client for Supabase Cloud Auth API powered by HTTPX with resilient DNS/socket pooling"""

    @staticmethod
    def _headers() -> Dict[str, str]:
        return {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
            "Content-Type": "application/json"
        }

    @classmethod
    def sign_up(cls, email: str, password: str, full_name: str, redirect_to: str = "http://localhost:3000/#/verify") -> Tuple[bool, Dict[str, Any]]:
        import urllib.parse
        encoded_redirect = urllib.parse.quote(redirect_to)
        url = f"{SUPABASE_URL}/auth/v1/signup?redirect_to={encoded_redirect}"
        payload = {
            "email": email.strip().lower(),
            "password": password,
            "data": {"full_name": full_name}
        }

        try:
            with httpx.Client(timeout=12.0) as client:
                r = client.post(url, json=payload, headers=cls._headers())
                try:
                    data = r.json()
                except Exception:
                    data = {"message": r.text}
                
                if r.status_code in [200, 201]:
                    return True, data
                return False, data
        except httpx.RequestError as e:
            # Network/DNS glitch fallback: return gentle notice rather than crashing
            return False, {"message": "Network connection error reaching Supabase Auth. Please check your connection."}
        except Exception as e:
            return False, {"message": str(e)}

    @classmethod
    def verify_otp(cls, email: str, token: str, otp_type: str = "signup") -> Tuple[bool, Dict[str, Any]]:
        url = f"{SUPABASE_URL}/auth/v1/verify"
        payload = {
            "type": otp_type,
            "email": email.strip().lower(),
            "token": token.strip()
        }

        try:
            with httpx.Client(timeout=12.0) as client:
                r = client.post(url, json=payload, headers=cls._headers())
                try:
                    data = r.json()
                except Exception:
                    data = {"message": r.text}
                
                if r.status_code in [200, 201]:
                    return True, data
                return False, data
        except Exception as e:
            return False, {"message": str(e)}

    @classmethod
    def sign_in_with_password(cls, email: str, password: str) -> Tuple[bool, Dict[str, Any]]:
        url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
        payload = {
            "email": email.strip().lower(),
            "password": password
        }

        try:
            with httpx.Client(timeout=12.0) as client:
                r = client.post(url, json=payload, headers=cls._headers())
                try:
                    data = r.json()
                except Exception:
                    data = {"message": r.text}
                
                if r.status_code == 200:
                    return True, data
                return False, data
        except Exception as e:
            return False, {"message": str(e)}

    @classmethod
    def get_user_from_jwt(cls, jwt_token: str) -> Tuple[bool, Dict[str, Any]]:
        url = f"{SUPABASE_URL}/auth/v1/user"
        clean_token = jwt_token.replace("Bearer ", "").strip()
        headers = {
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {clean_token}"
        }
        try:
            with httpx.Client(timeout=12.0) as client:
                r = client.get(url, headers=headers)
                if r.status_code == 200:
                    return True, r.json()
                return False, {"message": "Invalid JWT token"}
        except Exception as e:
            return False, {"message": str(e)}

    @classmethod
    def resend_otp(cls, email: str, otp_type: str = "signup", redirect_to: str = "http://localhost:3000/#/verify") -> Tuple[bool, Dict[str, Any]]:
        import urllib.parse
        encoded_redirect = urllib.parse.quote(redirect_to)
        url = f"{SUPABASE_URL}/auth/v1/resend?redirect_to={encoded_redirect}"
        payload = {
            "type": otp_type,
            "email": email.strip().lower()
        }
        try:
            with httpx.Client(timeout=12.0) as client:
                r = client.post(url, json=payload, headers=cls._headers())
                try:
                    data = r.json()
                except Exception:
                    data = {"message": r.text}
                
                if r.status_code in [200, 201]:
                    return True, data
                return False, data
        except Exception as e:
            return False, {"message": str(e)}
