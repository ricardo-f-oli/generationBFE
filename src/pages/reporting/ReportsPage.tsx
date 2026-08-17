import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Page, PageHeader, AsyncBoundary, EmptyState, ui } from '../../components/common/PageShell';
import { Button } from '../../components/common/Button';
import { Input, Select } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Tag, statusTone } from '../../components/common/Tag';
import { useToast } from '../../components/common/Toast';
import { createReport, fetchReports } from '../../services/reportingService';
import { fetchCampaigns } from '../../services/campaignService';
import { ApiError } from '../../services/apiClient';
import type { ReportCadence, ReportStatus, ReportType } from '../../types';
import styles from './Reporting.module.css';

const TYPE_LABELS: Record<ReportType, string> = {
  MONTHLY_SEEDING: 'Monthly seeding',
  CAMPAIGN_WRAP: 'Campaign wrap',
  MAILER_CONVERSION: 'Mailer conversion',
};

const STATUS_LABELS: Record<ReportStatus, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Awaiting sign-off',
  APPROVED: 'Approved',
  REJECTED: 'Changes requested',
  SENT: 'Sent to client',
};

/** The first of the month, and today — the default period for a monthly report. */
function defaultPeriod() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    from: start.toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
  };
}

/** Requirements #49–#54: the report library. */
export const ReportsPage: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<ReportStatus | ''>('');
  const [createOpen, setCreateOpen] = useState(false);

  const reports = useQuery({
    queryKey: ['reports', statusFilter],
    queryFn: () => fetchReports({ status: statusFilter || undefined, size: 50 }),
  });

  return (
    <Page>
      <PageHeader
        title="Reporting"
        subtitle="Client reports, built from the coverage actually captured for this brand."
        actions={
          <Button onClick={() => setCreateOpen(true)}>New report</Button>
        }
      />

      <div className={ui.filterBar}>
        <Select
          label="Status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as ReportStatus | '')}
        >
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      <AsyncBoundary
        isLoading={reports.isLoading}
        error={reports.error}
        onRetry={() => reports.refetch()}
        loadingLabel="Loading reports"
      >
        {reports.data && reports.data.items.length === 0 ? (
          <EmptyState
            title="No reports yet"
            message="A report snapshots the figures for a period, so the numbers a client sees do not move after you send them."
            action={<Button onClick={() => setCreateOpen(true)}>Create the first report</Button>}
          />
        ) : (
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th>Report</th>
                  <th>Type</th>
                  <th>Period</th>
                  <th className={ui.numeric}>Posts</th>
                  <th className={ui.numeric}>Reach</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {reports.data?.items.map((report) => (
                  <tr key={report.id}>
                    <td className={ui.cellStrong}>
                      <Link to={`/reporting/${report.id}`}>{report.name}</Link>
                    </td>
                    <td>{TYPE_LABELS[report.reportType]}</td>
                    <td className={ui.cellMuted}>
                      {report.periodStart} → {report.periodEnd}
                    </td>
                    <td className={ui.numeric}>{report.metrics?.posts ?? '—'}</td>
                    <td className={ui.numeric}>
                      {report.metrics
                        ? new Intl.NumberFormat('en-GB').format(report.metrics.estimatedReach)
                        : '—'}
                    </td>
                    <td>
                      <Tag tone={statusTone(report.status)}>{STATUS_LABELS[report.status]}</Tag>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AsyncBoundary>

      {createOpen && (
        <CreateReportModal
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            queryClient.invalidateQueries({ queryKey: ['reports'] });
            toast.success('Report created and figures generated');
          }}
        />
      )}
    </Page>
  );
};

const CreateReportModal: React.FC<{ onClose: () => void; onCreated: () => void }> = ({
  onClose,
  onCreated,
}) => {
  const toast = useToast();
  const period = defaultPeriod();
  const [name, setName] = useState('');
  const [reportType, setReportType] = useState<ReportType>('MONTHLY_SEEDING');
  const [cadence, setCadence] = useState<ReportCadence>('MONTHLY');
  const [campaignId, setCampaignId] = useState('');
  const [periodStart, setPeriodStart] = useState(period.from);
  const [periodEnd, setPeriodEnd] = useState(period.to);

  const campaigns = useQuery({ queryKey: ['campaigns'], queryFn: () => fetchCampaigns() });

  const mutation = useMutation({
    mutationFn: () =>
      createReport({
        name: name.trim() || undefined,
        reportType,
        cadence,
        campaignId: campaignId || undefined,
        periodStart,
        periodEnd,
      }),
    onSuccess: onCreated,
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not create the report'),
  });

  return (
    <Modal
      title="New report"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? 'Generating…' : 'Create and generate'}
          </Button>
        </>
      }
    >
      <div className={styles.formRow}>
        <Select
          label="Report type"
          value={reportType}
          onChange={(event) => setReportType(event.target.value as ReportType)}
        >
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Select
          label="Cadence"
          value={cadence}
          onChange={(event) => setCadence(event.target.value as ReportCadence)}
        >
          <option value="WEEKLY">Weekly</option>
          <option value="MONTHLY">Monthly</option>
          <option value="QUARTERLY">Quarterly</option>
          <option value="CAMPAIGN">At campaign end</option>
          <option value="AD_HOC">Ad hoc</option>
        </Select>
      </div>

      <div className={styles.formRow}>
        <Input
          label="Period start"
          type="date"
          value={periodStart}
          onChange={(event) => setPeriodStart(event.target.value)}
        />
        <Input
          label="Period end"
          type="date"
          value={periodEnd}
          onChange={(event) => setPeriodEnd(event.target.value)}
        />
      </div>

      <Select
        label="Campaign"
        value={campaignId}
        onChange={(event) => setCampaignId(event.target.value)}
      >
        <option value="">All campaigns for this brand</option>
        {campaigns.data?.items.map((campaign) => (
          <option key={campaign.id} value={campaign.id}>
            {campaign.name}
          </option>
        ))}
      </Select>

      <Input
        label="Name"
        hint="Leave blank and we will name it after the type and period."
        value={name}
        onChange={(event) => setName(event.target.value)}
      />
    </Modal>
  );
};
