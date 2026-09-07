import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Page, PageHeader, AsyncBoundary, EmptyState, ui } from '../../components/common/PageShell';
import { Button } from '../../components/common/Button';
import { Input, Select } from '../../components/common/Input';
import { useToast } from '../../components/common/Toast';
import {
  createCreator,
  discoverCreators,
  fetchCompetitorMentions,
  fetchDiscoveryStatus,
  refreshStalestCreators,
} from '../../services/creatorService';
import { ApiError } from '../../services/apiClient';
import type { DiscoveredCreator } from '../../types';
import styles from './Creators.module.css';

const number = new Intl.NumberFormat('en-GB');

/**
 * Requirement #23: finding creators who are not in the database yet, by describing them.
 *
 * <p>Our own search matches words against five columns — it is fast and it is literal. This
 * screen asks the creator-data vendor instead, which reads the sentence. The two are kept
 * separate on purpose: this one costs money per search, and a search box that silently bills
 * the agency is not a search box.
 */
export const DiscoveryPage: React.FC = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  /**
   * Two questions, deliberately separate. "Describe a creator" asks the vendor's semantic index
   * (#23); "who posts about" sweeps a hashtag (#25). They cost different amounts and return
   * different things, so one box that guessed which you meant would be a bad trade.
   */
  const [mode, setMode] = useState<'describe' | 'competitor'>('describe');
  const [query, setQuery] = useState('');
  const [platform, setPlatform] = useState('instagram');
  const [results, setResults] = useState<DiscoveredCreator[] | null>(null);

  const switchMode = (next: 'describe' | 'competitor') => {
    setMode(next);
    setResults(null);
  };

  const status = useQuery({
    queryKey: ['discovery-status'],
    queryFn: fetchDiscoveryStatus,
    staleTime: 60_000,
  });

  const search = useMutation({
    mutationFn: () =>
      mode === 'describe'
        ? discoverCreators({ query, platform })
        : fetchCompetitorMentions(query),
    onSuccess: (found) => {
      setResults(found);
      queryClient.invalidateQueries({ queryKey: ['discovery-status'] });
      if (found.length === 0) {
        toast.info('The provider matched nobody. Try describing the creator differently.');
      }
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : 'Could not reach the creator-data provider'),
  });

  /** Adds a discovered creator to the database. Demographics are fetched separately. */
  const addToDatabase = useMutation({
    mutationFn: (found: DiscoveredCreator) =>
      createCreator({
        name: found.name || found.handle,
        handle: found.handle,
        primaryPlatform: found.platform,
        followersCount: found.followers,
        erPercentage: found.er,
        location: found.location,
      }),
    onSuccess: (creator) => {
      queryClient.invalidateQueries({ queryKey: ['creators'] });
      toast.success(`@${creator.handle} added`);
      navigate(`/creators/${creator.id}`);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not add the creator'),
  });

  /** Requirement #26, in bulk: tops up whoever's demographics are oldest. */
  const refreshStalest = useMutation({
    mutationFn: () => refreshStalestCreators(10),
    onSuccess: (outcomes) => {
      const refreshed = outcomes.filter((o) => o.refreshed).length;
      queryClient.invalidateQueries({ queryKey: ['discovery-status'] });
      queryClient.invalidateQueries({ queryKey: ['creators'] });
      toast.success(
        refreshed === 0
          ? 'Nothing needed refreshing — every profile is inside the freshness window.'
          : `Refreshed ${refreshed} of ${outcomes.length} creator${outcomes.length === 1 ? '' : 's'}`,
      );
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not refresh'),
  });

  const credits = status.data?.credits;
  const lowOnCredits = credits !== undefined && credits < 10;

  return (
    <Page>
      <PageHeader
        title="Discover creators"
        subtitle="Search the creator-data provider by describing who you want, then add them to the database."
      />

      <AsyncBoundary isLoading={status.isLoading} error={status.error}>
        {!status.data?.live ? (
            <EmptyState
              title="Creator-data provider not connected"
              // Says exactly what to do rather than "unavailable".
              message="Set MODASH_API_KEY and INSIGHTS_PROVIDER=modash on the server, then reload. Until then the coverage and matching screens run on sample data."
            />
        ) : (
          <>
            <section className={ui.panel}>
                <div className={styles.modeSwitch}>
                  <Button
                    variant={mode === 'describe' ? 'primary' : 'secondary'}
                    onClick={() => switchMode('describe')}
                  >
                    Describe a creator
                  </Button>
                  <Button
                    variant={mode === 'competitor' ? 'primary' : 'secondary'}
                    onClick={() => switchMode('competitor')}
                  >
                    Who posts about a competitor
                  </Button>
                </div>

                <div className={styles.discoveryBar}>
                  <div className={styles.discoveryQuery}>
                    <Input
                      label={
                        mode === 'describe'
                          ? 'Describe the creator'
                          : 'Competitor hashtag or handle'
                      }
                      placeholder={
                        mode === 'describe'
                          ? 'Beauty creators in the north of England with a mostly female 25-34 audience'
                          : '#charlottetilbury'
                      }
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && query.trim()) search.mutate();
                      }}
                    />
                  </div>
                  {mode === 'describe' && (
                    <Select
                      label="Platform"
                      value={platform}
                      onChange={(event) => setPlatform(event.target.value)}
                    >
                      <option value="instagram">Instagram</option>
                      <option value="tiktok">TikTok</option>
                      <option value="youtube">YouTube</option>
                    </Select>
                  )}
                  <Button
                    onClick={() => search.mutate()}
                    disabled={!query.trim() || search.isPending}
                  >
                    {search.isPending ? 'Searching…' : 'Search'}
                  </Button>
                </div>

                <div className={styles.enrichBar}>
                  <p className={styles.balance}>
                    {status.data.balanceUnavailable ? (
                      'Balance unavailable — the provider did not answer.'
                    ) : (
                      <>
                        <span className={lowOnCredits ? styles.balanceLow : styles.balanceValue}>
                          {number.format(credits ?? 0)}
                        </span>
                        <span>
                          search credits left · {number.format(status.data.rawRequests ?? 0)} post
                          lookups · a search costs about 0.3, a demographics report costs 1
                        </span>
                      </>
                    )}
                  </p>
                  <Button
                    variant="secondary"
                    onClick={() => refreshStalest.mutate()}
                    disabled={refreshStalest.isPending}
                  >
                    {refreshStalest.isPending ? 'Refreshing…' : 'Refresh 10 stalest profiles'}
                  </Button>
                </div>
              </section>

              {results !== null && results.length > 0 && (
                <div className={styles.discoveryGrid}>
                  {results.map((found) => (
                    <article key={`${found.platform}-${found.handle}`} className={styles.discoveryCard}>
                      <p className={styles.discoveryHandle}>@{found.handle}</p>
                      <p className={styles.discoveryMeta}>{found.name}</p>
                      {mode === 'competitor' ? (
                        <p className={styles.discoveryMeta}>
                          {found.posts} post{found.posts === 1 ? '' : 's'} mentioning{' '}
                          {found.mention ?? query} · {number.format(found.engagements ?? 0)}{' '}
                          engagements
                        </p>
                      ) : (
                        <p className={styles.discoveryMeta}>
                          {number.format(found.followers)} followers
                          {found.er !== undefined && ` · ${found.er}% ER`}
                          {found.medianViews !== undefined &&
                            ` · ${number.format(found.medianViews)} median views`}
                        </p>
                      )}
                      {found.location && <p className={styles.discoveryMeta}>{found.location}</p>}
                      <div className={styles.discoveryFoot}>
                        {found.alreadyInDatabase ? (
                          <Button
                            variant="secondary"
                            onClick={() => navigate(`/creators/${found.existingCreatorId}`)}
                          >
                            Already added — open
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            onClick={() => addToDatabase.mutate(found)}
                            disabled={addToDatabase.isPending}
                          >
                            Add to database
                          </Button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {results !== null && results.length === 0 && (
                <EmptyState
                  title="Nobody matched"
                  message={
                    mode === 'describe'
                      ? 'The provider found no creators for that description. A shorter, plainer sentence usually works better than a list of criteria.'
                      : 'Nobody has posted under that hashtag recently. Check the spelling, or try the competitor\u2019s main brand tag.'
                  }
                />
              )}

              {results === null && (
                <EmptyState
                  title={
                    mode === 'describe'
                      ? 'Describe who you are looking for'
                      : 'Name a competitor hashtag'
                  }
                  message={
                    mode === 'describe'
                      ? 'Plain English works best: what they post about, roughly where they are, and who watches them. Filters you can already apply on the database screen are better applied there \u2014 this search costs credits.'
                      : 'Returns the creators posting under that tag, most active first. Nothing found here is added to the coverage log \u2014 a competitor\u2019s posts are not your client\u2019s coverage.'
                  }
                />
              )}
          </>
        )}
      </AsyncBoundary>
    </Page>
  );
};
