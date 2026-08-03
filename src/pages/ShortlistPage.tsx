import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchCreators } from '../services/creatorService';
import { Button } from '../components/common/Button';
import { Avatar } from '../components/common/Avatar';
import styles from './ShortlistPage.module.css';

export const ShortlistPage: React.FC = () => {
  const navigate = useNavigate();
  const [shortlistName, setShortlistName] = useState('Mediheal Spring Seeding Shortlist');
  const [campaignSel, setCampaignSel] = useState('Mediheal Spring Seeding');
  const [shortlistSaved, setShortlistSaved] = useState(false);
  const { data: creators = [], isLoading } = useQuery({
    queryKey: ['creators'],
    queryFn: fetchCreators,
  });

  const campaignOptions = ['Mediheal Spring Seeding', 'Katie Loxton Paid Partnership Q3'];

  const matchColorFor = (id: string) => {
    if (id === 'marcuslifts') return 'var(--color-lemon)';
    if (id === 'ellafashion') return '#F2A0A0';
    return 'var(--color-lime)';
  };

  if (isLoading) {
    return <div className={styles.loadingState}>Loading shortlist...</div>;
  }

  return (
    <div className={styles.page}>
      <div
        onClick={() => navigate('/creators')}
        className={styles.backLink}
      >
        ← back to creator database
      </div>

      <input
        value={shortlistName}
        onChange={(e) => setShortlistName(e.target.value)}
        className={styles.nameInput}
      />

      <div className={styles.layoutGrid}>
        {/* Shortlist Creator List */}
        <div className={styles.creatorList}>
          {creators.map((c) => (
            <div key={c.id} className={styles.creatorRow}>
              <Avatar name={c.handle} size={40} />
              <div className={styles.creatorRowInfo}>
                <div className={styles.creatorRowHandle}>{c.handle}</div>
                <div className={styles.creatorRowMeta}>
                  {c.platforms.map((p) => p[0].toUpperCase() + p.slice(1)).join(' + ')} · {c.er.toFixed(1)}% ER
                </div>
              </div>
              <div className={styles.kpiMatchWrapper}>
                <div className={styles.kpiMatchLabel}>
                  KPI match
                </div>
                <div className={styles.kpiMatchBar} style={{ backgroundColor: matchColorFor(c.id) }} />
              </div>
            </div>
          ))}
        </div>

        {/* Attach Panel */}
        <div className={styles.attachPanel}>
          <div className={styles.attachPanelLabel}>
            attach to campaign
          </div>

          <select
            value={campaignSel}
            onChange={(e) => setCampaignSel(e.target.value)}
            className={styles.campaignSelect}
          >
            {campaignOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>

          <Button variant="secondary" fullWidth onClick={() => setShortlistSaved(true)}>
            Save shortlist
          </Button>

          <Button variant="primary" fullWidth onClick={() => navigate('/campaigns')}>
            Move to campaign board
          </Button>

          {shortlistSaved && <div className={styles.savedNote}>Saved.</div>}
        </div>
      </div>
    </div>
  );
};
