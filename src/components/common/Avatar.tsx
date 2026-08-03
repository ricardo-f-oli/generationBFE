import React from 'react';

export interface AvatarProps {
  name: string;
  size?: number;
  style?: React.CSSProperties;
}

export const Avatar: React.FC<AvatarProps> = ({ name, size = 36, style }) => {
  const getInitials = (str: string): string => {
    const cleaned = str.replace(/^@/, '').trim();
    if (!cleaned) return '?';
    const parts = cleaned.split(/[\s._-]+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return cleaned.slice(0, 2).toUpperCase();
  };

  const avatarStyle: React.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    backgroundColor: 'var(--color-grey)',
    border: '1px solid var(--border-default)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'var(--weight-bold)',
    fontSize: `${Math.max(10, Math.floor(size * 0.38))}px`,
    color: 'var(--color-black)',
    flexShrink: 0,
    ...style,
  };

  return <div style={avatarStyle}>{getInitials(name)}</div>;
};
