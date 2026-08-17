/**
 * Outreach: templates, campaigns and the AI-suggested follow-ups.
 *
 * Coverage now lives in `coverageService`, gifting in `giftingService` and reporting in
 * `reportingService` — each grew past the point where one shared file made sense.
 */

import { apiRequest } from './apiClient';
import type {
  FollowUpSuggestion,
  OutreachCampaign,
  OutreachRecipient,
  OutreachTemplate,
  OutreachType,
  ResolvedPreview,
} from '../types';

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

// ------------------------------------------------------------- follow-ups

/**
 * Requirement #33: the queue of AI-drafted follow-ups for outreach that has gone quiet.
 * A suggestion is a draft, not a decision — nothing sends until someone acts on it.
 */
export function fetchFollowUps(status = 'SUGGESTED'): Promise<FollowUpSuggestion[]> {
  return apiRequest<FollowUpSuggestion[]>(`/outreach/follow-ups?status=${status}`);
}

/** Runs the same scan the 08:00 schedule runs. */
export function generateFollowUps(): Promise<FollowUpSuggestion[]> {
  return apiRequest<FollowUpSuggestion[]>('/outreach/follow-ups/generate', { method: 'POST' });
}

export function regenerateFollowUp(id: string): Promise<FollowUpSuggestion> {
  return apiRequest<FollowUpSuggestion>(`/outreach/follow-ups/${id}/regenerate`, {
    method: 'POST',
  });
}

export function editFollowUp(
  id: string,
  input: { subject?: string; body?: string },
): Promise<FollowUpSuggestion> {
  return apiRequest<FollowUpSuggestion>(`/outreach/follow-ups/${id}`, {
    method: 'PATCH',
    body: input,
  });
}

export function markFollowUpSent(id: string): Promise<void> {
  return apiRequest<void>(`/outreach/follow-ups/${id}/sent`, { method: 'POST' });
}

export function dismissFollowUp(id: string): Promise<void> {
  return apiRequest<void>(`/outreach/follow-ups/${id}`, { method: 'DELETE' });
}

// ------------------------------------------------------------ AI drafting

/** Requirement #32: drafts an outreach template for a brand and outreach type. */
export function generateAiTemplate(input: {
  type: OutreachType;
  brandName?: string;
  campaignContext?: string;
  tone?: string;
}): Promise<OutreachTemplate> {
  return apiRequest<OutreachTemplate>('/outreach/templates/ai-generate', {
    method: 'POST',
    body: input,
  });
}
