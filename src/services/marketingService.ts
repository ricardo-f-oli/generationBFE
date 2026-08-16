import { apiRequest, apiRequestPaged, qs } from './apiClient';
import type { Paged, WaitlistEntry, WaitlistStats } from '../types';

/** Requirement #48 — the marketing waitlist. */

export function joinWaitlist(input: {
  email: string;
  name?: string;
  handle?: string;
  platform?: string;
  niche?: string;
  consentGiven: boolean;
  source?: string;
}): Promise<{ id: string; status: string; message: string }> {
  return apiRequest('/public/waitlist', { method: 'POST', body: input, anonymous: true });
}

export function confirmWaitlist(token: string) {
  return apiRequest<{ status: string; message: string }>(
    `/public/waitlist/confirm${qs({ token })}`,
    { anonymous: true },
  );
}

export function fetchWaitlist(status?: string, page = 0, size = 25): Promise<Paged<WaitlistEntry>> {
  return apiRequestPaged<WaitlistEntry>(`/marketing/waitlist${qs({ status, page, size })}`);
}

export function fetchWaitlistStats(): Promise<WaitlistStats> {
  return apiRequest<WaitlistStats>('/marketing/waitlist/stats');
}

export function convertWaitlistEntry(id: string, creatorId: string): Promise<WaitlistEntry> {
  return apiRequest<WaitlistEntry>(`/marketing/waitlist/${id}/convert`, {
    method: 'POST',
    body: { creatorId },
  });
}

export function rejectWaitlistEntry(id: string): Promise<void> {
  return apiRequest<void>(`/marketing/waitlist/${id}/reject`, { method: 'POST' });
}
