/**
 * Screens for modules that were not in this round's "implement fully" scope.
 *
 * They read real endpoints where the backend genuinely has them, and say plainly what is not
 * built yet rather than showing invented numbers. Q-F1: nothing here falls back to fixtures.
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Page, PageHeader, AsyncBoundary, EmptyState, ui } from '../components/common/PageShell';
import { Button } from '../components/common/Button';
import { Input, Select } from '../components/common/Input';
import { Switch } from '../components/common/Switch';
import { Tag, statusTone, humanise } from '../components/common/Tag';
import { useToast } from '../components/common/Toast';
import {
  createTemplate,
  fetchCoverageLog,
  fetchGiftingLog,
  fetchTemplates,
  updateDigestSettings,
  updateDispatchStatus,
} from '../services/platformService';
import { fetchSuppressions } from '../services/creatorService';
import { ApiError } from '../services/apiClient';

// ------------------------------------------------------------ not yet built

const NotBuiltYet: React.FC<{ title: string; subtitle: string; detail: string }> = ({
  title,
  subtitle,
  detail,
}) => (
  <Page>
    <PageHeader title={title} subtitle={subtitle} />
    <div className={ui.noticeBanner}>
      <strong>Not built yet.</strong> {detail}
    </div>
  </Page>
);

// ----------------------------------------------------------------- coverage

export const CoveragePage: React.FC = () => {
  const coverage = useQuery({ queryKey: ['coverage'], queryFn: () => fetchCoverageLog() });

  const totals = coverage.data?.reduce(
    (acc, item) => ({
      posts: acc.posts + 1,
      views: acc.views + Number(item.views ?? 0),
      likes: acc.likes + Number(item.likes ?? 0),
    }),
    { posts: 0, views: 0, likes: 0 },
  );

  return (
    <Page>
      <PageHeader title="Coverage log" subtitle="Clippings captured for this brand" />

      <AsyncBoundary
        isLoading={coverage.isLoading}
        error={coverage.error}
        onRetry={() => coverage.refetch()}
        loadingLabel="Loading coverage"
      >
        <div className={ui.statGrid}>
          <div className={ui.stat}>
            <p className={ui.statLabel}>Posts</p>
            <div className={ui.statValue}>{totals?.posts ?? 0}</div>
          </div>
          <div className={`${ui.stat} ${ui.statTintLime}`}>
            <p className={ui.statLabel}>Total views</p>
            <div className={ui.statValue}>{(totals?.views ?? 0).toLocaleString('en-GB')}</div>
          </div>
          <div className={`${ui.stat} ${ui.statTintPeach}`}>
            <p className={ui.statLabel}>Total likes</p>
            <div className={ui.statValue}>{(totals?.likes ?? 0).toLocaleString('en-GB')}</div>
          </div>
        </div>

        {coverage.data?.length === 0 ? (
          <EmptyState
            title="No coverage captured yet"
            message="Auto-capture from Instagram and TikTok is pending the creator-data vendor contract."
          />
        ) : (
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th>Creator</th>
                  <th>Platform</th>
                  <th>Type</th>
                  <th className={ui.numeric}>Views</th>
                  <th className={ui.numeric}>Likes</th>
                  <th className={ui.numeric}>ER</th>
                  <th>Clipping name</th>
                </tr>
              </thead>
              <tbody>
                {coverage.data?.map((item) => (
                  <tr key={item.id}>
                    <td className={ui.cellStrong}>@{item.creatorHandle}</td>
                    <td className={ui.cellMuted}>{humanise(item.platform)}</td>
                    <td>
                      <Tag tone="neutral">{humanise(item.postType)}</Tag>
                      {item.unsolicited && <Tag tone="lemon">Unsolicited</Tag>}
                    </td>
                    <td className={ui.numeric}>{Number(item.views).toLocaleString('en-GB')}</td>
                    <td className={ui.numeric}>{Number(item.likes).toLocaleString('en-GB')}</td>
                    <td className={ui.numeric}>{Number(item.er).toFixed(1)}%</td>
                    <td className={ui.cellMuted}>
                      <code style={{ fontSize: 'var(--fs-xs)' }}>{item.standardizedName}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AsyncBoundary>
    </Page>
  );
};

export const CoverageDigestPage: React.FC = () => {
  const toast = useToast();
  const [enabled, setEnabled] = useState(true);
  const [sendTime, setSendTime] = useState('08:00');
  const [recipient, setRecipient] = useState('');

  const mutation = useMutation({
    mutationFn: () => updateDigestSettings({ enabled, sendTime, recipientEmail: recipient || undefined }),
    onSuccess: () => toast.success('Digest settings saved'),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not save settings'),
  });

  return (
    <Page>
      <PageHeader title="Coverage digest" subtitle="Daily morning summary of new coverage" />

      <section className={ui.panel} style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <Switch checked={enabled} onChange={setEnabled} label="Send a daily digest email" />
        <Input label="Send time" type="time" value={sendTime} onChange={(e) => setSendTime(e.target.value)} />
        <Input
          label="Recipient"
          type="email"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="team@btheagency.com"
        />
        {/* Q-J22: an explicit save, rather than firing a mutation on every keystroke. */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="primary" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Saving…' : 'Save settings'}
          </Button>
        </div>
        <p style={{ margin: 0, fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
          The scheduler runs daily at 08:00 Europe/London. Per-brand send times are stored but the
          digest email content is still being built.
        </p>
      </section>
    </Page>
  );
};

