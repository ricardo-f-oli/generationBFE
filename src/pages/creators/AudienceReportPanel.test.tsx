import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '../../components/common/Toast';
import { AudienceReportPanel, countryName } from './AudienceReportPanel';
import type { AudienceReport, AudienceReportOverview } from '../../types';

/**
 * A report costs 10 credits. The panel must show what was bought before for free, and only buy
 * when the button — which says what it costs — is pressed.
 */

const fetchAudienceReports = vi.fn();
const refreshAudienceReport = vi.fn();

vi.mock('../../services/creatorService', () => ({
  fetchAudienceReports: (id: string) => fetchAudienceReports(id),
  refreshAudienceReport: (id: string, platform?: string) => refreshAudienceReport(id, platform),
}));

const report: AudienceReport = {
  platform: 'INSTAGRAM',
  handle: 'sophia',
  fetchedAt: '2026-10-20T10:00:00Z',
  source: 'CREATORDB',
  countries: [
    { key: 'GB', pct: 62 },
    { key: 'US', pct: 20 },
  ],
  ageBands: [
    { key: '18-24', pct: 40 },
    { key: '25-34', pct: 45 },
  ],
  femalePct: 75,
  malePct: 25,
  averageAge: 27,
};

const overview = (overrides: Partial<AudienceReportOverview> = {}): AudienceReportOverview => ({
  available: true,
  platforms: [
    { platform: 'INSTAGRAM', handle: 'sophia' },
    { platform: 'TIKTOK', handle: 'sophia.tt' },
  ],
  reports: [report],
  ...overrides,
});

const renderPanel = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ToastProvider>
        <AudienceReportPanel creatorId="c1" />
      </ToastProvider>
    </QueryClientProvider>,
  );

describe('AudienceReportPanel', () => {
  beforeEach(() => {
    fetchAudienceReports.mockReset().mockResolvedValue(overview());
    refreshAudienceReport.mockReset().mockResolvedValue(report);
  });

  it('shows the stored report without buying anything', async () => {
    renderPanel();
    expect(await screen.findByLabelText('United Kingdom 62%')).toBeInTheDocument();
    expect(screen.getByText('75% / 25%')).toBeInTheDocument();
    expect(screen.getByText('27')).toBeInTheDocument();
    expect(screen.getByLabelText('United Kingdom 62%')).toBeInTheDocument();
    expect(screen.getByLabelText('25-34 45%')).toBeInTheDocument();
    expect(refreshAudienceReport).not.toHaveBeenCalled();
  });

  it('offers to buy a report for a platform that has none, and says what it costs', async () => {
    renderPanel();
    await userEvent.click(await screen.findByRole('button', { name: 'TikTok' }));

    expect(screen.getByText(/no audience report for tiktok yet/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /get audience report \(10 credits\)/i }));

    await waitFor(() => expect(refreshAudienceReport).toHaveBeenCalledWith('c1', 'TIKTOK'));
  });

  it('labels the button as a refresh when a report exists', async () => {
    renderPanel();
    expect(await screen.findByRole('button', { name: /refresh audience report \(10 credits\)/i })).toBeInTheDocument();
  });

  it('shows the server explanation when CreatorDB cannot answer', async () => {
    const { ApiError } = await import('../../services/apiClient');
    refreshAudienceReport.mockRejectedValue(
      new ApiError(422, 'UNPROCESSABLE', 'CreatorDB has not indexed @sophia on Instagram yet.'),
    );
    renderPanel();
    await userEvent.click(await screen.findByRole('button', { name: /refresh audience report/i }));
    expect(await screen.findByText(/has not indexed @sophia/i)).toBeInTheDocument();
  });

  it('hides itself when CreatorDB is not configured and nothing was ever bought', async () => {
    fetchAudienceReports.mockResolvedValue(overview({ available: false, reports: [] }));
    const { container } = renderPanel();
    await waitFor(() => expect(fetchAudienceReports).toHaveBeenCalled());
    expect(container.querySelector('section')).toBeNull();
  });

  it('keeps showing old reports, without a buy button, after CreatorDB is switched off', async () => {
    fetchAudienceReports.mockResolvedValue(overview({ available: false }));
    renderPanel();
    expect(await screen.findByLabelText('United Kingdom 62%')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /audience report/i })).not.toBeInTheDocument();
  });
});

describe('countryName', () => {
  it('names countries and falls back to the code', () => {
    expect(countryName('GB')).toBe('United Kingdom');
    expect(countryName('not-a-code')).toBe('not-a-code');
  });
});
