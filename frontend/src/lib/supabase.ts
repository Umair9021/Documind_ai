// Supabase Authentication & Multi-Tenant Client

export const SUPABASE_URL = "https://ycajybustcsijaazmwue.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljYWp5YnVzdGNzaWphYXptd3VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5ODkzNzAsImV4cCI6MjEwMzU2NTM3MH0.4SasDdX3WzjxXehYvAJuTiswBC3pO-JFeVtXXoCCE4w";

const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
export const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL
  ? `${(import.meta as any).env.VITE_API_BASE_URL.replace(/\/$/, "")}/api/v1`
  : (isLocal ? "http://127.0.0.1:8000/api/v1" : "/api/v1");

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  is_verified?: boolean;
  created_at?: string;
  usage?: Record<string, any>;
}

export function getAuthToken(): string | null {
  return localStorage.getItem("dm-token");
}

export function getCurrentUser(): AuthUser | null {
  const raw = localStorage.getItem("dm-user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setAuthSession(token: string, user: AuthUser) {
  localStorage.setItem("dm-token", token);
  localStorage.setItem("dm-user", JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem("dm-token");
  localStorage.removeItem("dm-user");
}

const supabaseHeaders = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  "Content-Type": "application/json",
};

/**
 * Sign up a new user and trigger Supabase 8-digit OTP verification email via Resend
 */
export async function signUpUser(email: string, password: string, fullName: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: supabaseHeaders,
    body: JSON.stringify({
      email: email.trim(),
      password,
      data: { full_name: fullName.trim() },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.msg || data.error_description || data.message || "Failed to create account.");
  }
  return {
    status: "success",
    message: "Registration initiated. Verification code sent.",
    email: email.trim(),
    user_id: data.id || data.user?.id,
  };
}

/**
 * Verify Email OTP to unlock private dashboard
 */
export async function verifyEmailOtp(email: string, otp: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
    method: "POST",
    headers: supabaseHeaders,
    body: JSON.stringify({
      type: "signup",
      email: email.trim(),
      token: otp.trim(),
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.msg || data.error_description || data.message || "Invalid verification code.");
  }

  const user: AuthUser = {
    id: data.user?.id || `user_${Date.now()}`,
    email: data.user?.email || email.trim(),
    full_name: data.user?.user_metadata?.full_name || "Scholar",
    is_verified: true,
    created_at: data.user?.created_at || new Date().toISOString(),
  };

  const token = data.access_token || SUPABASE_ANON_KEY;
  setAuthSession(token, user);
  return { access_token: token, user };
}

/**
 * Resend fresh OTP to user's email
 */
export async function resendEmailOtp(email: string) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/resend`, {
    method: "POST",
    headers: supabaseHeaders,
    body: JSON.stringify({
      type: "signup",
      email: email.trim(),
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.msg || data.error_description || data.message || "Failed to resend verification code.");
  }
  return { status: "success", message: "Verification code resent." };
}

/**
 * Log in with Email and Password (Strict Supabase Cloud Authentication)
 */
export async function loginUser(email: string, password: string) {
  // Direct Supabase Cloud Auth
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: supabaseHeaders,
    body: JSON.stringify({ email: email.trim(), password }),
  });

  const data = await res.json();
  if (!res.ok) {
    const msg = data.error_description || data.msg || data.message || "Invalid email or password.";
    const err = new Error(msg);
    if (msg.toLowerCase().includes("not confirmed") || msg.toLowerCase().includes("verify") || msg.toLowerCase().includes("unconfirmed")) {
      (err as any).status = 403;
    } else {
      (err as any).status = 401;
    }
    throw err;
  }

  const user: AuthUser = {
    id: data.user?.id || `user_${Date.now()}`,
    email: data.user?.email || email.trim(),
    full_name: data.user?.user_metadata?.full_name || email.split("@")[0] || "Scholar",
    is_verified: true,
    created_at: data.user?.created_at || new Date().toISOString(),
  };

  const token = data.access_token;
  setAuthSession(token, user);
  return { access_token: token, user };
}

/**
 * Fetch authenticated user details
 */
export async function fetchMe(): Promise<AuthUser | null> {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      if (res.ok) {
        const user = await res.json();
        localStorage.setItem("dm-user", JSON.stringify(user));
        return user;
      }
    }
  } catch {}

  return getCurrentUser();
}
