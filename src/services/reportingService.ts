/**
 * Reporting, insights and KPI targets (requirements #49–#55).
 */

import { apiDownload, apiRequest, apiRequestPaged, qs } from './apiClient';
import type {
  InsightRequest,
  KpiMatch,
  KpiTarget,
  Paged,
  Report,
  ReportCadence,
  ReportMetrics,
  ReportStatus,
  ReportTemplate,
  ReportType,
} from '../types';

// ---------------------------------------------------------------- reports

export function fetchReports(params: {
  status?: ReportStatus;
  campaignId?: string;
  page?: number;
  size?: number;
} = {}): Promise<Paged<Report>> {
  return apiRequestPaged<Report>(`/reports${qs(params as Record<string, unknown>)}`);
}

export function fetchReport(id: string): Promise<Report> {
  return apiRequest<Report>(`/reports/${id}`);
}

export function createReport(input: {
  name?: string;
  campaignId?: string;
  templateId?: string;
  reportType: ReportType;
  cadence?: ReportCadence;
  periodStart: string;
  periodEnd: string;
}): Promise<Report> {
  return apiRequest<Report>('/reports', { method: 'POST', body: input });
}

/** Live figures for a period without saving a report. */
export function previewMetrics(params: {
  campaignId?: string;
  from: string;
  to: string;
}): Promise<ReportMetrics> {
  return apiRequest<ReportMetrics>(`/reports/preview${qs(params as Record<string, unknown>)}`);
}

export function regenerateReport(id: string): Promise<Report> {
  return apiRequest<Report>(`/reports/${id}/regenerate`, { method: 'POST' });
}

export function submitReport(id: string): Promise<Report> {
  return apiRequest<Report>(`/reports/${id}/submit`, { method: 'POST' });
}

export function approveReport(id: string): Promise<Report> {
  return apiRequest<Report>(`/reports/${id}/approve`, { method: 'POST' });
}

export function rejectReport(id: string, reason: string): Promise<Report> {
  return apiRequest<Report>(`/reports/${id}/reject`, { method: 'POST', body: { reason } });
}

/** Requirement #53: the backend answers 422 unless a director has signed the report off. */
export function sendReportToClient(id: string): Promise<Report> {
  return apiRequest<Report>(`/reports/${id}/send`, { method: 'POST' });
}

export function deleteReport(id: string): Promise<void> {
  return apiRequest<void>(`/reports/${id}`, { method: 'DELETE' });
}

/** Requirement #54. */
export function downloadReport(
  id: string,
  format: 'pdf' | 'excel' | 'powerpoint',
): Promise<void> {
  const extension = format === 'pdf' ? 'pdf' : format === 'excel' ? 'xlsx' : 'pptx';
  return apiDownload(`/reports/${id}/export/${format}`, `report.${extension}`);
}

// -------------------------------------------------------------- templates

export function fetchReportTemplates(): Promise<ReportTemplate[]> {
  return apiRequest<ReportTemplate[]>('/reports/templates');
}

export function createReportTemplate(input: {
  name: string;
  reportType: ReportType;
  sections: string[];
  includeAffiliate: boolean;
}): Promise<ReportTemplate> {
  return apiRequest<ReportTemplate>('/reports/templates', { method: 'POST', body: input });
}

export function deleteReportTemplate(id: string): Promise<void> {
  return apiRequest<void>(`/reports/templates/${id}`, { method: 'DELETE' });
}

// --------------------------------------------------------------- insights

export function fetchInsightRequests(campaignId: string): Promise<InsightRequest[]> {
  return apiRequest<InsightRequest[]>(`/reports/insights/${campaignId}`);
}

/** Rebuilds the outstanding list from who was sent to versus who has posted. */
export function refreshInsightRequests(
  campaignId: string,
  range?: { from?: string; to?: string },
): Promise<InsightRequest[]> {
  return apiRequest<InsightRequest[]>(
    `/reports/insights/${campaignId}/refresh${qs(range ?? {})}`,
    { method: 'POST' },
  );
}

export function chaseAllInsights(campaignId: string): Promise<{ chased: number }> {
  return apiRequest<{ chased: number }>(`/reports/insights/${campaignId}/chase-all`, {
    method: 'POST',
  });
}

export function chaseInsight(requestId: string, campaignId?: string): Promise<InsightRequest> {
  return apiRequest<InsightRequest>(
    `/reports/insights/request/${requestId}/chase${qs({ campaignId })}`,
    { method: 'POST' },
  );
}

export function markInsightReceived(requestId: string): Promise<void> {
  return apiRequest<void>(`/reports/insights/request/${requestId}/received`, { method: 'POST' });
}

// -------------------------------------------------------------------- KPI

export function fetchKpiTarget(campaignId: string): Promise<KpiTarget> {
  return apiRequest<KpiTarget>(`/reports/kpi/${campaignId}`);
}

export function saveKpiTarget(campaignId: string, input: Partial<KpiTarget>): Promise<KpiTarget> {
  return apiRequest<KpiTarget>(`/reports/kpi/${campaignId}`, { method: 'PUT', body: input });
}

export function matchCreatorsToKpi(
  campaignId: string,
  creatorIds: string[],
): Promise<KpiMatch[]> {
  return apiRequest<KpiMatch[]>(`/reports/kpi/${campaignId}/match`, {
    method: 'POST',
    body: { creatorIds },
  });
}
