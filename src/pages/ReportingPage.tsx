import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchReportData, submitReportSignoff, chaseInsightForCreator } from '../services/reportService';
import { ReportCreatorBreakdown } from '../types';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Switch } from '../components/common/Switch';
import styles from './ReportingPage.module.css';

export const ReportingPage: React.FC = () => {
  const [reportCampaignSel, setReportCampaignSel] = useState('Mediheal Spring Seeding');
  const [reportTab, setReportTab] = useState('Monthly Seeding');
  const [reportBrand, setReportBrand] = useState('Mediheal');
  const [reportDateStart, setReportDateStart] = useState('');
  const [reportDateEnd, setReportDateEnd] = useState('');
  const [reportCadence, setReportCadence] = useState('Monthly');
  const [affiliateTracking, setAffiliateTracking] = useState(false);
  const [erTarget, setErTarget] = useState('4.0');
  const [reachTarget, setReachTarget] = useState('500000');
  const [directorApproved, setDirectorApproved] = useState(false);

  const queryClient = useQueryClient();
  const reportQueryKey = ['report-data', reportCampaignSel];

  const reportQuery = useQuery({
    queryKey: reportQueryKey,
    queryFn: () => fetchReportData(reportCampaignSel),
  });

  const signoffStatus = reportQuery.data?.signoffStatus ?? 'Draft';
  const creatorBreakdown: ReportCreatorBreakdown[] = reportQuery.data?.creatorBreakdown ?? [];

  const signoffMutation = useMutation({
    mutationFn: (status: 'Pending Approval' | 'Approved' | 'Sent to client') => submitReportSignoff(status),
    onSuccess: (_result, status) => {
      queryClient.setQueryData(reportQueryKey, (old: typeof reportQuery.data) =>
        old ? { ...old, signoffStatus: status } : old
      );
    },
  });

  const chaseMutation = useMutation({
    mutationFn: (creatorId: string) => chaseInsightForCreator(creatorId),
    onSuccess: (updated) => {
      queryClient.setQueryData(reportQueryKey, (old: typeof reportQuery.data) =>
        old
          ? {
              ...old,
              creatorBreakdown: old.creatorBreakdown.map((c) => (c.id === updated.id ? updated : c)),
            }
          : old
      );
    },
  });

  const campaignOptions = ['Mediheal Spring Seeding', 'Katie Loxton Paid Partnership Q3'];
  const reportTabs = ['Monthly Seeding', 'Campaign Wrap', 'Mailer Conversion'];

  const erTargetNum = parseFloat(erTarget) || 0;
  const avgErActual = 4.1;
  const vsTargetDiff = (avgErActual - erTargetNum).toFixed(1);
  const vsTargetLabel = (parseFloat(vsTargetDiff) >= 0 ? '+' : '') + vsTargetDiff + '%';
  const vsTargetColor = parseFloat(vsTargetDiff) >= 0 ? 'var(--color-red)' : 'var(--text-muted)';

  const handleSignoffUpdate = (status: 'Pending Approval' | 'Approved' | 'Sent to client') => {
    signoffMutation.mutate(status);
  };

  const handleChaseInsight = (creatorId: string) => {
    chaseMutation.mutate(creatorId);
  };

  const handleChaseAllPending = () => {
    queryClient.setQueryData(reportQueryKey, (old: typeof reportQuery.data) =>
      old
        ? {
            ...old,
            creatorBreakdown: old.creatorBreakdown.map((c) =>
              c.status === 'Pending' ? { ...c, status: 'Chased', statusBg: 'var(--color-grey)' } : c
            ),
          }
        : old
    );
  };

  if (reportQuery.isLoading) {
    return <div className={styles.loadingText}>Loading reporting analytics...</div>;
  }

  return (
    <div className={styles.page}>
      {/* Title */}
      <div>
        <select
          value={reportCampaignSel}
          onChange={(e) => setReportCampaignSel(e.target.value)}
          className={styles.campaignSelect}
        >
          {campaignOptions.map((rc2) => (
            <option key={rc2} value={rc2}>
              {rc2}
            </option>
          ))}
        </select>
        <div className={styles.subtitle}>reporting</div>
      </div>

      {/* Report Sub-tabs */}
      <div className={styles.tabsRow}>
        {reportTabs.map((t) => (
          <div
            key={t}
            onClick={() => setReportTab(t)}
            className={`${styles.tab} ${reportTab === t ? styles.tabActive : ''}`}
          >
            {t}
          </div>
        ))}
      </div>

      {/* Grid: Settings (35%) + Preview & Breakdown (65%) */}
      <div className={styles.grid}>
        {/* Settings Panel */}
        <div className={styles.settingsPanel}>
          <div className={styles.panelLabel}>report settings</div>

          <select
            value={reportBrand}
            onChange={(e) => setReportBrand(e.target.value)}
            className={styles.select}
          >
            <option>Mediheal</option>
            <option>Katie Loxton</option>
            <option>Joma</option>
          </select>

          <div className={styles.dateRow}>
            <input
              type="date"
              value={reportDateStart}
              onChange={(e) => setReportDateStart(e.target.value)}
              className={styles.dateInput}
            />
            <input
              type="date"
              value={reportDateEnd}
              onChange={(e) => setReportDateEnd(e.target.value)}
              className={styles.dateInput}
            />
          </div>

          <select
            value={reportCadence}
            onChange={(e) => setReportCadence(e.target.value)}
            className={styles.select}
          >
            <option>Weekly</option>
            <option>Monthly</option>
            <option>Quarterly</option>
          </select>

          <div className={styles.switchRow}>
            <span className={styles.switchLabel}>Include affiliate tracking</span>
            <Switch checked={affiliateTracking} onChange={(e) => setAffiliateTracking(e.target.checked)} />
          </div>

          <div className={styles.kpiSection}>
            <span className={styles.kpiLabel}>KPI targets</span>
            <Input value={erTarget} onChange={(e) => setErTarget(e.target.value)} placeholder="ER target %" />
            <Input value={reachTarget} onChange={(e) => setReachTarget(e.target.value)} placeholder="Reach target" />
          </div>
        </div>

        {/* Report Preview & Creator Breakdown */}
        <div className={styles.previewColumn}>
          <div className={styles.previewCard}>
            <div className={styles.previewTitle}>{reportCampaignSel}</div>
            <div className={styles.previewDateRange}>
              {reportDateStart && reportDateEnd ? `${reportDateStart} – ${reportDateEnd}` : '1 Mar – 30 Apr'}
            </div>

            <div className={styles.statsGrid}>
              <div>
                <div className={styles.statLabel}>Posts</div>
                <div className={styles.statValue}>9</div>
              </div>
              <div>
                <div className={styles.statLabel}>Reach</div>
                <div className={styles.statValue}>2.1M</div>
              </div>
              <div>
                <div className={styles.statLabel}>Avg ER</div>
                <div className={styles.statValue}>4.1%</div>
              </div>
              <div>
                <div className={styles.statLabel}>vs Target</div>
                <div className={styles.statValue} style={{ color: vsTargetColor }}>{vsTargetLabel}</div>
              </div>
            </div>

            {/* Signoff Actions */}
            <div className={styles.signoffRow}>
              <div className={styles.signoffLeft}>
                <span className={styles.statusLabel}>
                  status
                </span>
                <span className={styles.statusBadge}>
                  {signoffStatus}
                </span>

                {signoffStatus === 'Pending Approval' && (
                  <span
                    onClick={() => setDirectorApproved(!directorApproved)}
                    className={styles.directorLine}
                  >
                    Director: Tiff S. · {directorApproved ? 'Approved' : 'Awaiting sign-off'}
                  </span>
                )}
              </div>

              {signoffStatus === 'Draft' && (
                <Button variant="primary" size="sm" onClick={() => handleSignoffUpdate('Pending Approval')}>
                  Submit for director approval
                </Button>
              )}

              {signoffStatus === 'Approved' && (
                <Button variant="primary" size="sm" onClick={() => handleSignoffUpdate('Sent to client')}>
                  Send to client
                </Button>
              )}
            </div>
          </div>

          {/* Creator Breakdown Table */}
          <div>
            <div className={styles.breakdownHeader}>
              <div className={styles.panelLabel}>
                creator breakdown
              </div>
              <Button variant="secondary" size="sm" onClick={handleChaseAllPending}>
                Chase all pending insights
              </Button>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr className={styles.tableHeaderRow}>
                    <th className={styles.th}>Handle</th>
                    <th className={styles.th}>Posts</th>
                    <th className={styles.th}>Reach</th>
                    <th className={styles.th}>ER</th>
                    <th className={styles.th}>Quality</th>
                    <th className={styles.th}>Insights</th>
                    <th className={styles.th}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {creatorBreakdown.map((cb) => (
                    <tr key={cb.id} className={styles.tr}>
                      <td className={styles.tdBold}>{cb.handle}</td>
                      <td className={styles.td}>{cb.posts}</td>
                      <td className={styles.td}>{cb.reach}</td>
                      <td className={styles.td}>{cb.er}</td>
                      <td className={styles.td}>{cb.band}</td>
                      <td className={styles.td}>
                        <span className={styles.statusPill} style={{ backgroundColor: cb.statusBg }}>
                          {cb.status}
                        </span>
                      </td>
                      <td className={styles.td}>
                        {cb.status === 'Pending' && (
                          <span
                            onClick={() => handleChaseInsight(cb.id)}
                            className={styles.chaseLink}
                          >
                            Send chase email
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Export Options */}
          <div className={styles.exportRow}>
            <Button variant="secondary" size="sm">Export PDF</Button>
            <Button variant="secondary" size="sm">Export PowerPoint</Button>
            <Button variant="secondary" size="sm">Export Excel</Button>
          </div>
        </div>
      </div>
    </div>
  );
};
