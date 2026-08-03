import React from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { simulateDelay } from '../services/apiClient';
import { INITIAL_KPIS, INITIAL_ACTIVITY_FEED, INITIAL_PENDING_ACTIONS } from '../mocks/mockData';
import { KpiCardData, ActivityItem, PendingAction } from '../types';
import styles from './DashboardPage.module.css';

interface DashboardOverview {
  kpis: KpiCardData[];
  activityFeed: ActivityItem[];
  pendingActions: PendingAction[];
}

// Simulates a service fetch until a dedicated dashboardService/backend endpoint exists.
async function fetchDashboardOverview(): Promise<DashboardOverview> {
  return simulateDelay(
    {
      kpis: INITIAL_KPIS,
      activityFeed: INITIAL_ACTIVITY_FEED,
      pendingActions: INITIAL_PENDING_ACTIONS,
    },
    200
  );
}

export const DashboardPage: React.FC = () => {
  const { activeBrand } = useOutletContext<{ activeBrand: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: fetchDashboardOverview,
  });

  const kpis = data?.kpis ?? [];
  const activityFeed = data?.activityFeed ?? [];
  const pendingActions = data?.pendingActions ?? [];

  if (isLoading) {
    return (
      <div className={styles.loadingState}>
        Loading dashboard overview...
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div>
        <div className={styles.headerTitle}>dashboard</div>
        <div className={styles.headerSubtitle}>{activeBrand} · overview</div>
      </div>

      {/* KPI Cards Grid */}
      <div className={styles.kpiGrid}>
        {kpis.map((kpi, idx) => (
          <Card key={idx} tint={kpi.tint} style={{ height: '110px' }}>
            <div className={styles.kpiLabel}>{kpi.label}</div>
            <div className={styles.kpiValue}>{kpi.value}</div>
          </Card>
        ))}
      </div>

      {/* Activity Feed & Pending Actions Grid */}
      <div className={styles.contentGrid}>
        {/* Activity Feed */}
        <div>
          <div className={styles.sectionLabel}>activity feed</div>
          <div className={styles.activityList}>
            {activityFeed.map((item) => (
              <div key={item.id} className={styles.activityItem}>
                <div className={styles.activityText}>{item.text}</div>
                <div className={styles.activityTime}>{item.time}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Actions */}
        <div>
          <div className={styles.sectionLabel}>pending actions</div>
          <div className={styles.pendingList}>
            {pendingActions.map((action) => (
              <Card key={action.id} tint="grey">
                <div className={styles.pendingCardInner}>
                  <div>
                    <div className={styles.pendingTitle}>{action.title}</div>
                    <div className={styles.pendingSubtitle}>{action.subtitle}</div>
                  </div>
                  <Button variant="primary" size="sm" onClick={() => navigate(action.targetScreen)}>
                    {action.actionLabel}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
