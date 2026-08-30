// Supabase Authentication & Multi-Tenant Client

export const SUPABASE_URL = "https://ycajybustcsijaazmwue.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljYWp5YnVzdGNzaWphYXptd3VlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5ODkzNzAsImV4cCI6MjEwMzU2NTM3MH0.4SasDdX3WzjxXehYvAJuTiswBC3pO-JFeVtXXoCCE4w";

export const API_BASE = "http://127.0.0.1:8000/api/v1";

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

/**
 * Sign up a new user and trigger Supabase / Backend 6-digit OTP verification email
 */
export async function signUpUser(email: string, password: string, fullName: string) {
  const res = await fetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, full_name: fullName }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "Failed to create account.");
  }
  return data;
}

/**
 * Verify 6-digit Email OTP to unlock private dashboard
 */
export async function verifyEmailOtp(email: string, otp: string) {
  const res = await fetch(`${API_BASE}/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "Invalid verification code.");
  }

  if (data.access_token && data.user) {
    setAuthSession(data.access_token, data.user);
  }
  return data;
}

/**
 * Resend fresh 6-digit OTP to user's email
 */
export async function resendEmailOtp(email: string) {
  const res = await fetch(`${API_BASE}/auth/resend-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "Failed to resend verification code.");
  }
  return data;
}

/**
 * Log in with Email and Password (verifies account is verified)
 */
export async function loginUser(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok) {
    // If unverified, return error with status code
    const err = new Error(data.detail || "Invalid credentials.");
    (err as any).status = res.status;
    throw err;
  }

  if (data.access_token && data.user) {
    setAuthSession(data.access_token, data.user);
  }
  return data;
}

/**
 * Fetch authenticated user details and live storage quota
 */
export async function fetchMe(): Promise<AuthUser | null> {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      if (res.status === 401) {
        clearAuthSession();
      }
      return null;
    }
    const user = await res.json();
    localStorage.setItem("dm-user", JSON.stringify(user));
    return user;
  } catch {
    return getCurrentUser();
  }
}
