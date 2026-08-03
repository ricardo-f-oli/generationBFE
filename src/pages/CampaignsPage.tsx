import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchKanbanCards, updateKanbanCardPayment } from '../services/campaignService';
import { KanbanCard } from '../types';
import { Button } from '../components/common/Button';
import { Switch } from '../components/common/Switch';
import { Tag } from '../components/common/Tag';
import styles from './CampaignsPage.module.css';

export const CampaignsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [campaignSel, setCampaignSel] = useState('Mediheal Spring Seeding');
  const [drawerCardId, setDrawerCardId] = useState<string | null>(null);

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['kanban-board', campaignSel],
    queryFn: () => fetchKanbanCards(campaignSel),
  });

  const paymentMutation = useMutation({
    mutationFn: ({ cardId, isPaid }: { cardId: string; isPaid: boolean }) =>
      updateKanbanCardPayment(cardId, isPaid),
    onSuccess: (updated) => {
      queryClient.setQueryData<KanbanCard[]>(['kanban-board', campaignSel], (prev) =>
        prev ? prev.map((c) => (c.id === updated.id ? updated : c)) : prev
      );
    },
  });

  const campaignOptions = ['Mediheal Spring Seeding', 'Katie Loxton Paid Partnership Q3'];
  const columnNames = ['Target List', 'Brief Sent', 'Content Draft', 'Brand Review', 'Approved', 'Live', 'Reporting'];

  const kanbanBrand = campaignSel.startsWith('Mediheal') ? 'Mediheal' : 'Katie Loxton';
  const kanbanCreatorCount = campaignSel.startsWith('Mediheal') ? '12' : '8';
  const kanbanDates = campaignSel.startsWith('Mediheal') ? '1 Mar – 30 Apr' : '1 Jul – 30 Sep';

  const drawerCard = cards.find((c) => c.id === drawerCardId);

  const togglePayment = (cardId: string, currentPaid: boolean) => {
    paymentMutation.mutate({ cardId, isPaid: !currentPaid });
  };

  if (isLoading) {
    return <div className={styles.loadingState}>Loading campaign board...</div>;
  }

  return (
    <div className={styles.pageRoot}>
      {/* Board Header */}
      <div className={styles.boardHeader}>
        <div className={styles.headerTitleGroup}>
          <select
            value={campaignSel}
            onChange={(e) => setCampaignSel(e.target.value)}
            className={styles.campaignSelect}
          >
            {campaignOptions.map((co) => (
              <option key={co} value={co}>
                {co}
              </option>
            ))}
          </select>
          <div className={styles.headerSubtitle}>
            {kanbanBrand} · {kanbanCreatorCount} creators · {kanbanDates}
          </div>
        </div>

        <Button variant="primary" onClick={() => navigate('/brief')}>
          New campaign
        </Button>
      </div>

      {/* Kanban Columns */}
      <div className={styles.kanbanColumnsRow}>
        {columnNames.map((colName) => {
          const colCards = cards.filter((c) => c.col === colName);

          return (
            <div key={colName} className={styles.kanbanColumn}>
              <div className={styles.kanbanColumnHeader}>
                <div className={styles.kanbanColumnTitle}>
                  {colName}
                </div>
                <span className={styles.kanbanColumnCount}>
                  {colCards.length}
                </span>
              </div>

              {/* Cards List */}
              {colCards.map((card) => {
                const isPaid = card.payment === 'PAID';
                const isMediheal = card.brand === 'Mediheal';

                return (
                  <div
                    key={card.id}
                    onClick={() => setDrawerCardId(card.id)}
                    className={`${styles.kanbanCard} ${isMediheal ? styles.kanbanCardMediheal : ''}`}
                  >
                    <div className={styles.kanbanCardHandle}>{card.handle}</div>
                    <div className={styles.kanbanCardDeliverable}>{card.deliverable}</div>
                    <div className={styles.kanbanCardDeadline}>Due {card.deadline}</div>
                    <span className={`${styles.paymentBadge} ${isPaid ? styles.paymentBadgePaid : ''}`}>
                      {card.payment}
                    </span>
                  </div>
                );
              })}

              <div className={styles.addCreatorLink}>
                + Add creator
              </div>
            </div>
          );
        })}
      </div>

      {/* Card Detail Drawer Overlay */}
      {drawerCard && (
        <>
          <div
            onClick={() => setDrawerCardId(null)}
            className={styles.drawerBackdrop}
          />
          <div className={styles.drawerPanel}>
            <div className={styles.drawerHeaderRow}>
              <div className={styles.drawerHandleTitle}>{drawerCard.handle}</div>
              <span
                onClick={() => setDrawerCardId(null)}
                className={styles.drawerCloseBtn}
              >
                ×
              </span>
            </div>

            <div className={styles.drawerSubtitle}>
              {drawerCard.deliverable} · Due {drawerCard.deadline}
            </div>

            <div className={styles.drawerFieldGroup}>
              <div className={styles.drawerFieldLabel}>
                rate
              </div>
              <div className={styles.drawerFieldValue}>{drawerCard.rate}</div>
            </div>

            <div className={styles.drawerFieldGroup}>
              <div className={styles.drawerFieldLabel}>
                brief
              </div>
              <a href="#" onClick={(e) => e.preventDefault()}>View brief document</a>
            </div>

            <div className={styles.drawerFieldGroupSpaced}>
              <div className={styles.drawerFieldLabel}>
                content drafts
              </div>
              <div className={styles.contentDraftsBox}>
                No drafts uploaded yet
                <div className={styles.uploadButtonWrap}>
                  <Button variant="secondary" size="sm">Upload content</Button>
                </div>
              </div>
            </div>

            <div className={styles.drawerFieldGroupSpaced}>
              <div className={styles.drawerFieldLabel}>
                comments
              </div>
              {(drawerCard.comments || [
                { author: 'Director', text: 'Looks great, ship it.' },
                { author: 'Account Lead', text: 'Waiting on brand sign-off.' },
              ]).map((cm, idx) => (
                <div key={idx} className={styles.commentItem}>
                  <b>{cm.author}:</b> {cm.text}
                </div>
              ))}
            </div>

            <div className={styles.drawerFieldGroup}>
              <div className={styles.drawerFieldLabel}>
                approval status
              </div>
              <Tag tone="peach">{drawerCard.approvalStatus || 'Pending brand review'}</Tag>
            </div>

            <div className={styles.markPaidRow}>
              <span className={styles.markPaidLabel}>Mark as paid</span>
              <Switch
                checked={drawerCard.payment === 'PAID'}
                onChange={() => togglePayment(drawerCard.id, drawerCard.payment === 'PAID')}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
