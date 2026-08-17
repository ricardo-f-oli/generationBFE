/**
 * Centralised API client.
 *
 * Rewritten against the answered review:
 *  - Q-F1: no silent fallback to mock data. A failed request throws, and the UI shows an error.
 *  - Q-F4: the `ApiResponse.data` envelope is unwrapped here, once, for everyone.
 *  - Q-F6: refresh is single-flight with a queue, so N concurrent 401s do not each rotate the
 *          refresh token and log the user out.
 *  - Q-F7: session expiry raises an event instead of assigning window.location.
 *  - Q-F8: every request has a timeout and can be aborted.
 */

import type { ApiMeta, Paged } from '../types';

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8080/api';

const ACCESS_TOKEN_KEY = 'genb_access_token';
const REFRESH_TOKEN_KEY = 'genb_refresh_token';
const DEFAULT_TIMEOUT_MS = 20_000;

/** Raised so the router can redirect without the data layer touching the URL bar. */
export const SESSION_EXPIRED_EVENT = 'genb:session-expired';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: Array<{ field: string; message: string }>;

  constructor(
    status: number,
    code: string,
    message: string,
    fieldErrors: Array<{ field: string; message: string }> = [],
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

// ------------------------------------------------------------ token store

export const tokenStore = {
  getAccess: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_TOKEN_KEY),
  set(access: string, refresh?: string) {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

// -------------------------------------------------- single-flight refresh

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  // Q-F6: everyone who hits a 401 at the same time awaits the same promise.
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refreshToken = tokenStore.getRefresh();
    if (!refreshToken) return null;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) return null;

      const payload = await response.json();
      const access = payload?.data?.accessToken as string | undefined;
      const refresh = payload?.data?.refreshToken as string | undefined;
      if (!access) return null;

      tokenStore.set(access, refresh);
      return access;
    } catch {
      return null;
    } finally {
      // Cleared on the next tick so late callers still see this result.
      setTimeout(() => {
        refreshInFlight = null;
      }, 0);
    }
  })();

  return refreshInFlight;
}

function endSession() {
  tokenStore.clear();
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
}

// ------------------------------------------------------------- core fetch

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  timeoutMs?: number;
  /** Public endpoints skip the Authorization header and the refresh dance. */
  anonymous?: boolean;
}

interface Envelope<T> {
  data: T;
  meta?: ApiMeta;
}

async function rawRequest<T>(
  endpoint: string,
  options: RequestOptions,
  accessToken: string | null,
): Promise<Response> {
  const { body, timeoutMs = DEFAULT_TIMEOUT_MS, anonymous, headers, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((headers as Record<string, string>) ?? {}),
  };
  if (!anonymous && accessToken) {
    finalHeaders.Authorization = `Bearer ${accessToken}`;
  }

  // Q-F8: nothing hangs forever.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(
      endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`,
      {
        ...rest,
        headers: finalHeaders,
        credentials: 'include',
        signal: rest.signal ?? controller.signal,
        body: body === undefined ? undefined : JSON.stringify(body),
      },
    );
  } finally {
    clearTimeout(timer);
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  let code = 'UNKNOWN';
  let message = `Request failed (${response.status})`;
  let fieldErrors: Array<{ field: string; message: string }> = [];

  try {
    const payload = await response.json();
    if (payload?.error) code = payload.error;
    if (payload?.message) message = payload.message;
    if (Array.isArray(payload?.details)) {
      fieldErrors = payload.details.map((d: { field: string; message: string }) => ({
        field: d.field,
        message: d.message,
      }));
      if (fieldErrors.length) message = fieldErrors.map((f) => f.message).join('. ');
    }
  } catch {
    // Non-JSON error body: keep the status-based message.
  }

  return new ApiError(response.status, code, message, fieldErrors);
}

/** Returns the unwrapped `data` payload. Throws {@link ApiError} on any non-2xx. */
export async function apiRequest<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  let response: Response;

  try {
    response = await rawRequest(endpoint, options, tokenStore.getAccess());
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new ApiError(0, 'TIMEOUT', 'The server took too long to respond. Please try again.');
    }
    throw new ApiError(0, 'NETWORK', 'Could not reach the server. Check your connection.');
  }

  // Q-A5/Q-A6: the backend now reliably answers 401 for an expired or missing token.
  if (response.status === 401 && !options.anonymous && !endpoint.startsWith('/auth/')) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      try {
        response = await rawRequest(endpoint, options, newToken);
      } catch {
        throw new ApiError(0, 'NETWORK', 'Could not reach the server. Check your connection.');
      }
    } else {
      endSession();
      throw new ApiError(401, 'SESSION_EXPIRED', 'Your session has expired. Please sign in again.');
    }
  }

  if (response.status === 401 && !options.anonymous && !endpoint.startsWith('/auth/')) {
    endSession();
    throw new ApiError(401, 'SESSION_EXPIRED', 'Your session has expired. Please sign in again.');
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) return undefined as T;

  const payload = JSON.parse(text) as Envelope<T>;
  // Q-F4: unwrap once, here.
  return (payload?.data !== undefined ? payload.data : (payload as unknown)) as T;
}

/** Same as {@link apiRequest} but also returns the pagination envelope. */
export async function apiRequestPaged<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<Paged<T>> {
  let response: Response;

  try {
    response = await rawRequest(endpoint, options, tokenStore.getAccess());
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      throw new ApiError(0, 'TIMEOUT', 'The server took too long to respond. Please try again.');
    }
    throw new ApiError(0, 'NETWORK', 'Could not reach the server. Check your connection.');
  }

  if (response.status === 401 && !options.anonymous) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      response = await rawRequest(endpoint, options, newToken);
    } else {
      endSession();
      throw new ApiError(401, 'SESSION_EXPIRED', 'Your session has expired. Please sign in again.');
    }
  }

  if (!response.ok) throw await toApiError(response);

  const payload = (await response.json()) as Envelope<T[]>;
  return {
    items: payload.data ?? [],
    meta: payload.meta ?? { page: 0, size: 0, totalElements: 0, totalPages: 0 },
  };
}

/**
 * Downloads a binary export (PDF, Excel, PowerPoint) and hands it to the browser.
 *
 * These endpoints answer with the file itself rather than the JSON envelope, so they cannot go
 * through `apiRequest`. The Authorization header rules out a plain `<a href>`, which is why the
 * blob is fetched and then clicked through an object URL.
 */
export async function apiDownload(endpoint: string, fallbackName: string): Promise<void> {
  let response: Response;

  try {
    response = await rawRequest(endpoint, {}, tokenStore.getAccess());
  } catch {
    throw new ApiError(0, 'NETWORK', 'Could not reach the server. Check your connection.');
  }

  if (response.status === 401) {
    const newToken = await refreshAccessToken();
    if (!newToken) {
      endSession();
      throw new ApiError(401, 'SESSION_EXPIRED', 'Your session has expired. Please sign in again.');
    }
    response = await rawRequest(endpoint, {}, newToken);
  }

  if (!response.ok) throw await toApiError(response);

  // The filename the server chose, so an export is named the same however it was triggered.
  const disposition = response.headers.get('Content-Disposition') ?? '';
  const match = /filename="?([^";]+)"?/.exec(disposition);
  const filename = match ? match[1] : fallbackName;

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** Builds a query string, dropping undefined/empty values. */
export function qs(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.append(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}
