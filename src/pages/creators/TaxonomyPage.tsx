import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Page, PageHeader, AsyncBoundary, EmptyState, ui } from '../../components/common/PageShell';
import { Button } from '../../components/common/Button';
import { Input, Select } from '../../components/common/Input';
import { Tag } from '../../components/common/Tag';
import { useToast } from '../../components/common/Toast';
import {
  createAttributeDefinition,
  createTag,
  deleteAttributeDefinition,
  deleteTag,
  fetchAttributeDefinitions,
  fetchTags,
} from '../../services/creatorService';
import { ApiError } from '../../services/apiClient';

/**
 * Requirements #16 and #17: the admin surfaces for the tag library and the custom attribute
 * schema. Both had tables and entities but no endpoints and no UI at all.
 */
export const TaxonomyPage: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();

  const tags = useQuery({ queryKey: ['tags'], queryFn: fetchTags });
  const definitions = useQuery({ queryKey: ['attribute-defs'], queryFn: fetchAttributeDefinitions });

  const [tagName, setTagName] = useState('');
  const [tagCategory, setTagCategory] = useState('AESTHETIC');
  const [attr, setAttr] = useState({ key: '', label: '', type: 'STRING' });

  const addTag = useMutation({
    mutationFn: () => createTag(tagName, tagCategory),
    onSuccess: () => {
      setTagName('');
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['creator-filters'] });
      toast.success('Tag created');
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not create tag'),
  });

  const removeTag = useMutation({
    mutationFn: (id: string) => deleteTag(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
      queryClient.invalidateQueries({ queryKey: ['creator-filters'] });
      toast.success('Tag deleted');
    },
  });

  const addAttribute = useMutation({
    mutationFn: () =>
      createAttributeDefinition({ key: attr.key, label: attr.label, type: attr.type }),
    onSuccess: () => {
      setAttr({ key: '', label: '', type: 'STRING' });
      queryClient.invalidateQueries({ queryKey: ['attribute-defs'] });
      toast.success('Attribute added');
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not add attribute'),
  });

  const removeAttribute = useMutation({
    mutationFn: (id: string) => deleteAttributeDefinition(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attribute-defs'] });
      toast.success('Attribute removed');
    },
  });

  return (
    <Page>
      <PageHeader
        title="Tags &amp; attributes"
        subtitle="Define what your team tracks against every creator on this brand"
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-5)' }}>
        {/* ------------------------------------------------ tag library */}
        <section className={ui.panel}>
          <p className={ui.sectionLabel}>Aesthetic &amp; content-style tags</p>

          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-end' }}>
            <Input
              label="Tag name"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              placeholder="Elevated"
            />
            <Select
              label="Category"
              value={tagCategory}
              onChange={(e) => setTagCategory(e.target.value)}
            >
              <option value="AESTHETIC">Aesthetic</option>
              <option value="CONTENT_FORMAT">Content format</option>
            </Select>
            <Button
              variant="primary"
              disabled={!tagName || addTag.isPending}
              onClick={() => addTag.mutate()}
            >
              Add
            </Button>
          </div>

          <div style={{ marginTop: 'var(--space-4)' }}>
            <AsyncBoundary isLoading={tags.isLoading} error={tags.error}>
              {tags.data?.length === 0 ? (
                <EmptyState title="No tags yet" message="Add the aesthetics your team filters by." />
              ) : (
                <div className={ui.tableWrap}>
                  <table className={ui.table}>
                    <thead>
                      <tr>
                        <th>Tag</th>
                        <th>Category</th>
                        <th className={ui.numeric}>Creators</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {tags.data?.map((tag) => (
                        <tr key={tag.id}>
                          <td className={ui.cellStrong}>{tag.name}</td>
                          <td>
                            <Tag tone="neutral">{tag.category.replace('_', ' ')}</Tag>
                          </td>
                          <td className={ui.numeric}>{tag.creatorCount}</td>
                          <td style={{ textAlign: 'right' }}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeTag.mutate(tag.id)}
                            >
                              Delete
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </AsyncBoundary>
          </div>
        </section>

        {/* --------------------------------------- custom attributes */}
        <section className={ui.panel}>
          <p className={ui.sectionLabel}>Custom attributes</p>
          <p style={{ margin: '0 0 var(--space-4)', fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
            Anything your team needs per creator — birthdays, sizing, hair type, topics to avoid.
            These appear on every creator profile.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <Input
              label="Label"
              value={attr.label}
              onChange={(e) => setAttr((p) => ({ ...p, label: e.target.value }))}
              placeholder="Dress size"
            />
            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-end' }}>
              <Input
                label="Key"
                value={attr.key}
                onChange={(e) => setAttr((p) => ({ ...p, key: e.target.value }))}
                placeholder="dress_size"
              />
              <Select
                label="Type"
                value={attr.type}
                onChange={(e) => setAttr((p) => ({ ...p, type: e.target.value }))}
              >
                <option value="STRING">Text</option>
                <option value="NUMBER">Number</option>
                <option value="DATE">Date</option>
                <option value="BOOLEAN">Yes / no</option>
              </Select>
              <Button
                variant="primary"
                disabled={!attr.key || !attr.label || addAttribute.isPending}
                onClick={() => addAttribute.mutate()}
              >
                Add
              </Button>
            </div>
          </div>

          <div style={{ marginTop: 'var(--space-4)' }}>
            <AsyncBoundary isLoading={definitions.isLoading} error={definitions.error}>
              {definitions.data?.length === 0 ? (
                <EmptyState title="No attributes defined" />
              ) : (
                <div className={ui.tableWrap}>
                  <table className={ui.table}>
                    <thead>
                      <tr>
                        <th>Label</th>
                        <th>Key</th>
                        <th>Type</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {definitions.data?.map((definition) => (
                        <tr key={definition.id}>
                          <td className={ui.cellStrong}>{definition.label}</td>
                          <td className={ui.cellMuted}>
                            <code>{definition.key}</code>
                          </td>
                          <td className={ui.cellMuted}>{definition.type}</td>
                          <td style={{ textAlign: 'right' }}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAttribute.mutate(definition.id)}
                            >
                              Remove
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </AsyncBoundary>
          </div>
        </section>
      </div>
    </Page>
  );
};
