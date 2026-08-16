import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Page, PageHeader, AsyncBoundary, EmptyState, ui } from '../../components/common/PageShell';
import { Button } from '../../components/common/Button';
import { Select } from '../../components/common/Input';
import { Tag, statusTone, humanise } from '../../components/common/Tag';
import { useToast } from '../../components/common/Toast';
import { fetchWaitlist, fetchWaitlistStats, rejectWaitlistEntry } from '../../services/marketingService';
import { createCreator } from '../../services/creatorService';
import { convertWaitlistEntry } from '../../services/marketingService';
import { ApiError } from '../../services/apiClient';

/** Requirement #48: the waitlist, and its conversion into the creator database. */
export const WaitlistPage: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');

  const stats = useQuery({ queryKey: ['waitlist-stats'], queryFn: fetchWaitlistStats });
  const entries = useQuery({
    queryKey: ['waitlist', status],
    queryFn: () => fetchWaitlist(status || undefined),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['waitlist'] });
    queryClient.invalidateQueries({ queryKey: ['waitlist-stats'] });
    queryClient.invalidateQueries({ queryKey: ['creators'] });
  };

  /** Converting creates a real creator, then marks the entry converted. */
  const convert = useMutation({
    mutationFn: async (entry: { id: string; email: string; name: string | null; handle: string | null; primaryPlatform: string | null; niche: string | null }) => {
      const creator = await createCreator({
        name: entry.name ?? entry.email.split('@')[0],
        handle: entry.handle ?? entry.email.split('@')[0],
        email: entry.email,
        primaryPlatform: entry.primaryPlatform ?? 'INSTAGRAM',
        niche: entry.niche ?? undefined,
      });
      return convertWaitlistEntry(entry.id, creator.id);
    },
    onSuccess: () => {
      invalidate();
      toast.success('Added to the creator database');
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : 'Could not convert this sign-up'),
  });

  const reject = useMutation({
    mutationFn: (id: string) => rejectWaitlistEntry(id),
    onSuccess: () => {
      invalidate();
      toast.info('Sign-up rejected');
    },
  });

  const landingUrl = `${window.location.origin}/join`;

  return (
    <Page>
      <PageHeader
        title="Marketing waitlist"
        subtitle="Sign-ups from the public landing page"
        actions={
          <Button
            variant="secondary"
            onClick={() => {
              navigator.clipboard?.writeText(landingUrl);
              toast.success('Landing page link copied');
            }}
          >
            Copy landing page link
          </Button>
        }
      />

      <div className={ui.statGrid}>
        <div className={ui.stat}>
          <p className={ui.statLabel}>Total</p>
          <div className={ui.statValue}>{stats.data?.total ?? 0}</div>
        </div>
        <div className={`${ui.stat} ${ui.statTintLemon}`}>
          <p className={ui.statLabel}>Pending</p>
          <div className={ui.statValue}>{stats.data?.pending ?? 0}</div>
        </div>
        <div className={`${ui.stat} ${ui.statTintPeach}`}>
          <p className={ui.statLabel}>Confirmed</p>
          <div className={ui.statValue}>{stats.data?.confirmed ?? 0}</div>
        </div>
        <div className={`${ui.stat} ${ui.statTintLime}`}>
          <p className={ui.statLabel}>Converted</p>
          <div className={ui.statValue}>{stats.data?.converted ?? 0}</div>
        </div>
      </div>

      <div style={{ maxWidth: 240 }}>
        <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option>
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CONVERTED">Converted</option>
          <option value="REJECTED">Rejected</option>
        </Select>
      </div>

      <AsyncBoundary
        isLoading={entries.isLoading}
        error={entries.error}
        onRetry={() => entries.refetch()}
        loadingLabel="Loading waitlist"
      >
        {entries.data && entries.data.items.length === 0 ? (
          <EmptyState
            title="No sign-ups yet"
            message={`Share the landing page: ${landingUrl}`}
          />
        ) : (
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Handle</th>
                  <th>Platform</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {entries.data?.items.map((entry) => (
                  <tr key={entry.id}>
                    <td className={ui.cellStrong}>{entry.email}</td>
                    <td className={ui.cellMuted}>{entry.name ?? '—'}</td>
                    <td className={ui.cellMuted}>{entry.handle ? `@${entry.handle}` : '—'}</td>
                    <td className={ui.cellMuted}>{humanise(entry.primaryPlatform)}</td>
                    <td>
                      <Tag tone={statusTone(entry.status)}>{humanise(entry.status)}</Tag>
                    </td>
                    <td className={ui.cellMuted}>
                      {new Date(entry.createdAt).toLocaleDateString('en-GB')}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {entry.status !== 'CONVERTED' && entry.status !== 'REJECTED' && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => reject.mutate(entry.id)}>
                            Reject
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={convert.isPending}
                            onClick={() => convert.mutate(entry)}
                          >
                            Add as creator
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AsyncBoundary>
    </Page>
  );
};
