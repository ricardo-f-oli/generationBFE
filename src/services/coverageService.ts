import { USE_MOCK_DATA, simulateDelay, apiRequest } from './apiClient';
import { INITIAL_COVERAGE_ROWS } from '../mocks/mockData';
import { CoverageRow } from '../types';

export async function fetchCoverageLog(brand?: string): Promise<CoverageRow[]> {
  if (USE_MOCK_DATA) {
    // TODO: replace mock with real API call to GET /api/coverage/log?brand=<brand>
    return simulateDelay([...INITIAL_COVERAGE_ROWS]);
  }
  return apiRequest<CoverageRow[]>(`/coverage/log?brand=${encodeURIComponent(brand || '')}`);
}

export async function updateDigestSettings(settings: { enabled: boolean; time: string }): Promise<{ success: boolean }> {
  if (USE_MOCK_DATA) {
    // TODO: replace mock with real API call to PUT /api/coverage/digest-settings
    return simulateDelay({ success: true });
  }
  return apiRequest<{ success: boolean }>('/coverage/digest-settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}
