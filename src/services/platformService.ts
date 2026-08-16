/**
 * Coverage, gifting and outreach.
 *
 * These modules were not part of this round's "implement fully" scope, so the frontend here is
 * deliberately thin: it reads what the backend genuinely has and does not invent anything. Every
 * endpoint below exists and returns real data — nothing falls back to fixtures.
 */

import { apiRequest, qs } from './apiClient';
import type {
  CoverageItem,
  DigestSettings,
  GiftingRow,
  OutreachCampaign,
  OutreachRecipient,
  OutreachTemplate,
  ResolvedPreview,
} from '../types';

// --------------------------------------------------------------- coverage

export function fetchCoverageLog(brand?: string): Promise<CoverageItem[]> {
  return apiRequest<CoverageItem[]>(`/coverage/log${qs({ brand })}`);
}

export function updateDigestSettings(input: {
  enabled: boolean;
  sendTime: string;
  recipientEmail?: string;
}): Promise<DigestSettings> {
  return apiRequest<DigestSettings>('/coverage/digest-settings', { method: 'PUT', body: input });
}

// ---------------------------------------------------------------- gifting

export function fetchGiftingLog(): Promise<GiftingRow[]> {
  return apiRequest<GiftingRow[]>('/gifting/log');
}

export function updateDispatchStatus(id: string, input: {
  status: string;
  trackingNumber?: string;
  returnReason?: string;
}) {
  return apiRequest(`/gifting/dispatches/${id}/status`, { method: 'POST', body: input });
}

// --------------------------------------------------------------- outreach

export function fetchTemplates(): Promise<OutreachTemplate[]> {
  return apiRequest<OutreachTemplate[]>('/outreach/templates');
}

export function createTemplate(input: {
  name: string;
  type: string;
  subjectTemplate: string;
  bodyTemplate: string;
}): Promise<OutreachTemplate> {
  return apiRequest<OutreachTemplate>('/outreach/templates', { method: 'POST', body: input });
}

export function deactivateTemplate(id: string): Promise<void> {
  return apiRequest<void>(`/outreach/templates/${id}`, { method: 'DELETE' });
}

export function createOutreachDraft(input: {
  templateId?: string;
  campaignId?: string;
  outreachType: string;
  subject: string;
  body: string;
  productName?: string;
  noReplyWindowDays?: number;
}): Promise<OutreachCampaign> {
  return apiRequest<OutreachCampaign>('/outreach/campaigns', {
    method: 'POST',
    body: { noReplyWindowDays: 7, ...input },
  });
}

export function addRecipients(campaignId: string, creatorIds: string[]): Promise<OutreachCampaign> {
  return apiRequest<OutreachCampaign>(`/outreach/campaigns/${campaignId}/recipients`, {
    method: 'POST',
    body: creatorIds,
  });
}

export function fetchRecipients(campaignId: string): Promise<OutreachRecipient[]> {
  return apiRequest<OutreachRecipient[]>(`/outreach/campaigns/${campaignId}/recipients`);
}

export function previewResolved(campaignId: string, recipientId: string): Promise<ResolvedPreview> {
  return apiRequest<ResolvedPreview>(`/outreach/campaigns/${campaignId}/preview/${recipientId}`);
}

export function sendOutreachNow(campaignId: string): Promise<OutreachCampaign> {
  return apiRequest<OutreachCampaign>(`/outreach/campaigns/${campaignId}/send`, { method: 'POST' });
}
