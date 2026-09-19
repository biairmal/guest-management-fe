import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

// Same-origin paths only: next.config.ts rewrites /api/v1/* to the backend,
// which sends no CORS headers, so the browser never calls it directly.

const STORAGE_KEY = "gm-session";

// Tokens + the claims the UI needs (sub/tenant_id/role_id from the access
// JWT). email comes from the login form — the JWT doesn't carry it and there
// is no "current user" endpoint.
export type Session = {
  accessToken: string;
  refreshToken: string;
  email: string;
  userId: string;
  tenantId: string;
  roleId: string;
  mustChangePassword: boolean;
};

type TokenPair = {
  access_token: string;
  refresh_token: string;
  must_change_password: boolean;
};

export type User = {
  id: string;
  tenant_id: string;
  email: string;
  role_id: string;
  is_tenant_master: boolean;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
};

export type Page<T> = {
  items: T[];
  page: number;
  size: number;
  total: number;
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function getSession(): Session | null {
  return parseSession(localStorage.getItem(STORAGE_KEY));
}

function parseSession(raw: string | null): Session | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

function saveSession(pair: TokenPair, email: string): Session {
  const payload = pair.access_token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  const claims = JSON.parse(atob(payload));
  const session: Session = {
    accessToken: pair.access_token,
    refreshToken: pair.refresh_token,
    email,
    userId: claims.sub,
    tenantId: claims.tenant_id,
    roleId: claims.role_id,
    mustChangePassword: pair.must_change_password,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  return session;
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

// Clears the must-change flag after POST /users/me/password succeeds, so the
// app shell stops treating this session as a forced-change one.
export function markPasswordChanged() {
  const session = getSession();
  if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...session, mustChangePassword: false }));
}

function send(path: string, init: RequestInit, token?: string) {
  return fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
}

// Unwraps the backend envelope: `data` on success, `error.message` as an
// ApiError otherwise. DELETE's 204 has no body.
async function unwrap<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, body?.error?.message ?? body?.message ?? `Request failed (${res.status})`);
  }
  return body?.data as T;
}

export async function login(email: string, password: string): Promise<Session> {
  const res = await send("/api/v1/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  return saveSession(await unwrap<TokenPair>(res), email);
}

async function refresh(session: Session): Promise<Session | null> {
  try {
    const res = await send("/api/v1/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: session.refreshToken }),
    });
    return saveSession(await unwrap<TokenPair>(res), session.email);
  } catch {
    return null;
  }
}

// Authenticated request. On a 401 it refreshes the token pair once and
// retries; if the refresh fails the session is cleared and the browser sent
// to /login.
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = getSession();
  let res = await send(path, init, session?.accessToken);
  if (res.status === 401 && session) {
    const renewed = await refresh(session);
    if (!renewed) {
      clearSession();
      window.location.assign("/login");
      throw new ApiError(401, "Your session has expired. Please log in again.");
    }
    res = await send(path, init, renewed.accessToken);
  }
  return unwrap<T>(res);
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

// undefined until hydrated on the client (server has no localStorage), then
// the stored session or null.
export function useSession(): Session | null | undefined {
  const raw = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(STORAGE_KEY),
    () => undefined,
  );
  return useMemo(() => (raw === undefined ? undefined : parseSession(raw)), [raw]);
}

// GET `path` on mount / when `path` changes / on reload(); a null path waits.
// `loading` is derived (settled key !== current key) rather than set inside
// the effect.
export function useApi<T>(path: string | null) {
  const [version, setVersion] = useState(0);
  const key = `${version}:${path}`;
  const [result, setResult] = useState<{ key: string; data?: T; error?: ApiError }>({ key: "" });

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    api<T>(path).then(
      (data) => !cancelled && setResult({ key, data }),
      (err) => !cancelled && setResult({ key, error: err instanceof ApiError ? err : new ApiError(0, String(err)) }),
    );
    return () => {
      cancelled = true;
    };
  }, [key, path]);

  const settled = result.key === key;
  return {
    data: settled ? result.data : undefined,
    error: settled ? result.error : undefined,
    loading: !settled,
    reload: () => setVersion((v) => v + 1),
  };
}
