import React, { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Page, PageHeader, AsyncBoundary, EmptyState, ui } from '../../components/common/PageShell';
import { Button } from '../../components/common/Button';
import { Input, Select } from '../../components/common/Input';
import { Tag } from '../../components/common/Tag';
import { useToast } from '../../components/common/Toast';
import { fetchKpiTarget, matchCreatorsToKpi, saveKpiTarget } from '../../services/reportingService';
import { fetchCampaigns } from '../../services/campaignService';
import { searchCreators } from '../../services/creatorService';
import { ApiError } from '../../services/apiClient';
import type { KpiMatch } from '../../types';
import styles from './Reporting.module.css';

const BAND_TONE = { STRONG: 'lime', PARTIAL: 'lemon', WEAK: 'peach', UNSET: 'neutral' } as const;

/**
 * Requirement #55: KPI targets and the match indicator.
 *
 * The brief's stated purpose is "justify shortlists to clients without spreadsheets", so every
 * criterion shows its reason. A bare percentage justifies nothing.
 */
export const KpiPage: React.FC = () => {
  const toast = useToast();
  const [campaignId, setCampaignId] = useState('');
  const [matches, setMatches] = useState<KpiMatch[]>([]);

  const [form, setForm] = useState({
    minFollowers: '',
    maxFollowers: '',
    minEr: '',
    minUkAudience: '',
    targetReach: '',
    preferredPlatform: '',
    preferredNiche: '',
  });

  const campaigns = useQuery({ queryKey: ['campaigns'], queryFn: () => fetchCampaigns() });

  const target = useQuery({
    queryKey: ['kpi', campaignId],
    queryFn: () => fetchKpiTarget(campaignId),
    enabled: Boolean(campaignId),
  });

  // Load the saved targets into the form whenever the campaign changes.
  useEffect(() => {
    const data = target.data;
    if (!data) return;
    setForm({
      minFollowers: data.minFollowers?.toString() ?? '',
      maxFollowers: data.maxFollowers?.toString() ?? '',
      minEr: data.minEr?.toString() ?? '',
      minUkAudience: data.minUkAudience?.toString() ?? '',
      targetReach: data.targetReach?.toString() ?? '',
      preferredPlatform: data.preferredPlatform ?? '',
      preferredNiche: data.preferredNiche ?? '',
    });
    setMatches([]);
  }, [target.data]);

  const numberOrNull = (value: string) => (value.trim() === '' ? null : Number(value));

  const save = useMutation({
    mutationFn: () =>
      saveKpiTarget(campaignId, {
        minFollowers: numberOrNull(form.minFollowers),
        maxFollowers: numberOrNull(form.maxFollowers),
        minEr: numberOrNull(form.minEr),
        minUkAudience: numberOrNull(form.minUkAudience),
        targetReach: numberOrNull(form.targetReach),
        preferredPlatform: form.preferredPlatform || null,
        preferredNiche: form.preferredNiche || null,
      }),
    onSuccess: () => toast.success('KPI targets saved'),
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not save the targets'),
  });

  const creators = useQuery({
    queryKey: ['creators-for-kpi'],
    queryFn: () => searchCreators({ page: 0, size: 24 }),
    enabled: Boolean(campaignId),
  });

  const runMatch = useMutation({
    mutationFn: () =>
      matchCreatorsToKpi(campaignId, (creators.data?.items ?? []).map((creator) => creator.id)),
    onSuccess: setMatches,
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not score the creators'),
  });

  return (
    <Page>
      <PageHeader
        title="Campaign KPIs"
        subtitle="Client-set targets, and how each creator measures against them."
      />

      <div className={ui.filterBar}>
        <Select
          label="Campaign"
          value={campaignId}
          onChange={(event) => setCampaignId(event.target.value)}
        >
          <option value="">Choose a campaign</option>
          {campaigns.data?.items.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.name}
            </option>
          ))}
        </Select>
      </div>

      {!campaignId ? (
        <EmptyState
          title="Pick a campaign"
          message="KPI targets are set per campaign, because each client sets their own."
        />
      ) : (
        <AsyncBoundary
          isLoading={target.isLoading}
          error={target.error}
          onRetry={() => target.refetch()}
          loadingLabel="Loading targets"
        >
          <section className={ui.panel}>
            <h2 className={ui.sectionLabel}>Targets</h2>
            <div className={styles.formRow}>
              <Input
                label="Minimum followers"
                type="number"
                value={form.minFollowers}
                onChange={(event) => setForm({ ...form, minFollowers: event.target.value })}
              />
              <Input
                label="Maximum followers"
                type="number"
                value={form.maxFollowers}
                onChange={(event) => setForm({ ...form, maxFollowers: event.target.value })}
              />
              <Input
                label="Minimum ER %"
                type="number"
                step="0.1"
                value={form.minEr}
                onChange={(event) => setForm({ ...form, minEr: event.target.value })}
              />
              <Input
                label="Minimum UK audience %"
                type="number"
                step="1"
                hint="Needs the creator-data provider to be measurable."
                value={form.minUkAudience}
                onChange={(event) => setForm({ ...form, minUkAudience: event.target.value })}
              />
              <Input
                label="Target reach"
                type="number"
                value={form.targetReach}
                onChange={(event) => setForm({ ...form, targetReach: event.target.value })}
              />
              <Select
                label="Preferred platform"
                value={form.preferredPlatform}
                onChange={(event) => setForm({ ...form, preferredPlatform: event.target.value })}
              >
                <option value="">Any</option>
                <option value="INSTAGRAM">Instagram</option>
                <option value="TIKTOK">TikTok</option>
                <option value="YOUTUBE">YouTube</option>
              </Select>
              <Input
                label="Preferred niche"
                value={form.preferredNiche}
                onChange={(event) => setForm({ ...form, preferredNiche: event.target.value })}
              />
            </div>

            <div className={styles.inlineActions} style={{ marginTop: 'var(--space-4)' }}>
              <Button onClick={() => save.mutate()} disabled={save.isPending}>
                Save targets
              </Button>
              <Button
                variant="secondary"
                onClick={() => runMatch.mutate()}
                disabled={runMatch.isPending || !creators.data?.items.length}
              >
                Score creators against these
              </Button>
            </div>
          </section>

          {matches.length > 0 && (
            <section style={{ marginTop: 'var(--space-5)' }}>
              <h2 className={ui.sectionLabel}>Match</h2>
              <div className={ui.cardGrid}>
                {matches
                  .slice()
                  .sort((a, b) => b.score - a.score)
                  .map((match) => (
                    <div key={match.creatorId} className={ui.panel}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 'var(--space-3)',
                        }}
                      >
                        <strong>@{match.handle}</strong>
                        <Tag tone={BAND_TONE[match.band]}>
                          {match.band === 'UNSET' ? 'No targets' : `${match.score}% ${match.band.toLowerCase()}`}
                        </Tag>
                      </div>

                      <div className={styles.scoreBar} style={{ margin: 'var(--space-3) 0' }}>
                        <div
                          className={[
                            styles.scoreFill,
                            match.band === 'STRONG' ? styles.scoreFillStrong : '',
                            match.band === 'PARTIAL' ? styles.scoreFillPartial : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          style={{ width: `${match.score}%` }}
                        />
                      </div>

                      {match.criteria.map((criterion) => (
                        <div key={criterion.label} className={styles.criterion}>
                          <span
                            className={`${styles.criterionMark} ${
                              criterion.met ? styles.criterionMet : styles.criterionUnmet
                            }`}
                          >
                            {criterion.met ? '✓' : '✕'}
                          </span>
                          <span>
                            <strong>{criterion.label}</strong>
                            <br />
                            <span className={ui.cellMuted}>{criterion.detail}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
              </div>
            </section>
          )}
        </AsyncBoundary>
      )}
    </Page>
  );
};
