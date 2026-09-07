import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiRequest, qs, tokenStore, SESSION_EXPIRED_EVENT } from './apiClient';

/**
 * The API client is the one piece of frontend code every screen depends on, and the place the
 * subtle bugs lived: silent fallbacks to mock data, a refresh stampede logging users out, and
 * errors surfacing as empty states.
 */
describe('apiClient', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const jsonResponse = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  describe('response handling', () => {
    it('unwraps the data envelope so callers never see it', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ data: { id: '1', name: 'Sophia' } }));

      const result = await apiRequest<{ id: string; name: string }>('/creators/1');

      expect(result).toEqual({ id: '1', name: 'Sophia' });
    });

    it('returns undefined for a 204 rather than trying to parse a body', async () => {
      fetchMock.mockResolvedValue(new Response(null, { status: 204 }));

      await expect(apiRequest('/creators/1', { method: 'DELETE' })).resolves.toBeUndefined();
    });

    it('surfaces the backend message rather than swallowing the failure', async () => {
      // Q-F1: the old client fell back to mock data here, so a broken endpoint looked fine.
      fetchMock.mockResolvedValue(
        jsonResponse({ error: 'CONFLICT', message: 'That post is already in the log.' }, 409),
      );

      await expect(apiRequest('/coverage/log', { method: 'POST' })).rejects.toMatchObject({
        status: 409,
        code: 'CONFLICT',
        message: 'That post is already in the log.',
      });
    });

    it('joins field errors into one readable message', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(
          {
            error: 'VALIDATION_FAILED',
            message: 'Validation failed',
            details: [
              { field: 'name', message: 'Name is required' },
              { field: 'email', message: 'Email is invalid' },
            ],
          },
          400,
        ),
      );

      await expect(apiRequest('/creators', { method: 'POST' })).rejects.toThrow(
        'Name is required. Email is invalid',
      );
    });

    it('reports a network failure as a network error, not a parse error', async () => {
      fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(apiRequest('/creators')).rejects.toMatchObject({ code: 'NETWORK' });
    });

    it('reports an aborted request as a timeout the user can understand', async () => {
      const abort = new Error('The operation was aborted');
      abort.name = 'AbortError';
      fetchMock.mockRejectedValue(abort);

      await expect(apiRequest('/reports/preview')).rejects.toMatchObject({
        code: 'TIMEOUT',
      });
    });
  });

  describe('authentication', () => {
    it('sends the bearer token when one is stored', async () => {
      tokenStore.set('access-123', 'refresh-456');
      fetchMock.mockResolvedValue(jsonResponse({ data: [] }));

      await apiRequest('/creators');

      const headers = fetchMock.mock.calls[0][1].headers;
      expect(headers.Authorization).toBe('Bearer access-123');
    });

    it('omits the token on an anonymous call, so a public page never leaks one', async () => {
      tokenStore.set('access-123');
      fetchMock.mockResolvedValue(jsonResponse({ data: {} }));

      await apiRequest('/public/gifting/address/abc', { anonymous: true });

      const headers = fetchMock.mock.calls[0][1].headers;
      expect(headers.Authorization).toBeUndefined();
    });

    it('refreshes once on a 401 and retries the original request', async () => {
      tokenStore.set('expired', 'refresh-456');

      fetchMock
        .mockResolvedValueOnce(jsonResponse({ message: 'expired' }, 401))
        .mockResolvedValueOnce(jsonResponse({ data: { accessToken: 'fresh', refreshToken: 'r2' } }))
        .mockResolvedValueOnce(jsonResponse({ data: { id: '1' } }));

      const result = await apiRequest<{ id: string }>('/creators/1');

      expect(result).toEqual({ id: '1' });
      expect(tokenStore.getAccess()).toBe('fresh');
    });

    it('ends the session and raises an event when the refresh itself fails', async () => {
      // Q-F7: this must not assign window.location — the router listens for the event.
      tokenStore.set('expired', 'bad-refresh');
      const listener = vi.fn();
      window.addEventListener(SESSION_EXPIRED_EVENT, listener);

      fetchMock
        .mockResolvedValueOnce(jsonResponse({ message: 'expired' }, 401))
        .mockResolvedValueOnce(jsonResponse({ message: 'nope' }, 401));

      await expect(apiRequest('/creators/1')).rejects.toBeInstanceOf(ApiError);

      expect(listener).toHaveBeenCalled();
      expect(tokenStore.getAccess()).toBeNull();
      window.removeEventListener(SESSION_EXPIRED_EVENT, listener);
    });

    it('does not attempt a refresh on the login endpoint itself', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ message: 'Bad credentials' }, 401));

      await expect(
        apiRequest('/auth/login', { method: 'POST', body: {} }),
      ).rejects.toMatchObject({ status: 401 });

      // One call only: a failed login must not trigger the refresh dance.
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('qs', () => {
    it('drops undefined, null and empty values so they never reach the API', () => {
      expect(qs({ page: 0, query: '', platform: undefined, niche: null, size: 24 })).toBe(
        '?page=0&size=24',
      );
    });

    it('returns an empty string when nothing survives', () => {
      expect(qs({ a: undefined, b: '' })).toBe('');
    });

    it('encodes values that would otherwise break the query string', () => {
      expect(qs({ query: 'a&b=c' })).toContain('a%26b%3Dc');
    });
  });
});
