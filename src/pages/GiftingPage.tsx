import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchGiftingLog, sendAddressCaptureEmails, exportEcGroupExcel } from '../services/giftingService';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import styles from './GiftingPage.module.css';

export const GiftingPage: React.FC = () => {
  const [campaignSel, setCampaignSel] = useState('Mediheal Spring Seeding');
  const [directOpen, setDirectOpen] = useState(false);
  const [brandName, setBrandName] = useState('');
  const [giftingNotes, setGiftingNotes] = useState('');
  const [selectedRecipients, setSelectedRecipients] = useState<Record<string, boolean>>({
    sophiabeauty: true,
    marcuslifts: true,
    ellafashion: true,
  });
  const [actionMsg, setActionMsg] = useState('');
  const [exporting, setExporting] = useState(false);

  const queryClient = useQueryClient();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['gifting-log'],
    queryFn: fetchGiftingLog,
  });

  const sendAddressCaptureMutation = useMutation({
    mutationFn: sendAddressCaptureEmails,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['gifting-log'] });
      setActionMsg(`Address capture emails sent to ${result.sentCount} creators.`);
      setTimeout(() => setActionMsg(''), 3000);
    },
  });

  const campaignOptions = ['Mediheal Spring Seeding', 'Katie Loxton Paid Partnership Q3'];
  const giftingColumns = [
    'Creator',
    'Address status',
    'GDPR consent',
    'Product assigned',
    'Courier',
    'Tracking number',
    'Delivery status',
    'Comp slip approved',
    'Action',
  ];

  const handleSendAddressCapture = () => {
    const ids = rows.map((r) => r.id);
    sendAddressCaptureMutation.mutate(ids);
  };

  const handleExportEcGroup = async () => {
    setExporting(true);
    await exportEcGroupExcel();
    setExporting(false);
    setActionMsg('EC Group Excel exported successfully.');
    setTimeout(() => setActionMsg(''), 3000);
  };

  const approvedSlips = rows.filter((r) => r.compSlip === 'Approved').length;
  const compSlipSummary = `${rows.length} comp slips · ${approvedSlips} approved · ${rows.length - approvedSlips} pending review`;

  if (isLoading) {
    return <div className={styles.loadingState}>Loading gifting logistics...</div>;
  }

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.headerRow}>
        <div>
          <select
            value={campaignSel}
            onChange={(e) => setCampaignSel(e.target.value)}
            className={styles.campaignSelect}
          >
            {campaignOptions.map((gc) => (
              <option key={gc} value={gc}>
                {gc}
              </option>
            ))}
          </select>
          <div className={styles.subtitle}>gifting logistics</div>
        </div>

        <Button variant="primary">New gifting run</Button>
      </div>

      {/* Action Buttons */}
      <div className={styles.actionButtonsRow}>
        {actionMsg && <div className={styles.actionMessage}>{actionMsg}</div>}
        <Button
          variant="secondary"
          onClick={handleSendAddressCapture}
          disabled={sendAddressCaptureMutation.isPending}
        >
          {sendAddressCaptureMutation.isPending ? 'Sending...' : 'Send address capture email'}
        </Button>
        <Button variant="primary" onClick={handleExportEcGroup} disabled={exporting}>
          {exporting ? 'Exporting...' : 'Export to EC Group (Excel)'}
        </Button>
      </div>

      {/* Logistics Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr className={styles.tableHeadRow}>
              {giftingColumns.map((gcol) => (
                <th key={gcol} className={styles.tableHeadCell}>
                  {gcol}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((gr) => (
              <tr key={gr.id} className={styles.tableRow}>
                <td className={styles.tableCellBold}>{gr.handle}</td>
                <td className={styles.tableCell}>
                  <span className={styles.statusPill} style={{ backgroundColor: gr.addressBg }}>
                    {gr.addressStatus}
                  </span>
                </td>
                <td className={styles.tableCell}>{gr.gdpr}</td>
                <td className={styles.tableCell}>{gr.product}</td>
                <td className={styles.tableCell}>{gr.courier}</td>
                <td className={styles.tableCell}>{gr.tracking}</td>
                <td className={styles.tableCell}>
                  <span className={styles.statusPill} style={{ backgroundColor: gr.deliveryBg }}>
                    {gr.delivery}
                  </span>
                </td>
                <td className={styles.tableCell}>{gr.compSlip}</td>
                <td className={styles.tableCellAction}>View</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Direct-from-brand Panel */}
      <div className={styles.directPanel}>
        <div onClick={() => setDirectOpen(!directOpen)} className={styles.directPanelHeader}>
          <span>Direct-from-brand</span>
          <span>{directOpen ? '−' : '+'}</span>
        </div>

        {directOpen && (
          <div className={styles.directPanelBody}>
            <Input label="Brand name" value={brandName} onChange={(e) => setBrandName(e.target.value)} />

            <div className={styles.recipientsSection}>
              <span className={styles.sectionLabel}>Recipients</span>
              {rows.map((r) => (
                <label key={r.id} className={styles.recipientCheckboxLabel}>
                  <input
                    type="checkbox"
                    checked={selectedRecipients[r.id] !== false}
                    onChange={() =>
                      setSelectedRecipients({
                        ...selectedRecipients,
                        [r.id]: !(selectedRecipients[r.id] !== false),
                      })
                    }
                  />
                  {r.handle}
                </label>
              ))}
            </div>

            <label className={styles.notesLabel}>
              <span className={styles.sectionLabel}>Notes</span>
              <textarea
                value={giftingNotes}
                onChange={(e) => setGiftingNotes(e.target.value)}
                rows={3}
                className={styles.notesTextarea}
              />
            </label>

            <Button variant="primary">Send order request email</Button>
          </div>
        )}
      </div>

      <div className={styles.compSlipSummary}>
        {compSlipSummary} · <span className={styles.reviewPendingLink}>Review pending</span>
      </div>
    </div>
  );
};
