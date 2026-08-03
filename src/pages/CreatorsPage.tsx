import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchCreators } from '../services/creatorService';
import { Button } from '../components/common/Button';
import { Avatar } from '../components/common/Avatar';
import { Tag } from '../components/common/Tag';
import styles from './CreatorsPage.module.css';

export const CreatorsPage: React.FC = () => {
  const navigate = useNavigate();
  const { data: creators = [], isLoading } = useQuery({
    queryKey: ['creators'],
    queryFn: fetchCreators,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [dismissedFilters, setDismissedFilters] = useState<Record<string, boolean>>({});
  const [shortlistIds, setShortlistIds] = useState<string[]>(['sophiabeauty', 'marcuslifts', 'ellafashion']);

  const filterCategories = ['Platform', 'Location', 'Niche', 'Follower band', 'ER', 'Aesthetic tags', 'Competitor mentions'];
  const allFilterChips = [
    { key: 'location', label: 'Location: London' },
    { key: 'niche', label: 'Niche: Beauty' },
  ];

  const activeFilterChips = allFilterChips.filter((c) => !dismissedFilters[c.key]);

  const toggleShortlist = (id: string) => {
    setShortlistIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const filteredCreators = creators.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.handle.toLowerCase().includes(q) ||
      c.location.toLowerCase().includes(q) ||
      c.niche.toLowerCase().includes(q) ||
      c.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  if (isLoading) {
    return <div className={styles.loadingState}>Loading creator database...</div>;
  }

  return (
    <div className={styles.page}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div>
          <div className={styles.headerTitle}>creator database</div>
          <div className={styles.headerSubtitle}>
            {filteredCreators.length} creators in database
          </div>
        </div>
        <div className={styles.headerActions}>
          <Button variant="secondary" size="md">Import from Kolsquare</Button>
          <Button variant="secondary" size="md">Add creator manually</Button>
        </div>
      </div>

      {/* Search Input */}
      <div className={styles.searchWrapper}>
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Find London beauty creators who cycle for sport"
          className={styles.searchInput}
        />
      </div>

      {/* Filter Category Pills */}
      <div className={styles.filterPills}>
        {filterCategories.map((cat) => (
          <div key={cat} className={styles.filterPill}>
            {cat}
          </div>
        ))}
      </div>

      {/* Active Filter Chips */}
      {activeFilterChips.length > 0 && (
        <div className={styles.activeFiltersRow}>
          <span className={styles.activeFiltersLabel}>
            active filters:
          </span>
          {activeFilterChips.map((chip) => (
            <div key={chip.key} className={styles.filterChip}>
              <span>{chip.label}</span>
              <span
                onClick={() => setDismissedFilters({ ...dismissedFilters, [chip.key]: true })}
                className={styles.filterChipRemove}
              >
                ×
              </span>
            </div>
          ))}
        </div>
      )}

      {/* View Shortlist Action Link */}
      <div className={styles.shortlistLinkRow}>
        <Button variant="ghost" size="sm" onClick={() => navigate('/shortlist')}>
          View shortlist ({shortlistIds.length}) →
        </Button>
      </div>

      {/* Creator Grid */}
      <div className={styles.creatorGrid}>
        {filteredCreators.map((creator) => {
          const isShortlisted = shortlistIds.includes(creator.id);
          return (
            <div key={creator.id} className={styles.creatorCard}>
              <div className={styles.creatorHeader}>
                <Avatar name={creator.handle} size={48} />
                <div className={styles.creatorInfo}>
                  <div className={styles.creatorHandle}>{creator.handle}</div>
                  <div className={styles.creatorMeta}>
                    {creator.location} · {creator.niche}
                  </div>
                </div>
              </div>

              {/* Platform Badges */}
              <div className={styles.platformBadges}>
                {creator.platforms.includes('instagram') && (
                  <span className={styles.platformBadge}>
                    Instagram
                  </span>
                )}
                {creator.platforms.includes('tiktok') && (
                  <span className={styles.platformBadge}>
                    TikTok
                  </span>
                )}
                {creator.platforms.includes('youtube') && (
                  <span className={styles.platformBadge}>
                    YouTube
                  </span>
                )}
              </div>

              {/* Followers & ER */}
              <div className={styles.followerRow}>
                <div className={styles.followerCount}>{creator.followersDisplay}</div>
                <Tag tone="brand">{creator.er.toFixed(1)}% ER</Tag>
              </div>

              <div className={styles.lastContact}>Last contact: {creator.lastContact}</div>

              {/* Tags */}
              <div className={styles.tagRow}>
                {creator.tags.map((tag) => (
                  <span key={tag} className={styles.tagChip}>
                    {tag}
                  </span>
                ))}
              </div>

              <Button
                variant={isShortlisted ? 'secondary' : 'primary'}
                size="sm"
                fullWidth
                onClick={() => toggleShortlist(creator.id)}
              >
                {isShortlisted ? 'Added to shortlist ✓' : 'Add to shortlist'}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
