import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Page, PageHeader, AsyncBoundary, ui } from '../../components/common/PageShell';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Switch } from '../../components/common/Switch';
import { useToast } from '../../components/common/Toast';
import { useDebouncedValue } from '../../components/common/useDebouncedValue';
import {
  fetchDigestSettings,
  previewClippingName,
  sendDigestNow,
  updateDigestSettings,
} from '../../services/coverageService';
import { ApiError } from '../../services/apiClient';

const PLACEHOLDERS = ['{brand}', '{creator}', '{handle}', '{platform}', '{type}', '{date}'];

/**
 * Requirements #12 and #13: the clipping-name format and the morning digest.
 */
export const CoverageDigestPage: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [enabled, setEnabled] = useState(true);
  const [sendTime, setSendTime] = useState('08:00');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [includeUnsolicited, setIncludeUnsolicited] = useState(true);
  const [pattern, setPattern] = useState('');

  const settings = useQuery({ queryKey: ['digest-settings'], queryFn: fetchDigestSettings });

  useEffect(() => {
    const data = settings.data;
    if (!data) return;
    setEnabled(data.enabled);
    setSendTime(data.sendTime);
    setRecipientEmail(data.recipientEmail ?? '');
    setIncludeUnsolicited(data.includeUnsolicited);
    setPattern(data.clippingNamePattern);
  }, [settings.data]);

  const debouncedPattern = useDebouncedValue(pattern, 400);

  // Requirement #12: shows what the pattern produces before anyone commits to it.
  const preview = useQuery({
    queryKey: ['clipping-preview', debouncedPattern],
    queryFn: () => previewClippingName(debouncedPattern || undefined),
    enabled: Boolean(debouncedPattern),
  });

  const onError = (error: unknown) =>
    toast.error(error instanceof ApiError ? error.message : 'That did not work');

  const save = useMutation({
    mutationFn: () =>
      updateDigestSettings({
        enabled,
        sendTime,
        recipientEmail,
        includeUnsolicited,
        clippingNamePattern: pattern,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digest-settings'] });
      toast.success('Settings saved');
    },
    onError,
  });

  const sendNow = useMutation({
    mutationFn: sendDigestNow,
    onSuccess: (result) =>
      result.sent
        ? toast.success('Digest sent')
        : toast.info('Nothing new since the last digest, so none was sent.'),
    onError,
  });

  return (
    <Page>
      <PageHeader
        title="Coverage settings"
        subtitle="The morning digest, and how clippings are named."
      />

      <AsyncBoundary
        isLoading={settings.isLoading}
        error={settings.error}
        onRetry={() => settings.refetch()}
        loadingLabel="Loading settings"
      >
        <section className={ui.panel}>
          <h2 className={ui.sectionLabel}>Morning digest</h2>
          <p className={ui.cellMuted} style={{ marginTop: 0 }}>
            A summary of everything captured since the last one. Quiet days do not produce an
            email — a daily "nothing to report" trains people to ignore it.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Switch checked={enabled} onChange={setEnabled} label="Send the digest" />

            <Input
              label="Send at"
              type="time"
              value={sendTime}
              onChange={(event) => setSendTime(event.target.value)}
            />

            <Input
              label="Send to"
              type="email"
              hint="Leave blank to use the team address configured for this environment."
              value={recipientEmail}
              onChange={(event) => setRecipientEmail(event.target.value)}
            />

            <Switch
              checked={includeUnsolicited}
              onChange={setIncludeUnsolicited}
              label="Include unsolicited coverage"
            />
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              Save settings
            </Button>
            <Button
              variant="secondary"
              onClick={() => sendNow.mutate()}
              disabled={sendNow.isPending}
            >
              Send one now
            </Button>
          </div>

          {settings.data?.lastSentAt && (
            <p className={ui.cellMuted} style={{ marginBottom: 0 }}>
              Last sent {new Date(settings.data.lastSentAt).toLocaleString('en-GB')}.
            </p>
          )}
        </section>

        <section className={ui.panel} style={{ marginTop: 'var(--space-5)' }}>
          <h2 className={ui.sectionLabel}>Clipping names</h2>
          <p className={ui.cellMuted} style={{ marginTop: 0 }}>
            Every captured post gets a standardised name so assets file consistently. Available
            placeholders: {PLACEHOLDERS.join(' ')}
          </p>

          <Input
            label="Format"
            value={pattern}
            onChange={(event) => setPattern(event.target.value)}
          />

          {preview.data && (
            <div className={ui.noticeBanner}>
              <strong>Example:</strong> {preview.data.example}
            </div>
          )}

          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending || !pattern.trim()}
            style={{ marginTop: 'var(--space-3)' }}
          >
            Save format
          </Button>
        </section>
      </AsyncBoundary>
    </Page>
  );
};
