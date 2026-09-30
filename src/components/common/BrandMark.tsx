import React from 'react';
import styles from './BrandMark.module.css';

const B = () => (
  <>
    <span className={styles.b}>b</span>.
  </>
);

/** The underlined "b." from the logo, alone or inside the product and agency names. */
export const BrandMark: React.FC<{ name?: 'mark' | 'product' | 'agency' }> = ({
  name = 'mark',
}) => (
  <span className={styles.name}>
    {name === 'product' && 'generation '}
    <B />
    {name === 'agency' && ' the agency'}
  </span>
);
