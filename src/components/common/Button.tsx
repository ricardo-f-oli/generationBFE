import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  children,
  style,
  disabled,
  ...props
}) => {
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: 'var(--color-red)',
          color: 'var(--color-white)',
          border: '1px solid var(--color-red)',
        };
      case 'secondary':
        return {
          backgroundColor: 'var(--color-white)',
          color: 'var(--color-black)',
          border: '1px solid var(--border-default)',
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: 'var(--color-red)',
          border: 'none',
          paddingLeft: 0,
          paddingRight: 0,
        };
      default:
        return {};
    }
  };

  const getSizeStyles = (): React.CSSProperties => {
    switch (size) {
      case 'sm':
        return {
          padding: '6px 12px',
          fontSize: '12px',
          height: '32px',
        };
      case 'lg':
        return {
          padding: '14px 24px',
          fontSize: '15px',
          height: '48px',
        };
      case 'md':
      default:
        return {
          padding: '10px 18px',
          fontSize: '13px',
          height: '40px',
        };
    }
  };

  const baseStyle: React.CSSProperties = {
    fontFamily: 'var(--font-wide)',
    fontWeight: 'var(--weight-bold)',
    letterSpacing: 'var(--tracking-wide)',
    textTransform: 'uppercase',
    borderRadius: 'var(--radius-sm)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: fullWidth ? '100%' : 'auto',
    transition: 'background-color 150ms ease, opacity 150ms ease',
    ...getVariantStyles(),
    ...getSizeStyles(),
    ...style,
  };

  return (
    <button style={baseStyle} disabled={disabled} {...props}>
      {children}
    </button>
  );
};
