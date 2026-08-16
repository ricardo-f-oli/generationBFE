import { apiRequest, apiRequestPaged, qs } from './apiClient';
import type {
  AttributeDefinition,
  Creator,
  CreatorFilters,
  CreatorNote,
  CreatorRegistrationPayload,
  CreatorSearchParams,
  Paged,
  StyleTag,
  Suppression,
} from '../types';

// ------------------------------------------------------------------ search

export function searchCreators(params: CreatorSearchParams = {}): Promise<Paged<Creator>> {
  return apiRequestPaged<Creator>(`/creators${qs({ ...params })}`);
}

export function fetchCreator(id: string): Promise<Creator> {
  return apiRequest<Creator>(`/creators/${id}`);
}

export function fetchCreatorFilters(): Promise<CreatorFilters> {
  return apiRequest<CreatorFilters>('/creators/filters');
}

export function fetchPendingRegistrations(page = 0, size = 20): Promise<Paged<Creator>> {
  return apiRequestPaged<Creator>(`/creators/pending${qs({ page, size })}`);
}

// ---------------------------------------------------------------- mutation

export interface CreateCreatorInput {
  name: string;
  handle: string;
  email?: string;
  phone?: string;
  primaryPlatform?: string;
  tiktokHandle?: string;
  youtubeHandle?: string;
  followersCount?: number;
  erPercentage?: number;
  location?: string;
  niche?: string;
  bio?: string;
  portfolioUrl?: string;
  tagIds?: string[];
}

export function createCreator(input: CreateCreatorInput): Promise<Creator> {
  return apiRequest<Creator>('/creators', { method: 'POST', body: input });
}

export function updateCreator(id: string, input: Partial<CreateCreatorInput> & { optInStatus?: string }) {
  return apiRequest<Creator>(`/creators/${id}`, { method: 'PATCH', body: input });
}

export function deleteCreator(id: string): Promise<void> {
  return apiRequest<void>(`/creators/${id}`, { method: 'DELETE' });
}

export function approveRegistration(id: string): Promise<Creator> {
  return apiRequest<Creator>(`/creators/${id}/approve`, { method: 'POST' });
}

export function rejectRegistration(id: string): Promise<Creator> {
  return apiRequest<Creator>(`/creators/${id}/reject`, { method: 'POST' });
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export function importCreators(rows: Array<Record<string, string>>): Promise<ImportResult> {
  return apiRequest<ImportResult>('/creators/import', { method: 'POST', body: rows });
}

// ------------------------------------------------------------------- notes

export function fetchNotes(creatorId: string): Promise<CreatorNote[]> {
  return apiRequest<CreatorNote[]>(`/creators/${creatorId}/notes`);
}

export function addNote(creatorId: string, noteText: string, confidential = false) {
  return apiRequest<CreatorNote>(`/creators/${creatorId}/notes`, {
    method: 'POST',
    body: { noteText, confidential },
  });
}

export function updateNote(noteId: string, noteText: string) {
  return apiRequest<CreatorNote>(`/creators/notes/${noteId}`, {
    method: 'PUT',
    body: { noteText, confidential: false },
  });
}

export function deleteNote(noteId: string): Promise<void> {
  return apiRequest<void>(`/creators/notes/${noteId}`, { method: 'DELETE' });
}

// ------------------------------------------------------------- suppression

export function suppressCreator(input: {
  creatorId?: string;
  email?: string;
  handle?: string;
  reason?: string;
}): Promise<{ message: string }> {
  return apiRequest('/creators/suppress', { method: 'POST', body: input });
}

export function anonymiseCreator(id: string): Promise<{ message: string }> {
  return apiRequest(`/creators/${id}/anonymise`, { method: 'POST' });
}

export function fetchSuppressions(page = 0, size = 50): Promise<Paged<Suppression>> {
  return apiRequestPaged<Suppression>(`/settings/suppressions${qs({ page, size })}`);
}

// -------------------------------------------------------- tags & attributes

export function fetchTags(): Promise<StyleTag[]> {
  return apiRequest<StyleTag[]>('/taxonomy/tags');
}

export function createTag(name: string, category = 'AESTHETIC'): Promise<StyleTag> {
  return apiRequest<StyleTag>('/taxonomy/tags', { method: 'POST', body: { name, category } });
}

export function deleteTag(tagId: string): Promise<void> {
  return apiRequest<void>(`/taxonomy/tags/${tagId}`, { method: 'DELETE' });
}

export function assignTag(creatorId: string, tagId: string): Promise<void> {
  return apiRequest<void>(`/taxonomy/creators/${creatorId}/tags/${tagId}`, { method: 'PUT' });
}

export function unassignTag(creatorId: string, tagId: string): Promise<void> {
  return apiRequest<void>(`/taxonomy/creators/${creatorId}/tags/${tagId}`, { method: 'DELETE' });
}

export function fetchAttributeDefinitions(): Promise<AttributeDefinition[]> {
  return apiRequest<AttributeDefinition[]>('/taxonomy/attributes');
}

export function createAttributeDefinition(input: {
  key: string;
  label: string;
  type?: string;
  options?: string[];
  required?: boolean;
}): Promise<AttributeDefinition> {
  return apiRequest<AttributeDefinition>('/taxonomy/attributes', { method: 'POST', body: input });
}

export function deleteAttributeDefinition(id: string): Promise<void> {
  return apiRequest<void>(`/taxonomy/attributes/${id}`, { method: 'DELETE' });
}

export function fetchAttributeValues(creatorId: string): Promise<Record<string, string>> {
  return apiRequest<Record<string, string>>(`/taxonomy/creators/${creatorId}/attributes`);
}

export function setAttributeValue(creatorId: string, definitionId: string, value: string) {
  return apiRequest<void>(`/taxonomy/creators/${creatorId}/attributes`, {
    method: 'PUT',
    body: { definitionId, value },
  });
}

// ------------------------------------------------------- public (no auth)

export function registerCreator(payload: CreatorRegistrationPayload) {
  return apiRequest<{ id: string; status: string; message: string }>('/public/creators/register', {
    method: 'POST',
    body: payload,
    anonymous: true,
  });
}

export function unsubscribe(email: string, reason?: string) {
  return apiRequest<{ message: string }>('/public/unsubscribe', {
    method: 'POST',
    body: { email, reason },
    anonymous: true,
  });
}
