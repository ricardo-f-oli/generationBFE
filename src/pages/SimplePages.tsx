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
import { Input, Select, TextArea } from '../components/common/Input';
import { Tag, humanise } from '../components/common/Tag';
import { useToast } from '../components/common/Toast';
import { createTemplate, fetchTemplates, generateAiTemplate } from '../services/platformService';
import { fetchSuppressions } from '../services/creatorService';
import { fetchRetentionStatus, runRetention } from '../services/adminService';
import { ApiError } from '../services/apiClient';
import type { OutreachType } from '../types';

/**
 * Requirement #32: drafts an outreach email with the LLM and saves it as a template.
 *
 * The result is always a draft in the library — it is never sent from here. If the provider is
 * unavailable the backend returns its own written fallback rather than failing, so this button
 * always produces something usable.
 */
const AiDraftPanel: React.FC<{ onCreated: () => void }> = ({ onCreated }) => {
  const toast = useToast();
  const [type, setType] = useState<OutreachType>('INITIAL_OUTREACH');
  const [context, setContext] = useState('');
  const [tone, setTone] = useState('');
  const [result, setResult] = useState<{ subject: string; body: string } | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      generateAiTemplate({
        type,
        campaignContext: context || undefined,
        tone: tone || undefined,
      }),
    onSuccess: (template) => {
      setResult({ subject: template.subjectTemplate, body: template.bodyTemplate });
      onCreated();
      toast.success('Draft written and saved to the library');
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not draft the email'),
  });

  return (
    <section className={ui.panel} style={{ marginBottom: 'var(--space-5)' }}>
      <p className={ui.sectionLabel}>Draft with AI</p>
      <p className={ui.cellMuted} style={{ marginTop: 0 }}>
        Writes an outreach email in the brand&apos;s tone of voice, keeping the merge tokens
        intact. It is saved as a draft template — nothing is sent.
      </p>

      <div className={ui.autoFit}>
        <Select label="Outreach type" value={type} onChange={(e) => setType(e.target.value as OutreachType)}>
          <option value="INITIAL_OUTREACH">Initial outreach</option>
          <option value="GIFTING_CONFIRMATION">Gifting confirmation</option>
          <option value="FOLLOW_UP">Follow-up</option>
          <option value="RE_ENGAGEMENT">Re-engagement</option>
        </Select>
        <Input
          label="Tone of voice"
          placeholder="Leave blank to use the brand's own"
          value={tone}
          onChange={(e) => setTone(e.target.value)}
        />
      </div>

      <TextArea
        label="Campaign context"
        placeholder="Autumn handbag launch, seeding to UK fashion creators"
        rows={2}
        value={context}
        onChange={(e) => setContext(e.target.value)}
      />

      <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
        {mutation.isPending ? 'Writing…' : 'Draft it'}
      </Button>

      {result && (
        <div style={{ marginTop: 'var(--space-4)' }}>
          <p className={ui.sectionLabel}>{result.subject}</p>
          <div
            style={{
              whiteSpace: 'pre-wrap',
              padding: 'var(--space-4)',
              background: 'var(--surface-muted)',
              border: 'var(--border-w) solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--fs-sm)',
              lineHeight: 1.6,
            }}
          >
            {result.body}
          </div>
        </div>
      )}
    </section>
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

      <AiDraftPanel
        onCreated={() => queryClient.invalidateQueries({ queryKey: ['outreach-templates'] })}
      />

      <div className={ui.splitNarrow}>
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

/**
 * Requirement #37: what the platform deletes, when, and when it last did it.
 *
 * The policy text comes from the server, which generates it from the sweepers themselves. That
 * matters more than it looks: a retention policy written on a page and a retention job written in
 * code drift apart within a quarter, and the page is the one people believe. Here there is only
 * one source, so the screen cannot claim something the job does not do.
 */
const RetentionPanel: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();

  const status = useQuery({
    queryKey: ['retention-status'],
    queryFn: fetchRetentionStatus,
    retry: false,
  });

  const preview = useMutation({
    mutationFn: () => runRetention(true),
    onSuccess: (outcomes) => {
      const total = outcomes.reduce((sum, o) => sum + o.affected, 0);
      toast.info(
        total === 0
          ? 'Nothing is currently due for deletion.'
          : `${total} record(s) are due. Nothing has been deleted \u2014 this was a preview.`,
      );
      queryClient.invalidateQueries({ queryKey: ['retention-status'] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not run the preview'),
  });

  const formatDate = (value: string | null) =>
    value ? new Date(value).toLocaleDateString('en-GB') : 'Never';

  return (
    <section className={ui.panel}>
      <p className={ui.sectionLabel}>Retention</p>

      <AsyncBoundary isLoading={status.isLoading} error={status.error}>
        {!status.data ? null : (
          <>
            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', marginTop: 0 }}>
              {status.data.enabled
                ? `Runs automatically at ${status.data.schedule}.`
                : 'Automatic deletion is switched OFF on this environment. Previews still work.'}
            </p>

            <div className={ui.tableWrap}>
              <table className={ui.table}>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Policy</th>
                    <th>Last applied</th>
                    <th className={ui.numeric}>Removed</th>
                  </tr>
                </thead>
                <tbody>
                  {status.data.policies.map((policy) => (
                    <tr key={policy.dataset}>
                      <td className={ui.cellStrong}>{policy.dataset}</td>
                      <td className={ui.cellMuted}>{policy.policy}</td>
                      <td className={policy.lastRunAt ? undefined : ui.cellMuted}>
                        {formatDate(policy.lastRunAt)}
                        {policy.error && (
                          <>
                            {' '}
                            <Tag tone="brand">Failed</Tag>
                          </>
                        )}
                      </td>
                      <td className={ui.numeric}>
                        {policy.lastAffected === null ? '\u2014' : policy.lastAffected}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 'var(--space-4)' }}>
              <Button
                variant="secondary"
                onClick={() => preview.mutate()}
                disabled={preview.isPending}
              >
                {preview.isPending ? 'Checking\u2026' : 'Preview what is due'}
              </Button>
              <p
                style={{
                  fontSize: 'var(--fs-xs)',
                  color: 'var(--text-muted)',
                  margin: 'var(--space-2) 0 0',
                }}
              >
                A preview counts what would be removed and changes nothing. Deletion happens on the
                nightly schedule.
              </p>
            </div>
          </>
        )}
      </AsyncBoundary>
    </section>
  );
};

export const SettingsGdprPage: React.FC = () => {
  const suppressions = useQuery({
    queryKey: ['suppressions'],
    queryFn: () => fetchSuppressions(0, 100),
    retry: false,
  });

  return (
    <Page>
      <PageHeader title="GDPR & data" subtitle="Consent, suppression and erasure" />

      <RetentionPanel />

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
