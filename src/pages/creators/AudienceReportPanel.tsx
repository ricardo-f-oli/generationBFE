import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ui } from '../../components/common/PageShell';
import { Button } from '../../components/common/Button';
import { useToast } from '../../components/common/Toast';
import { fetchAudienceReports, refreshAudienceReport } from '../../services/creatorService';
import { ApiError } from '../../services/apiClient';
import type { AudienceReport, AudienceShare, DiscoveryPlatform } from '../../types';

const PLATFORM_LABELS: Record<DiscoveryPlatform, string> = {
  INSTAGRAM: 'Instagram',
  TIKTOK: 'TikTok',
  YOUTUBE: 'YouTube',
};

const regionNames = (() => {
  try {
    return new Intl.DisplayNames(['en-GB'], { type: 'region' });
  } catch {
    return null;
  }
})();

/** "GB" → "United Kingdom"; the code itself when the browser cannot name it. */
export function countryName(code: string): string {
  try {
    return regionNames?.of(code) ?? code;
  } catch {
    return code;
  }
}

const ShareBars: React.FC<{ title: string; shares: AudienceShare[]; label: (key: string) => string }> = ({
  title,
  shares,
  label,
}) => (
  <div>
    <p className={ui.statLabel}>{title}</p>
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--space-2)' }}>
      {shares.map((share) => (
        <li key={share.key} aria-label={`${label(share.key)} ${share.pct}%`}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-sm)' }}>
            <span>{label(share.key)}</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{share.pct}%</span>
          </div>
          <div style={{ height: 6, background: 'var(--surface-muted)', borderRadius: 3 }}>
            <div
              style={{
                width: `${Math.min(100, Math.max(0, share.pct))}%`,
                height: '100%',
                background: 'var(--color-black)',
                borderRadius: 3,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  </div>
);

const ReportBody: React.FC<{ report: AudienceReport }> = ({ report }) => (
  <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
    <div className={ui.statGrid}>
      <div className={`${ui.stat} ${ui.statTintLime}`}>
        <p className={ui.statLabel}>UK share</p>
        <div className={ui.statValue}>
          {report.countries.find((c) => c.key === 'GB')?.pct ?? 0}%
        </div>
      </div>
      {report.femalePct != null && (
        <div className={`${ui.stat} ${ui.statTintPeach}`}>
          <p className={ui.statLabel}>Female / male</p>
          <div className={ui.statValue}>
            {report.femalePct}% / {report.malePct}%
          </div>
        </div>
      )}
      {report.averageAge != null && (
        <div className={`${ui.stat} ${ui.statTintLemon}`}>
          <p className={ui.statLabel}>Average age</p>
          <div className={ui.statValue}>{report.averageAge}</div>
        </div>
      )}
    </div>
    <div className={ui.pair}>
      {report.countries.length > 0 && (
        <ShareBars title="Top countries" shares={report.countries.slice(0, 8)} label={countryName} />
      )}
      {report.ageBands.length > 0 && (
        <ShareBars title="Age" shares={report.ageBands} label={(range) => range} />
      )}
    </div>
    <p className={ui.statNote}>
      {PLATFORM_LABELS[report.platform]}
      {report.handle ? ` @${report.handle}` : ''} · CreatorDB, bought{' '}
      {new Date(report.fetchedAt).toLocaleDateString('en-GB')}. Modelled by CreatorDB from the
      creator&apos;s followers and engagers, not reported by the platform.
    </p>
  </div>
);

/**
 * Requirement #26: the creator's full audience report from CreatorDB — every country and age
 * band, not only the summary on the profile.
 *
 * Opening the profile reads what was bought before, for nothing. Buying costs 10 credits, so it
 * is a button that says so, and never happens on page load.
 */
export const AudienceReportPanel: React.FC<{ creatorId: string }> = ({ creatorId }) => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const overview = useQuery({
    queryKey: ['audience-report', creatorId],
    queryFn: () => fetchAudienceReports(creatorId),
  });
  const [selected, setSelected] = useState<DiscoveryPlatform | null>(null);

  const buy = useMutation({
    mutationFn: (platform: DiscoveryPlatform) => refreshAudienceReport(creatorId, platform),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audience-report', creatorId] });
      // The summary figures on the profile change with the primary platform's report.
      queryClient.invalidateQueries({ queryKey: ['creator', creatorId] });
      toast.success('Audience report updated');
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not get the audience report'),
  });

  if (overview.isLoading || overview.error || !overview.data) {
    return null;
  }
  const { available, platforms, reports } = overview.data;
  if (!available && reports.length === 0) {
    return null;
  }

  const platform = selected ?? platforms[0]?.platform ?? reports[0]?.platform ?? null;
  const report = reports.find((r) => r.platform === platform);

  return (
    <section className={ui.panel} aria-label="Audience report">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
        <p className={ui.sectionLabel} style={{ margin: 0 }}>Audience report</p>
        {platforms.length > 1 && (
          <div className={ui.chipRow} role="group" aria-label="Platform">
            {platforms.map((p) => (
              <button
                key={p.platform}
                type="button"
                className={`${ui.chip} ${p.platform === platform ? ui.chipActive : ''}`}
                aria-pressed={p.platform === platform}
                onClick={() => setSelected(p.platform)}
              >
                {PLATFORM_LABELS[p.platform]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 'var(--space-4)' }}>
        {report ? (
          <ReportBody report={report} />
        ) : platforms.length === 0 ? (
          <p className={ui.cellMuted}>Add an Instagram, TikTok or YouTube handle to get an audience report.</p>
        ) : (
          <p className={ui.cellMuted}>
            No audience report for {platform ? PLATFORM_LABELS[platform] : 'this creator'} yet.
          </p>
        )}
      </div>

      {available && platform && platforms.some((p) => p.platform === platform) && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <Button variant="secondary" onClick={() => buy.mutate(platform)} disabled={buy.isPending}>
            {buy.isPending
              ? 'Getting report…'
              : `${report ? 'Refresh' : 'Get'} audience report (10 credits)`}
          </Button>
        </div>
      )}
    </section>
  );
};
