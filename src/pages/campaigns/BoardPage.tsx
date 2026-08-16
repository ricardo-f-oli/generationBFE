import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Page, PageHeader, AsyncBoundary, EmptyState, ui } from '../../components/common/PageShell';
import { Button } from '../../components/common/Button';
import { Input, Select, TextArea } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Switch } from '../../components/common/Switch';
import { Tag, statusTone, humanise } from '../../components/common/Tag';
import { useToast } from '../../components/common/Toast';
import {
  addColumn,
  addComment,
  approveCard,
  bulkMoveCards,
  fetchBoardForCampaign,
  fetchCampaigns,
  fetchComments,
  moveCard,
  updateCard,
  updatePaymentStatus,
} from '../../services/campaignService';
import { searchCreators } from '../../services/creatorService';
import { ApiError } from '../../services/apiClient';
import type { CampaignCard } from '../../types';
import styles from './Board.module.css';

const FILTERS = [
  { key: '', label: 'All cards' },
  { key: 'my-cards', label: 'My cards' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'awaiting-approval', label: 'Awaiting approval' },
  { key: 'due-this-week', label: 'Due this week' },
];

/**
 * Requirements #5, #6, #8, #9: the campaign board.
 *
 * Drag-and-drop uses the native HTML5 API (no new dependency, per Q-Z2) and posts the target
 * stage plus the drop position, so ordering survives a refresh. The approval gate is enforced
 * server-side — a rejected move surfaces as a toast rather than silently snapping back.
 */
