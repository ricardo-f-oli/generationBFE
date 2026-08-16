import React from 'react';
import styles from './Tag.module.css';

export type TagTone = 'brand' | 'lime' | 'peach' | 'lemon' | 'neutral' | 'outline';

export const Tag: React.FC<{ tone?: TagTone; children: React.ReactNode }> = ({
  tone = 'neutral',
  children,
}) => <span className={`${styles.tag} ${styles[tone]}`}>{children}</span>;

/**
 * Maps a backend status onto a tone from the prototype palette.
 * Q-E16: the backend used to send CSS variables as data; that decision belongs here.
 */
export function statusTone(status: string | null | undefined): TagTone {
  switch (status) {
    case 'PAID':
    case 'APPROVED':
    case 'DELIVERED':
    case 'REPLIED':
    case 'CONFIRMED':
    case 'WORKED_WITH':
    case 'CAPTURED':
      return 'lime';
    case 'TO_PAY':
    case 'PENDING':
    case 'PENDING_REVIEW':
    case 'SENT':
    case 'DISPATCHED':
    case 'SCHEDULED':
      return 'lemon';
    case 'OPENED':
    case 'CONTACTED':
    case 'READY_TO_DISPATCH':
      return 'peach';
    case 'REJECTED':
    case 'FAILED':
    case 'BOUNCED':
    case 'RETURNED':
    case 'UNSUBSCRIBED':
    case 'BLOCKED':
    case 'DECLINED':
      return 'brand';
    default:
      return 'neutral';
  }
}

/** Turns SCREAMING_SNAKE_CASE into readable text. */
export function humanise(value: string | null | undefined): string {
  if (!value) return '—';
  return value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, ' ');
}
