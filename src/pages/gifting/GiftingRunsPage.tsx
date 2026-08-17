import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Page, PageHeader, AsyncBoundary, EmptyState, ui } from '../../components/common/PageShell';
import { Button } from '../../components/common/Button';
import { Input, TextArea } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Tag, statusTone } from '../../components/common/Tag';
import { useToast } from '../../components/common/Toast';
import {
  approveCompSlip,
  createBrandOrder,
  createDispatches,
  createGiftingRun,
  downloadFulfilmentList,
  fetchBrandOrders,
  fetchGiftingRuns,
  rejectCompSlip,
  requestAddresses,
} from '../../services/giftingService';
import { ApiError } from '../../services/apiClient';
import type { DispatchCreationResult, GiftingRun } from '../../types';
import { CreatorPicker } from './CreatorPicker';
import styles from './Gifting.module.css';

type Dialog =
  | { kind: 'create-run' }
  | { kind: 'comp-slip'; run: GiftingRun }
  | { kind: 'dispatch'; run: GiftingRun }
  | { kind: 'addresses' }
  | { kind: 'brand-order'; run: GiftingRun | null }
  | null;

/**
 * Requirements #41 and #43–#46: gifting runs, comp slip sign-off, dispatch creation, address
 * capture and direct-from-brand orders.
 */
