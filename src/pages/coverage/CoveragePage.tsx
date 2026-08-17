import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Page, PageHeader, AsyncBoundary, EmptyState, ui } from '../../components/common/PageShell';
import { Button } from '../../components/common/Button';
import { Input, Select } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Tag } from '../../components/common/Tag';
import { useToast } from '../../components/common/Toast';
import { useDebouncedValue } from '../../components/common/useDebouncedValue';
import {
  clipBrandMentions,
  clipCreatorActivity,
  createCoverageItem,
  deleteCoverageItem,
  downloadCoverageExport,
  fetchCoverageLog,
} from '../../services/coverageService';
import { ApiError } from '../../services/apiClient';
import type { ClipResult } from '../../types';

const number = new Intl.NumberFormat('en-GB');

/**
 * Requirements #11–#14: the coverage log.
 *
 * Q-C1: this list is brand-scoped server-side. It used to call `findAll()` and show every
 * tenant's clippings to whoever asked.
 */
export const CoveragePage: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [query, setQuery] = useState('');
  const [platform, setPlatform] = useState('');
  const [unsolicited, setUnsolicited] = useState('');
  const [page, setPage] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [clipResult, setClipResult] = useState<ClipResult | null>(null);

  const debouncedQuery = useDebouncedValue(query, 300);

  const coverage = useQuery({
    queryKey: ['coverage', debouncedQuery, platform, unsolicited, page],
    queryFn: () =>
      fetchCoverageLog({
        query: debouncedQuery || undefined,
        platform: platform || undefined,
        unsolicited: unsolicited === '' ? undefined : unsolicited === 'true',
        page,
        size: 50,
      }),
  });

  const onError = (error: unknown) =>
    toast.error(error instanceof ApiError ? error.message : 'That did not work');

  const mentions = useMutation({
    mutationFn: () => clipBrandMentions(25),
    onSuccess: (result) => {
      setClipResult(result);
      queryClient.invalidateQueries({ queryKey: ['coverage'] });
      toast.success(
        result.captured === 0
          ? `Nothing new — all ${result.duplicates} found posts were already logged.`
          : `${result.captured} new post${result.captured === 1 ? '' : 's'} logged`,
      );
    },
    onError,
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteCoverageItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coverage'] });
      toast.success('Removed from the log');
    },
    onError,
  });

  const exportLog = useMutation({
    mutationFn: (format: 'excel' | 'csv') => downloadCoverageExport(format),
    onError,
  });

  const items = coverage.data?.items ?? [];
  const totals = items.reduce(
    (acc, item) => ({
      views: acc.views + item.views,
      engagements: acc.engagements + item.likes + item.comments + (item.shares ?? 0) + (item.saves ?? 0),
    }),
    { views: 0, engagements: 0 },
  );

  return (
    <Page>
      <PageHeader
        title="Coverage log"
        subtitle="Every post captured for this brand, solicited or not."
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <Button
              variant="secondary"
              onClick={() => mentions.mutate()}
              disabled={mentions.isPending}
            >
              Find brand mentions
            </Button>
            <Button variant="secondary" onClick={() => exportLog.mutate('excel')}>
              Export
            </Button>
            <Button onClick={() => setAddOpen(true)}>Log a post</Button>
          </div>
        }
      />

      {clipResult && clipResult.duplicates > 0 && (
        <div className={ui.noticeBanner}>
          {clipResult.duplicates} post{clipResult.duplicates === 1 ? ' was' : 's were'} already in
          the log and {clipResult.duplicates === 1 ? 'was' : 'were'} skipped.
        </div>
      )}

      <div className={ui.statGrid}>
        <div className={`${ui.stat} ${ui.statTintPeach}`}>
          <p className={ui.statLabel}>Posts on this page</p>
          <div className={ui.statValue}>{items.length}</div>
        </div>
        <div className={`${ui.stat} ${ui.statTintLime}`}>
          <p className={ui.statLabel}>Views</p>
          <div className={ui.statValue}>{number.format(totals.views)}</div>
        </div>
        <div className={`${ui.stat} ${ui.statTintLemon}`}>
          <p className={ui.statLabel}>Engagements</p>
          <div className={ui.statValue}>{number.format(totals.engagements)}</div>
        </div>
      </div>

      <div className={ui.filterBar}>
        <Input
          label="Search"
          placeholder="Handle or clipping name"
          value={query}
          onChange={(event) => {
            setPage(0);
            setQuery(event.target.value);
          }}
        />
        <Select
          label="Platform"
          value={platform}
          onChange={(event) => {
            setPage(0);
            setPlatform(event.target.value);
          }}
        >
          <option value="">All platforms</option>
          <option value="INSTAGRAM">Instagram</option>
          <option value="TIKTOK">TikTok</option>
          <option value="YOUTUBE">YouTube</option>
        </Select>
        <Select
          label="Type"
          value={unsolicited}
          onChange={(event) => {
            setPage(0);
            setUnsolicited(event.target.value);
          }}
        >
          <option value="">Everything</option>
          <option value="false">Solicited only</option>
          <option value="true">Unsolicited only</option>
        </Select>
      </div>

      <AsyncBoundary
        isLoading={coverage.isLoading}
        error={coverage.error}
        onRetry={() => coverage.refetch()}
        loadingLabel="Loading coverage"
      >
        {items.length === 0 ? (
          <EmptyState
            title="No coverage captured"
            message="Log a post by hand, or search for posts that mention the brand."
            action={<Button onClick={() => setAddOpen(true)}>Log a post</Button>}
          />
        ) : (
          <>
            <div className={ui.tableWrap}>
              <table className={ui.table}>
                <thead>
                  <tr>
                    <th>Clipping name</th>
                    <th>Creator</th>
                    <th>Platform</th>
                    <th>Form</th>
                    <th className={ui.numeric}>Views</th>
                    <th className={ui.numeric}>ER</th>
                    <th>Posted</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className={ui.cellMuted} style={{ fontSize: 'var(--fs-xs)' }}>
                        {item.standardizedName}
                      </td>
                      <td className={ui.cellStrong}>
                        @{item.creatorHandle}
                        {item.unsolicited && (
                          <>
                            {' '}
                            <Tag tone="brand">Unsolicited</Tag>
                          </>
                        )}
                      </td>
                      <td>{item.platform}</td>
                      <td>{item.contentForm === 'LONG' ? 'Long' : 'Short'}</td>
                      <td className={ui.numeric}>{number.format(item.views)}</td>
                      <td className={ui.numeric}>{item.er}%</td>
                      <td className={ui.cellMuted}>
                        {new Date(item.postedAt).toLocaleDateString('en-GB')}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                          {item.url && (
                            <a href={item.url} target="_blank" rel="noreferrer">
                              View
                            </a>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => remove.mutate(item.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {coverage.data && coverage.data.meta.totalPages > 1 && (
              <div className={ui.pagination}>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Previous
                </Button>
                <span className={ui.pageInfo}>
                  Page {page + 1} of {coverage.data.meta.totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page + 1 >= coverage.data.meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </AsyncBoundary>

      {addOpen && (
        <LogPostModal
          onClose={() => setAddOpen(false)}
          onSaved={() => {
            setAddOpen(false);
            queryClient.invalidateQueries({ queryKey: ['coverage'] });
            toast.success('Logged');
          }}
        />
      )}
    </Page>
  );
};

const LogPostModal: React.FC<{ onClose: () => void; onSaved: () => void }> = ({
  onClose,
  onSaved,
}) => {
  const toast = useToast();
  const [form, setForm] = useState({
    creatorHandle: '',
    platform: 'INSTAGRAM',
    postType: 'REEL',
    url: '',
    views: '',
    likes: '',
    comments: '',
    shares: '',
    saves: '',
    unsolicited: false,
  });

  const numberOrUndefined = (value: string) =>
    value.trim() === '' ? undefined : Number(value);

  const mutation = useMutation({
    mutationFn: () =>
      createCoverageItem({
        creatorHandle: form.creatorHandle,
        platform: form.platform,
        postType: form.postType,
        url: form.url || undefined,
        views: numberOrUndefined(form.views),
        likes: numberOrUndefined(form.likes),
        comments: numberOrUndefined(form.comments),
        shares: numberOrUndefined(form.shares),
        saves: numberOrUndefined(form.saves),
        unsolicited: form.unsolicited,
      }),
    onSuccess: onSaved,
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not log the post'),
  });

  return (
    <Modal
      title="Log a post"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!form.creatorHandle.trim() || mutation.isPending}
          >
            Log it
          </Button>
        </>
      }
    >
      <Input
        label="Creator handle"
        placeholder="@davidtech"
        value={form.creatorHandle}
        onChange={(event) => setForm({ ...form, creatorHandle: event.target.value })}
      />
      <Input
        label="Post URL"
        value={form.url}
        onChange={(event) => setForm({ ...form, url: event.target.value })}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
        <Select
          label="Platform"
          value={form.platform}
          onChange={(event) => setForm({ ...form, platform: event.target.value })}
        >
          <option value="INSTAGRAM">Instagram</option>
          <option value="TIKTOK">TikTok</option>
          <option value="YOUTUBE">YouTube</option>
        </Select>
        <Select
          label="Post type"
          value={form.postType}
          onChange={(event) => setForm({ ...form, postType: event.target.value })}
        >
          <option value="REEL">Reel</option>
          <option value="STORY">Story</option>
          <option value="POST">Post</option>
          <option value="TIKTOK">TikTok</option>
          <option value="YOUTUBE">YouTube video</option>
        </Select>
        <Input
          label="Views"
          type="number"
          value={form.views}
          onChange={(event) => setForm({ ...form, views: event.target.value })}
        />
        <Input
          label="Likes"
          type="number"
          value={form.likes}
          onChange={(event) => setForm({ ...form, likes: event.target.value })}
        />
        <Input
          label="Comments"
          type="number"
          value={form.comments}
          onChange={(event) => setForm({ ...form, comments: event.target.value })}
        />
        <Input
          label="Shares"
          type="number"
          value={form.shares}
          onChange={(event) => setForm({ ...form, shares: event.target.value })}
        />
        <Input
          label="Saves"
          type="number"
          value={form.saves}
          onChange={(event) => setForm({ ...form, saves: event.target.value })}
        />
      </div>

      <label style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
        <input
          type="checkbox"
          checked={form.unsolicited}
          onChange={(event) => setForm({ ...form, unsolicited: event.target.checked })}
        />
        <span>Unsolicited — we did not send this creator anything</span>
      </label>
    </Modal>
  );
};
