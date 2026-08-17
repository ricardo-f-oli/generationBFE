import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Page, PageHeader, AsyncBoundary, EmptyState, ui } from '../../components/common/PageShell';
import { Button } from '../../components/common/Button';
import { Input, Select, TextArea } from '../../components/common/Input';
import { useToast } from '../../components/common/Toast';
import {
  dismissFollowUp,
  editFollowUp,
  fetchFollowUps,
  generateFollowUps,
  markFollowUpSent,
  regenerateFollowUp,
} from '../../services/platformService';
import { ApiError } from '../../services/apiClient';
import type { FollowUpSuggestion } from '../../types';

/**
 * Requirement #33: the AI-drafted follow-up queue.
 *
 * A suggestion is a draft, not a decision: nothing leaves the building from this screen. You
 * edit the wording, copy it into your own send, and then mark it as sent — which is what stops
 * the daily scan suggesting the same person again.
 */
export const FollowUpsPage: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('SUGGESTED');

  const suggestions = useQuery({
    queryKey: ['follow-ups', status],
    queryFn: () => fetchFollowUps(status),
  });

  const onError = (error: unknown) =>
    toast.error(error instanceof ApiError ? error.message : 'That did not work');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['follow-ups'] });

  const generate = useMutation({
    mutationFn: generateFollowUps,
    onSuccess: (rows) => {
      invalidate();
      toast.success(
        rows.length === 0
          ? 'Nothing is waiting on a reply long enough to chase yet.'
          : `${rows.length} suggestion${rows.length === 1 ? '' : 's'} in the queue`,
      );
    },
    onError,
  });

  return (
    <Page>
      <PageHeader
        title="Follow-ups"
        subtitle="Outreach that has gone quiet, with a draft ready to send."
        actions={
          <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
            {generate.isPending ? 'Scanning…' : 'Scan for new ones'}
          </Button>
        }
      />

      <div className={ui.filterBar}>
        <Select
          label="Show"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="SUGGESTED">Waiting on you</option>
          <option value="SENT">Sent</option>
          <option value="DISMISSED">Dismissed</option>
        </Select>
      </div>

      <AsyncBoundary
        isLoading={suggestions.isLoading}
        error={suggestions.error}
        onRetry={() => suggestions.refetch()}
        loadingLabel="Loading suggestions"
      >
        {suggestions.data && suggestions.data.length === 0 ? (
          <EmptyState
            title={status === 'SUGGESTED' ? 'Nothing to chase' : 'Nothing here'}
            message="The daily scan at 08:00 picks up anyone who has not replied within the window. You can run it now instead."
            action={
              status === 'SUGGESTED' ? (
                <Button variant="secondary" onClick={() => generate.mutate()}>
                  Scan now
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {suggestions.data?.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                readOnly={status !== 'SUGGESTED'}
                onChanged={invalidate}
              />
            ))}
          </div>
        )}
      </AsyncBoundary>
    </Page>
  );
};

const SuggestionCard: React.FC<{
  suggestion: FollowUpSuggestion;
  readOnly: boolean;
  onChanged: () => void;
}> = ({ suggestion, readOnly, onChanged }) => {
  const toast = useToast();
  const [subject, setSubject] = useState(suggestion.draftSubject ?? '');
  const [body, setBody] = useState(suggestion.draftBody ?? '');

  const onError = (error: unknown) =>
    toast.error(error instanceof ApiError ? error.message : 'That did not work');

  const save = useMutation({
    mutationFn: () => editFollowUp(suggestion.id, { subject, body }),
    onSuccess: () => {
      onChanged();
      toast.success('Draft saved');
    },
    onError,
  });

  const regenerate = useMutation({
    mutationFn: () => regenerateFollowUp(suggestion.id),
    onSuccess: (updated) => {
      setBody(updated.draftBody ?? '');
      onChanged();
      toast.success('Rewritten');
    },
    onError,
  });

  const markSent = useMutation({
    mutationFn: () => markFollowUpSent(suggestion.id),
    onSuccess: () => {
      onChanged();
      toast.success('Marked as sent');
    },
    onError,
  });

  const dismiss = useMutation({
    mutationFn: () => dismissFollowUp(suggestion.id),
    onSuccess: () => {
      onChanged();
      toast.success('Dismissed');
    },
    onError,
  });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(body);
      toast.success('Draft copied');
    } catch {
      toast.error('Your browser would not let us copy. Select the text instead.');
    }
  };

  return (
    <article className={ui.panel}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-3)',
        }}
      >
        <strong>@{suggestion.creatorHandle}</strong>
        <span className={ui.cellMuted} style={{ fontSize: 'var(--fs-xs)' }}>
          Suggested {new Date(suggestion.createdAt).toLocaleDateString('en-GB')}
        </span>
      </div>

      <Input
        label="Subject"
        value={subject}
        disabled={readOnly}
        onChange={(event) => setSubject(event.target.value)}
      />
      <TextArea
        label="Draft"
        rows={6}
        value={body}
        disabled={readOnly}
        onChange={(event) => setBody(event.target.value)}
      />

      {!readOnly && (
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <Button size="sm" onClick={copy}>
            Copy draft
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => save.mutate()}
            disabled={save.isPending}
          >
            Save edits
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => regenerate.mutate()}
            disabled={regenerate.isPending}
          >
            Rewrite
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => markSent.mutate()}
            disabled={markSent.isPending}
          >
            I have sent this
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => dismiss.mutate()}
            disabled={dismiss.isPending}
          >
            Dismiss
          </Button>
        </div>
      )}
    </article>
  );
};
