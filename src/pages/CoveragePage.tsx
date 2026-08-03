import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchCoverageLog, updateDigestSettings } from '../services/coverageService';
import { Button } from '../components/common/Button';
import { Dialog } from '../components/common/Dialog';
import { Switch } from '../components/common/Switch';
import styles from './CoveragePage.module.css';

export const CoveragePage: React.FC = () => {
  const [coverageBrand, setCoverageBrand] = useState('All brands');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [reconFilter, setReconFilter] = useState<string | null>(null);
  const [digestModalOpen, setDigestModalOpen] = useState(false);
  const [digestOn, setDigestOn] = useState(true);
  const [digestTime, setDigestTime] = useState('08:00');

  const { data: coverageRows = [], isLoading } = useQuery({
    queryKey: ['coverage-log', coverageBrand],
    queryFn: () => fetchCoverageLog(coverageBrand),
  });

  const digestMutation = useMutation({
    mutationFn: updateDigestSettings,
  });

  const summaryStrip = [
    { label: 'Total posts', value: '17' },
    { label: 'Total reach', value: '2.1M' },
    { label: 'Avg ER', value: '4.1%' },
    { label: 'Stories', value: '8' },
    { label: 'Reels', value: '6' },
    { label: 'TikToks', value: '3' },
  ];

  const reconciliation = [
    { label: 'Sent to', value: '12', filter: null },
    { label: 'Posted', value: '9', filter: 'posted' },
    { label: 'Not yet posted', value: '3', filter: 'not-posted' },
    { label: 'No response', value: '1', filter: 'no-response' },
  ];

  const coverageColumns = [
    'Creator',
    'Platform',
    'Post type',
    'Date posted',
    'Views',
    'Likes',
    'Comments',
    'ER',
    'Coverage name',
    'Action',
  ];

  const filteredRows = reconFilter
    ? coverageRows.filter((r) => r.status === reconFilter)
    : coverageRows;

  const handleSaveDigest = (newOn: boolean, newTime: string) => {
    setDigestOn(newOn);
    setDigestTime(newTime);
    digestMutation.mutate({ enabled: newOn, time: newTime });
  };

  if (isLoading) {
    return <div className={styles.loadingState}>Loading coverage log...</div>;
  }

  return (
    <div className={styles.root}>
      {/* Header & Export Dropdown */}
      <div className={styles.headerRow}>
        <div className={styles.pageTitle}>coverage log</div>
        <div className={styles.exportWrapper}>
          <Button variant="secondary" onClick={() => setExportMenuOpen(!exportMenuOpen)}>
            Export ▾
          </Button>

          {exportMenuOpen && (
            <div className={styles.exportMenu}>
              <div className={styles.exportMenuItem}>Excel</div>
              <div className={styles.exportMenuItem}>PDF</div>
              <div className={styles.exportMenuItem}>Zip assets</div>
            </div>
          )}
        </div>
      </div>

      {/* Filter Row */}
      <div className={styles.filterRow}>
        <select
          value={coverageBrand}
          onChange={(e) => setCoverageBrand(e.target.value)}
          className={styles.filterSelect}
        >
          <option>All brands</option>
          <option>Mediheal</option>
          <option>Katie Loxton</option>
          <option>Joma</option>
        </select>
        <select className={styles.filterSelect}>
          <option>All campaigns</option>
          <option>Mediheal Spring Seeding</option>
          <option>Katie Loxton Paid Partnership Q3</option>
        </select>
        <input type="date" className={styles.filterDateInput} />
        <input type="date" className={styles.filterDateInput} />
      </div>

      {/* Summary Strip */}
      <div className={styles.summaryStrip}>
        {summaryStrip.map((sm) => (
          <div key={sm.label} className={styles.summaryCard}>
            <div className={styles.summaryLabel}>{sm.label}</div>
            <div className={styles.summaryValue}>{sm.value}</div>
          </div>
        ))}
      </div>

      {/* Coverage Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr className={styles.tableHeadRow}>
              {coverageColumns.map((cc) => (
                <th key={cc} className={styles.tableHeadCell}>
                  {cc}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.id} className={styles.tableRow}>
                <td className={styles.tableCellBold}>{row.handle}</td>
                <td className={styles.tableCell}>{row.platform}</td>
                <td className={styles.tableCell}>{row.postType}</td>
                <td className={styles.tableCell}>{row.date}</td>
                <td className={styles.tableCell}>{row.views}</td>
                <td className={styles.tableCell}>{row.likes}</td>
                <td className={styles.tableCell}>{row.comments}</td>
                <td className={styles.tableCell}>{row.er}</td>
                <td className={styles.tableCellMuted}>{row.coverageName}</td>
                <td className={styles.tableCellAction}>View</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Send vs Posted Reconciliation */}
      <div>
        <div className={styles.sectionLabel}>send vs posted reconciliation</div>
        <div className={styles.reconciliationRow}>
          {reconciliation.map((rc) => (
            <div key={rc.label} onClick={() => setReconFilter(rc.filter)} className={styles.reconciliationItem}>
              <span className={styles.reconciliationValue}>{rc.value}</span>
              <span className={styles.reconciliationLabel}>{rc.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div onClick={() => setDigestModalOpen(true)} className={styles.digestLink}>
        Coverage digest settings →
      </div>

      {/* Digest Settings Modal */}
      {digestModalOpen && (
        <div onClick={() => setDigestModalOpen(false)} className={styles.modalOverlay}>
          <Dialog title="Coverage digest settings" onClose={() => setDigestModalOpen(false)}>
            <div className={styles.digestForm}>
              <div className={styles.digestToggleRow}>
                <span>Daily morning digest email</span>
                <Switch checked={digestOn} onChange={(e) => handleSaveDigest(e.target.checked, digestTime)} />
              </div>
              <label className={styles.digestTimeLabel}>
                <span className={styles.digestTimeCaption}>Send time</span>
                <input
                  type="time"
                  value={digestTime}
                  onChange={(e) => handleSaveDigest(digestOn, e.target.value)}
                  className={styles.digestTimeInput}
                />
              </label>
            </div>
          </Dialog>
        </div>
      )}
    </div>
  );
};
