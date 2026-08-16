import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Page, PageHeader, AsyncBoundary, EmptyState, ui } from '../../components/common/PageShell';
import { Button } from '../../components/common/Button';
import { Input, Select } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Avatar } from '../../components/common/Avatar';
import { Tag } from '../../components/common/Tag';
import { useToast } from '../../components/common/Toast';
import {
  createCreator,
  fetchCreatorFilters,
  importCreators,
  searchCreators,
} from '../../services/creatorService';
import { createShortlist, fetchShortlists, addCreatorsToShortlist } from '../../services/campaignService';
import { ApiError } from '../../services/apiClient';
import type { CreatorSearchParams } from '../../types';
import styles from './Creators.module.css';

const PAGE_SIZE = 24;

/**
 * Requirement #16-#22: the creator database.
 * Q-G1: search and filtering happen in the database, paginated — not by loading every creator
 * into the browser and filtering twice.
 */
export const CreatorsPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [params, setParams] = useState<CreatorSearchParams>({ page: 0, size: PAGE_SIZE });
  const [searchInput, setSearchInput] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [shortlistOpen, setShortlistOpen] = useState(false);

  const filters = useQuery({ queryKey: ['creator-filters'], queryFn: fetchCreatorFilters });
  const creators = useQuery({
    queryKey: ['creators', params],
    queryFn: () => searchCreators(params),
  });

  const applySearch = (event: React.FormEvent) => {
    event.preventDefault();
    setParams((prev) => ({ ...prev, query: searchInput || undefined, page: 0 }));
  };

  const setFilter = (key: keyof CreatorSearchParams, value: string | number | undefined) =>
    setParams((prev) => ({ ...prev, [key]: value || undefined, page: 0 }));

  const toggleSelected = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const meta = creators.data?.meta;

  return (
    <Page>
      <PageHeader
        title="Creator database"
        subtitle={
          meta
            ? `${meta.totalElements} creator${meta.totalElements === 1 ? '' : 's'} · shared across every brand`
            : undefined
        }
        actions={
          <>
            <Button variant="secondary" onClick={() => setImportOpen(true)}>
              Import CSV
            </Button>
            <Button variant="primary" onClick={() => setAddOpen(true)}>
              Add creator
            </Button>
          </>
        }
      />

      <form onSubmit={applySearch} className={styles.searchRow}>
        <input
          className={styles.searchInput}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search by handle, name, location, niche or bio"
          aria-label="Search creators"
        />
        <Button type="submit" variant="primary">
          Search
        </Button>
      </form>

      <div className={ui.filterBar}>
        <Select
          label="Platform"
          value={params.platform ?? ''}
          onChange={(e) => setFilter('platform', e.target.value)}
        >
          <option value="">All platforms</option>
          {filters.data?.platforms.map((p) => (
            <option key={p} value={p}>
              {p.charAt(0) + p.slice(1).toLowerCase()}
            </option>
          ))}
        </Select>

        <Select
          label="Niche"
          value={params.niche ?? ''}
          onChange={(e) => setFilter('niche', e.target.value)}
        >
          <option value="">All niches</option>
          {filters.data?.niches.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </Select>

        <Select
          label="Location"
          value={params.location ?? ''}
          onChange={(e) => setFilter('location', e.target.value)}
        >
          <option value="">All locations</option>
          {filters.data?.locations.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </Select>

        <Select
          label="Aesthetic tag"
          value={params.tagId ?? ''}
          onChange={(e) => setFilter('tagId', e.target.value)}
        >
          <option value="">Any tag</option>
          {filters.data?.tags.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.creatorCount})
            </option>
          ))}
        </Select>

        <Input
          label="Min followers"
          type="number"
          min={0}
          value={params.minFollowers ?? ''}
          onChange={(e) => setFilter('minFollowers', e.target.value ? Number(e.target.value) : undefined)}
        />

        <Input
          label="Min ER %"
          type="number"
          step="0.1"
          min={0}
          value={params.minEr ?? ''}
          onChange={(e) => setFilter('minEr', e.target.value ? Number(e.target.value) : undefined)}
        />
      </div>

      {selected.length > 0 && (
        <div className={styles.selectionBar}>
          <span>
            <strong>{selected.length}</strong> selected
          </span>
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <Button variant="secondary" size="sm" onClick={() => setSelected([])}>
              Clear
            </Button>
            <Button variant="primary" size="sm" onClick={() => setShortlistOpen(true)}>
              Add to shortlist
            </Button>
          </div>
        </div>
      )}

      <AsyncBoundary
        isLoading={creators.isLoading}
        error={creators.error}
        onRetry={() => creators.refetch()}
        loadingLabel="Loading creators"
      >
        {creators.data && creators.data.items.length === 0 ? (
          <EmptyState
            title="No creators match those filters"
            message="Try widening the search, or clear a filter."
            action={
              <Button variant="secondary" onClick={() => { setParams({ page: 0, size: PAGE_SIZE }); setSearchInput(''); }}>
                Clear all filters
              </Button>
            }
          />
        ) : (
          <>
            <div className={ui.cardGrid}>
              {creators.data?.items.map((creator) => {
                const isSelected = selected.includes(creator.id);
                return (
                  <article key={creator.id} className={styles.creatorCard}>
                    <div className={styles.cardTop}>
                      <Avatar name={creator.handle} size={44} />
                      <div className={styles.cardIdentity}>
                        <button
                          type="button"
                          className={styles.handleButton}
                          onClick={() => navigate(`/creators/${creator.id}`)}
                        >
                          @{creator.handle}
                        </button>
                        <span className={styles.cardMeta}>
                          {creator.location ?? 'Location unknown'}
                          {creator.niche ? ` · ${creator.niche}` : ''}
                        </span>
                      </div>
                    </div>

                    <div className={styles.metrics}>
                      <div>
                        <span className={styles.metricValue}>{creator.followersDisplay}</span>
                        <span className={styles.metricLabel}>followers</span>
                      </div>
                      <div>
                        <span className={styles.metricValue}>
                          {Number(creator.erPercentage).toFixed(1)}%
                        </span>
                        <span className={styles.metricLabel}>engagement</span>
                      </div>
                    </div>

                    <div className={ui.chipRow}>
                      {creator.platforms.map((p) => (
                        <span key={p} className={styles.platformBadge}>
                          {p}
                        </span>
                      ))}
                    </div>

                    {(creator.suppressed || creator.workedWithOtherBrand) && (
                      <div className={ui.chipRow}>
                        {creator.suppressed && <Tag tone="brand">Opted out</Tag>}
                        {creator.workedWithOtherBrand && <Tag tone="peach">Worked with another brand</Tag>}
                      </div>
                    )}

                    <p className={styles.lastContact}>Last contact: {creator.lastContact}</p>

                    <div className={styles.cardActions}>
                      <Button
                        variant={isSelected ? 'secondary' : 'primary'}
                        size="sm"
                        fullWidth
                        onClick={() => toggleSelected(creator.id)}
                      >
                        {isSelected ? 'Selected ✓' : 'Select'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/creators/${creator.id}`)}
                      >
                        View
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>

            {meta && meta.totalPages > 1 && (
              <div className={ui.pagination}>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={meta.page === 0}
                  onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 0) - 1 }))}
                >
                  ← Previous
                </Button>
                <span className={ui.pageInfo}>
                  Page {meta.page + 1} of {meta.totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={meta.page >= meta.totalPages - 1}
                  onClick={() => setParams((p) => ({ ...p, page: (p.page ?? 0) + 1 }))}
                >
                  Next →
                </Button>
              </div>
            )}
          </>
        )}
      </AsyncBoundary>

      {addOpen && (
        <AddCreatorModal
          onClose={() => setAddOpen(false)}
          onCreated={() => {
            setAddOpen(false);
            queryClient.invalidateQueries({ queryKey: ['creators'] });
            toast.success('Creator added');
          }}
        />
      )}

      {importOpen && (
        <ImportModal
          onClose={() => setImportOpen(false)}
          onDone={(imported, skipped) => {
            setImportOpen(false);
            queryClient.invalidateQueries({ queryKey: ['creators'] });
            toast.success(`Imported ${imported}, skipped ${skipped} duplicate(s)`);
          }}
        />
      )}

      {shortlistOpen && (
        <AddToShortlistModal
          creatorIds={selected}
          onClose={() => setShortlistOpen(false)}
          onDone={(name) => {
            setShortlistOpen(false);
            setSelected([]);
            queryClient.invalidateQueries({ queryKey: ['shortlists'] });
            toast.success(`Added ${selected.length} creator(s) to ${name}`);
          }}
        />
      )}
    </Page>
  );
};

// ------------------------------------------------------------------ modals

const AddCreatorModal: React.FC<{ onClose: () => void; onCreated: () => void }> = ({
  onClose,
  onCreated,
}) => {
  const toast = useToast();
  const [form, setForm] = useState({
    name: '',
    handle: '',
    email: '',
    primaryPlatform: 'INSTAGRAM',
    followersCount: '',
    erPercentage: '',
    location: '',
    niche: '',
  });

  const mutation = useMutation({
    mutationFn: () =>
      createCreator({
        name: form.name,
        handle: form.handle,
        email: form.email || undefined,
        primaryPlatform: form.primaryPlatform,
        followersCount: form.followersCount ? Number(form.followersCount) : undefined,
        erPercentage: form.erPercentage ? Number(form.erPercentage) : undefined,
        location: form.location || undefined,
        niche: form.niche || undefined,
      }),
    onSuccess: onCreated,
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not add creator'),
  });

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <Modal
      title="Add creator"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!form.name || !form.handle || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Saving…' : 'Add creator'}
          </Button>
        </>
      }
    >
      <Input label="Full name" value={form.name} onChange={set('name')} required />
      <Input label="Handle" value={form.handle} onChange={set('handle')} placeholder="sophiabeauty" required />
      <Input label="Email" type="email" value={form.email} onChange={set('email')} />
      <Select label="Primary platform" value={form.primaryPlatform} onChange={set('primaryPlatform')}>
        <option value="INSTAGRAM">Instagram</option>
        <option value="TIKTOK">TikTok</option>
        <option value="YOUTUBE">YouTube</option>
      </Select>
      <Input label="Followers" type="number" value={form.followersCount} onChange={set('followersCount')} />
      <Input label="Engagement rate %" type="number" step="0.1" value={form.erPercentage} onChange={set('erPercentage')} />
      <Input label="Location" value={form.location} onChange={set('location')} placeholder="London, UK" />
      <Input label="Niche" value={form.niche} onChange={set('niche')} placeholder="Beauty" />
    </Modal>
  );
};

const ImportModal: React.FC<{
  onClose: () => void;
  onDone: (imported: number, skipped: number) => void;
}> = ({ onClose, onDone }) => {
  const toast = useToast();
  const [rows, setRows] = useState<Array<Record<string, string>>>([]);
  const [fileName, setFileName] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => importCreators(rows),
    onSuccess: (result) => {
      if (result.errors.length) toast.info(result.errors.slice(0, 3).join(' · '));
      onDone(result.imported, result.skipped);
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Import failed'),
  });

  /** Minimal CSV parse — no dependency added (Q-Z2). Handles quoted fields. */
  const parseCsv = (text: string) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) throw new Error('The file needs a header row and at least one data row.');

    const splitLine = (line: string) => {
      const out: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i += 1) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') { current += '"'; i += 1; }
          else inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          out.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      out.push(current.trim());
      return out;
    };

    const headers = splitLine(lines[0]).map((h) => h.replace(/^"|"$/g, ''));
    return lines.slice(1).map((line) => {
      const values = splitLine(line);
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = (values[index] ?? '').replace(/^"|"$/g, '');
      });
      return row;
    });
  };

  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError(null);
    try {
      setRows(parseCsv(await file.text()));
    } catch (err) {
      setRows([]);
      setParseError((err as Error).message);
    }
  };

  return (
    <Modal
      title="Import creators from CSV"
      onClose={onClose}
      wide
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={rows.length === 0 || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Importing…' : `Import ${rows.length} row(s)`}
          </Button>
        </>
      }
    >
      <p style={{ margin: 0, fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
        Expected columns: <code>handle</code>, <code>name</code>, <code>email</code>,{' '}
        <code>location</code>, <code>niche</code>, <code>platform</code>, <code>followers</code>,{' '}
        <code>er</code>. Duplicates are skipped by handle and by email.
      </p>

      <input type="file" accept=".csv,text/csv" onChange={onFile} aria-label="CSV file" />

      {parseError && <div className={ui.errorBanner}>{parseError}</div>}

      {rows.length > 0 && (
        <>
          <p className={ui.sectionLabel}>
            Preview — {fileName}, {rows.length} row(s)
          </p>
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <thead>
                <tr>
                  {Object.keys(rows[0]).slice(0, 6).map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((row, index) => (
                  <tr key={index}>
                    {Object.keys(rows[0]).slice(0, 6).map((h) => (
                      <td key={h}>{row[h]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
};

const AddToShortlistModal: React.FC<{
  creatorIds: string[];
  onClose: () => void;
  onDone: (name: string) => void;
}> = ({ creatorIds, onClose, onDone }) => {
  const toast = useToast();
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [shortlistId, setShortlistId] = useState('');
  const [name, setName] = useState('');

  const shortlists = useQuery({ queryKey: ['shortlists'], queryFn: fetchShortlists });

  const mutation = useMutation({
    mutationFn: async () => {
      if (mode === 'new') {
        const created = await createShortlist({ name, creatorIds });
        return created.name;
      }
      await addCreatorsToShortlist(shortlistId, creatorIds);
      return shortlists.data?.find((s) => s.id === shortlistId)?.name ?? 'shortlist';
    },
    onSuccess: onDone,
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not update shortlist'),
  });

  return (
    <Modal
      title={`Add ${creatorIds.length} creator(s) to a shortlist`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={mutation.isPending || (mode === 'existing' ? !shortlistId : !name)}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Saving…' : 'Add'}
          </Button>
        </>
      }
    >
      <div className={ui.chipRow}>
        <button
          type="button"
          className={`${ui.chip} ${mode === 'existing' ? ui.chipActive : ''}`}
          onClick={() => setMode('existing')}
        >
          Existing shortlist
        </button>
        <button
          type="button"
          className={`${ui.chip} ${mode === 'new' ? ui.chipActive : ''}`}
          onClick={() => setMode('new')}
        >
          New shortlist
        </button>
      </div>

      {mode === 'existing' ? (
        <Select
          label="Shortlist"
          value={shortlistId}
          onChange={(e) => setShortlistId(e.target.value)}
        >
          <option value="">Choose a shortlist…</option>
          {shortlists.data?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.creatorCount})
            </option>
          ))}
        </Select>
      ) : (
        <Input
          label="Shortlist name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Mediheal Spring Seeding"
        />
      )}
    </Modal>
  );
};
