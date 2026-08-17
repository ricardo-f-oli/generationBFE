import React from 'react';
import { ui } from '../../components/common/PageShell';
import { Tag } from '../../components/common/Tag';
import type { ReportMetrics } from '../../types';
import styles from './Reporting.module.css';

const number = new Intl.NumberFormat('en-GB');

export function formatNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : number.format(value);
}

/**
 * A metric with no data source behind it.
 *
 * Requirement #49 asks for impressions and conversion rate, and nothing we connect to supplies
 * either. Rendering them as 0 would read as a result rather than an absence, so the tile says
 * what is missing instead.
 */
const Unmeasured: React.FC<{ reason: string }> = ({ reason }) => (
  <span className={styles.metricUnmeasured}>{reason}</span>
);

const Metric: React.FC<{
  label: string;
  children: React.ReactNode;
  tint?: 'peach' | 'lime' | 'lemon';
}> = ({ label, children, tint }) => (
  <div
    className={[
      styles.metric,
      tint === 'peach' ? styles.metricPeach : '',
      tint === 'lime' ? styles.metricLime : '',
      tint === 'lemon' ? styles.metricLemon : '',
    ]
      .filter(Boolean)
      .join(' ')}
  >
    <span className={styles.metricLabel}>{label}</span>
    {typeof children === 'string' || typeof children === 'number' ? (
      <span className={styles.metricValue}>{children}</span>
    ) : (
      children
    )}
  </div>
);

/** Requirement #49: the full metric set, with the gaps stated rather than filled with zeros. */
export const MetricPanel: React.FC<{ metrics: ReportMetrics }> = ({ metrics }) => (
  <>
    <div className={styles.metricGrid}>
      <Metric label="Posts" tint="peach">
        {formatNumber(metrics.posts)}
      </Metric>
      <Metric label="Estimated reach" tint="lime">
        {formatNumber(metrics.estimatedReach)}
      </Metric>
      <Metric label="Views">{formatNumber(metrics.views)}</Metric>
      <Metric label="Likes">{formatNumber(metrics.likes)}</Metric>
      <Metric label="Comments">{formatNumber(metrics.comments)}</Metric>
      <Metric label="Shares">{formatNumber(metrics.shares)}</Metric>
      <Metric label="Saves">{formatNumber(metrics.saves)}</Metric>
      <Metric label="Average engagement" tint="lemon">
        {metrics.averageEngagementRate === null ? (
          <Unmeasured reason="No posts with views in this period." />
        ) : (
          `${metrics.averageEngagementRate}%`
        )}
      </Metric>
      <Metric label="Follower growth">
        {metrics.followerGrowth === null ? (
          <Unmeasured reason="Needs two follower snapshots; the first is taken nightly." />
        ) : (
          `${metrics.followerGrowth > 0 ? '+' : ''}${formatNumber(metrics.followerGrowth)}`
        )}
      </Metric>
      <Metric label="Impressions">
        <Unmeasured reason="No connected data source supplies impressions." />
      </Metric>
      <Metric label="Conversion rate">
        <Unmeasured reason="Needs affiliate or UTM tracking, which is not set up." />
      </Metric>
      <Metric label="Short / long form">
        {`${formatNumber(metrics.shortFormPosts)} / ${formatNumber(metrics.longFormPosts)}`}
      </Metric>
      <Metric label="Unsolicited posts">{formatNumber(metrics.unsolicitedPosts)}</Metric>
    </div>

    {metrics.notes.length > 0 && (
      <div className={styles.notes} style={{ marginTop: 'var(--space-4)' }}>
        <span className={styles.notesTitle}>What this report cannot tell you</span>
        {metrics.notes.map((note) => (
          <span key={note}>· {note}</span>
        ))}
      </div>
    )}
  </>
);

/** Requirement #15: who we sent to versus who actually posted. */
export const ReconciliationPanel: React.FC<{ metrics: ReportMetrics }> = ({ metrics }) => {
  const rec = metrics.reconciliation;
  if (!rec) return null;

  if (rec.sentTo === 0) {
    return (
      <div className={ui.noticeBanner}>
        No sends are recorded for this period, so there is nothing to reconcile against.
      </div>
    );
  }

  return (
    <>
      <div className={styles.metricGrid}>
        <Metric label="Sent to">{formatNumber(rec.sentTo)}</Metric>
        <Metric label="Posted" tint="lime">
          {formatNumber(rec.posted)}
        </Metric>
        <Metric label="Not yet posted" tint="peach">
          {formatNumber(rec.notPosted)}
        </Metric>
        <Metric label="Post rate">{rec.postRate === null ? '—' : `${rec.postRate}%`}</Metric>
      </div>

      {rec.outstanding.length > 0 && (
        <div className={ui.tableWrap} style={{ marginTop: 'var(--space-4)' }}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th>Creator</th>
                <th>Insight request</th>
              </tr>
            </thead>
            <tbody>
              {rec.outstanding.map((row) => (
                <tr key={row.creatorId}>
                  <td className={ui.cellStrong}>@{row.handle}</td>
                  <td>
                    <Tag tone={row.insightStatus === 'CHASED' ? 'lemon' : 'peach'}>
                      {row.insightStatus === 'CHASED' ? 'Chased' : 'Not chased'}
                    </Tag>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};

/** The per-creator table that goes into the client deck. */
export const CreatorBreakdown: React.FC<{ metrics: ReportMetrics }> = ({ metrics }) => {
  if (metrics.creatorBreakdown.length === 0) {
    return <p className={ui.cellMuted}>No creator posts in this period.</p>;
  }

  return (
    <div className={ui.tableWrap}>
      <table className={ui.table}>
        <thead>
          <tr>
            <th>Creator</th>
            <th className={ui.numeric}>Posts</th>
            <th className={ui.numeric}>Views</th>
            <th className={ui.numeric}>Likes</th>
            <th className={ui.numeric}>Comments</th>
            <th className={ui.numeric}>ER</th>
            <th>Insights</th>
          </tr>
        </thead>
        <tbody>
          {metrics.creatorBreakdown.map((row) => (
            <tr key={row.creatorId}>
              <td className={ui.cellStrong}>@{row.handle}</td>
              <td className={ui.numeric}>{formatNumber(row.posts)}</td>
              <td className={ui.numeric}>{formatNumber(row.views)}</td>
              <td className={ui.numeric}>{formatNumber(row.likes)}</td>
              <td className={ui.numeric}>{formatNumber(row.comments)}</td>
              <td className={ui.numeric}>
                {row.engagementRate === null ? '—' : `${row.engagementRate}%`}
              </td>
              <td>
                {row.insightStatus ? (
                  <Tag tone={row.insightStatus === 'RECEIVED' ? 'lime' : 'lemon'}>
                    {row.insightStatus.charAt(0) + row.insightStatus.slice(1).toLowerCase()}
                  </Tag>
                ) : (
                  <span className={ui.cellMuted}>—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
