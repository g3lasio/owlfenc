/**
 * fetchWithAuth — Drop-in replacement for fetch() that always includes
 * the Firebase Bearer token in the Authorization header.
 *
 * WHY THIS EXISTS:
 * The native `fetch()` API does not go through the axios interceptor defined
 * in axios-config.ts. On a new device, the `__session` cookie does not exist
 * yet (it is created by /api/sessionLogin AFTER the first Firebase auth).
 * Without this utility, any `fetch('/api/...')` that fires before the session
 * cookie is established will arrive at the backend with `firebaseUser: null`
 * and receive a 401.
 *
 * USAGE:
 *   import { fetchWithAuth } from '@/lib/fetch-with-auth';
 *   const res = await fetchWithAuth('/api/wallet/balance');
 *
 * The function behaves exactly like `fetch()` but:
 *   1. Adds `credentials: 'include'` (sends cookies when present)
 *   2. Adds `Authorization: Bearer <token>` when a Firebase user is signed in
 *   3. Falls back gracefully if the token cannot be obtained
 */

import { auth } from '@/lib/firebase';

type FetchInput = RequestInfo | URL;
type FetchInit = RequestInit & { skipAuth?: boolean };

export async function fetchWithAuth(
  input: FetchInput,
  init: FetchInit = {}
): Promise<Response> {
  const { skipAuth = false, ...fetchInit } = init;

  // Always include cookies (for environments where the session cookie exists)
  fetchInit.credentials = fetchInit.credentials ?? 'include';

  if (!skipAuth) {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        // getIdToken(false) returns cached token; getIdToken(true) forces refresh.
        // We use false here for performance — Firebase SDK auto-refreshes tokens.
        const token = await currentUser.getIdToken(false);
        if (token) {
          fetchInit.headers = {
            ...fetchInit.headers,
            Authorization: `Bearer ${token}`,
          };
        }
      }
    } catch (err) {
      // Non-blocking: if token retrieval fails, continue without it.
      // The session cookie may still work if it exists.
      console.warn('[fetchWithAuth] Could not get Firebase token:', err);
    }
  }

  return fetch(input, fetchInit);
}

/**
 * Convenience wrapper that parses JSON and throws on non-2xx responses.
 * Mirrors the common pattern: const data = await apiGet('/api/...')
 */
export async function apiGet<T = unknown>(
  url: string,
  init: FetchInit = {}
): Promise<T> {
  const res = await fetchWithAuth(url, { method: 'GET', ...init });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GET ${url} → ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export async function apiPost<T = unknown>(
  url: string,
  body: unknown,
  init: FetchInit = {}
): Promise<T> {
  const res = await fetchWithAuth(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...init.headers },
    body: JSON.stringify(body),
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${url} → ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}
