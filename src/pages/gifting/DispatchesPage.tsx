import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Page, PageHeader, AsyncBoundary, EmptyState, ui } from '../../components/common/PageShell';
import { Button } from '../../components/common/Button';
import { Input, Select, TextArea } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Tag, statusTone, humanise } from '../../components/common/Tag';
import { useToast } from '../../components/common/Toast';
import {
  downloadFulfilmentList,
  fetchGiftingLog,
  runGiftReminders,
  updateDispatchStatus,
} from '../../services/giftingService';
import { ApiError } from '../../services/apiClient';
import type { GiftingRow } from '../../types';
import styles from './Gifting.module.css';

const STATUSES = [
  'READY_TO_DISPATCH',
  'DISPATCHED',
  'DELIVERED',
  'RETURNED',
  'DECLINED',
] as const;

/**
 * Requirements #45–#48: the dispatch log.
 *
 * Marking a parcel RETURNED or DECLINED also excludes that creator from future gifting
 * (requirement #47), so the confirm step says so before you commit to it.
 */
export const DispatchesPage: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [editing, setEditing] = useState<GiftingRow | null>(null);

  const dispatches = useQuery({ queryKey: ['gifting-log'], queryFn: fetchGiftingLog });

  const onError = (error: unknown) =>
    toast.error(error instanceof ApiError ? error.message : 'That did not work');

  const reminders = useMutation({
    mutationFn: runGiftReminders,
    onSuccess: (result) =>
      toast.success(
        result.sent === 0
          ? 'No reminders were due today.'
          : `${result.sent} reminder${result.sent === 1 ? '' : 's'} sent`,
      ),
    onError,
  });

  const exportList = useMutation({ mutationFn: () => downloadFulfilmentList(), onError });

  const rows = (dispatches.data ?? []).filter(
    (row) => !statusFilter || row.status === statusFilter,
  );

  const awaitingAddress = (dispatches.data ?? []).filter(
    (row) => row.addressStatus === 'PENDING',
  ).length;

  return (
    <Page>
      <PageHeader
        title="Dispatches"
        subtitle="Every parcel this brand has sent, and where it got to."
        actions={
          <div className={styles.actions}>
            <Button variant="secondary" onClick={() => reminders.mutate()}>
              Run reminders now
            </Button>
            <Button variant="secondary" onClick={() => exportList.mutate()}>
              Export ready-to-dispatch
            </Button>
          </div>
        }
      />

      {awaitingAddress > 0 && (
        <div className={ui.noticeBanner}>
          <strong>{awaitingAddress}</strong> dispatch{awaitingAddress === 1 ? '' : 'es'} still
          have no confirmed address. Request one from the gifting runs screen.
        </div>
      )}

      <div className={ui.filterBar}>
        <Select
          label="Status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="">All statuses</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {humanise(status)}
            </option>
          ))}
        </Select>
      </div>

      <AsyncBoundary
        isLoading={dispatches.isLoading}
        error={dispatches.error}
        onRetry={() => dispatches.refetch()}
        loadingLabel="Loading dispatches"
      >
        {rows.length === 0 ? (
          <EmptyState
            title="No dispatches"
            message="Create a gifting run and add creators to it to start sending."
          />
        ) : (
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th>Creator</th>
                  <th>Product</th>
                  <th>Address</th>
                  <th>Courier</th>
                  <th>Tracking</th>
                  <th>Deadline</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className={ui.cellStrong}>@{row.handle}</td>
                    <td>{row.productName ?? '—'}</td>
                    <td>
                      <Tag tone={row.addressStatus === 'CAPTURED' ? 'lime' : 'peach'}>
                        {row.addressStatus === 'CAPTURED' ? 'Confirmed' : 'Not yet given'}
                      </Tag>
                    </td>
                    <td>{row.courier ?? '—'}</td>
                    <td className={ui.cellMuted}>{row.trackingNumber ?? '—'}</td>
                    <td className={ui.cellMuted}>{row.contentDeadline ?? '—'}</td>
                    <td>
                      <Tag tone={statusTone(row.status)}>{humanise(row.status)}</Tag>
                    </td>
                    <td>
                      <Button size="sm" variant="secondary" onClick={() => setEditing(row)}>
                        Update
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AsyncBoundary>

      {editing && (
        <StatusModal
          dispatch={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            queryClient.invalidateQueries({ queryKey: ['gifting-log'] });
            toast.success('Dispatch updated');
          }}
        />
      )}
    </Page>
  );
};

const StatusModal: React.FC<{
  dispatch: GiftingRow;
  onClose: () => void;
  onSaved: () => void;
}> = ({ dispatch, onClose, onSaved }) => {
  const toast = useToast();
  const [status, setStatus] = useState<string>(dispatch.status);
  const [trackingNumber, setTrackingNumber] = useState(dispatch.trackingNumber ?? '');
  const [courier, setCourier] = useState(dispatch.courier ?? '');
  const [returnReason, setReturnReason] = useState(dispatch.returnReason ?? '');

  const excludes = status === 'RETURNED' || status === 'DECLINED';

  const mutation = useMutation({
    mutationFn: () =>
      updateDispatchStatus(dispatch.id, {
        status,
        trackingNumber: trackingNumber || undefined,
        courier: courier || undefined,
        returnReason: returnReason || undefined,
      }),
    onSuccess: onSaved,
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not update the dispatch'),
  });

  return (
    <Modal
      title={`@${dispatch.handle}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={excludes ? 'danger' : 'primary'}
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {excludes ? 'Save and exclude' : 'Save'}
          </Button>
        </>
      }
    >
      <Select
        label="Status"
        value={status}
        onChange={(event) => setStatus(event.target.value)}
      >
        {STATUSES.map((option) => (
          <option key={option} value={option}>
            {humanise(option)}
          </option>
        ))}
      </Select>

      <Input
        label="Courier"
        value={courier}
        onChange={(event) => setCourier(event.target.value)}
      />
      <Input
        label="Tracking number"
        value={trackingNumber}
        onChange={(event) => setTrackingNumber(event.target.value)}
      />

      {excludes && (
        <>
          <TextArea
            label="Reason"
            rows={2}
            value={returnReason}
            onChange={(event) => setReturnReason(event.target.value)}
          />
          <div className={ui.noticeBanner}>
            <strong>This excludes @{dispatch.handle} from future gifting.</strong> They will be
            skipped on every brand until an admin clears the flag.
          </div>
        </>
      )}
    </Modal>
  );
};
