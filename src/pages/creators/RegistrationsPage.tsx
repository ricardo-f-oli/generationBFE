import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Page, PageHeader, AsyncBoundary, EmptyState, ui } from '../../components/common/PageShell';
import { Button } from '../../components/common/Button';
import { Tag, humanise } from '../../components/common/Tag';
import { useToast } from '../../components/common/Toast';
import {
  approveRegistration,
  fetchPendingRegistrations,
  rejectRegistration,
} from '../../services/creatorService';

/**
 * Requirement #20: creators who self-register queue for team review.
 * The backend set PENDING_REVIEW all along; there was no way to see or action the queue.
 */
export const RegistrationsPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const pending = useQuery({
    queryKey: ['pending-registrations'],
    queryFn: () => fetchPendingRegistrations(0, 50),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['pending-registrations'] });
    queryClient.invalidateQueries({ queryKey: ['creators'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const approve = useMutation({
    mutationFn: (id: string) => approveRegistration(id),
    onSuccess: () => {
      invalidate();
      toast.success('Creator approved and added to the database');
    },
  });

  const reject = useMutation({
    mutationFn: (id: string) => rejectRegistration(id),
    onSuccess: () => {
      invalidate();
      toast.info('Registration rejected');
    },
  });

  return (
    <Page>
      <PageHeader
        title="Creator registrations"
        subtitle="Self sign-ups awaiting review"
      />

      <AsyncBoundary
        isLoading={pending.isLoading}
        error={pending.error}
        onRetry={() => pending.refetch()}
        loadingLabel="Loading registrations"
      >
        {pending.data && pending.data.items.length === 0 ? (
          <EmptyState
            title="Nothing to review"
            message="New sign-ups from the public creator form will appear here."
          />
        ) : (
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th>Creator</th>
                  <th>Email</th>
                  <th>Platform</th>
                  <th>Niche</th>
                  <th>Band</th>
                  <th>Applied</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pending.data?.items.map((creator) => (
                  <tr key={creator.id}>
                    <td className={ui.cellStrong}>
                      <button
                        type="button"
                        onClick={() => navigate(`/creators/${creator.id}`)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          font: 'inherit',
                          color: 'inherit',
                          cursor: 'pointer',
                        }}
                      >
                        @{creator.handle}
                      </button>
                      <div style={{ fontWeight: 400, color: 'var(--text-muted)' }}>
                        {creator.name}
                      </div>
                    </td>
                    <td className={ui.cellMuted}>{creator.email ?? '—'}</td>
                    <td>
                      <Tag tone="neutral">{humanise(creator.primaryPlatform)}</Tag>
                    </td>
                    <td className={ui.cellMuted}>{creator.niche ?? '—'}</td>
                    <td className={ui.cellMuted}>{creator.followerBand}</td>
                    <td className={ui.cellMuted}>
                      {new Date(creator.createdAt).toLocaleDateString('en-GB')}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => reject.mutate(creator.id)}
                        disabled={reject.isPending}
                      >
                        Reject
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => approve.mutate(creator.id)}
                        disabled={approve.isPending}
                      >
                        Approve
                      </Button>
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
