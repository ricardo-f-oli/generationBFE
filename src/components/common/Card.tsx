import React from 'react';

export interface CardProps {
  tint?: 'white' | 'grey' | 'peach' | 'lime' | 'lemon';
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  tint = 'white',
  children,
  style,
  className,
  onClick,
}) => {
  const getBackgroundColor = (): string => {
    switch (tint) {
      case 'grey':
        return 'var(--color-grey)';
      case 'peach':
        return 'var(--color-peach)';
      case 'lime':
        return 'var(--color-lime)';
      case 'lemon':
        return 'var(--color-lemon)';
      case 'white':
      default:
        return 'var(--color-white)';
    }
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: getBackgroundColor(),
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    padding: '20px',
    cursor: onClick ? 'pointer' : 'default',
    ...style,
  };

  return (
    <div style={cardStyle} className={className} onClick={onClick}>
      {children}
    </div>
  );
};
