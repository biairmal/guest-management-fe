// Development-only browser-console logging of every backend call made
// through api.ts. NODE_ENV is inlined at build time, so in a production build
// both functions compile down to an early return. Use the console's filter
// box with "[api]" or "[auth]" to isolate these entries.

const ENABLED = process.env.NODE_ENV === "development";

// Where next.config.ts's rewrite forwards /api/v1/* — same default.
const BACKEND = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

const SECRET_KEYS = new Set(["password", "access_token", "refresh_token"]);

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, SECRET_KEYS.has(k) ? "***" : redact(v)]),
    );
  }
  return value;
}

function parseBody(body: BodyInit | null | undefined): unknown {
  if (typeof body !== "string") return body;
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}

export type ApiCallLog = {
  method: string;
  url: string; // same-origin path + query, e.g. /api/v1/users?page=1
  body?: BodyInit | null;
  token?: string;
  ms: number;
  status?: number; // absent when fetch itself threw
  response?: unknown;
  error?: unknown;
};

export function logApiCall(c: ApiCallLog) {
  if (!ENABLED) return;
  const { pathname, search, searchParams } = new URL(c.url, window.location.origin);
  const ok = c.status !== undefined && c.status < 400;
  console.groupCollapsed(
    `%c[api] ${c.method} ${pathname}${decodeURIComponent(search)} → ${c.status ?? "network error"} (${c.ms}ms)`,
    `color: ${ok ? "#16a34a" : "#dc2626"}`,
  );
  console.log("proxied to:", `${BACKEND}${pathname}${search}`);
  // Rows rather than an object so repeated params (sort=…&sort=…) all show.
  const params = [...searchParams].map(([param, value]) => ({ param, value }));
  if (params.length) console.table(params);
  console.log("auth:", c.token ? `Bearer …${c.token.slice(-8)}` : "none");
  if (c.body != null) console.log("request body:", redact(parseBody(c.body)));
  if (c.response !== undefined) console.log("response:", redact(c.response));
  if (c.error !== undefined) console.error(c.error);
  console.groupEnd();
}

// Session lifecycle events: refreshes, 401 retries, logouts.
export function logAuth(message: string) {
  if (!ENABLED) return;
  console.info(`%c[auth] ${message}`, "color: #7c3aed");
}