export const GiftingRunsPage: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [dialog, setDialog] = useState<Dialog>(null);

  const runs = useQuery({ queryKey: ['gifting-runs'], queryFn: fetchGiftingRuns });
  const brandOrders = useQuery({ queryKey: ['brand-orders'], queryFn: fetchBrandOrders });

  const onError = (error: unknown) =>
    toast.error(error instanceof ApiError ? error.message : 'That did not work');

  const approve = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => approveCompSlip(id, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gifting-runs'] });
      setDialog(null);
      toast.success('Comp slip approved — this run can now ship');
    },
    onError,
  });

  const reject = useMutation({
    mutationFn: (id: string) => rejectCompSlip(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gifting-runs'] });
      toast.success('Comp slip sent back');
    },
    onError,
  });

  const exportList = useMutation({
    mutationFn: (runId?: string) => downloadFulfilmentList(runId),
    onError,
  });

  return (
    <Page>
      <PageHeader
        title="Gifting runs"
        subtitle="A run is a batch of product. Nothing ships until its comp slip is signed off."
        actions={
          <div className={styles.actions}>
            <Button variant="secondary" onClick={() => setDialog({ kind: 'addresses' })}>
              Request addresses
            </Button>
            <Button onClick={() => setDialog({ kind: 'create-run' })}>New run</Button>
          </div>
        }
      />

      <AsyncBoundary
        isLoading={runs.isLoading}
        error={runs.error}
        onRetry={() => runs.refetch()}
        loadingLabel="Loading runs"
      >
        {runs.data && runs.data.length === 0 ? (
          <EmptyState
            title="No gifting runs yet"
            message="Create a run, approve its comp slip, then add the creators you are sending to."
            action={<Button onClick={() => setDialog({ kind: 'create-run' })}>New run</Button>}
          />
        ) : (
          <div className={ui.cardGrid}>
            {runs.data?.map((run) => (
              <article key={run.id} className={styles.runCard}>
                <div className={styles.runTop}>
                  <div>
                    <h2 className={styles.runName}>{run.name}</h2>
                    {run.productName && (
                      <p className={ui.cellMuted} style={{ margin: 0 }}>
                        {run.productName}
                      </p>
                    )}
                  </div>
                  <Tag tone={statusTone(run.compSlipStatus)}>
                    {run.compSlipStatus === 'APPROVED'
                      ? 'Comp slip approved'
                      : run.compSlipStatus === 'REJECTED'
                        ? 'Comp slip rejected'
                        : 'Comp slip pending'}
                  </Tag>
                </div>

                <div className={run.mailerText ? styles.compSlip : styles.compSlipEmpty}>
                  {run.mailerText || 'No comp slip wording written yet.'}
                </div>

                <div className={styles.runMeta}>
                  <span>{run.dispatchCount} dispatch{run.dispatchCount === 1 ? '' : 'es'}</span>
                  {run.approvedAt && (
                    <span>
                      Approved {new Date(run.approvedAt).toLocaleDateString('en-GB')}
                    </span>
                  )}
                </div>

                <div className={styles.actions}>
                  {run.compSlipStatus !== 'APPROVED' ? (
                    <Button size="sm" onClick={() => setDialog({ kind: 'comp-slip', run })}>
                      Review comp slip
                    </Button>
                  ) : (
                    <>
                      <Button size="sm" onClick={() => setDialog({ kind: 'dispatch', run })}>
                        Add creators
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => exportList.mutate(run.id)}
                      >
                        Export for fulfilment
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setDialog({ kind: 'brand-order', run })}
                      >
                        Ask the brand to send
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => reject.mutate(run.id)}
                        disabled={reject.isPending}
                      >
                        Unapprove
                      </Button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </AsyncBoundary>

      <section style={{ marginTop: 'var(--space-6)' }}>
        <h2 className={ui.sectionLabel}>Direct-from-brand orders</h2>
        {brandOrders.data && brandOrders.data.length > 0 ? (
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th>Brand contact</th>
                  <th className={ui.numeric}>Recipients</th>
                  <th>Status</th>
                  <th>Requested</th>
                  <th>Confirmed</th>
                </tr>
              </thead>
              <tbody>
                {brandOrders.data.map((order) => (
                  <tr key={order.id}>
                    <td className={ui.cellStrong}>{order.brandContactEmail}</td>
                    <td className={ui.numeric}>{order.recipientCount}</td>
                    <td>
                      <Tag tone={statusTone(order.status)}>
                        {order.status.charAt(0) + order.status.slice(1).toLowerCase()}
                      </Tag>
                    </td>
                    <td className={ui.cellMuted}>
                      {new Date(order.createdAt).toLocaleDateString('en-GB')}
                    </td>
                    <td className={ui.cellMuted}>
                      {order.confirmedAt
                        ? new Date(order.confirmedAt).toLocaleDateString('en-GB')
                        : 'Waiting on the brand'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={ui.cellMuted}>
            Nothing requested yet. Some brands ship their own product — ask them from a run above,
            and they confirm through a link in the email.
          </p>
        )}
      </section>

      {dialog?.kind === 'create-run' && (
        <CreateRunModal
          onClose={() => setDialog(null)}
          onCreated={() => {
            setDialog(null);
            queryClient.invalidateQueries({ queryKey: ['gifting-runs'] });
            toast.success('Run created');
          }}
        />
      )}

      {dialog?.kind === 'comp-slip' && (
        <CompSlipModal
          run={dialog.run}
          pending={approve.isPending}
          onClose={() => setDialog(null)}
          onApprove={(text) => approve.mutate({ id: dialog.run.id, text })}
        />
      )}

      {dialog?.kind === 'dispatch' && (
        <DispatchModal
          run={dialog.run}
          onClose={() => setDialog(null)}
          onDone={() => {
            queryClient.invalidateQueries({ queryKey: ['gifting-runs'] });
            queryClient.invalidateQueries({ queryKey: ['gifting-log'] });
          }}
        />
      )}

      {dialog?.kind === 'addresses' && <AddressRequestModal onClose={() => setDialog(null)} />}

      {dialog?.kind === 'brand-order' && (
        <BrandOrderModal
          run={dialog.run}
          onClose={() => setDialog(null)}
          onCreated={() => {
            setDialog(null);
            queryClient.invalidateQueries({ queryKey: ['brand-orders'] });
            toast.success('The brand has been emailed');
          }}
        />
      )}
    </Page>
  );
};

// ---------------------------------------------------------------- modals

const CreateRunModal: React.FC<{ onClose: () => void; onCreated: () => void }> = ({
  onClose,
  onCreated,
}) => {
  const toast = useToast();
  const [name, setName] = useState('');
  const [productName, setProductName] = useState('');
  const [mailerText, setMailerText] = useState('');

  const mutation = useMutation({
    mutationFn: () => createGiftingRun({ name, productName, mailerText }),
    onSuccess: onCreated,
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not create the run'),
  });

  return (
    <Modal
      title="New gifting run"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!name.trim() || mutation.isPending}>
            Create run
          </Button>
        </>
      }
    >
      <Input
        label="Run name"
        placeholder="August seeding"
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
      <Input
        label="Product"
        placeholder="Hydrating mask box"
        value={productName}
        onChange={(event) => setProductName(event.target.value)}
      />
      <TextArea
        label="Comp slip wording"
        hint="This goes in the box. It needs approving before anything ships."
        rows={4}
        value={mailerText}
        onChange={(event) => setMailerText(event.target.value)}
      />
    </Modal>
  );
};

const CompSlipModal: React.FC<{
  run: GiftingRun;
  pending: boolean;
  onClose: () => void;
  onApprove: (text: string) => void;
}> = ({ run, pending, onClose, onApprove }) => {
  const [text, setText] = useState(run.mailerText ?? '');

  return (
    <Modal
      title="Comp slip"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onApprove(text)} disabled={!text.trim() || pending}>
            Approve wording
          </Button>
        </>
      }
    >
      <p className={ui.cellMuted} style={{ marginTop: 0 }}>
        Approving records who signed this off and when, and unlocks dispatching for this run.
      </p>
      <TextArea
        label="Wording"
        rows={6}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
    </Modal>
  );
};

const DispatchModal: React.FC<{
  run: GiftingRun;
  onClose: () => void;
  onDone: () => void;
}> = ({ run, onClose, onDone }) => {
  const toast = useToast();
  const [selected, setSelected] = useState<string[]>([]);
  const [contentDeadline, setContentDeadline] = useState('');
  const [result, setResult] = useState<DispatchCreationResult | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      createDispatches({
        giftingRunId: run.id,
        creatorIds: selected,
        contentDeadline: contentDeadline || undefined,
      }),
    onSuccess: (data) => {
      setResult(data);
      setSelected([]);
      onDone();
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not create the dispatches'),
  });

  return (
    <Modal
      title={`Add creators to ${run.name}`}
      wide
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={selected.length === 0 || mutation.isPending}
          >
            Create {selected.length || ''} dispatch{selected.length === 1 ? '' : 'es'}
          </Button>
        </>
      }
    >
      <Input
        label="Content deadline"
        type="date"
        hint="Reminders go out a week before, and again 48 hours before."
        value={contentDeadline}
        onChange={(event) => setContentDeadline(event.target.value)}
      />

      <CreatorPicker selected={selected} onChange={setSelected} />

      {result && (
        <div className={styles.outcome} style={{ marginTop: 'var(--space-4)' }}>
          <div className={styles.outcomeCounts}>
            <span>{result.created} created</span>
            {result.skippedNoAddress > 0 && <span>{result.skippedNoAddress} no address</span>}
            {result.skippedExcluded > 0 && <span>{result.skippedExcluded} excluded</span>}
            {result.skippedDuplicate > 0 && <span>{result.skippedDuplicate} already on the run</span>}
          </div>
          {result.warnings.map((warning) => (
            <span key={warning} className={styles.warning}>
              {warning}
            </span>
          ))}
        </div>
      )}
    </Modal>
  );
};

const AddressRequestModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const toast = useToast();
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<{ emailsSent: number; skipped: number; warnings: string[] } | null>(
    null,
  );

  const mutation = useMutation({
    mutationFn: () => requestAddresses({ creatorIds: selected }),
    onSuccess: (data) => {
      setResult(data);
      setSelected([]);
      toast.success(`${data.emailsSent} address request${data.emailsSent === 1 ? '' : 's'} sent`);
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not send the requests'),
  });

  return (
    <Modal
      title="Request delivery addresses"
      wide
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={selected.length === 0 || mutation.isPending}
          >
            Email {selected.length || ''} creator{selected.length === 1 ? '' : 's'}
          </Button>
        </>
      }
    >
      <p className={ui.cellMuted} style={{ marginTop: 0 }}>
        Each creator gets a single-use link to a form that captures their address and their
        consent to us holding it. Anyone who has opted out, or who is excluded from gifting, is
        skipped.
      </p>

      <CreatorPicker selected={selected} onChange={setSelected} />

      {result && (
        <div className={styles.outcome} style={{ marginTop: 'var(--space-4)' }}>
          <div className={styles.outcomeCounts}>
            <span>{result.emailsSent} emailed</span>
            {result.skipped > 0 && <span>{result.skipped} skipped</span>}
          </div>
          {result.warnings.map((warning) => (
            <span key={warning} className={styles.warning}>
              {warning}
            </span>
          ))}
        </div>
      )}
    </Modal>
  );
};

const BrandOrderModal: React.FC<{
  run: GiftingRun | null;
  onClose: () => void;
  onCreated: () => void;
}> = ({ run, onClose, onCreated }) => {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: () =>
      createBrandOrder({
        brandContactEmail: email,
        giftingRunId: run?.id,
        productName: run?.productName ?? undefined,
        creatorIds: selected,
        notes,
      }),
    onSuccess: onCreated,
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not send the request'),
  });

  return (
    <Modal
      title="Ask the brand to send"
      wide
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!email.trim() || selected.length === 0 || mutation.isPending}
          >
            Email the brand
          </Button>
        </>
      }
    >
      <p className={ui.cellMuted} style={{ marginTop: 0 }}>
        The brand gets a link to confirm once they have shipped. Nothing is marked as sent until
        they click it.
      </p>

      <Input
        label="Brand contact email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <TextArea
        label="Notes for the brand"
        rows={3}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
      />

      <CreatorPicker selected={selected} onChange={setSelected} />
    </Modal>
  );
};
