import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Page, PageHeader, AsyncBoundary, ui } from '../components/common/PageShell';
import { Button } from '../components/common/Button';
import { Tag, statusTone, humanise } from '../components/common/Tag';
import { useAuth } from '../context/AuthContext';
import { searchCreators, fetchPendingRegistrations } from '../services/creatorService';
import { fetchCampaigns, fetchShortlists } from '../services/campaignService';
import { fetchWaitlistStats } from '../services/marketingService';

/**
 * Q-F9: every number on this page used to be a hardcoded literal. They are all live now.
 * Q-A9: no useOutletContext — the brand comes from the authenticated user.
 */
export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const overview = useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: async () => {
      const [creators, campaigns, shortlists, pending, waitlist] = await Promise.all([
        searchCreators({ size: 1 }),
        fetchCampaigns(undefined, 0, 100),
        fetchShortlists(),
        fetchPendingRegistrations(0, 5),
        fetchWaitlistStats().catch(() => ({ pending: 0, confirmed: 0, converted: 0, total: 0 })),
      ]);
      return { creators, campaigns, shortlists, pending, waitlist };
    },
  });

  const data = overview.data;
  const activeCampaigns = data?.campaigns.items.filter((c) => c.status === 'ACTIVE') ?? [];

  return (
    <Page>
      <PageHeader
        title="Dashboard"
        subtitle={`Signed in as ${user?.name ?? user?.email} · ${humanise(user?.role)}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('/creators')}>
              Find creators
            </Button>
            <Button variant="primary" onClick={() => navigate('/campaigns')}>
              New campaign
            </Button>
          </>
        }
      />

      <AsyncBoundary
        isLoading={overview.isLoading}
        error={overview.error}
        onRetry={() => overview.refetch()}
        loadingLabel="Loading your workspace"
      >
        <div className={ui.statGrid}>
          <div className={ui.stat}>
            <p className={ui.statLabel}>Creators in database</p>
            <div className={ui.statValue}>{data?.creators.meta.totalElements ?? 0}</div>
          </div>
          <div className={`${ui.stat} ${ui.statTintGrey}`}>
            <p className={ui.statLabel}>Active campaigns</p>
            <div className={ui.statValue}>{activeCampaigns.length}</div>
          </div>
          <div className={`${ui.stat} ${ui.statTintPeach}`}>
            <p className={ui.statLabel}>Pending registrations</p>
            <div className={ui.statValue}>{data?.pending.meta.totalElements ?? 0}</div>
          </div>
          <div className={`${ui.stat} ${ui.statTintLime}`}>
            <p className={ui.statLabel}>Shortlists</p>
            <div className={ui.statValue}>{data?.shortlists.length ?? 0}</div>
          </div>
          <div className={`${ui.stat} ${ui.statTintLemon}`}>
            <p className={ui.statLabel}>Waitlist sign-ups</p>
            <div className={ui.statValue}>{data?.waitlist.total ?? 0}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
          <section>
            <p className={ui.sectionLabel}>Active campaigns</p>
            {activeCampaigns.length === 0 ? (
              <div className={ui.emptyState}>
                <p className={ui.emptyTitle}>No active campaigns</p>
                <p style={{ margin: 0 }}>Create one to start building a board.</p>
              </div>
            ) : (
              <div className={ui.tableWrap}>
                <table className={ui.table}>
                  <thead>
                    <tr>
                      <th>Campaign</th>
                      <th>Type</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeCampaigns.slice(0, 6).map((campaign) => (
                      <tr
                        key={campaign.id}
                        onClick={() => navigate(`/campaigns/board?campaignId=${campaign.id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td className={ui.cellStrong}>{campaign.name}</td>
                        <td className={ui.cellMuted}>{humanise(campaign.campaignType)}</td>
                        <td>
                          <Tag tone={statusTone(campaign.status)}>{humanise(campaign.status)}</Tag>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <p className={ui.sectionLabel}>Awaiting your review</p>
            {(data?.pending.items.length ?? 0) === 0 ? (
              <div className={ui.emptyState}>
                <p className={ui.emptyTitle}>Nothing pending</p>
                <p style={{ margin: 0 }}>New creator sign-ups will appear here.</p>
              </div>
            ) : (
              <div className={ui.tableWrap}>
                <table className={ui.table}>
                  <thead>
                    <tr>
                      <th>Creator</th>
                      <th>Platform</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {data?.pending.items.map((creator) => (
                      <tr key={creator.id}>
                        <td className={ui.cellStrong}>@{creator.handle}</td>
                        <td className={ui.cellMuted}>{humanise(creator.primaryPlatform)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate('/creators/registrations')}
                          >
                            Review →
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </AsyncBoundary>
    </Page>
  );
};
