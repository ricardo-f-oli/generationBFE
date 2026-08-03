import React from 'react';

export interface TagProps {
  tone?: 'brand' | 'lime' | 'peach' | 'neutral' | 'lemon';
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const Tag: React.FC<TagProps> = ({ tone = 'neutral', children, style }) => {
  const getBackgroundColor = (): string => {
    switch (tone) {
      case 'brand':
        return 'var(--color-red)';
      case 'lime':
        return 'var(--color-lime)';
      case 'peach':
        return 'var(--color-peach)';
      case 'lemon':
        return 'var(--color-lemon)';
      case 'neutral':
      default:
        return 'var(--color-grey)';
    }
  };

  const getTextColor = (): string => {
    if (tone === 'brand') return 'var(--color-white)';
    return 'var(--color-black)';
  };

  const tagStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 8px',
    borderRadius: 'var(--radius-pill)',
    fontSize: '11px',
    fontWeight: 'var(--weight-bold)',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    backgroundColor: getBackgroundColor(),
    color: getTextColor(),
    ...style,
  };

  return <span style={tagStyle}>{children}</span>;
};