// ------------------------------------------------------------------ gifting

export const GiftingPage: React.FC = () => {
  const gifting = useQuery({ queryKey: ['gifting'], queryFn: fetchGiftingLog });

  return (
    <Page>
      <PageHeader title="Gifting logistics" subtitle="Dispatch and delivery per creator" />

      <AsyncBoundary
        isLoading={gifting.isLoading}
        error={gifting.error}
        onRetry={() => gifting.refetch()}
        loadingLabel="Loading gifting log"
      >
        {gifting.data?.length === 0 ? (
          <EmptyState
            title="No dispatches yet"
            message="Dispatches appear here once a gifting run is created."
          />
        ) : (
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th>Creator</th>
                  <th>Address</th>
                  <th>GDPR consent</th>
                  <th>Product</th>
                  <th>Courier</th>
                  <th>Tracking</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {gifting.data?.map((row) => (
                  <tr key={row.id}>
                    <td className={ui.cellStrong}>@{row.handle}</td>
                    <td>
                      <Tag tone={statusTone(row.addressStatus)}>{humanise(row.addressStatus)}</Tag>
                    </td>
                    <td className={ui.cellMuted}>{row.gdprConsent ? 'Recorded' : 'Not captured'}</td>
                    <td className={ui.cellMuted}>{row.productName ?? '—'}</td>
                    <td className={ui.cellMuted}>{row.courier ?? '—'}</td>
                    <td className={ui.cellMuted}>{row.trackingNumber ?? '—'}</td>
                    <td>
                      <Tag tone={statusTone(row.status)}>{humanise(row.status)}</Tag>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AsyncBoundary>
    </Page>
  );
};

export const DispatchesPage: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const gifting = useQuery({ queryKey: ['gifting'], queryFn: fetchGiftingLog });

  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateDispatchStatus(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gifting'] });
      toast.success('Dispatch updated');
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not update dispatch'),
  });

  return (
    <Page>
      <PageHeader title="Dispatches" subtitle="Update courier status per parcel" />

      <AsyncBoundary isLoading={gifting.isLoading} error={gifting.error}>
        {gifting.data?.length === 0 ? (
          <EmptyState title="No dispatches" />
        ) : (
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead>
                <tr>
                  <th>Creator</th>
                  <th>Tracking</th>
                  <th>Status</th>
                  <th>Update</th>
                </tr>
              </thead>
              <tbody>
                {gifting.data?.map((row) => (
                  <tr key={row.id}>
                    <td className={ui.cellStrong}>@{row.handle}</td>
                    <td className={ui.cellMuted}>{row.trackingNumber ?? '—'}</td>
                    <td>
                      <Tag tone={statusTone(row.status)}>{humanise(row.status)}</Tag>
                    </td>
                    <td>
                      <select
                        className={ui.select}
                        style={{ width: 'auto' }}
                        defaultValue=""
                        onChange={(e) => {
                          if (e.target.value) mutation.mutate({ id: row.id, status: e.target.value });
                          e.target.value = '';
                        }}
                        aria-label={`Update status for ${row.handle}`}
                      >
                        <option value="">Set status…</option>
                        <option value="READY_TO_DISPATCH">Ready to dispatch</option>
                        <option value="DISPATCHED">Dispatched</option>
                        <option value="DELIVERED">Delivered</option>
                        <option value="RETURNED">Returned</option>
                        <option value="DECLINED">Declined</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AsyncBoundary>
    </Page>
  );
};

// ----------------------------------------------------------------- outreach

export const TemplatesPage: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const templates = useQuery({ queryKey: ['outreach-templates'], queryFn: fetchTemplates });
  const [form, setForm] = useState({ name: '', subjectTemplate: '', bodyTemplate: '' });

  const mutation = useMutation({
    mutationFn: () => createTemplate({ ...form, type: 'INITIAL_OUTREACH' }),
    onSuccess: () => {
      setForm({ name: '', subjectTemplate: '', bodyTemplate: '' });
      queryClient.invalidateQueries({ queryKey: ['outreach-templates'] });
      toast.success('Template created');
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not create template'),
  });

  return (
    <Page>
      <PageHeader title="Outreach templates" subtitle="Reusable email templates for this brand" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 'var(--space-5)' }}>
        <section className={ui.panel} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <p className={ui.sectionLabel}>New template</p>
          <Input label="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          <Input
            label="Subject"
            value={form.subjectTemplate}
            onChange={(e) => setForm((p) => ({ ...p, subjectTemplate: e.target.value }))}
          />
          <Input
            label="Body"
            value={form.bodyTemplate}
            onChange={(e) => setForm((p) => ({ ...p, bodyTemplate: e.target.value }))}
            hint="Use {first_name}, {handle}, {brand}"
          />
          <Button
            variant="primary"
            disabled={!form.name || !form.subjectTemplate || !form.bodyTemplate || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            Create template
          </Button>
        </section>

        <section>
          <AsyncBoundary isLoading={templates.isLoading} error={templates.error}>
            {templates.data?.length === 0 ? (
              <EmptyState title="No templates yet" />
            ) : (
              <div className={ui.tableWrap}>
                <table className={ui.table}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Subject</th>
                      <th>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {templates.data?.map((template) => (
                      <tr key={template.id}>
                        <td className={ui.cellStrong}>{template.name}</td>
                        <td className={ui.cellMuted}>{humanise(template.type)}</td>
                        <td className={ui.cellMuted}>{template.subjectTemplate}</td>
                        <td>{template.aiGenerated ? <Tag tone="peach">AI</Tag> : <Tag tone="neutral">Manual</Tag>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AsyncBoundary>
        </section>
      </div>
    </Page>
  );
};

// ---------------------------------------------------------------- reporting

export const ReportingPage: React.FC = () => (
  <NotBuiltYet
    title="Reporting"
    subtitle="Campaign and seeding reports"
    detail={
      'The reporting module is the next phase. Five of the eight required metrics have no data ' +
      'source yet — impressions, follower growth, content quality, conversion and short-vs-long ' +
      'form are not captured anywhere. Rather than show numbers that are not real, this screen ' +
      'stays empty until the metrics pipeline exists.'
    }
  />
);

// ----------------------------------------------------------------- settings

export const SettingsUsersPage: React.FC = () => (
  <NotBuiltYet
    title="Users & roles"
    subtitle="Team access for this brand"
    detail={
      'User management has no backend yet. Each user currently belongs to exactly one brand, ' +
      'and accounts are created by seeding. Invite, role change and removal are the next step.'
    }
  />
);

export const SettingsGdprPage: React.FC = () => {
  const suppressions = useQuery({
    queryKey: ['suppressions'],
    queryFn: () => fetchSuppressions(0, 100),
    retry: false,
  });

  return (
    <Page>
      <PageHeader title="GDPR & data" subtitle="Consent, suppression and erasure" />

      <section className={ui.panel}>
        <p className={ui.sectionLabel}>What is live</p>
        <ul style={{ margin: 0, paddingLeft: 'var(--space-5)', fontSize: 'var(--fs-sm)', lineHeight: 1.7 }}>
          <li>Consent is recorded with a lawful basis, timestamp, source and policy version.</li>
          <li>
            Suppression is enforced before every send — an opted-out creator cannot be added to an
            outreach list, on any brand.
          </li>
          <li>
            Every outreach email carries an unsubscribe link and a <code>List-Unsubscribe</code>{' '}
            header, pointing at a public page that needs no login.
          </li>
          <li>
            Right to erasure anonymises the creator record and keeps a suppression entry so they
            are never re-imported. Available from any creator profile, admin only.
          </li>
        </ul>
      </section>

      <section>
        <p className={ui.sectionLabel}>Suppression list</p>
        <AsyncBoundary isLoading={suppressions.isLoading} error={null}>
          {!suppressions.data || suppressions.data.items.length === 0 ? (
            <EmptyState
              title="Nobody suppressed"
              message="Opt-outs and erasure requests will be listed here."
            />
          ) : (
            <div className={ui.tableWrap}>
              <table className={ui.table}>
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Handle</th>
                    <th>Reason</th>
                    <th>Source</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {suppressions.data.items.map((entry) => (
                    <tr key={entry.id}>
                      <td className={ui.cellStrong}>{entry.email ?? '—'}</td>
                      <td className={ui.cellMuted}>{entry.handle ?? '—'}</td>
                      <td className={ui.cellMuted}>{entry.reason}</td>
                      <td>
                        <Tag tone="neutral">{humanise(entry.source)}</Tag>
                      </td>
                      <td className={ui.cellMuted}>
                        {new Date(entry.optedOutAt).toLocaleDateString('en-GB')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AsyncBoundary>
        <p style={{ marginTop: 'var(--space-3)', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
          Test the public unsubscribe flow at <Link to="/unsubscribe">/unsubscribe</Link>.
        </p>
      </section>
    </Page>
  );
};

export const SettingsAuditPage: React.FC = () => (
  <NotBuiltYet
    title="Audit log"
    subtitle="Every change, with the previous value"
    detail={
      'Auditing is running and writing records for briefs, campaigns, boards, creators and ' +
      'outreach, with PII redacted. A read API and this viewer are the remaining piece.'
    }
  />
);

// --------------------------------------------------------------- not found

export const NotFoundPage: React.FC = () => (
  <Page>
    <PageHeader title="Page not found" subtitle="That link does not go anywhere" />
    <EmptyState
      title="404"
      message="The page you were looking for does not exist."
      action={
        <Link to="/dashboard">
          <Button variant="primary">Back to dashboard</Button>
        </Link>
      }
    />
  </Page>
);
