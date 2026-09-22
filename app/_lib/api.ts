"use client";

import { useMemo, useSyncExternalStore } from "react";
import { logApiCall, logAuth, type ApiCallLog } from "./dev-logger";

// Session = the TokenPair from POST /api/v1/auth/login|refresh plus its
// decoded access-token claims, kept in localStorage. Every call goes to
// same-origin /api/v1/*, which next.config.ts rewrites to the backend, so
// the backend needs no CORS.
// ponytail: localStorage tokens are readable by any XSS on this origin —
// move them to httpOnly cookies behind a route-handler BFF if that matters.

export type Session = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch ms of the access token's expiry
  userId: string;
  tenantId: string;
  roleId: string;
  email: string; // not a JWT claim — remembered from the login form
  mustChangePassword: boolean;
};

type TokenPair = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number; // seconds
  must_change_password: boolean;
};

export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  size: number;
  total_pages: number;
  has_prev: boolean;
  has_next: boolean;
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    // Per-field validation messages from the error envelope's meta.fields,
    // keyed by field name or JSON path (e.g. "ticket_types[1].name").
    public fields?: Record<string, string>,
  ) {
    super(message);
  }
}

const KEY = "gm-session";
// Refresh this long before the access token expires, so a request never
// leaves with a token that dies in flight.
const REFRESH_LEEWAY_MS = 30_000;

function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function getSession(): Session | null {
  const raw = readRaw();
  return raw ? (JSON.parse(raw) as Session) : null;
}

function saveSession(pair: TokenPair, email: string): Session {
  const payload = pair.access_token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  const claims = JSON.parse(atob(payload));
  const session: Session = {
    accessToken: pair.access_token,
    refreshToken: pair.refresh_token,
    expiresAt: Date.now() + pair.expires_in * 1000,
    userId: claims.sub,
    tenantId: claims.tenant_id,
    roleId: claims.role_id,
    email,
    mustChangePassword: pair.must_change_password,
  };
  localStorage.setItem(KEY, JSON.stringify(session));
  return session;
}

async function request<T>(path: string, init: RequestInit, token?: string): Promise<T> {
  const url = `/api/v1${path}`;
  const started = performance.now();
  const log = (result: Pick<ApiCallLog, "status" | "response" | "error">) =>
    logApiCall({
      method: init.method ?? "GET",
      url,
      body: init.body,
      token,
      ms: Math.round(performance.now() - started),
      ...result,
    });

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch (error) {
    log({ error });
    throw error;
  }
  if (res.status === 204) {
    log({ status: 204 });
    return undefined as T;
  }
  const body = await res.json().catch(() => null);
  log({ status: res.status, response: body });
  if (!res.ok) {
    throw new ApiError(
      res.status,
      body?.error?.message ?? body?.message ?? res.statusText,
      body?.error?.meta?.fields,
    );
  }
  return body.data as T;
}

export async function login(email: string, password: string): Promise<Session> {
  const pair = await request<TokenPair>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return saveSession(pair, email);
}

export function logout() {
  logAuth("logout: session cleared, redirecting to /login");
  try {
    localStorage.removeItem(KEY);
  } catch {}
  window.location.replace("/login");
}

// Sliding session: each refresh returns a brand-new pair, refresh token
// included with a fresh TTL, so the session stays alive for as long as the
// user makes a call at least once per refresh TTL. Concurrent callers share
// one in-flight refresh.
let refreshing: Promise<Session> | null = null;
function refresh(session: Session, reason: string): Promise<Session> {
  if (refreshing) logAuth(`refresh already in flight, joining it (${reason})`);
  else logAuth(`refreshing token pair: ${reason}`);
  refreshing ??= request<TokenPair>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token: session.refreshToken }),
  })
    .then((pair) => saveSession(pair, session.email))
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

// Authenticated call to /api/v1{path}: refreshes shortly before expiry, and
// once more on a 401. If the refresh itself is rejected, the session is
// over, so this logs out.
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let session = getSession();
  if (!session) {
    logout();
    throw new ApiError(401, "Not signed in");
  }
  try {
    const msLeft = session.expiresAt - Date.now();
    if (msLeft < REFRESH_LEEWAY_MS) {
      session = await refresh(session, `access token expires in ${Math.round(msLeft / 1000)}s`);
    }
    try {
      return await request<T>(path, init, session.accessToken);
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 401)) throw e;
    }
    session = await refresh(session, `401 on ${init.method ?? "GET"} ${path}, will retry once`);
    return await request<T>(path, init, session.accessToken);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      logAuth(`401 persisted after refresh (${e.message}), session is over`);
      logout();
    }
    throw e;
  }
}

// Reactive read of the stored session: null during SSR/hydration, and it
// updates when another tab logs in or out (the storage event).
function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
}

export function useSession(): Session | null {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  return useMemo(() => (raw ? (JSON.parse(raw) as Session) : null), [raw]);
}
