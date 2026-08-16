import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Page, PageHeader, AsyncBoundary, EmptyState, ui } from '../../components/common/PageShell';
import { Button } from '../../components/common/Button';
import { Input, Select } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Tag } from '../../components/common/Tag';
import { useToast } from '../../components/common/Toast';
import {
  createShortlist,
  deleteShortlist,
  fetchCampaigns,
  fetchShortlist,
  fetchShortlists,
  promoteShortlist,
  removeCreatorFromShortlist,
} from '../../services/campaignService';
import { searchCreators } from '../../services/creatorService';
import { ApiError } from '../../services/apiClient';

/**
 * Requirement #27: shortlists are persisted server-side and promote onto the campaign board as
 * the Target List column. Previously nothing was saved and "promote" did nothing at all.
 */
export const ShortlistsPage: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [promoteId, setPromoteId] = useState<string | null>(null);

  const shortlists = useQuery({ queryKey: ['shortlists'], queryFn: fetchShortlists });

  const removeMutation = useMutation({
    mutationFn: (id: string) => deleteShortlist(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shortlists'] });
      toast.success('Shortlist deleted');
    },
  });

  return (
    <Page>
      <PageHeader
        title="Shortlists"
        subtitle="Saved creator lists. Team lists are visible to everyone on this brand."
        actions={
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            New shortlist
          </Button>
        }
      />

      <AsyncBoundary
        isLoading={shortlists.isLoading}
        error={shortlists.error}
        onRetry={() => shortlists.refetch()}
        loadingLabel="Loading shortlists"
      >
        {shortlists.data && shortlists.data.length === 0 ? (
          <EmptyState
            title="No shortlists yet"
            message="Select creators in the database and add them to a shortlist."
            action={
              <Button variant="primary" onClick={() => setCreateOpen(true)}>
                Create a shortlist
              </Button>
            }
          />
        ) : (
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Visibility</th>
                  <th className={ui.numeric}>Creators</th>
                  <th>Created</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {shortlists.data?.map((shortlist) => (
                  <tr key={shortlist.id}>
                    <td className={ui.cellStrong}>{shortlist.name}</td>
                    <td>
                      <Tag tone={shortlist.visibility === 'PRIVATE' ? 'peach' : 'neutral'}>
                        {shortlist.visibility}
                      </Tag>
                    </td>
                    <td className={ui.numeric}>{shortlist.creatorCount}</td>
                    <td className={ui.cellMuted}>
                      {new Date(shortlist.createdAt).toLocaleDateString('en-GB')}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <Button variant="ghost" size="sm" onClick={() => setOpenId(shortlist.id)}>
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPromoteId(shortlist.id)}
                        disabled={shortlist.creatorCount === 0}
                      >
                        Promote
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (window.confirm(`Delete "${shortlist.name}"?`)) {
                            removeMutation.mutate(shortlist.id);
                          }
                        }}
                      >
                        Delete
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
        <CreateShortlistModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            queryClient.invalidateQueries({ queryKey: ['shortlists'] });
            toast.success('Shortlist created');
          }}
        />
      )}

      {openId && <ShortlistDetailModal id={openId} onClose={() => setOpenId(null)} />}

      {promoteId && (
        <PromoteModal
          shortlistId={promoteId}
          onClose={() => setPromoteId(null)}
          onDone={(count, column) => {
            setPromoteId(null);
            queryClient.invalidateQueries({ queryKey: ['shortlists'] });
            toast.success(`Promoted ${count} creator(s) into "${column}"`);
          }}
        />
      )}
    </Page>
  );
};

const CreateShortlistModal: React.FC<{ onClose: () => void; onCreated: () => void }> = ({
  onClose,
  onCreated,
}) => {
  const toast = useToast();
  const [name, setName] = useState('');
  const [visibility, setVisibility] = useState<'TEAM' | 'PRIVATE'>('TEAM');

  const mutation = useMutation({
    mutationFn: () => createShortlist({ name, visibility }),
    onSuccess: onCreated,
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not create shortlist'),
  });

  return (
    <Modal
      title="New shortlist"
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
      <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
      <Select
        label="Visibility"
        value={visibility}
        onChange={(e) => setVisibility(e.target.value as 'TEAM' | 'PRIVATE')}
      >
        <option value="TEAM">Team — everyone on this brand can see it</option>
        <option value="PRIVATE">Private — only you</option>
      </Select>
    </Modal>
  );
};

const ShortlistDetailModal: React.FC<{ id: string; onClose: () => void }> = ({ id, onClose }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const detail = useQuery({ queryKey: ['shortlist', id], queryFn: () => fetchShortlist(id) });
  const creators = useQuery({
    queryKey: ['shortlist-creators', id, detail.data?.creatorIds],
    queryFn: async () => {
      const all = await searchCreators({ size: 200 });
      return all.items.filter((c) => detail.data?.creatorIds.includes(c.id));
    },
    enabled: !!detail.data,
  });

  const removeMutation = useMutation({
    mutationFn: (creatorId: string) => removeCreatorFromShortlist(id, creatorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shortlist', id] });
      queryClient.invalidateQueries({ queryKey: ['shortlists'] });
    },
  });

  return (
    <Modal title={detail.data?.name ?? 'Shortlist'} onClose={onClose} wide>
      <AsyncBoundary isLoading={detail.isLoading || creators.isLoading} error={detail.error}>
        {creators.data?.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)' }}>
            No creators on this shortlist yet.
          </p>
        ) : (
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th>Creator</th>
                  <th className={ui.numeric}>Followers</th>
                  <th className={ui.numeric}>ER</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {creators.data?.map((creator) => (
                  <tr key={creator.id}>
                    <td className={ui.cellStrong}>@{creator.handle}</td>
                    <td className={ui.numeric}>{creator.followersDisplay}</td>
                    <td className={ui.numeric}>{Number(creator.erPercentage).toFixed(1)}%</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/creators/${creator.id}`)}>
                        View
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => removeMutation.mutate(creator.id)}>
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AsyncBoundary>
    </Modal>
  );
};

const PromoteModal: React.FC<{
  shortlistId: string;
  onClose: () => void;
  onDone: (count: number, column: string) => void;
}> = ({ shortlistId, onClose, onDone }) => {
  const toast = useToast();
  const [campaignId, setCampaignId] = useState('');
  const campaigns = useQuery({ queryKey: ['campaigns'], queryFn: () => fetchCampaigns() });

  const mutation = useMutation({
    mutationFn: () => promoteShortlist(shortlistId, campaignId),
    onSuccess: (result) => onDone(result.promotedCount, result.targetColumn),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not promote shortlist'),
  });

  return (
    <Modal
      title="Promote to a campaign board"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!campaignId || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Promoting…' : 'Promote'}
          </Button>
        </>
      }
    >
      <p style={{ margin: 0, fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
        Every creator on this shortlist becomes a card in the campaign board&rsquo;s{' '}
        <strong>Target List</strong> stage. Creators already on the board are skipped.
      </p>
      <Select label="Campaign" value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
        <option value="">Choose a campaign…</option>
        {campaigns.data?.items.map((campaign) => (
          <option key={campaign.id} value={campaign.id}>
            {campaign.name}
          </option>
        ))}
      </Select>
    </Modal>
  );
};
