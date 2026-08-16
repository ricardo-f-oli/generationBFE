import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Page, PageHeader, AsyncBoundary, ui } from '../../components/common/PageShell';
import { Button } from '../../components/common/Button';
import { Input, TextArea } from '../../components/common/Input';
import { Switch } from '../../components/common/Switch';
import { Avatar } from '../../components/common/Avatar';
import { Tag, statusTone, humanise } from '../../components/common/Tag';
import { useToast } from '../../components/common/Toast';
import { useAuth } from '../../context/AuthContext';
import {
  addNote,
  anonymiseCreator,
  assignTag,
  deleteNote,
  fetchAttributeDefinitions,
  fetchAttributeValues,
  fetchCreator,
  fetchNotes,
  fetchTags,
  setAttributeValue,
  suppressCreator,
  unassignTag,
} from '../../services/creatorService';
import { ApiError } from '../../services/apiClient';
import styles from './Creators.module.css';

/**
 * Requirements #16, #17, #18, #19, #26 all need a creator profile screen — the prototype had
 * none, so notes, custom attributes and send history had nowhere to live.
 */
export const CreatorDetailPage: React.FC = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { hasRole } = useAuth();

  const creator = useQuery({ queryKey: ['creator', id], queryFn: () => fetchCreator(id) });
  const notes = useQuery({ queryKey: ['creator-notes', id], queryFn: () => fetchNotes(id) });
  const tags = useQuery({ queryKey: ['tags'], queryFn: fetchTags });
  const definitions = useQuery({ queryKey: ['attribute-defs'], queryFn: fetchAttributeDefinitions });
  const values = useQuery({
    queryKey: ['attribute-values', id],
    queryFn: () => fetchAttributeValues(id),
  });

  const [noteText, setNoteText] = useState('');
  const [confidential, setConfidential] = useState(false);

  const addNoteMutation = useMutation({
    mutationFn: () => addNote(id, noteText, confidential),
    onSuccess: () => {
      setNoteText('');
      setConfidential(false);
      queryClient.invalidateQueries({ queryKey: ['creator-notes', id] });
      toast.success('Note added');
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not add note'),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (noteId: string) => deleteNote(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-notes', id] });
      toast.success('Note removed');
    },
  });

  const tagMutation = useMutation({
    mutationFn: ({ tagId, attach }: { tagId: string; attach: boolean }) =>
      attach ? assignTag(id, tagId) : unassignTag(id, tagId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['creator', id] }),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not update tags'),
  });

  const attributeMutation = useMutation({
    mutationFn: ({ definitionId, value }: { definitionId: string; value: string }) =>
      setAttributeValue(id, definitionId, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attribute-values', id] });
      toast.success('Saved');
    },
  });

  const suppressMutation = useMutation({
    mutationFn: () => suppressCreator({ creatorId: id, reason: 'Suppressed by team' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator', id] });
      toast.success('Creator added to the suppression list');
    },
  });

  const anonymiseMutation = useMutation({
    mutationFn: () => anonymiseCreator(id),
    onSuccess: () => {
      toast.success('Creator anonymised');
      navigate('/creators');
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not anonymise'),
  });

  return (
    <Page>
      <Button variant="ghost" size="sm" onClick={() => navigate('/creators')}>
        ← Back to creator database
      </Button>

      <AsyncBoundary
        isLoading={creator.isLoading}
        error={creator.error}
        onRetry={() => creator.refetch()}
        loadingLabel="Loading creator"
      >
        {creator.data && (
          <>
            <PageHeader
              title={creator.data.name}
              subtitle={`@${creator.data.handle}`}
              actions={
                <>
                  {!creator.data.suppressed && (
                    <Button
                      variant="secondary"
                      onClick={() => suppressMutation.mutate()}
                      disabled={suppressMutation.isPending}
                    >
                      Suppress
                    </Button>
                  )}
                  {hasRole('ADMIN') && (
                    <Button
                      variant="danger"
                      onClick={() => {
                        if (window.confirm('Anonymise this creator? This cannot be undone.')) {
                          anonymiseMutation.mutate();
                        }
                      }}
                    >
                      Right to erasure
                    </Button>
                  )}
                </>
              }
            />

            {creator.data.suppressed && (
              <div className={ui.errorBanner}>
                This creator has opted out. They are excluded from every outreach send, across all
                brands.
              </div>
            )}

            <div className={styles.detailGrid}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                <section className={ui.panel}>
                  <div className={styles.detailHeader}>
                    <Avatar name={creator.data.handle} size={56} />
                    <div>
                      <h2 className={styles.detailName}>{creator.data.name}</h2>
                      <span className={styles.detailHandle}>
                        {creator.data.location ?? 'Location unknown'}
                        {creator.data.niche ? ` · ${creator.data.niche}` : ''}
                      </span>
                    </div>
                  </div>

                  <div className={ui.statGrid} style={{ marginTop: 'var(--space-4)' }}>
                    <div className={`${ui.stat} ${ui.statTintGrey}`}>
                      <p className={ui.statLabel}>Followers</p>
                      <div className={ui.statValue}>{creator.data.followersDisplay}</div>
                    </div>
                    <div className={`${ui.stat} ${ui.statTintLime}`}>
                      <p className={ui.statLabel}>Engagement</p>
                      <div className={ui.statValue}>
                        {Number(creator.data.erPercentage).toFixed(1)}%
                      </div>
                    </div>
                    <div className={`${ui.stat} ${ui.statTintPeach}`}>
                      <p className={ui.statLabel}>Band</p>
                      <div className={ui.statValue} style={{ fontSize: 'var(--fs-md)' }}>
                        {creator.data.followerBand}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Requirement #18 — internal notes with edit history */}
                <section className={ui.panel}>
                  <p className={ui.sectionLabel}>Internal notes</p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    <TextArea
                      label="Add a note"
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Visible to your team on this brand"
                      rows={3}
                    />
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 'var(--space-3)',
                        flexWrap: 'wrap',
                      }}
                    >
                      <Switch
                        checked={confidential}
                        onChange={setConfidential}
                        label="Confidential (admins, directors and you)"
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={!noteText.trim() || addNoteMutation.isPending}
                        onClick={() => addNoteMutation.mutate()}
                      >
                        {addNoteMutation.isPending ? 'Saving…' : 'Add note'}
                      </Button>
                    </div>
                  </div>

                  <div style={{ marginTop: 'var(--space-4)' }}>
                    {notes.data && notes.data.length === 0 && (
                      <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', margin: 0 }}>
                        No notes yet.
                      </p>
                    )}
                    {notes.data?.map((note) => (
                      <div key={note.id} className={styles.noteItem}>
                        <div className={styles.noteMeta}>
                          <span>{new Date(note.createdAt).toLocaleDateString('en-GB')}</span>
                          {note.confidential && <Tag tone="brand">Confidential</Tag>}
                          {note.revisionCount > 0 && (
                            <span>· edited {note.revisionCount}×</span>
                          )}
                          <button
                            type="button"
                            onClick={() => deleteNoteMutation.mutate(note.id)}
                            style={{
                              marginLeft: 'auto',
                              background: 'none',
                              border: 'none',
                              color: 'var(--color-red)',
                              cursor: 'pointer',
                              fontSize: 'var(--fs-xs)',
                              fontFamily: 'var(--font-body)',
                            }}
                          >
                            Delete
                          </button>
                        </div>
                        <p className={styles.noteBody}>{note.noteText}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                <section className={ui.panel}>
                  <p className={ui.sectionLabel}>Profile</p>
                  <dl className={styles.definitionList}>
                    <dt>Email</dt>
                    <dd>{creator.data.email ?? '—'}</dd>
                    <dt>Phone</dt>
                    <dd>{creator.data.phone ?? '—'}</dd>
                    <dt>Platform</dt>
                    <dd>{humanise(creator.data.primaryPlatform)}</dd>
                    <dt>TikTok</dt>
                    <dd>{creator.data.tiktokHandle ?? '—'}</dd>
                    <dt>YouTube</dt>
                    <dd>{creator.data.youtubeHandle ?? '—'}</dd>
                    <dt>UK audience</dt>
                    <dd>{creator.data.ukAudiencePct ? `${creator.data.ukAudiencePct}%` : '—'}</dd>
                    <dt>Age band</dt>
                    <dd>{creator.data.audienceAgeBand ?? '—'}</dd>
                    <dt>Opt-in</dt>
                    <dd>
                      <Tag tone={statusTone(creator.data.optInStatus)}>
                        {humanise(creator.data.optInStatus)}
                      </Tag>
                    </dd>
                    <dt>Last contact</dt>
                    <dd>{creator.data.lastContact ?? '—'}</dd>
                  </dl>
                </section>

                {/* Requirement #19 — cross-brand engagement history */}
                <section className={ui.panel}>
                  <p className={ui.sectionLabel}>Brand history</p>
                  {creator.data.brandEngagements.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', margin: 0 }}>
                      Not yet engaged by any brand.
                    </p>
                  ) : (
                    <div className={ui.chipRow}>
                      {creator.data.brandEngagements.map((engagement) => (
                        <Tag key={engagement.brandId} tone={statusTone(engagement.status)}>
                          {humanise(engagement.status)}
                        </Tag>
                      ))}
                    </div>
                  )}
                  {creator.data.workedWithOtherBrand && (
                    <p
                      style={{
                        marginTop: 'var(--space-3)',
                        fontSize: 'var(--fs-xs)',
                        color: 'var(--text-muted)',
                      }}
                    >
                      This creator has been contacted by another brand in the agency.
                    </p>
                  )}
                </section>

                {/* Requirement #17 — aesthetic tags */}
                <section className={ui.panel}>
                  <p className={ui.sectionLabel}>Aesthetic &amp; content tags</p>
                  <div className={ui.chipRow}>
                    {tags.data?.map((tag) => {
                      const attached = creator.data!.tags.includes(tag.name);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          className={`${ui.chip} ${attached ? ui.chipActive : ''}`}
                          onClick={() => tagMutation.mutate({ tagId: tag.id, attach: !attached })}
                        >
                          {tag.name}
                        </button>
                      );
                    })}
                    {tags.data?.length === 0 && (
                      <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', margin: 0 }}>
                        No tags defined yet.
                      </p>
                    )}
                  </div>
                </section>

                {/* Requirement #16 — admin-defined custom attributes */}
                <section className={ui.panel}>
                  <p className={ui.sectionLabel}>Custom attributes</p>
                  {definitions.data?.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', margin: 0 }}>
                      No attributes defined. An admin can add them under Tags &amp; attributes.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                      {definitions.data?.map((definition) => (
                        <Input
                          key={definition.id}
                          label={definition.label}
                          defaultValue={values.data?.[definition.key] ?? ''}
                          onBlur={(e) =>
                            attributeMutation.mutate({
                              definitionId: definition.id,
                              value: e.target.value,
                            })
                          }
                        />
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>
          </>
        )}
      </AsyncBoundary>
    </Page>
  );
};
