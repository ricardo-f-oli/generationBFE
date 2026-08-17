import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Page, PageHeader, AsyncBoundary, ui } from '../../components/common/PageShell';
import { Button } from '../../components/common/Button';
import { TextArea } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Tag, statusTone } from '../../components/common/Tag';
import { useToast } from '../../components/common/Toast';
import { useAuth } from '../../context/AuthContext';
import {
  approveReport,
  deleteReport,
  downloadReport,
  fetchReport,
  regenerateReport,
  rejectReport,
  sendReportToClient,
  submitReport,
} from '../../services/reportingService';
import { ApiError } from '../../services/apiClient';
import type { ReportStatus } from '../../types';
import { CreatorBreakdown, MetricPanel, ReconciliationPanel } from './MetricPanel';
import styles from './Reporting.module.css';

const STATUS_LABELS: Record<ReportStatus, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Awaiting sign-off',
  APPROVED: 'Approved',
  REJECTED: 'Changes requested',
  SENT: 'Sent to client',
};

/** Requirement #53: the lifecycle, drawn so the gate is visible before anyone hits it. */
const STEPS: Array<{ status: ReportStatus; label: string }> = [
  { status: 'DRAFT', label: 'Drafted' },
  { status: 'PENDING_APPROVAL', label: 'Submitted for sign-off' },
  { status: 'APPROVED', label: 'Signed off by a director' },
  { status: 'SENT', label: 'Sent to the client' },
];

function stepIndex(status: ReportStatus): number {
  if (status === 'REJECTED') return 0;
  return STEPS.findIndex((step) => step.status === status);
}

