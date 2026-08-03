import React from 'react';

export interface DialogProps {
  title: string;
  children: React.ReactNode;
  onClose?: () => void;
  style?: React.CSSProperties;
}

export const Dialog: React.FC<DialogProps> = ({ title, children, onClose, style }) => {
  const dialogStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-white)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    padding: '24px',
    width: '420px',
    maxWidth: '90vw',
    boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
    ...style,
  };

  const headerStyle: React.CSSProperties = {
    fontFamily: 'var(--font-display)',
    fontSize: '24px',
    marginBottom: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  return (
    <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
      <div style={headerStyle}>
        <span>{title}</span>
        {onClose && (
          <span
            onClick={onClose}
            style={{ cursor: 'pointer', fontSize: '20px', fontWeight: 'bold' }}
          >
            ×
          </span>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
};
