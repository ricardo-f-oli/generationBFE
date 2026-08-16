import { apiRequest, apiRequestPaged, qs } from './apiClient';
import type { Brief, ContractClause, Paged, ToneOfVoice } from '../types';

export function fetchBriefs(page = 0, size = 20): Promise<Paged<Brief>> {
  return apiRequestPaged<Brief>(`/briefs${qs({ page, size })}`);
}

export function fetchBrief(id: string): Promise<Brief> {
  return apiRequest<Brief>(`/briefs/${id}`);
}

export interface BriefInput {
  campaignName: string;
  campaignGoal?: string;
  keyMessages?: string;
  deliverables?: string[];
  budgetMin?: number;
  budgetMax?: number;
  timelineStart?: string;
  timelineEnd?: string;
  toneOfVoice?: ToneOfVoice;
  additionalNotes?: string;
}

export function createBrief(input: BriefInput): Promise<Brief> {
  return apiRequest<Brief>('/briefs', { method: 'POST', body: input });
}

export function updateBrief(id: string, input: BriefInput): Promise<Brief> {
  return apiRequest<Brief>(`/briefs/${id}`, { method: 'PUT', body: input });
}

export function generateBrief(id: string): Promise<Brief> {
  return apiRequest<Brief>(`/briefs/${id}/generate`, { method: 'POST' });
}

export function deleteBrief(id: string): Promise<void> {
  return apiRequest<void>(`/briefs/${id}`, { method: 'DELETE' });
}

export function fetchShareLink(id: string): Promise<{ shareLink: string }> {
  return apiRequest<{ shareLink: string }>(`/briefs/${id}/share-link`);
}

export function fetchClauses(): Promise<ContractClause[]> {
  return apiRequest<ContractClause[]>('/clauses');
}

export function reorderClauses(orderedIds: string[]): Promise<void> {
  return apiRequest<void>('/clauses/reorder', { method: 'PUT', body: orderedIds });
}

/** PDF export needs the raw response, so it bypasses the JSON envelope. */
export function briefPdfUrl(id: string): string {
  return `/briefs/${id}/export/pdf`;
}
