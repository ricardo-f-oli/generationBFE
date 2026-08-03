import { USE_MOCK_DATA, simulateDelay, apiRequest } from './apiClient';
import { INITIAL_REPORT_CREATORS } from '../mocks/mockData';
import { ReportCreatorBreakdown } from '../types';

let reportCreatorsStore = [...INITIAL_REPORT_CREATORS];

export async function fetchReportData(campaignName?: string): Promise<{
  signoffStatus: string;
  creatorBreakdown: ReportCreatorBreakdown[];
}> {
  if (USE_MOCK_DATA) {
    // TODO: replace mock with real API call to GET /api/reports/analytics?campaign=<campaignName>
    return simulateDelay({
      signoffStatus: 'Draft',
      creatorBreakdown: [...reportCreatorsStore],
    });
  }
  return apiRequest<{
    signoffStatus: string;
    creatorBreakdown: ReportCreatorBreakdown[];
  }>(`/reports/analytics?campaign=${encodeURIComponent(campaignName || '')}`);
}

export async function submitReportSignoff(status: 'Pending Approval' | 'Approved' | 'Sent to client'): Promise<{ success: boolean; status: string }> {
  if (USE_MOCK_DATA) {
    // TODO: replace mock with real API call to POST /api/reports/signoff
    return simulateDelay({ success: true, status });
  }
  return apiRequest<{ success: boolean; status: string }>('/reports/signoff', {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
}

export async function chaseInsightForCreator(creatorId: string): Promise<ReportCreatorBreakdown> {
  if (USE_MOCK_DATA) {
    // TODO: replace mock with real API call to POST /api/reports/chase-insights/:creatorId
    const itemIndex = reportCreatorsStore.findIndex((c) => c.id === creatorId);
    if (itemIndex !== -1) {
      reportCreatorsStore[itemIndex] = {
        ...reportCreatorsStore[itemIndex],
        status: 'Chased',
        statusBg: 'var(--color-grey)',
      };
      return simulateDelay({ ...reportCreatorsStore[itemIndex] });
    }
    throw new Error('Creator not found');
  }
  return apiRequest<ReportCreatorBreakdown>(`/reports/chase-insights/${creatorId}`, { method: 'POST' });
}
