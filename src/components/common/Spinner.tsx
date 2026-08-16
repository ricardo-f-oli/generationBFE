import React from 'react';
import styles from './Spinner.module.css';

export const Spinner: React.FC<{ label?: string; fullPage?: boolean }> = ({
  label = 'Loading',
  fullPage = false,
}) => (
  <div className={fullPage ? styles.fullPage : styles.inline} role="status" aria-live="polite">
    <span className={styles.dot} aria-hidden="true" />
    <span className={styles.label}>{label}…</span>
  </div>
);
