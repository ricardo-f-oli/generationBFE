import { USE_MOCK_DATA, simulateDelay, apiRequest } from './apiClient';
import { INITIAL_GIFTING_ROWS } from '../mocks/mockData';
import { GiftingRow } from '../types';

export async function fetchGiftingLog(): Promise<GiftingRow[]> {
  if (USE_MOCK_DATA) {
    // TODO: replace mock with real API call to GET /api/gifting/log
    return simulateDelay([...INITIAL_GIFTING_ROWS]);
  }
  return apiRequest<GiftingRow[]>('/gifting/log');
}

export async function sendAddressCaptureEmails(recipientIds: string[]): Promise<{ success: boolean; sentCount: number }> {
  if (USE_MOCK_DATA) {
    // TODO: replace mock with real API call to POST /api/gifting/address-capture
    return simulateDelay({ success: true, sentCount: recipientIds.length });
  }
  return apiRequest<{ success: boolean; sentCount: number }>('/gifting/address-capture', {
    method: 'POST',
    body: JSON.stringify({ recipientIds }),
  });
}

export async function exportEcGroupExcel(): Promise<{ downloadUrl: string }> {
  if (USE_MOCK_DATA) {
    // TODO: replace mock with real API call to POST /api/gifting/export/ec-group
    return simulateDelay({ downloadUrl: '#mock-ec-group-export.xlsx' });
  }
  return apiRequest<{ downloadUrl: string }>('/gifting/export/ec-group', { method: 'POST' });
}
