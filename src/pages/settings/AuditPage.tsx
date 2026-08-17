import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Page, PageHeader, AsyncBoundary, EmptyState, ui } from '../../components/common/PageShell';
import { Button } from '../../components/common/Button';
import { Select } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Tag } from '../../components/common/Tag';
import { fetchAuditEntityTypes, fetchAuditLog } from '../../services/adminService';
import type { AuditEntry } from '../../types';

const ACTION_TONE = {
  CREATE: 'lime',
  UPDATE: 'lemon',
  DELETE: 'brand',
} as const;

/**
 * Requirement #36: the audit trail.
 *
 * Q-B21: the before/after snapshots have personal fields redacted at write time — the trail
 * records that something changed and who changed it, not a second copy of everyone's data. That
 * is why some values read "[redacted]" here.
 */
export const AuditPage: React.FC = () => {
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(0);
  const [inspecting, setInspecting] = useState<AuditEntry | null>(null);

  const entityTypes = useQuery({
    queryKey: ['audit-entity-types'],
    queryFn: fetchAuditEntityTypes,
  });

  const entries = useQuery({
    queryKey: ['audit', entityType, action, page],
    queryFn: () =>
      fetchAuditLog({
        entityType: entityType || undefined,
        action: action || undefined,
        page,
        size: 50,
      }),
  });

  return (
    <Page>
      <PageHeader
        title="Audit log"
        subtitle="Who changed what, and when. Reads are not recorded — only changes."
      />

      <div className={ui.filterBar}>
        <Select
          label="Record type"
          value={entityType}
          onChange={(event) => {
            setPage(0);
            setEntityType(event.target.value);
          }}
        >
          <option value="">Everything</option>
          {entityTypes.data?.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </Select>
        <Select
          label="Action"
          value={action}
          onChange={(event) => {
            setPage(0);
            setAction(event.target.value);
          }}
        >
          <option value="">All actions</option>
          <option value="CREATE">Created</option>
          <option value="UPDATE">Updated</option>
          <option value="DELETE">Deleted</option>
        </Select>
      </div>

      <AsyncBoundary
        isLoading={entries.isLoading}
        error={entries.error}
        onRetry={() => entries.refetch()}
        loadingLabel="Loading the audit trail"
      >
        {entries.data && entries.data.items.length === 0 ? (
          <EmptyState
            title="Nothing recorded yet"
            message="Entries appear here as people create, change and delete records."
          />
        ) : (
          <>
            <div className={ui.tableWrap}>
              <table className={ui.table}>
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Who</th>
                    <th>Action</th>
                    <th>Record</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {entries.data?.items.map((entry) => (
                    <tr key={entry.id}>
                      <td className={ui.cellMuted}>
                        {new Date(entry.timestamp).toLocaleString('en-GB')}
                      </td>
                      <td className={ui.cellStrong}>{entry.changedByName}</td>
                      <td>
                        <Tag tone={ACTION_TONE[entry.action as keyof typeof ACTION_TONE] ?? 'neutral'}>
                          {entry.action.charAt(0) + entry.action.slice(1).toLowerCase()}
                        </Tag>
                      </td>
                      <td>{entry.entityType}</td>
                      <td>
                        <Button size="sm" variant="ghost" onClick={() => setInspecting(entry)}>
                          What changed
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {entries.data && entries.data.meta.totalPages > 1 && (
              <div className={ui.pagination}>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  Previous
                </Button>
                <span className={ui.pageInfo}>
                  Page {page + 1} of {entries.data.meta.totalPages} ·{' '}
                  {entries.data.meta.totalElements} entries
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page + 1 >= entries.data.meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </AsyncBoundary>

      {inspecting && <DiffModal entry={inspecting} onClose={() => setInspecting(null)} />}
    </Page>
  );
};

/** Shows only the fields that actually differ — a full JSON dump buries the change. */
const DiffModal: React.FC<{ entry: AuditEntry; onClose: () => void }> = ({ entry, onClose }) => {
  const parse = (value: string | null): Record<string, unknown> => {
    if (!value) return {};
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return {};
    }
  };

  const before = parse(entry.previousValue);
  const after = parse(entry.newValue);
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).sort();

  const show = (value: unknown) =>
    value === undefined || value === null ? '—' : String(value);

  const changed = keys.filter((key) => show(before[key]) !== show(after[key]));

  return (
    <Modal title={`${entry.entityType} · ${entry.action.toLowerCase()}`} wide onClose={onClose}>
      <p className={ui.cellMuted} style={{ marginTop: 0 }}>
        {entry.changedByName} · {new Date(entry.timestamp).toLocaleString('en-GB')}
      </p>

      {changed.length === 0 ? (
        <p>No field-level differences were recorded for this entry.</p>
      ) : (
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th>Field</th>
                <th>Before</th>
                <th>After</th>
              </tr>
            </thead>
            <tbody>
              {changed.map((key) => (
                <tr key={key}>
                  <td className={ui.cellStrong}>{key}</td>
                  <td className={ui.cellMuted}>{show(before[key])}</td>
                  <td>{show(after[key])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
};
