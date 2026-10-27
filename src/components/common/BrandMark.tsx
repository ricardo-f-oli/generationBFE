import React from 'react';
import styles from './BrandMark.module.css';

/**
 * The "b." logo, traced from the agency's own artwork (745×1053, measured off the file Chloe
 * shared on 27 Oct 2026) — no vector source exists. It used to be the letter "b" in the display
 * font with a CSS underline, which is a different typeface and stopped the bar short of the dot.
 *
 * Drawn as shapes rather than text so it is the same everywhere, and labelled so screen readers
 * and tests still read "generation b." / "b. the agency" as words.
 */
const Logo = () => (
  <svg
    className={styles.logo}
    viewBox="0 0 745 1053"
    role="img"
    aria-label="b."
    focusable="false"
  >
    <rect x="0" y="0" width="126" height="798" />
    <path
      fillRule="evenodd"
      d="M26 524a273 284 0 1 0 546 0a273 284 0 1 0 -546 0Z M146 524a153 158 0 1 0 306 0a153 158 0 1 0 -306 0Z"
    />
    <circle cx="676" cy="731" r="68" />
    <rect x="4" y="957" width="736" height="96" />
  </svg>
);

/** The "b." logo, alone or inside the product and agency names — always lowercase. */
export const BrandMark: React.FC<{ name?: 'mark' | 'product' | 'agency' }> = ({
  name = 'mark',
}) => (
  <span className={styles.name}>
    {name === 'product' && 'generation '}
    <Logo />
    {name === 'agency' && ' the agency'}
  </span>
);
