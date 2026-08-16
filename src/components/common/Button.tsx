import React from 'react';
import styles from './Button.module.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  children: React.ReactNode;
}

/** Q-F13: CSS modules, so hover and focus states actually work. */
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  children,
  className,
  type = 'button',
  ...props
}) => (
  <button
    type={type}
    className={[
      styles.button,
      styles[variant],
      styles[size],
      fullWidth ? styles.fullWidth : '',
      className ?? '',
    ]
      .filter(Boolean)
      .join(' ')}
    {...props}
  >
    {children}
  </button>
);
