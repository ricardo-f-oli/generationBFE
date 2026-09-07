import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MetricPanel, ReconciliationPanel } from './MetricPanel';
import type { ReportMetrics } from '../../types';

/**
 * The rule this file exists to protect: a metric with no data source is shown as unmeasurable,
 * never as zero.
 *
 * <p>It is the single most consequential piece of copy in the product — a client reading
 * "0 impressions" concludes the campaign got none, which is a different and much worse claim
 * than "we cannot measure this". A refactor that renders `metric ?? 0` would pass a type check
 * and quietly reintroduce it, so it is asserted here.
 */
const baseMetrics: ReportMetrics = {
  posts: 6,
  views: 128000,
  likes: 9400,
  comments: 412,
  shares: 260,
  saves: 880,
  estimatedReach: 128000,
  impressions: null,
  averageEngagementRate: 8.56,
  engagementRateVsTarget: null,
  followerGrowth: null,
  followerGrowthPct: null,
  shortFormPosts: 4,
  longFormPosts: 2,
  unsolicitedPosts: 1,
  qualityBands: { Strong: 3 },
  conversionRate: null,
  reconciliation: null,
  creatorBreakdown: [],
  topPosts: [],
  notes: [
    'Impressions are not supplied by any connected data source and are therefore not reported.',
  ],
};

describe('MetricPanel', () => {
  it('never prints zero for a metric that has no data source', () => {
    render(<MetricPanel metrics={baseMetrics} />);

    // Impressions and conversion are structurally unmeasurable, so they explain themselves.
    expect(screen.getByText(/No connected data source supplies impressions/i)).toBeInTheDocument();
    expect(screen.getByText(/Needs affiliate or UTM tracking/i)).toBeInTheDocument();
  });

  it('explains that follower growth needs two snapshots rather than showing 0', () => {
    render(<MetricPanel metrics={baseMetrics} />);

    expect(screen.getByText(/two follower snapshots/i)).toBeInTheDocument();
  });

  it('shows a real follower change when there is one, including a negative', () => {
    render(<MetricPanel metrics={{ ...baseMetrics, followerGrowth: -28000 }} />);

    // Losing followers is a real result and must be reported, not hidden.
    expect(screen.getByText('-28,000')).toBeInTheDocument();
  });

  it('prefixes a gain with a plus so direction is unmistakable', () => {
    render(<MetricPanel metrics={{ ...baseMetrics, followerGrowth: 15704 }} />);

    expect(screen.getByText('+15,704')).toBeInTheDocument();
  });

  it('formats large numbers for a human reader', () => {
    render(<MetricPanel metrics={{ ...baseMetrics, views: 3120000000 }} />);

    expect(screen.getByText('3,120,000,000')).toBeInTheDocument();
  });

  it('lists what the report cannot tell you', () => {
    render(<MetricPanel metrics={baseMetrics} />);

    expect(screen.getByText(/What this report cannot tell you/i)).toBeInTheDocument();
    expect(screen.getByText(/Impressions are not supplied/i)).toBeInTheDocument();
  });

  it('says so when there is no engagement rate, rather than showing 0%', () => {
    render(<MetricPanel metrics={{ ...baseMetrics, averageEngagementRate: null }} />);

    expect(screen.getByText(/No posts with views in this period/i)).toBeInTheDocument();
  });
});

describe('ReconciliationPanel', () => {
  it('says there is nothing to reconcile rather than showing a 0% post rate', () => {
    render(
      <ReconciliationPanel
        metrics={{
          ...baseMetrics,
          reconciliation: {
            sentTo: 0,
            posted: 0,
            notPosted: 0,
            postRate: null,
            outstanding: [],
          },
        }}
      />,
    );

    // 0% would read as "nobody posted", which is a different claim from "we sent to nobody".
    expect(screen.getByText(/No sends are recorded for this period/i)).toBeInTheDocument();
  });

  it('names everyone still to post and whether they have been chased', () => {
    render(
      <ReconciliationPanel
        metrics={{
          ...baseMetrics,
          reconciliation: {
            sentTo: 7,
            posted: 4,
            notPosted: 3,
            postRate: 57.1,
            outstanding: [
              { creatorId: '1', handle: 'marcuslifts', insightStatus: 'PENDING' },
              { creatorId: '2', handle: 'ellafashion', insightStatus: 'CHASED' },
            ],
          },
        }}
      />,
    );

    expect(screen.getByText('@marcuslifts')).toBeInTheDocument();
    expect(screen.getByText('Not chased')).toBeInTheDocument();
    expect(screen.getByText('Chased')).toBeInTheDocument();
    expect(screen.getByText('57.1%')).toBeInTheDocument();
  });
});
