import React, { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Page, PageHeader, AsyncBoundary, EmptyState, ui } from '../../components/common/PageShell';
import { Button } from '../../components/common/Button';
import { Tag, humanise } from '../../components/common/Tag';
import { useToast } from '../../components/common/Toast';
import { fetchClauses, reorderClauses } from '../../services/briefService';
import { ApiError } from '../../services/apiClient';
import type { ContractClause } from '../../types';

/**
 * Requirement #3: the reusable clause library, ordered by drag-and-drop.
 * The order is now persisted — previously it lived in component state and was thrown away.
 */
export const ClauseLibraryPage: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();

  const clauses = useQuery({ queryKey: ['clauses'], queryFn: fetchClauses });
  const [ordered, setOrdered] = useState<ContractClause[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (clauses.data) {
      setOrdered(clauses.data);
      setDirty(false);
    }
  }, [clauses.data]);

  const saveMutation = useMutation({
    mutationFn: () => reorderClauses(ordered.map((clause) => clause.id)),
    onSuccess: () => {
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ['clauses'] });
      toast.success('Clause order saved');
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not save the order'),
  });

  const handleDrop = (targetId: string) => {
    if (!draggingId || draggingId === targetId) return;
    setOrdered((prev) => {
      const next = [...prev];
      const from = next.findIndex((c) => c.id === draggingId);
      const to = next.findIndex((c) => c.id === targetId);
      if (from < 0 || to < 0) return prev;
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setDirty(true);
    setDraggingId(null);
  };

  return (
    <Page>
      <PageHeader
        title="Clause library"
        subtitle="Reusable contract clauses. Drag to set the order they appear in a brief."
        actions={
          <Button
            variant="primary"
            disabled={!dirty || saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            {saveMutation.isPending ? 'Saving…' : 'Save order'}
          </Button>
        }
      />

      <AsyncBoundary
        isLoading={clauses.isLoading}
        error={clauses.error}
        onRetry={() => clauses.refetch()}
        loadingLabel="Loading clauses"
      >
        {ordered.length === 0 ? (
          <EmptyState
            title="No clauses yet"
            message="Contract clauses are seeded per brand. Ask an admin to add them."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {ordered.map((clause) => (
              <article
                key={clause.id}
                draggable
                onDragStart={() => setDraggingId(clause.id)}
                onDragEnd={() => setDraggingId(null)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(clause.id)}
                className={ui.panel}
                style={{
                  display: 'flex',
                  gap: 'var(--space-4)',
                  alignItems: 'flex-start',
                  cursor: 'grab',
                  opacity: draggingId === clause.id ? 0.4 : 1,
                }}
              >
                <span aria-hidden="true" style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-md)' }}>
                  ⠿
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <Tag tone="neutral">{humanise(clause.clauseType)}</Tag>
                    {!clause.active && <Tag tone="brand">Inactive</Tag>}
                  </div>
                  <p style={{ margin: 'var(--space-3) 0 0', fontSize: 'var(--fs-sm)', lineHeight: 'var(--lh-normal)' }}>
                    {clause.content}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </AsyncBoundary>
    </Page>
  );
};
