/**
 * Coverage tracking (requirements #11–#15).
 */

import { apiDownload, apiRequest, apiRequestPaged, qs } from './apiClient';
import type { ClipResult, CoverageItem, DigestSettings, Paged } from '../types';

export interface CoverageFilters {
  query?: string;
  platform?: string;
  postType?: string;
  campaignId?: string;
  creatorId?: string;
  unsolicited?: boolean;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

export function fetchCoverageLog(filters: CoverageFilters = {}): Promise<Paged<CoverageItem>> {
  return apiRequestPaged<CoverageItem>(`/coverage/log${qs(filters as Record<string, unknown>)}`);
}

export function createCoverageItem(input: {
  campaignId?: string;
  creatorId?: string;
  creatorHandle: string;
  platform?: string;
  postType?: string;
  url?: string;
  caption?: string;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  impressions?: number;
  unsolicited?: boolean;
  postedAt?: string;
}): Promise<CoverageItem> {
  return apiRequest<CoverageItem>('/coverage/log', { method: 'POST', body: input });
}

export function deleteCoverageItem(id: string): Promise<void> {
  return apiRequest<void>(`/coverage/log/${id}`, { method: 'DELETE' });
}

/** Requirement #11: pull a creator's recent posts in, skipping anything already logged. */
export function clipCreatorActivity(input: {
  creatorId?: string;
  creatorHandle?: string;
  campaignId?: string;
}): Promise<ClipResult> {
  return apiRequest<ClipResult>('/coverage/clip', { method: 'POST', body: input });
}

/** Requirement #11: unsolicited coverage, found by brand name or monitored hashtags. */
export function clipBrandMentions(limit = 25): Promise<ClipResult> {
  return apiRequest<ClipResult>(`/coverage/clip/mentions${qs({ limit })}`, { method: 'POST' });
}

/** Requirement #14. */
export function downloadCoverageExport(
  format: 'excel' | 'csv',
  campaignId?: string,
): Promise<void> {
  return apiDownload(
    `/coverage/export/${format}${qs({ campaignId })}`,
    format === 'csv' ? 'coverage-log.csv' : 'coverage-log.xlsx',
  );
}

// --------------------------------------------------------------- settings

export function fetchDigestSettings(): Promise<DigestSettings> {
  return apiRequest<DigestSettings>('/coverage/digest-settings');
}

export function updateDigestSettings(input: {
  enabled?: boolean;
  sendTime?: string;
  recipientEmail?: string;
  clippingNamePattern?: string;
  includeUnsolicited?: boolean;
}): Promise<DigestSettings> {
  return apiRequest<DigestSettings>('/coverage/digest-settings', { method: 'PUT', body: input });
}

/** Requirement #12: shows what a clipping name will look like before the pattern is saved. */
export function previewClippingName(pattern?: string): Promise<{ example: string }> {
  return apiRequest<{ example: string }>(`/coverage/clipping-name/preview${qs({ pattern })}`);
}

/** Requirement #13. */
export function sendDigestNow(): Promise<{ sent: boolean }> {
  return apiRequest<{ sent: boolean }>('/coverage/digest/send', { method: 'POST' });
}
