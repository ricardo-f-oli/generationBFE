import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Page, PageHeader, AsyncBoundary, EmptyState, ui } from '../components/common/PageShell';
import { Button } from '../components/common/Button';
import { Input, Select, TextArea } from '../components/common/Input';
import { Tag, statusTone, humanise } from '../components/common/Tag';
import { useToast } from '../components/common/Toast';
import {
  addRecipients,
  createOutreachDraft,
  fetchRecipients,
  fetchTemplates,
  markSentManually,
  prepareManualSend,
  previewResolved,
  sendOutreachNow,
} from '../services/platformService';
import { searchCreators } from '../services/creatorService';
import { ApiError } from '../services/apiClient';
import type { ManualSendBatch, ManualSendItem } from '../types';

const MERGE_TOKENS = ['{first_name}', '{handle}', '{brand}', '{last_worked_with}', '{product}'];

/**
 * Requirements #28–#31. Outreach was not in this round's "implement fully" scope, so this is a
 * working composer over the real endpoints rather than a finished product surface.
 *
 * Two behaviours are worth noting because they were broken before:
 *  - suppressed creators are rejected by the backend when recipients are added (#21)
 *  - a send reports per-recipient success or failure instead of claiming everything worked
 */
export const OutreachPage: React.FC = () => {
  const toast = useToast();

  const [subject, setSubject] = useState("Let's work together");
  const [body, setBody] = useState('Hi {first_name},\n\nWe would love to work with you on {brand}.');
  const [selected, setSelected] = useState<string[]>([]);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [recipientSearch, setRecipientSearch] = useState('');

  const templates = useQuery({ queryKey: ['outreach-templates'], queryFn: fetchTemplates });
  const creators = useQuery({
    queryKey: ['creators', 'outreach', recipientSearch],
    queryFn: () => searchCreators({ query: recipientSearch || undefined, size: 50 }),
  });
  const recipients = useQuery({
    queryKey: ['outreach-recipients', campaignId],
    queryFn: () => fetchRecipients(campaignId!),
    enabled: !!campaignId,
  });

  const draftMutation = useMutation({
    mutationFn: async () => {
      const draft = await createOutreachDraft({
        outreachType: 'INITIAL_OUTREACH',
        subject,
        body,
      });
      if (selected.length) await addRecipients(draft.id, selected);
      return draft;
    },
    onSuccess: (draft) => {
      setCampaignId(draft.id);
      toast.success('Draft saved with recipients');
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not save the draft'),
  });

  const sendMutation = useMutation({
    mutationFn: () => sendOutreachNow(campaignId!),
    onSuccess: (result) => {
      if (result.status === 'PARTIALLY_FAILED') {
        toast.error('Some messages failed to send — check the recipient list.');
      } else {
        toast.success(`Sent to ${result.recipientCount} creator(s)`);
      }
      recipients.refetch();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Send failed'),
  });

  const previewMutation = useMutation({
    mutationFn: () => previewResolved(campaignId!, recipients.data![0].id),
  });

  /**
   * Requirement #28, interim.
   *
   * The sending domain is not authenticated yet — it publishes `v=spf1 -all`, so mail claiming
   * to come from it is rejected outright rather than landing in spam. Until that is sorted, the
   * platform prepares the emails and the user sends them from their own mailbox.
   *
   * Everything the platform is good at still happens: the draft, the merge tokens resolved
   * against real data, the opt-out enforcement. Only the last hop moves.
   */
  const [manualBatch, setManualBatch] = useState<ManualSendBatch | null>(null);
  const [sentIds, setSentIds] = useState<string[]>([]);

  const manualMutation = useMutation({
    mutationFn: () => prepareManualSend(campaignId!),
    onSuccess: (batch) => {
      setManualBatch(batch);
      setSentIds([]);
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : 'Could not prepare the emails'),
  });

  const confirmSentMutation = useMutation({
    mutationFn: () => markSentManually(campaignId!, sentIds),
    onSuccess: (result) => {
      toast.success(`${result.marked} marked as sent`);
      setManualBatch(null);
      setSentIds([]);
      recipients.refetch();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not update statuses'),
  });

  const copyEmail = async (item: ManualSendItem) => {
    await navigator.clipboard.writeText(
      `To: ${item.email ?? ''}\nSubject: ${item.subject}\n\n${item.body}`,
    );
    toast.success('Copied — paste it into your mail client');
  };

  const insertToken = (token: string) => setBody((prev) => `${prev} ${token}`);

  return (
    <Page>
      <PageHeader
        title="Outreach composer"
        subtitle="Personalised email to selected creators"
        actions={
          <>
            <Button
              variant="secondary"
              disabled={!subject || !body || selected.length === 0 || draftMutation.isPending}
              onClick={() => draftMutation.mutate()}
            >
              {draftMutation.isPending ? 'Saving…' : 'Save draft'}
            </Button>
            {/*
              Preparing the emails for the user is the primary action while the domain is
              unauthenticated. "Send now" stays available but is secondary, because today it
              produces bounces rather than delivery.
            */}
            <Button
              variant="primary"
              disabled={!campaignId || manualMutation.isPending}
              onClick={() => manualMutation.mutate()}
            >
              {manualMutation.isPending ? 'Preparing…' : 'Prepare emails to send'}
            </Button>
            <Button
              variant="ghost"
              disabled={!campaignId || sendMutation.isPending}
              onClick={() => sendMutation.mutate()}
            >
              {sendMutation.isPending ? 'Sending…' : 'Send via platform'}
            </Button>
          </>
        }
      />

      {manualBatch && (
        <section className={ui.panel} style={{ marginBottom: 'var(--space-5)' }}>
          <p className={ui.sectionLabel}>Send these yourself</p>

          <p
            style={{
              fontSize: 'var(--fs-sm)',
              color: 'var(--text-muted)',
              margin: '0 0 var(--space-4)',
              maxWidth: '68ch',
            }}
          >
            {manualBatch.platformCanSend
              ? 'Each email below is personalised and ready. Send from your own mailbox, then tick off what went.'
              : 'The sending domain is not authenticated yet, so mail sent by the platform would be rejected rather than delivered. Each email below is written and personalised — send them from your own address, then tick off what went.'}
            {manualBatch.skipped > 0
              && ` ${manualBatch.skipped} creator(s) are excluded and their addresses withheld.`}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {manualBatch.items.map((item: ManualSendItem) => (
              <div
                key={item.recipientId}
                style={{
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-3)',
                  opacity: item.skipReason ? 0.6 : 1,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                  }}
                >
                  {!item.skipReason && (
                    <input
                      type="checkbox"
                      aria-label={`Mark ${item.creatorHandle} as sent`}
                      checked={sentIds.includes(item.recipientId)}
                      onChange={(e) =>
                        setSentIds((prev) =>
                          e.target.checked
                            ? [...prev, item.recipientId]
                            : prev.filter((id) => id !== item.recipientId),
                        )
                      }
                    />
                  )}
                  <strong style={{ fontSize: 'var(--fs-sm)' }}>@{item.creatorHandle}</strong>
                  <span className={ui.cellMuted} style={{ fontSize: 'var(--fs-xs)', flex: 1 }}>
                    {item.skipReason ?? item.email}
                  </span>

                  {!item.skipReason && (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => copyEmail(item)}>
                        Copy
                      </Button>
                      {item.mailtoUrl && (
                        <a
                          className={ui.inlineLink}
                          href={item.mailtoUrl}
                          style={{ fontSize: 'var(--fs-xs)', fontWeight: 'var(--weight-bold)' }}
                        >
                          Open in mail app
                        </a>
                      )}
                    </>
                  )}
                </div>

                {!item.skipReason && (
                  <details style={{ marginTop: 'var(--space-2)' }}>
                    <summary style={{ fontSize: 'var(--fs-xs)', cursor: 'pointer' }}>
                      {item.subject}
                    </summary>
                    <pre
                      style={{
                        whiteSpace: 'pre-wrap',
                        fontFamily: 'var(--font-body)',
                        fontSize: 'var(--fs-sm)',
                        margin: 'var(--space-2) 0 0',
                        color: 'var(--text-muted)',
                      }}
                    >
                      {item.body}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>

          <div className={ui.enrichBar ?? ''} style={{ marginTop: 'var(--space-4)' }}>
            <Button
              variant="primary"
              disabled={sentIds.length === 0 || confirmSentMutation.isPending}
              onClick={() => confirmSentMutation.mutate()}
            >
              {confirmSentMutation.isPending
                ? 'Updating…'
                : `Mark ${sentIds.length} as sent`}
            </Button>
            <Button variant="ghost" onClick={() => setManualBatch(null)}>
              Close
            </Button>
          </div>
        </section>
      )}

      <div className={ui.splitWide}>
        <section className={ui.panel} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Select
            label="Start from a template"
            defaultValue=""
            onChange={(e) => {
              const template = templates.data?.find((t) => t.id === e.target.value);
              if (template) {
                setSubject(template.subjectTemplate);
                setBody(template.bodyTemplate);
              }
            }}
          >
            <option value="">Blank message</option>
            {templates.data?.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </Select>

          <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />

          <div>
            <p className={ui.label} style={{ marginBottom: 'var(--space-2)' }}>Merge tokens</p>
            <div className={ui.chipRow}>
              {MERGE_TOKENS.map((token) => (
                <button key={token} type="button" className={ui.chip} onClick={() => insertToken(token)}>
                  {token}
                </button>
              ))}
            </div>
          </div>

          <TextArea label="Message" value={body} onChange={(e) => setBody(e.target.value)} rows={10} />

          <div>
            <p className={ui.sectionLabel}>Preview</p>
            {previewMutation.data ? (
              <div className={ui.panel} style={{ background: 'var(--surface-muted)' }}>
                <strong style={{ fontSize: 'var(--fs-sm)' }}>{previewMutation.data.resolvedSubject}</strong>
                <p style={{ whiteSpace: 'pre-wrap', fontSize: 'var(--fs-sm)', marginTop: 'var(--space-3)' }}>
                  {previewMutation.data.resolvedBody}
                </p>
              </div>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                disabled={!campaignId || !recipients.data?.length || previewMutation.isPending}
                onClick={() => previewMutation.mutate()}
              >
                Preview for the first recipient
              </Button>
            )}
          </div>
        </section>

        <section className={ui.panel}>
          <p className={ui.sectionLabel}>Recipients ({selected.length} selected)</p>

          <Input
            label="Search creators"
            value={recipientSearch}
            onChange={(e) => setRecipientSearch(e.target.value)}
            placeholder="handle, niche, location"
          />

          <div style={{ maxHeight: 320, overflowY: 'auto', marginTop: 'var(--space-3)' }}>
            <AsyncBoundary isLoading={creators.isLoading} error={creators.error}>
              {creators.data?.items.map((creator) => (
                <label
                  key={creator.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    padding: 'var(--space-2) 0',
                    borderBottom: '1px solid var(--border-subtle)',
                    fontSize: 'var(--fs-sm)',
                    opacity: creator.suppressed ? 0.5 : 1,
                  }}
                >
                  <input
                    type="checkbox"
                    disabled={creator.suppressed}
                    checked={selected.includes(creator.id)}
                    onChange={() =>
                      setSelected((prev) =>
                        prev.includes(creator.id)
                          ? prev.filter((x) => x !== creator.id)
                          : [...prev, creator.id],
                      )
                    }
                  />
                  <span style={{ flex: 1 }}>@{creator.handle}</span>
                  {creator.suppressed && <Tag tone="brand">Opted out</Tag>}
                </label>
              ))}
            </AsyncBoundary>
          </div>

          {campaignId && (
            <div style={{ marginTop: 'var(--space-4)' }}>
              <p className={ui.sectionLabel}>Send status</p>
              {recipients.data?.length === 0 ? (
                <EmptyState title="No recipients yet" />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {recipients.data?.map((recipient) => (
                    <div
                      key={recipient.id}
                      style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--fs-sm)' }}
                    >
                      <span style={{ flex: 1 }}>@{recipient.creatorHandle}</span>
                      <Tag tone={statusTone(recipient.status)}>{humanise(recipient.status)}</Tag>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </Page>
  );
};
