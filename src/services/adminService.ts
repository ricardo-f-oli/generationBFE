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

// ------------------------------------------------- retention (req #37)

/** One dataset's rule, plus what the last real pass of it did. */
export interface RetentionPolicy {
  dataset: string;
  /** The rule in a sentence. Generated from the sweeper, so it is necessarily what the code does. */
  policy: string;
  lastAffected: number | null;
  lastRunAt: string | null;
  /** Age of the oldest record still held. A value that stops moving means a stuck sweeper. */
  oldestRemaining: string | null;
  error: string | null;
}

export interface RetentionStatus {
  enabled: boolean;
  schedule: string;
  policies: RetentionPolicy[];
}

export interface RetentionOutcome {
  dataset: string;
  policy: string;
  affected: number;
}

export function fetchRetentionStatus(): Promise<RetentionStatus> {
  return apiRequest<RetentionStatus>('/settings/retention');
}

/**
 * Runs the policies now. `dryRun` defaults to true on the server as well — nobody should be one
 * mis-click from deleting a year of addresses on a screen whose job is showing them the rules.
 */
export function runRetention(dryRun = true): Promise<RetentionOutcome[]> {
  return apiRequest<RetentionOutcome[]>(`/settings/retention/run${qs({ dryRun })}`, {
    method: 'POST',
  });
}