export const ReportDetailPage: React.FC = () => {
  const { id = '' } = useParams();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();
  const [rejectOpen, setRejectOpen] = useState(false);

  const report = useQuery({
    queryKey: ['report', id],
    queryFn: () => fetchReport(id),
    enabled: Boolean(id),
  });

  /**
   * Every lifecycle action behaves the same way: refresh the report, tell the user what
   * happened, and surface the backend's own message on failure — the 422 from the sign-off gate
   * explains itself better than anything this page could invent.
   */
  const options = (label: string) => ({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report', id] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success(label);
    },
    onError: (error: unknown) =>
      toast.error(error instanceof ApiError ? error.message : 'That did not work'),
  });

  const regenerate = useMutation({
    mutationFn: () => regenerateReport(id),
    ...options('Figures regenerated'),
  });
  const submit = useMutation({
    mutationFn: () => submitReport(id),
    ...options('Sent to the director for sign-off'),
  });
  const approve = useMutation({
    mutationFn: () => approveReport(id),
    ...options('Report approved'),
  });
  const send = useMutation({
    mutationFn: () => sendReportToClient(id),
    ...options('Marked as sent to the client'),
  });
  const remove = useMutation({
    mutationFn: () => deleteReport(id),
    onSuccess: () => {
      toast.success('Report deleted');
      navigate('/reporting');
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not delete the report'),
  });

  const download = useMutation({
    mutationFn: (format: 'pdf' | 'excel' | 'powerpoint') => downloadReport(id, format),
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not build the export'),
  });

  const data = report.data;
  const canApprove = hasRole('ADMIN', 'DIRECTOR');
  const editable = data?.status === 'DRAFT' || data?.status === 'REJECTED';

  return (
    <Page>
      <PageHeader
        title={data?.name ?? 'Report'}
        subtitle={
          data ? `${data.periodStart} → ${data.periodEnd}` : 'Loading the report'
        }
        actions={<Link to="/reporting">← All reports</Link>}
      />

      <AsyncBoundary
        isLoading={report.isLoading}
        error={report.error}
        onRetry={() => report.refetch()}
        loadingLabel="Loading report"
      >
        {data && (
          <div className={styles.layout}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              {data.status === 'REJECTED' && data.rejectionReason && (
                <div className={ui.errorBanner}>
                  <strong>Changes requested.</strong> {data.rejectionReason}
                </div>
              )}

              <section>
                <h2 className={ui.sectionLabel}>Summary</h2>
                {data.metrics ? (
                  <MetricPanel metrics={data.metrics} />
                ) : (
                  <div className={ui.noticeBanner}>
                    This report has no generated figures yet. Regenerate it to build them.
                  </div>
                )}
              </section>

              {data.metrics && (
                <section>
                  <h2 className={ui.sectionLabel}>Send versus posted</h2>
                  <ReconciliationPanel metrics={data.metrics} />
                </section>
              )}

              {data.metrics && (
                <section>
                  <h2 className={ui.sectionLabel}>Creator breakdown</h2>
                  <CreatorBreakdown metrics={data.metrics} />
                </section>
              )}

              {data.metrics && data.metrics.topPosts.length > 0 && (
                <section>
                  <h2 className={ui.sectionLabel}>Top posts</h2>
                  <div className={ui.tableWrap}>
                    <table className={ui.table}>
                      <thead>
                        <tr>
                          <th>Creator</th>
                          <th>Platform</th>
                          <th className={ui.numeric}>Views</th>
                          <th className={ui.numeric}>ER</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {data.metrics.topPosts.map((post) => (
                          <tr key={`${post.handle}-${post.url ?? post.postType}`}>
                            <td className={ui.cellStrong}>@{post.handle}</td>
                            <td>{post.platform}</td>
                            <td className={ui.numeric}>
                              {new Intl.NumberFormat('en-GB').format(post.views)}
                            </td>
                            <td className={ui.numeric}>
                              {post.engagementRate === null ? '—' : `${post.engagementRate}%`}
                            </td>
                            <td>
                              {post.url && (
                                <a href={post.url} target="_blank" rel="noreferrer">
                                  View
                                </a>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>

            <aside className={styles.rail}>
              <div className={styles.railSection}>
                <span className={styles.railLabel}>Status</span>
                <div>
                  <Tag tone={statusTone(data.status)}>{STATUS_LABELS[data.status]}</Tag>
                </div>
              </div>

              <div className={styles.track}>
                {STEPS.map((step, index) => {
                  const done = index <= stepIndex(data.status);
                  return (
                    <div
                      key={step.status}
                      className={`${styles.trackStep} ${done ? styles.trackStepDone : ''}`}
                    >
                      <span className={`${styles.trackDot} ${done ? styles.trackDotDone : ''}`} />
                      {step.label}
                    </div>
                  );
                })}
              </div>

              <div className={styles.railSection}>
                <span className={styles.railLabel}>Actions</span>
                <div className={styles.railActions}>
                  {editable && (
                    <>
                      <Button
                        variant="secondary"
                        onClick={() => regenerate.mutate()}
                        disabled={regenerate.isPending}
                      >
                        Regenerate figures
                      </Button>
                      <Button onClick={() => submit.mutate()} disabled={submit.isPending}>
                        Submit for sign-off
                      </Button>
                    </>
                  )}

                  {data.status === 'PENDING_APPROVAL' &&
                    (canApprove ? (
                      <>
                        <Button onClick={() => approve.mutate()} disabled={approve.isPending}>
                          Approve
                        </Button>
                        <Button variant="secondary" onClick={() => setRejectOpen(true)}>
                          Request changes
                        </Button>
                      </>
                    ) : (
                      <p className={ui.cellMuted} style={{ margin: 0, fontSize: 'var(--fs-sm)' }}>
                        A director has been emailed. Only a director or admin can sign this off.
                      </p>
                    ))}

                  {data.status === 'APPROVED' && (
                    <Button onClick={() => send.mutate()} disabled={send.isPending}>
                      Mark as sent to client
                    </Button>
                  )}

                  {data.status === 'SENT' && (
                    <p className={ui.cellMuted} style={{ margin: 0, fontSize: 'var(--fs-sm)' }}>
                      Sent on {new Date(data.sentAt ?? '').toLocaleDateString('en-GB')}. The
                      figures are frozen so they match what the client received.
                    </p>
                  )}

                  {data.status !== 'SENT' && (
                    <Button
                      variant="danger"
                      onClick={() => remove.mutate()}
                      disabled={remove.isPending}
                    >
                      Delete report
                    </Button>
                  )}
                </div>
              </div>

              <div className={styles.railSection}>
                <span className={styles.railLabel}>Download</span>
                <div className={styles.railActions}>
                  <Button variant="secondary" onClick={() => download.mutate('pdf')}>
                    PDF
                  </Button>
                  <Button variant="secondary" onClick={() => download.mutate('powerpoint')}>
                    PowerPoint
                  </Button>
                  <Button variant="secondary" onClick={() => download.mutate('excel')}>
                    Excel
                  </Button>
                </div>
              </div>
            </aside>
          </div>
        )}
      </AsyncBoundary>

      {rejectOpen && (
        <RejectModal
          onClose={() => setRejectOpen(false)}
          onConfirm={async (reason) => {
            try {
              await rejectReport(id, reason);
              queryClient.invalidateQueries({ queryKey: ['report', id] });
              setRejectOpen(false);
              toast.success('Sent back for changes');
            } catch (error) {
              toast.error(error instanceof ApiError ? error.message : 'That did not work');
            }
          }}
        />
      )}
    </Page>
  );
};

const RejectModal: React.FC<{
  onClose: () => void;
  onConfirm: (reason: string) => void;
}> = ({ onClose, onConfirm }) => {
  const [reason, setReason] = useState('');

  return (
    <Modal
      title="Request changes"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm(reason)} disabled={!reason.trim()}>
            Send back
          </Button>
        </>
      }
    >
      <TextArea
        label="What needs changing?"
        hint="The person who submitted it sees this on the report."
        rows={4}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
    </Modal>
  );
};
