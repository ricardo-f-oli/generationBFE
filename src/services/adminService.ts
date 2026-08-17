/**
 * User management and the audit trail (requirements #35 and #36).
 */

import { apiRequest, apiRequestPaged, qs } from './apiClient';
import type { AuditEntry, ManagedUser, Paged, Role } from '../types';

// ---------------------------------------------------------------- users

export function fetchUsers(page = 0, size = 25): Promise<Paged<ManagedUser>> {
  return apiRequestPaged<ManagedUser>(`/settings/users${qs({ page, size })}`);
}

export function createUser(input: {
  name: string;
  email: string;
  username?: string;
  role: Role;
}): Promise<ManagedUser> {
  return apiRequest<ManagedUser>('/settings/users', { method: 'POST', body: input });
}

export function updateUser(
  id: string,
  input: { name?: string; role?: Role; active?: boolean },
): Promise<ManagedUser> {
  return apiRequest<ManagedUser>(`/settings/users/${id}`, { method: 'PATCH', body: input });
}

/** Clears a lockout after too many failed sign-in attempts. */
export function unlockUser(id: string): Promise<ManagedUser> {
  return apiRequest<ManagedUser>(`/settings/users/${id}/unlock`, { method: 'POST' });
}

export function sendPasswordReset(id: string): Promise<void> {
  return apiRequest<void>(`/settings/users/${id}/send-reset`, { method: 'POST' });
}

export function fetchRoles(): Promise<Role[]> {
  return apiRequest<Role[]>('/settings/roles');
}

// ---------------------------------------------------------------- audit

export interface AuditFilters {
  entityType?: string;
  action?: string;
  entityId?: string;
  changedBy?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

export function fetchAuditLog(filters: AuditFilters = {}): Promise<Paged<AuditEntry>> {
  return apiRequestPaged<AuditEntry>(`/settings/audit${qs(filters as Record<string, unknown>)}`);
}

export function fetchAuditEntityTypes(): Promise<string[]> {
  return apiRequest<string[]>('/settings/audit/entity-types');
}
