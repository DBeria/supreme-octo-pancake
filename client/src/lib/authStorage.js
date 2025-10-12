// src/lib/authStorage.js

const TOKEN_KEYS = ["token", "authToken", "jwt", "userInfo", "user"];

export function saveAuth({ token, user }) {
  if (token) localStorage.setItem("token", token); // primary
  if (user) localStorage.setItem("user", JSON.stringify(user));
}

export function getToken() {
  // Prefer the primary key
  const tok = localStorage.getItem("token");
  if (tok) return tok;

  // Backwards compatibility
  for (const key of TOKEN_KEYS) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    if (/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(raw)) return raw;
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === "string" && /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(parsed)) {
        return parsed;
      }
      if (parsed && typeof parsed === "object") {
        if (typeof parsed.token === "string") return parsed.token;
        if (typeof parsed.accessToken === "string") return parsed.accessToken;
        if (parsed.user && typeof parsed.user.token === "string") return parsed.user.token;
      }
    } catch {}
  }
  return null;
}

export function getUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearAllAuth() {
  for (const key of TOKEN_KEYS) localStorage.removeItem(key);
}
