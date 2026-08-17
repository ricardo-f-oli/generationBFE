import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDebouncedValue } from '../../components/common/useDebouncedValue';
import { Input } from '../../components/common/Input';
import { Spinner } from '../../components/common/Spinner';
import { searchCreators } from '../../services/creatorService';
import styles from './Gifting.module.css';

/**
 * Picks creators for a gifting action.
 *
 * The list does not hide anyone: a creator with no confirmed address still appears, because the
 * point of the address-capture action is precisely to reach them. The backend is the one that
 * decides who a dispatch can actually be created for, and it says why.
 */
export const CreatorPicker: React.FC<{
  selected: string[];
  onChange: (ids: string[]) => void;
}> = ({ selected, onChange }) => {
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query, 300);

  const creators = useQuery({
    queryKey: ['creator-picker', debounced],
    queryFn: () => searchCreators({ query: debounced || undefined, page: 0, size: 40 }),
  });

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <Input
        label="Find creators"
        placeholder="Search by name or handle"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      {creators.isLoading ? (
        <Spinner label="Loading creators" />
      ) : (
        <div className={styles.pickerGrid}>
          {creators.data?.items.map((creator) => {
            const isSelected = selected.includes(creator.id);
            return (
              <label
                key={creator.id}
                className={`${styles.pickerRow} ${isSelected ? styles.pickerRowSelected : ''}`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(creator.id)}
                />
                <span>
                  <strong>@{creator.handle}</strong>
                  <br />
                  <span style={{ color: 'var(--text-muted)' }}>{creator.followersDisplay}</span>
                </span>
              </label>
            );
          })}
        </div>
      )}

      <p style={{ margin: 0, fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>
        {selected.length} selected
      </p>
    </div>
  );
};