export const BoardPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const queryClient = useQueryClient();

  const campaignId = searchParams.get('campaignId') ?? '';
  const filter = searchParams.get('filter') ?? '';

  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropColumn, setDropColumn] = useState<string | null>(null);
  const [addCardColumn, setAddCardColumn] = useState<string | null>(null);
  const [addStageOpen, setAddStageOpen] = useState(false);

  const campaigns = useQuery({ queryKey: ['campaigns'], queryFn: () => fetchCampaigns() });

  // One board per campaign, resolved (and created on first access) by the backend.
  const boardQuery = useQuery({
    queryKey: ['board', campaignId, filter],
    enabled: !!campaignId,
    queryFn: () => fetchBoardForCampaign(campaignId, filter || undefined),
  });

  // Default to the first campaign so the page is never empty on arrival.
  useEffect(() => {
    if (!campaignId && campaigns.data && campaigns.data.items.length > 0) {
      setSearchParams({ campaignId: campaigns.data.items[0].id }, { replace: true });
    }
  }, [campaignId, campaigns.data, setSearchParams]);

  const board = boardQuery.data;

  const invalidateBoard = () =>
    queryClient.invalidateQueries({ queryKey: ['board', campaignId] });

  const moveMutation = useMutation({
    mutationFn: ({ cardId, columnId, position }: { cardId: string; columnId: string; position?: number }) =>
      moveCard(cardId, columnId, position),
    onSuccess: () => invalidateBoard(),
    onError: (error) => {
      // Q-E18: a 422 here means the stage requires director sign-off.
      toast.error(error instanceof ApiError ? error.message : 'Could not move that card');
      invalidateBoard();
    },
  });

  const bulkMutation = useMutation({
    mutationFn: ({ columnId }: { columnId: string }) =>
      bulkMoveCards(board!.id, selected, columnId),
    onSuccess: (result) => {
      setSelected([]);
      invalidateBoard();
      if (result.rejected.length) {
        toast.info(`Moved ${result.moved}. ${result.rejected.length} blocked by an approval gate.`);
      } else {
        toast.success(`Moved ${result.moved} card(s)`);
      }
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Bulk move failed'),
  });

  const onDrop = (columnId: string, index?: number) => {
    setDropColumn(null);
    if (!draggingId) return;
    moveMutation.mutate({ cardId: draggingId, columnId, position: index });
    setDraggingId(null);
  };

  const openCard = useMemo(
    () => board?.columns.flatMap((c) => c.cards).find((c) => c.id === openCardId) ?? null,
    [board, openCardId],
  );

  return (
    <Page>
      <PageHeader
        title="Campaign board"
        subtitle="Drag a card to move it between stages"
        actions={
          <>
            <Button variant="secondary" onClick={() => setAddStageOpen(true)} disabled={!board}>
              Add stage
            </Button>
            <Button
              variant="primary"
              onClick={() => setAddCardColumn(board?.columns[0]?.id ?? null)}
              disabled={!board}
            >
              Add creator
            </Button>
          </>
        }
      />

      <div className={styles.boardBar}>
        <Select
          label="Campaign"
          value={campaignId}
          onChange={(e) => setSearchParams({ campaignId: e.target.value })}
        >
          <option value="">Choose a campaign…</option>
          {campaigns.data?.items.map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.name}
            </option>
          ))}
        </Select>

        <div className={styles.filterChips}>
          {FILTERS.map((option) => (
            <button
              key={option.key}
              type="button"
              className={`${ui.chip} ${filter === option.key ? ui.chipActive : ''}`}
              onClick={() =>
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  if (option.key) next.set('filter', option.key);
                  else next.delete('filter');
                  return next;
                })
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {selected.length > 0 && board && (
        <div className={styles.selectionBar}>
          <span>
            <strong>{selected.length}</strong> card(s) selected
          </span>
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
            <select
              className={ui.select}
              style={{ width: 'auto' }}
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) bulkMutation.mutate({ columnId: e.target.value });
                e.target.value = '';
              }}
              aria-label="Move selected cards to stage"
            >
              <option value="">Move to stage…</option>
              {board.columns.map((column) => (
                <option key={column.id} value={column.id}>
                  {column.name}
                </option>
              ))}
            </select>
            <Button variant="secondary" size="sm" onClick={() => setSelected([])}>
              Clear
            </Button>
          </div>
        </div>
      )}

      <AsyncBoundary
        isLoading={boardQuery.isLoading || campaigns.isLoading}
        error={boardQuery.error}
        onRetry={() => boardQuery.refetch()}
        loadingLabel="Loading board"
      >
        {!campaignId ? (
          <EmptyState title="Choose a campaign" message="Pick a campaign above to see its board." />
        ) : !board ? (
          <EmptyState title="No board yet" message="This campaign has no board." />
        ) : (
          <div className={styles.columns}>
            {board.columns.map((column) => (
              <div
                key={column.id}
                className={`${styles.column} ${dropColumn === column.id ? styles.columnDropTarget : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDropColumn(column.id);
                }}
                onDragLeave={() => setDropColumn((c) => (c === column.id ? null : c))}
                onDrop={() => onDrop(column.id)}
              >
                <div className={styles.columnHeader}>
                  <span className={styles.columnTitle}>{column.name}</span>
                  {column.requiresDirectorApproval && (
                    <span className={styles.gateIcon} title="Requires director sign-off">🔒</span>
                  )}
                  {column.requiresClientApproval && (
                    <span className={styles.gateIcon} title="Requires client approval">👤</span>
                  )}
                  {column.triggersEmail && (
                    <span className={styles.gateIcon} title="Sends an automated email">✉</span>
                  )}
                  <span className={styles.columnCount}>{column.cards.length}</span>
                </div>

                <div className={styles.columnBody}>
                  {column.cards.length === 0 && (
                    <div className={styles.dropHint}>Drop a card here</div>
                  )}

                  {column.cards.map((card, index) => (
                    <CardTile
                      key={card.id}
                      card={card}
                      dragging={draggingId === card.id}
                      selected={selected.includes(card.id)}
                      onDragStart={() => setDraggingId(card.id)}
                      onDragEnd={() => setDraggingId(null)}
                      onDropBefore={() => onDrop(column.id, index)}
                      onOpen={() => setOpenCardId(card.id)}
                      onToggleSelect={() =>
                        setSelected((prev) =>
                          prev.includes(card.id)
                            ? prev.filter((x) => x !== card.id)
                            : [...prev, card.id],
                        )
                      }
                    />
                  ))}

                  <button
                    type="button"
                    className={styles.dropHint}
                    style={{ cursor: 'pointer', background: 'none' }}
                    onClick={() => setAddCardColumn(column.id)}
                  >
                    + Add creator
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </AsyncBoundary>

      {openCard && board && (
        <CardDrawer
          card={openCard}
          onClose={() => setOpenCardId(null)}
          onChanged={invalidateBoard}
        />
      )}

      {addCardColumn && board && (
        <AddCardModal
          boardId={board.id}
          campaignId={board.campaignId}
          columnId={addCardColumn}
          onClose={() => setAddCardColumn(null)}
          onAdded={() => {
            setAddCardColumn(null);
            invalidateBoard();
            toast.success('Creator added to the board');
          }}
        />
      )}

      {addStageOpen && board && (
        <AddStageModal
          boardId={board.id}
          onClose={() => setAddStageOpen(false)}
          onAdded={() => {
            setAddStageOpen(false);
            invalidateBoard();
            toast.success('Stage added');
          }}
        />
      )}
    </Page>
  );
};

// ------------------------------------------------------------------ tiles

const CardTile: React.FC<{
  card: CampaignCard;
  dragging: boolean;
  selected: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDropBefore: () => void;
  onOpen: () => void;
  onToggleSelect: () => void;
}> = ({ card, dragging, selected, onDragStart, onDragEnd, onDropBefore, onOpen, onToggleSelect }) => (
  <article
    draggable
    onDragStart={onDragStart}
    onDragEnd={onDragEnd}
    onDragOver={(e) => e.preventDefault()}
    onDrop={(e) => {
      e.stopPropagation();
      onDropBefore();
    }}
    className={[
      styles.card,
      dragging ? styles.cardDragging : '',
      selected ? styles.cardSelected : '',
      card.blocked ? styles.cardBlocked : '',
    ]
      .filter(Boolean)
      .join(' ')}
  >
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
      <input
        type="checkbox"
        checked={selected}
        onChange={onToggleSelect}
        onClick={(e) => e.stopPropagation()}
        aria-label="Select card"
      />
      <button
        type="button"
        onClick={onOpen}
        className={styles.cardHandle}
        style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', flex: 1 }}
      >
        @{card.creatorHandle ?? 'unknown'}
      </button>
    </div>

    {card.deliverables && card.deliverables.length > 0 && (
      <span className={styles.cardMeta}>{card.deliverables.join(', ')}</span>
    )}

    {card.deadline && (
      <span className={styles.cardMeta}>
        Due {new Date(card.deadline).toLocaleDateString('en-GB')}
      </span>
    )}

    <div className={styles.cardFooter}>
      <Tag tone={statusTone(card.paymentStatus)}>{humanise(card.paymentStatus)}</Tag>
      {card.approvalStatus !== 'PENDING' && (
        <Tag tone={statusTone(card.approvalStatus)}>{humanise(card.approvalStatus)}</Tag>
      )}
      {card.feeAmount != null && (
        <span className={styles.cardMeta}>
          {card.feeCurrency === 'GBP' ? '£' : ''}
          {Number(card.feeAmount).toLocaleString('en-GB')}
        </span>
      )}
    </div>
  </article>
);

// ----------------------------------------------------------------- drawer

const CardDrawer: React.FC<{
  card: CampaignCard;
  onClose: () => void;
  onChanged: () => void;
}> = ({ card, onClose, onChanged }) => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const [notes, setNotes] = useState(card.notes ?? '');

  const comments = useQuery({
    queryKey: ['card-comments', card.id],
    queryFn: () => fetchComments(card.id),
  });

  const commentMutation = useMutation({
    mutationFn: () => addComment(card.id, comment),
    onSuccess: () => {
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['card-comments', card.id] });
      toast.success('Comment added');
    },
  });

  const paymentMutation = useMutation({
    mutationFn: (paid: boolean) => updatePaymentStatus(card.id, paid ? 'PAID' : 'UNPAID'),
    onSuccess: () => {
      onChanged();
      toast.success('Payment status updated');
    },
  });

  const approvalMutation = useMutation({
    mutationFn: (approved: boolean) => approveCard(card.id, approved),
    onSuccess: () => {
      onChanged();
      toast.success('Approval recorded');
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not record approval'),
  });

  const notesMutation = useMutation({
    mutationFn: () => updateCard(card.id, { notes }),
    onSuccess: () => {
      onChanged();
      toast.success('Notes saved');
    },
  });

  return (
    <>
      <button type="button" className={styles.drawerBackdrop} aria-label="Close" onClick={onClose} />
      <aside className={styles.drawer} role="dialog" aria-label="Card details">
        <div className={styles.drawerHeader}>
          <h2 className={styles.drawerTitle}>@{card.creatorHandle ?? 'Card'}</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close ×
          </Button>
        </div>

        <div className={styles.drawerBody}>
          <div>
            <p className={ui.sectionLabel}>Status</p>
            <div className={ui.chipRow}>
              <Tag tone={statusTone(card.paymentStatus)}>{humanise(card.paymentStatus)}</Tag>
              <Tag tone={statusTone(card.approvalStatus)}>{humanise(card.approvalStatus)}</Tag>
              {card.blocked && <Tag tone="brand">Blocked</Tag>}
            </div>
          </div>

          <div>
            <p className={ui.sectionLabel}>Deliverables</p>
            <p style={{ margin: 0, fontSize: 'var(--fs-sm)' }}>
              {card.deliverables?.join(', ') || 'None recorded'}
            </p>
          </div>

          <div>
            <p className={ui.sectionLabel}>Fee</p>
            <p style={{ margin: 0, fontSize: 'var(--fs-sm)' }}>
              {card.feeAmount != null
                ? `${card.feeCurrency === 'GBP' ? '£' : ''}${Number(card.feeAmount).toLocaleString('en-GB')}`
                : 'Not set'}
            </p>
          </div>

          <Switch
            checked={card.paymentStatus === 'PAID'}
            onChange={(checked) => paymentMutation.mutate(checked)}
            label="Mark as paid"
          />

          <div>
            <p className={ui.sectionLabel}>Director sign-off</p>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <Button
                variant="primary"
                size="sm"
                onClick={() => approvalMutation.mutate(true)}
                disabled={card.approvalStatus === 'APPROVED'}
              >
                Approve
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => approvalMutation.mutate(false)}
                disabled={card.approvalStatus === 'REJECTED'}
              >
                Reject
              </Button>
            </div>
            <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--fs-xs)', color: 'var(--text-muted)' }}>
              Stages marked 🔒 cannot be entered until a card is approved.
            </p>
          </div>

          <div>
            <TextArea
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
            <div style={{ marginTop: 'var(--space-2)', display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="secondary" size="sm" onClick={() => notesMutation.mutate()}>
                Save notes
              </Button>
            </div>
          </div>

          <div>
            <p className={ui.sectionLabel}>Comments</p>
            {comments.data?.length === 0 && (
              <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', margin: 0 }}>
                No comments yet.
              </p>
            )}
            {comments.data?.map((entry) => (
              <div key={entry.id} className={styles.commentItem}>
                <span className={styles.commentAuthor}>
                  {entry.authorName ?? 'Team'} ·{' '}
                  {new Date(entry.createdAt).toLocaleDateString('en-GB')}
                </span>
                {entry.body}
              </div>
            ))}

            <div style={{ marginTop: 'var(--space-3)' }}>
              <TextArea
                label="Add a comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
              />
              <div style={{ marginTop: 'var(--space-2)', display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!comment.trim() || commentMutation.isPending}
                  onClick={() => commentMutation.mutate()}
                >
                  Post
                </Button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

// ------------------------------------------------------------------ modals

const AddCardModal: React.FC<{
  boardId: string;
  campaignId: string;
  columnId: string;
  onClose: () => void;
  onAdded: () => void;
}> = ({ boardId, campaignId, columnId, onClose, onAdded }) => {
  const toast = useToast();
  const [creatorId, setCreatorId] = useState('');
  const [deliverables, setDeliverables] = useState('');
  const [fee, setFee] = useState('');
  const [deadline, setDeadline] = useState('');

  const creators = useQuery({
    queryKey: ['creators', 'picker'],
    queryFn: () => searchCreators({ size: 100 }),
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const { createCard } = await import('../../services/campaignService');
      return createCard(boardId, {
        columnId,
        creatorId,
        campaignId,
        deliverables: deliverables ? deliverables.split(',').map((d) => d.trim()) : undefined,
        feeAmount: fee ? Number(fee) : undefined,
        feeCurrency: 'GBP',
        deadline: deadline || undefined,
      });
    },
    onSuccess: onAdded,
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not add the card'),
  });

  return (
    <Modal
      title="Add creator to board"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!creatorId || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Adding…' : 'Add card'}
          </Button>
        </>
      }
    >
      <Select label="Creator" value={creatorId} onChange={(e) => setCreatorId(e.target.value)}>
        <option value="">Choose a creator…</option>
        {creators.data?.items.map((creator) => (
          <option key={creator.id} value={creator.id}>
            @{creator.handle} — {creator.followersDisplay}
          </option>
        ))}
      </Select>
      <Input
        label="Deliverables"
        value={deliverables}
        onChange={(e) => setDeliverables(e.target.value)}
        placeholder="1x Reel, 2x Story"
        hint="Comma separated"
      />
      <Input label="Fee (£)" type="number" value={fee} onChange={(e) => setFee(e.target.value)} />
      <Input label="Deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
    </Modal>
  );
};

const AddStageModal: React.FC<{
  boardId: string;
  onClose: () => void;
  onAdded: () => void;
}> = ({ boardId, onClose, onAdded }) => {
  const toast = useToast();
  const [name, setName] = useState('');
  const [directorApproval, setDirectorApproval] = useState(false);
  const [clientApproval, setClientApproval] = useState(false);
  const [triggersEmail, setTriggersEmail] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      addColumn(boardId, {
        name,
        requiresDirectorApproval: directorApproval,
        requiresClientApproval: clientApproval,
        triggersEmail,
      }),
    onSuccess: onAdded,
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not add the stage'),
  });

  return (
    <Modal
      title="Add a stage"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!name || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? 'Adding…' : 'Add stage'}
          </Button>
        </>
      }
    >
      <Input
        label="Stage name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Script approval"
      />
      <Switch checked={directorApproval} onChange={setDirectorApproval} label="Requires director sign-off" />
      <Switch checked={clientApproval} onChange={setClientApproval} label="Requires client approval" />
      <Switch checked={triggersEmail} onChange={setTriggersEmail} label="Sends an automated email" />
    </Modal>
  );
};
