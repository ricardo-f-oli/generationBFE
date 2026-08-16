import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Page, PageHeader, AsyncBoundary, ui } from '../../components/common/PageShell';
import { Button } from '../../components/common/Button';
import { Input, Select, TextArea } from '../../components/common/Input';
import { Tag, statusTone, humanise } from '../../components/common/Tag';
import { useToast } from '../../components/common/Toast';
import {
  createBrief,
  fetchBriefs,
  fetchClauses,
  fetchShareLink,
  generateBrief,
} from '../../services/briefService';
import { API_BASE_URL, ApiError, tokenStore } from '../../services/apiClient';
import type { ToneOfVoice } from '../../types';

const DELIVERABLE_OPTIONS = ['Reel', 'Story', 'TikTok', 'YouTube', 'Blog', 'UGC'];
const TONES: ToneOfVoice[] = ['FORMAL', 'CONVERSATIONAL', 'PLAYFUL', 'EDITORIAL', 'INSPIRATIONAL'];

/** Requirements #1–#3: brief builder, PDF/share export, and the clause library. */
export const BriefBuilderPage: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    campaignName: '',
    campaignGoal: '',
    keyMessages: '',
    budgetMin: '',
    budgetMax: '',
    timelineStart: '',
    timelineEnd: '',
    toneOfVoice: 'CONVERSATIONAL' as ToneOfVoice,
    additionalNotes: '',
  });
  const [deliverables, setDeliverables] = useState<string[]>(['Reel', 'Story']);
  const [currentBriefId, setCurrentBriefId] = useState<string | null>(null);

  const briefs = useQuery({ queryKey: ['briefs'], queryFn: () => fetchBriefs(0, 10) });
  const clauses = useQuery({ queryKey: ['clauses'], queryFn: fetchClauses });

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const saveMutation = useMutation({
    mutationFn: () =>
      createBrief({
        campaignName: form.campaignName,
        campaignGoal: form.campaignGoal || undefined,
        keyMessages: form.keyMessages || undefined,
        deliverables,
        budgetMin: form.budgetMin ? Number(form.budgetMin) : undefined,
        budgetMax: form.budgetMax ? Number(form.budgetMax) : undefined,
        timelineStart: form.timelineStart ? new Date(form.timelineStart).toISOString() : undefined,
        timelineEnd: form.timelineEnd ? new Date(form.timelineEnd).toISOString() : undefined,
        toneOfVoice: form.toneOfVoice,
        additionalNotes: form.additionalNotes || undefined,
      }),
    onSuccess: (brief) => {
      setCurrentBriefId(brief.id);
      queryClient.invalidateQueries({ queryKey: ['briefs'] });
      toast.success('Brief saved');
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not save the brief'),
  });

  const generateMutation = useMutation({
    mutationFn: (id: string) => generateBrief(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['briefs'] });
      toast.success('Brief content generated');
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Generation failed'),
  });

  const shareMutation = useMutation({
    mutationFn: (id: string) => fetchShareLink(id),
    onSuccess: (result) => {
      const url = `${window.location.origin}${result.shareLink}`;
      navigator.clipboard?.writeText(url);
      toast.success('Share link copied to your clipboard');
    },
  });

  /** The PDF is a binary response, so it bypasses the JSON envelope. */
  const downloadPdf = async (id: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/briefs/${id}/export/pdf`, {
        headers: { Authorization: `Bearer ${tokenStore.getAccess()}` },
      });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `brief-${id}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Could not export the PDF');
    }
  };

  const toggleDeliverable = (item: string) =>
    setDeliverables((prev) =>
      prev.includes(item) ? prev.filter((d) => d !== item) : [...prev, item],
    );

  return (
    <Page>
      <PageHeader title="Brief builder" subtitle="Draft a creator brief and share it with the client" />

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 'var(--space-5)' }}>
        <section className={ui.panel} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Input label="Campaign name" value={form.campaignName} onChange={set('campaignName')} required />
          <TextArea label="Campaign goal" value={form.campaignGoal} onChange={set('campaignGoal')} rows={3} />
          <TextArea label="Key messages" value={form.keyMessages} onChange={set('keyMessages')} rows={3} />

          <div>
            <p className={ui.label} style={{ marginBottom: 'var(--space-2)' }}>Deliverables</p>
            <div className={ui.chipRow}>
              {DELIVERABLE_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`${ui.chip} ${deliverables.includes(option) ? ui.chipActive : ''}`}
                  onClick={() => toggleDeliverable(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <Input label="Budget min (£)" type="number" value={form.budgetMin} onChange={set('budgetMin')} />
            <Input label="Budget max (£)" type="number" value={form.budgetMax} onChange={set('budgetMax')} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <Input label="Start" type="date" value={form.timelineStart} onChange={set('timelineStart')} />
            <Input label="End" type="date" value={form.timelineEnd} onChange={set('timelineEnd')} />
          </div>

          <Select label="Tone of voice" value={form.toneOfVoice} onChange={set('toneOfVoice')}>
            {TONES.map((tone) => (
              <option key={tone} value={tone}>{humanise(tone)}</option>
            ))}
          </Select>

          <TextArea label="Additional notes" value={form.additionalNotes} onChange={set('additionalNotes')} rows={3} />

          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <Button
              variant="secondary"
              disabled={!form.campaignName || saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? 'Saving…' : 'Save brief'}
            </Button>
            <Button
              variant="primary"
              disabled={!currentBriefId || generateMutation.isPending}
              onClick={() => currentBriefId && generateMutation.mutate(currentBriefId)}
            >
              {generateMutation.isPending ? 'Generating…' : 'Generate content'}
            </Button>
          </div>
          <p style={{ margin: 0, fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
            Save the brief first, then generate. Review the draft before sharing it with a client.
          </p>
        </section>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <section className={ui.panel}>
            <p className={ui.sectionLabel}>Contract clauses</p>
            <AsyncBoundary isLoading={clauses.isLoading} error={clauses.error}>
              {clauses.data?.length === 0 ? (
                <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', margin: 0 }}>
                  No clauses defined yet.
                </p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 'var(--space-4)', fontSize: 'var(--fs-sm)' }}>
                  {clauses.data?.map((clause) => (
                    <li key={clause.id} style={{ marginBottom: 'var(--space-2)' }}>
                      <strong>{humanise(clause.clauseType)}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </AsyncBoundary>
          </section>

          <section className={ui.panel}>
            <p className={ui.sectionLabel}>Recent briefs</p>
            <AsyncBoundary isLoading={briefs.isLoading} error={briefs.error}>
              {briefs.data?.items.length === 0 ? (
                <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', margin: 0 }}>
                  No briefs yet.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {briefs.data?.items.map((brief) => (
                    <div
                      key={brief.id}
                      style={{
                        paddingBottom: 'var(--space-3)',
                        borderBottom: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <strong style={{ fontSize: 'var(--fs-sm)', flex: 1 }}>{brief.campaignName}</strong>
                        <Tag tone={statusTone(brief.status)}>{humanise(brief.status)}</Tag>
                      </div>
                      <div style={{ marginTop: 'var(--space-2)', display: 'flex', gap: 'var(--space-2)' }}>
                        <Button variant="ghost" size="sm" onClick={() => downloadPdf(brief.id)}>
                          PDF
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => shareMutation.mutate(brief.id)}>
                          Copy share link
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </AsyncBoundary>
          </section>
        </div>
      </div>
    </Page>
  );
};
