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
  previewResolved,
  sendOutreachNow,
} from '../services/platformService';
import { searchCreators } from '../services/creatorService';
import { ApiError } from '../services/apiClient';

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
            <Button
              variant="primary"
              disabled={!campaignId || sendMutation.isPending}
              onClick={() => sendMutation.mutate()}
            >
              {sendMutation.isPending ? 'Sending…' : 'Send now'}
            </Button>
          </>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 'var(--space-5)' }}>
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
