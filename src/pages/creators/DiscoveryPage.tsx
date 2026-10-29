import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Page, PageHeader, EmptyState, ErrorState, ui } from '../../components/common/PageShell';
import { Button } from '../../components/common/Button';
import { Input, Select } from '../../components/common/Input';
import { Avatar } from '../../components/common/Avatar';
import { Spinner } from '../../components/common/Spinner';
import { useToast } from '../../components/common/Toast';
import { createCreator, discoverCreators, fetchDiscoveryStatus } from '../../services/creatorService';
import { ApiError } from '../../services/apiClient';
import type {
  DiscoveredCreator,
  DiscoveryPlatform,
  DiscoverySearchParams,
  DiscoverySearchResult,
} from '../../types';

const PLATFORM_LABELS: Record<DiscoveryPlatform, string> = {
  INSTAGRAM: 'Instagram',
  TIKTOK: 'TikTok',
  YOUTUBE: 'YouTube',
};

/** "12,400" rather than "12400"; a dash when CreatorDB did not say. */
export function formatFollowers(value: number | null | undefined): string {
  return value == null ? '—' : value.toLocaleString('en-GB');
}

/** Empty inputs are left out of the request rather than sent as 0 or "". */
export function toSearchParams(form: {
  platform: DiscoveryPlatform;
  keywords: string;
  country: string;
  minFollowers: string;
  maxFollowers: string;
}): DiscoverySearchParams {
  const number = (raw: string) => {
    const parsed = Number(raw.replace(/[,\s]/g, ''));
    return raw.trim() === '' || !Number.isFinite(parsed) || parsed <= 0 ? undefined : parsed;
  };
  return {
    platform: form.platform,
    keywords: form.keywords.trim() || undefined,
    country: form.country.trim().toUpperCase() || undefined,
    minFollowers: number(form.minFollowers),
    maxFollowers: number(form.maxFollowers),
  };
}

/**
 * Requirement #23: finding creators who are not on the database yet, from CreatorDB's index.
 *
 * Every search costs a credit, so it runs on the button rather than as you type, and "Load more"
 * fetches the next page on demand. Adding a creator copies the handle and follower count onto the
 * database; the profile refresh fills in the rest.
 */
