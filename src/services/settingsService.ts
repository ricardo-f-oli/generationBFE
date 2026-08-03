import { USE_MOCK_DATA, simulateDelay, apiRequest } from './apiClient';
import { INITIAL_USERS, INITIAL_INTEGRATIONS, INITIAL_AUDIT_LOGS } from '../mocks/mockData';
import { UserRole, Integration, AuditLogEntry } from '../types';

let usersStore = [...INITIAL_USERS];

export async function fetchUsers(): Promise<UserRole[]> {
  if (USE_MOCK_DATA) {
    // TODO: replace mock with real API call to GET /api/settings/users
    return simulateDelay([...usersStore]);
  }
  return apiRequest<UserRole[]>('/settings/users');
}

export async function inviteUser(email: string, role: UserRole['role']): Promise<UserRole> {
  if (USE_MOCK_DATA) {
    // TODO: replace mock with real API call to POST /api/settings/users/invite
    const newUser: UserRole = {
      id: `u-${Date.now()}`,
      name: email.split('@')[0],
      email,
      role,
      brands: 'All brands',
      lastActive: 'Invited just now',
    };
    usersStore.push(newUser);
    return simulateDelay(newUser);
  }
  return apiRequest<UserRole>('/settings/users/invite', {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  });
}

export async function fetchIntegrations(): Promise<Integration[]> {
  if (USE_MOCK_DATA) {
    // TODO: replace mock with real API call to GET /api/settings/integrations
    return simulateDelay([...INITIAL_INTEGRATIONS]);
  }
  return apiRequest<Integration[]>('/settings/integrations');
}

export async function fetchAuditLogs(): Promise<AuditLogEntry[]> {
  if (USE_MOCK_DATA) {
    // TODO: replace mock with real API call to GET /api/settings/audit-logs
    return simulateDelay([...INITIAL_AUDIT_LOGS]);
  }
  return apiRequest<AuditLogEntry[]>('/settings/audit-logs');
}
