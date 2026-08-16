import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Page, PageHeader, AsyncBoundary, EmptyState, ui } from '../../components/common/PageShell';
import { Button } from '../../components/common/Button';
import { Input, Select } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Tag, statusTone, humanise } from '../../components/common/Tag';
import { useToast } from '../../components/common/Toast';
import {
  archiveCampaign,
  createCampaign,
  fetchCampaigns,
  unarchiveCampaign,
} from '../../services/campaignService';
import { ApiError } from '../../services/apiClient';
import type { CampaignStatus, CampaignType } from '../../types';

/** Q-E24: create, update, archive, unarchive, delete — the full lifecycle. */
export const CampaignsPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<CampaignStatus | ''>('');
  const [createOpen, setCreateOpen] = useState(false);

  const campaigns = useQuery({
    queryKey: ['campaigns', status],
    queryFn: () => fetchCampaigns(status || undefined),
  });

  const archive = useMutation({
    mutationFn: ({ id, archived }: { id: string; archived: boolean }) =>
      archived ? unarchiveCampaign(id) : archiveCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campaign updated');
    },
  });

  return (
    <Page>
      <PageHeader
        title="Campaigns"
        subtitle="Every campaign for this brand"
        actions={
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            New campaign
          </Button>
        }
      />

      <div style={{ maxWidth: 260 }}>
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as CampaignStatus | '')}
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PAUSED">Paused</option>
          <option value="COMPLETED">Completed</option>
          <option value="ARCHIVED">Archived</option>
        </Select>
      </div>

      <AsyncBoundary
        isLoading={campaigns.isLoading}
        error={campaigns.error}
        onRetry={() => campaigns.refetch()}
        loadingLabel="Loading campaigns"
      >
        {campaigns.data && campaigns.data.items.length === 0 ? (
          <EmptyState
            title="No campaigns yet"
            message="Create one to start building a board and shortlist."
            action={
              <Button variant="primary" onClick={() => setCreateOpen(true)}>
                New campaign
              </Button>
            }
          />
        ) : (
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {campaigns.data?.items.map((campaign) => (
                  <tr key={campaign.id}>
                    <td className={ui.cellStrong}>{campaign.name}</td>
                    <td className={ui.cellMuted}>{humanise(campaign.campaignType)}</td>
                    <td>
                      <Tag tone={statusTone(campaign.status)}>{humanise(campaign.status)}</Tag>
                    </td>
                    <td className={ui.cellMuted}>
                      {new Date(campaign.createdAt).toLocaleDateString('en-GB')}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/campaigns/board?campaignId=${campaign.id}`)}
                      >
                        Open board
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          archive.mutate({
                            id: campaign.id,
                            archived: campaign.status === 'ARCHIVED',
                          })
                        }
                      >
                        {campaign.status === 'ARCHIVED' ? 'Unarchive' : 'Archive'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AsyncBoundary>

      {createOpen && (
        <CreateCampaignModal
          onClose={() => setCreateOpen(false)}
          onCreated={(id) => {
            setCreateOpen(false);
            queryClient.invalidateQueries({ queryKey: ['campaigns'] });
            toast.success('Campaign created');
            navigate(`/campaigns/board?campaignId=${id}`);
          }}
        />
      )}
    </Page>
  );
};

const CreateCampaignModal: React.FC<{
  onClose: () => void;
  onCreated: (id: string) => void;
}> = ({ onClose, onCreated }) => {
  const toast = useToast();
  const [name, setName] = useState('');
  const [type, setType] = useState<CampaignType>('SEEDING');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      createCampaign({
        name,
        campaignType: type,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
      }),
    onSuccess: (campaign) => onCreated(campaign.id),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not create campaign'),
  });

  return (
    <Modal
      title="New campaign"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!name || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Creating…' : 'Create'}
          </Button>
        </>
      }
    >
      <Input
        label="Campaign name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Mediheal Spring Seeding"
      />
      <Select label="Type" value={type} onChange={(e) => setType(e.target.value as CampaignType)}>
        <option value="SEEDING">Seeding</option>
        <option value="PAID">Paid partnership</option>
        <option value="GIFTING">Gifting</option>
        <option value="EVENT">Event</option>
      </Select>
      <p style={{ margin: 0, fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
        The board stages come from your brand&rsquo;s template for this campaign type.
      </p>
      <Input label="Start date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      <Input label="End date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
    </Modal>
  );
};
