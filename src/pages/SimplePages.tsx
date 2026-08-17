/**
 * Screens that are small enough not to warrant a folder of their own.
 *
 * Coverage, gifting, reporting, follow-ups and user management have each grown into their own
 * directory. What is left here is the outreach template library, the GDPR overview and the 404.
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Page, PageHeader, AsyncBoundary, EmptyState, ui } from '../components/common/PageShell';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Tag, humanise } from '../components/common/Tag';
import { useToast } from '../components/common/Toast';
import { createTemplate, fetchTemplates } from '../services/platformService';
import { fetchSuppressions } from '../services/creatorService';
import { ApiError } from '../services/apiClient';

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

// ------------------------------------------------------------------- GDPR

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
