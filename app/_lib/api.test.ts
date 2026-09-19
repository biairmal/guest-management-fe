import { beforeEach, expect, test } from "bun:test";
import { api, ApiError, getSession, login } from "./api";

// Unsigned JWT with the claims the backend puts in its access token.
function jwt(claims: object) {
  return `h.${btoa(JSON.stringify(claims))}.s`;
}

function tokenPair(sub: string, mustChange = false) {
  return {
    access_token: jwt({ sub, tenant_id: "t1", role_id: "r1", type: "access" }),
    refresh_token: `refresh-${sub}`,
    token_type: "Bearer",
    expires_in: 900,
    must_change_password: mustChange,
  };
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status });
}

const ok = (data: unknown) => json(200, { code: "OK", data });
const unauthorized = () => json(401, { code: "ERROR", error: { code: "UNAUTHORIZED", message: "invalid token" } });

// Shared mock state — ALL of it is rebuilt in beforeEach so no test sees
// calls, storage, or redirects left over from another.
let calls: string[];
let redirects: string[];
let respond: (url: string, init: RequestInit) => Response;

beforeEach(() => {
  calls = [];
  redirects = [];
  respond = () => {
    throw new Error("unexpected fetch");
  };

  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: () => null,
    get length() {
      return store.size;
    },
  } as Storage;

  globalThis.window = { location: { assign: (url: string) => redirects.push(url) } } as unknown as Window &
    typeof globalThis;

  globalThis.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input);
    calls.push(url);
    return respond(url, init);
  }) as typeof fetch;
});

test("login stores the decoded session", async () => {
  respond = () => ok(tokenPair("u1", true));

  const session = await login("jane@acme.com", "secret");

  expect(calls).toEqual(["/api/v1/auth/login"]);
  expect(session).toEqual({
    accessToken: tokenPair("u1").access_token,
    refreshToken: "refresh-u1",
    email: "jane@acme.com",
    userId: "u1",
    tenantId: "t1",
    roleId: "r1",
    mustChangePassword: true,
  });
  expect(getSession()).toEqual(session);
});

test("a 401 refreshes once and retries the original request", async () => {
  respond = () => ok(tokenPair("u1"));
  await login("jane@acme.com", "secret");
  calls = []; // only observe what api() does

  const auth: (string | null)[] = [];
  respond = (url, init) => {
    if (url === "/api/v1/auth/refresh") return ok(tokenPair("u1-renewed"));
    auth.push(new Headers(init.headers).get("Authorization"));
    return auth.length === 1 ? unauthorized() : ok([{ id: "x" }]);
  };

  const data = await api("/api/v1/users");

  expect(data).toEqual([{ id: "x" }]);
  expect(calls).toEqual(["/api/v1/users", "/api/v1/auth/refresh", "/api/v1/users"]);
  expect(auth[1]).toBe(`Bearer ${tokenPair("u1-renewed").access_token}`);
  expect(getSession()?.refreshToken).toBe("refresh-u1-renewed");
  expect(getSession()?.email).toBe("jane@acme.com");
});

test("a failed refresh clears the session and redirects to /login", async () => {
  respond = () => ok(tokenPair("u1"));
  await login("jane@acme.com", "secret");
  calls = [];

  respond = () => unauthorized();

  await expect(api("/api/v1/users")).rejects.toBeInstanceOf(ApiError);
  expect(calls).toEqual(["/api/v1/users", "/api/v1/auth/refresh"]);
  expect(getSession()).toBeNull();
  expect(redirects).toEqual(["/login"]);
});

test("an error envelope surfaces as ApiError with the backend message", async () => {
  respond = () => json(403, { code: "ERROR", error: { code: "FORBIDDEN", message: "missing permission" } });

  const err = await api("/api/v1/users").catch((e) => e);

  expect(err).toBeInstanceOf(ApiError);
  expect(err.status).toBe(403);
  expect(err.message).toBe("missing permission");
  expect(calls).toEqual(["/api/v1/users"]);
  expect(redirects).toEqual([]);
});