export const DiscoveryPage: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    platform: 'INSTAGRAM' as DiscoveryPlatform,
    keywords: '',
    country: 'GB',
    minFollowers: '',
    maxFollowers: '',
  });
  const [lastParams, setLastParams] = useState<DiscoverySearchParams | null>(null);
  const [results, setResults] = useState<DiscoverySearchResult | null>(null);
  /** Creators added during this visit, so the row flips to "On database" without a new search. */
  const [added, setAdded] = useState<Record<string, string>>({});

  const status = useQuery({ queryKey: ['discovery-status'], queryFn: fetchDiscoveryStatus });

  const searchMutation = useMutation({
    mutationFn: (params: DiscoverySearchParams) => discoverCreators(params),
    onSuccess: (page, params) => {
      setResults((previous) =>
        params.offset && previous
          ? { ...page, results: [...previous.results, ...page.results] }
          : page,
      );
      queryClient.invalidateQueries({ queryKey: ['discovery-status'] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Search failed'),
  });

  const addMutation = useMutation({
    mutationFn: (creator: DiscoveredCreator) =>
      createCreator({
        name: creator.name || creator.handle,
        handle: creator.handle,
        primaryPlatform: creator.platform,
        tiktokHandle: creator.platform === 'TIKTOK' ? creator.handle : undefined,
        youtubeHandle: creator.platform === 'YOUTUBE' ? creator.handle : undefined,
        followersCount: creator.followers ?? undefined,
      }),
    onSuccess: (created, creator) => {
      setAdded((previous) => ({ ...previous, [key(creator)]: created.id }));
      queryClient.invalidateQueries({ queryKey: ['creators'] });
      toast.success(`@${creator.handle} added to the database`);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not add the creator'),
  });

  const runSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const params = toSearchParams(form);
    setLastParams(params);
    setResults(null);
    searchMutation.mutate(params);
  };

  const loadMore = () => {
    if (!lastParams || !results?.nextOffset) return;
    searchMutation.mutate({ ...lastParams, offset: results.nextOffset });
  };

  const credits = results?.creditsAvailable ?? status.data?.creditsAvailable ?? null;

  if (status.isLoading) return <Spinner label="Loading" />;
  if (status.error) return <ErrorState error={status.error} onRetry={() => status.refetch()} />;

  return (
    <Page>
      <PageHeader
        title="Discover creators"
        subtitle="Search CreatorDB for creators who are not on the database yet."
        actions={
          credits != null && credits >= 0 ? (
            <span className={ui.cellMuted}>{credits.toLocaleString('en-GB')} CreatorDB credits left</span>
          ) : undefined
        }
      />

      {!status.data?.available ? (
        <EmptyState
          title="Discovery is not configured"
          message="Set CREATORDB_API_KEY on the server to search CreatorDB's creator index."
        />
      ) : (
        <>
          <form className={ui.panel} onSubmit={runSearch} aria-label="Discovery search">
            <div className={ui.filterBar}>
              <Select
                label="Platform"
                value={form.platform}
                onChange={(e) => setForm({ ...form, platform: e.target.value as DiscoveryPlatform })}
              >
                {Object.entries(PLATFORM_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
              <Input
                label="Hashtags or keywords"
                placeholder="skincare, makeup"
                value={form.keywords}
                onChange={(e) => setForm({ ...form, keywords: e.target.value })}
              />
              <Input
                label="Creator country"
                placeholder="GB"
                maxLength={3}
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              />
              <Input
                label="Min followers"
                inputMode="numeric"
                placeholder="10,000"
                value={form.minFollowers}
                onChange={(e) => setForm({ ...form, minFollowers: e.target.value })}
              />
              <Input
                label="Max followers"
                inputMode="numeric"
                placeholder="250,000"
                value={form.maxFollowers}
                onChange={(e) => setForm({ ...form, maxFollowers: e.target.value })}
              />
              <Button type="submit" variant="primary" disabled={searchMutation.isPending}>
                {searchMutation.isPending && !lastParams?.offset ? 'Searching…' : 'Search'}
              </Button>
            </div>
            <p className={ui.statNote}>Each search uses 1 CreatorDB credit. Results are sorted by follower count.</p>
          </form>

          {searchMutation.isPending && !results && <Spinner label="Searching CreatorDB" />}

          {results && results.results.length === 0 && (
            <EmptyState
              title="No creators match"
              message="Try fewer hashtags, a wider follower range, or leave the country blank."
            />
          )}

          {results && results.results.length > 0 && (
            <section className={ui.panelFlush}>
              <div className={ui.tableWrap}>
                <table className={ui.table}>
                  <thead>
                    <tr>
                      <th>Creator</th>
                      <th>Platform</th>
                      <th className={ui.numeric}>Followers</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {results.results.map((creator) => {
                      const existingId = creator.existingCreatorId ?? added[key(creator)];
                      return (
                        <tr key={key(creator)}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                              <Avatar name={creator.name || creator.handle} size={32} />
                              <div>
                                <div className={ui.cellStrong}>{creator.name || creator.handle}</div>
                                <a href={creator.profileUrl} target="_blank" rel="noreferrer" className={ui.cellMuted}>
                                  @{creator.handle}
                                </a>
                              </div>
                            </div>
                          </td>
                          <td>{PLATFORM_LABELS[creator.platform]}</td>
                          <td className={ui.numeric}>{formatFollowers(creator.followers)}</td>
                          <td style={{ textAlign: 'right' }}>
                            {existingId ? (
                              <Link to={`/creators/${existingId}`}>On database →</Link>
                            ) : (
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={addMutation.isPending && addMutation.variables === creator}
                                onClick={() => addMutation.mutate(creator)}
                              >
                                Add to database
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className={ui.pagination} style={{ padding: 'var(--space-4)' }}>
                <span className={ui.cellMuted}>
                  Showing {results.results.length.toLocaleString('en-GB')} of{' '}
                  {results.totalResults.toLocaleString('en-GB')}
                </span>
                {results.hasNextPage && results.nextOffset != null && (
                  <Button variant="secondary" onClick={loadMore} disabled={searchMutation.isPending}>
                    {searchMutation.isPending ? 'Loading…' : 'Load more (1 credit)'}
                  </Button>
                )}
              </div>
            </section>
          )}
        </>
      )}
    </Page>
  );
};

function key(creator: DiscoveredCreator): string {
  return `${creator.platform}:${creator.handle.toLowerCase()}`;
}
