import { USE_MOCK_DATA, simulateDelay, apiRequest } from './apiClient';
import { INITIAL_OUTREACH_RECIPIENTS } from '../mocks/mockData';
import { OutreachRecipient } from '../types';

export async function fetchOutreachRecipients(): Promise<OutreachRecipient[]> {
  if (USE_MOCK_DATA) {
    // TODO: replace mock with real API call to GET /api/outreach/recipients
    return simulateDelay([...INITIAL_OUTREACH_RECIPIENTS]);
  }
  return apiRequest<OutreachRecipient[]>('/outreach/recipients');
}

export async function sendOutreachMessage(payload: {
  template: string;
  subject: string;
  body: string;
  recipientIds: string[];
}): Promise<{ success: boolean; count: number }> {
  if (USE_MOCK_DATA) {
    // TODO: replace mock with real API call to POST /api/outreach/send
    return simulateDelay({ success: true, count: payload.recipientIds.length }, 400);
  }
  return apiRequest<{ success: boolean; count: number }>('/outreach/send', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
