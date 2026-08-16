import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Page, PageHeader, AsyncBoundary, EmptyState, ui } from '../../components/common/PageShell';
import { Button } from '../../components/common/Button';
import { Input, Select } from '../../components/common/Input';
import { Tag } from '../../components/common/Tag';
import { fetchCreatorFilters, searchCreators } from '../../services/creatorService';
import type { CreatorSearchParams } from '../../types';
import styles from './Creators.module.css';

/**
 * Requirements #23–#26: creator matching.
 *
 * The brief asks for natural-language search. What is live today is indexed multi-field search
 * plus every classic filter, which is the honest half of that requirement — the free-text box
 * matches handle, name, location, niche and bio in the database. Semantic parsing of a phrase
 * like "London beauty creators who cycle" is a follow-up once the insights provider is wired.
 */
export const MatchingPage: React.FC = () => {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<CreatorSearchParams>({ page: 0, size: 24 });
  const [applied, setApplied] = useState<CreatorSearchParams>({ page: 0, size: 24 });

  const filters = useQuery({ queryKey: ['creator-filters'], queryFn: fetchCreatorFilters });
  const results = useQuery({
    queryKey: ['matching', applied],
    queryFn: () => searchCreators(applied),
  });

  const set = (key: keyof CreatorSearchParams, value: string | number | undefined) =>
    setDraft((prev) => ({ ...prev, [key]: value || undefined }));

  const meta = results.data?.meta;

  return (
    <Page>
      <PageHeader
        title="Creator matching"
        subtitle="Filter the shared creator database down to an on-brand list"
        actions={
          <Button
            variant="secondary"
            onClick={() => {
              const reset = { page: 0, size: 24 };
              setDraft(reset);
              setApplied(reset);
            }}
          >
            Reset
          </Button>
        }
      />

      <section className={ui.panel}>
        <p className={ui.sectionLabel}>Search criteria</p>

        <div className={ui.filterBar}>
          <Input
            label="Free text"
            value={draft.query ?? ''}
            onChange={(e) => set('query', e.target.value)}
            placeholder="beauty, London, clean girl…"
          />
          <Select
            label="Platform"
            value={draft.platform ?? ''}
            onChange={(e) => set('platform', e.target.value)}
          >
            <option value="">Any</option>
            {filters.data?.platforms.map((p) => (
              <option key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</option>
            ))}
          </Select>
          <Select
            label="Niche"
            value={draft.niche ?? ''}
            onChange={(e) => set('niche', e.target.value)}
          >
            <option value="">Any</option>
            {filters.data?.niches.map((n) => <option key={n} value={n}>{n}</option>)}
          </Select>
          <Select
            label="City / location"
            value={draft.location ?? ''}
            onChange={(e) => set('location', e.target.value)}
          >
            <option value="">Any</option>
            {filters.data?.locations.map((l) => <option key={l} value={l}>{l}</option>)}
          </Select>
          <Select
            label="Aesthetic tag"
            value={draft.tagId ?? ''}
            onChange={(e) => set('tagId', e.target.value)}
          >
            <option value="">Any</option>
            {filters.data?.tags.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </Select>
          <Input
            label="Min followers"
            type="number"
            value={draft.minFollowers ?? ''}
            onChange={(e) => set('minFollowers', e.target.value ? Number(e.target.value) : undefined)}
          />
          <Input
            label="Max followers"
            type="number"
            value={draft.maxFollowers ?? ''}
            onChange={(e) => set('maxFollowers', e.target.value ? Number(e.target.value) : undefined)}
          />
          <Input
            label="Min ER %"
            type="number"
            step="0.1"
            value={draft.minEr ?? ''}
            onChange={(e) => set('minEr', e.target.value ? Number(e.target.value) : undefined)}
          />
          <Input
            label="Min UK audience %"
            type="number"
            step="1"
            value={draft.minUkAudience ?? ''}
            onChange={(e) => set('minUkAudience', e.target.value ? Number(e.target.value) : undefined)}
          />
        </div>

        <div style={{ marginTop: 'var(--space-4)', display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="primary" onClick={() => setApplied({ ...draft, page: 0 })}>
            Apply filters
          </Button>
        </div>
      </section>

      <AsyncBoundary
        isLoading={results.isLoading}
        error={results.error}
        onRetry={() => results.refetch()}
        loadingLabel="Matching creators"
      >
        <p className={ui.sectionLabel}>
          {meta?.totalElements ?? 0} match{meta?.totalElements === 1 ? '' : 'es'}
        </p>

        {results.data && results.data.items.length === 0 ? (
          <EmptyState
            title="No creators match"
            message="Loosen a filter — min followers and UK audience are the usual culprits."
          />
        ) : (
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th>Creator</th>
                  <th>Location</th>
                  <th>Niche</th>
                  <th className={ui.numeric}>Followers</th>
                  <th className={ui.numeric}>ER</th>
                  <th>Flags</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {results.data?.items.map((creator) => (
                  <tr key={creator.id}>
                    <td className={ui.cellStrong}>@{creator.handle}</td>
                    <td className={ui.cellMuted}>{creator.location ?? '—'}</td>
                    <td className={ui.cellMuted}>{creator.niche ?? '—'}</td>
                    <td className={ui.numeric}>{creator.followersDisplay}</td>
                    <td className={ui.numeric}>{Number(creator.erPercentage).toFixed(1)}%</td>
                    <td>
                      <div className={ui.chipRow}>
                        {creator.suppressed && <Tag tone="brand">Opted out</Tag>}
                        {creator.workedWithOtherBrand && <Tag tone="peach">Cross-brand</Tag>}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/creators/${creator.id}`)}
                      >
                        View →
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta && meta.totalPages > 1 && (
          <div className={ui.pagination}>
            <Button
              variant="secondary"
              size="sm"
              disabled={meta.page === 0}
              onClick={() => setApplied((p) => ({ ...p, page: (p.page ?? 0) - 1 }))}
            >
              ← Previous
            </Button>
            <span className={ui.pageInfo}>
              Page {meta.page + 1} of {meta.totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={meta.page >= meta.totalPages - 1}
              onClick={() => setApplied((p) => ({ ...p, page: (p.page ?? 0) + 1 }))}
            >
              Next →
            </Button>
          </div>
        )}
      </AsyncBoundary>
    </Page>
  );
};
