import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Page, PageHeader, AsyncBoundary, EmptyState, ui } from '../../components/common/PageShell';
import { Button } from '../../components/common/Button';
import { Select } from '../../components/common/Input';
import { Tag } from '../../components/common/Tag';
import { useToast } from '../../components/common/Toast';
import {
  chaseAllInsights,
  chaseInsight,
  fetchInsightRequests,
  markInsightReceived,
  refreshInsightRequests,
} from '../../services/reportingService';
import { fetchCampaigns } from '../../services/campaignService';
import { ApiError } from '../../services/apiClient';

/**
 * Requirement #52: chasing creators for the insights they have not sent.
 *
 * "Outstanding" means the brand sent to them and no coverage has been captured — the same
 * definition the reconciliation metric uses, so the two screens never disagree.
 */
export const InsightsPage: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [campaignId, setCampaignId] = useState('');

  const campaigns = useQuery({ queryKey: ['campaigns'], queryFn: () => fetchCampaigns() });

  const requests = useQuery({
    queryKey: ['insights', campaignId],
    queryFn: () => fetchInsightRequests(campaignId),
    enabled: Boolean(campaignId),
  });

  const onError = (error: unknown) =>
    toast.error(error instanceof ApiError ? error.message : 'That did not work');

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['insights', campaignId] });

  const refresh = useMutation({
    mutationFn: () => refreshInsightRequests(campaignId),
    onSuccess: (rows) => {
      invalidate();
      toast.success(
        rows.length === 0
          ? 'Everyone we sent to has posted — nothing outstanding.'
          : `${rows.length} creator${rows.length === 1 ? '' : 's'} outstanding`,
      );
    },
    onError,
  });

  const chaseAll = useMutation({
    mutationFn: () => chaseAllInsights(campaignId),
    onSuccess: (result) => {
      invalidate();
      toast.success(
        result.chased === 0
          ? 'Nobody to chase.'
          : `Chased ${result.chased} creator${result.chased === 1 ? '' : 's'}`,
      );
    },
    onError,
  });

  const chaseOne = useMutation({
    mutationFn: (requestId: string) => chaseInsight(requestId, campaignId),
    onSuccess: () => {
      invalidate();
      toast.success('Chaser sent');
    },
    onError,
  });

  const markReceived = useMutation({
    mutationFn: (requestId: string) => markInsightReceived(requestId),
    onSuccess: () => {
      invalidate();
      toast.success('Marked as received');
    },
    onError,
  });

  const outstanding = (requests.data ?? []).filter((row) => row.status !== 'RECEIVED');

  return (
    <Page>
      <PageHeader
        title="Insight chasing"
        subtitle="Creators we sent to who have not sent their post analytics back."
        actions={
          campaignId && (
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <Button
                variant="secondary"
                onClick={() => refresh.mutate()}
                disabled={refresh.isPending}
              >
                Rebuild list
              </Button>
              <Button
                onClick={() => chaseAll.mutate()}
                disabled={chaseAll.isPending || outstanding.length === 0}
              >
                Chase all outstanding
              </Button>
            </div>
          )
        }
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
          message="Insight chasing works per campaign, because who we sent to is recorded per campaign."
        />
      ) : (
        <AsyncBoundary
          isLoading={requests.isLoading}
          error={requests.error}
          onRetry={() => requests.refetch()}
          loadingLabel="Loading requests"
        >
          {requests.data && requests.data.length === 0 ? (
            <EmptyState
              title="Nothing outstanding"
              message="Rebuild the list to check again against who has posted since."
              action={
                <Button variant="secondary" onClick={() => refresh.mutate()}>
                  Rebuild list
                </Button>
              }
            />
          ) : (
            <div className={ui.tableWrap}>
              <table className={ui.table}>
                <thead>
                  <tr>
                    <th>Creator</th>
                    <th>Status</th>
                    <th className={ui.numeric}>Chases</th>
                    <th>Last chased</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {requests.data?.map((row) => (
                    <tr key={row.id}>
                      <td className={ui.cellStrong}>@{row.handle}</td>
                      <td>
                        <Tag
                          tone={
                            row.status === 'RECEIVED'
                              ? 'lime'
                              : row.status === 'CHASED'
                                ? 'lemon'
                                : 'peach'
                          }
                        >
                          {row.status.charAt(0) + row.status.slice(1).toLowerCase()}
                        </Tag>
                      </td>
                      <td className={ui.numeric}>{row.chaseCount}</td>
                      <td className={ui.cellMuted}>
                        {row.lastChasedAt
                          ? new Date(row.lastChasedAt).toLocaleDateString('en-GB')
                          : '—'}
                      </td>
                      <td>
                        {row.status !== 'RECEIVED' && (
                          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => chaseOne.mutate(row.id)}
                              disabled={chaseOne.isPending}
                            >
                              Chase
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => markReceived.mutate(row.id)}
                              disabled={markReceived.isPending}
                            >
                              Received
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AsyncBoundary>
      )}
    </Page>
  );
};
