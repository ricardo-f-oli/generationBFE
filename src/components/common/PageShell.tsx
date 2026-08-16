import React from 'react';
import ui from './ui.module.css';
import { Spinner } from './Spinner';
import { ApiError } from '../../services/apiClient';

export const PageHeader: React.FC<{
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}> = ({ title, subtitle, actions }) => (
  <div className={ui.pageHeader}>
    <div>
      <h1 className={ui.pageTitle}>{title}</h1>
      {subtitle && <p className={ui.pageSubtitle}>{subtitle}</p>}
    </div>
    {actions && <div className={ui.headerActions}>{actions}</div>}
  </div>
);

export const Page: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className={ui.page}>{children}</div>
);

export const EmptyState: React.FC<{
  title: string;
  message?: string;
  action?: React.ReactNode;
}> = ({ title, message, action }) => (
  <div className={ui.emptyState}>
    <p className={ui.emptyTitle}>{title}</p>
    {message && <p style={{ margin: 0 }}>{message}</p>}
    {action && <div style={{ marginTop: 'var(--space-4)' }}>{action}</div>}
  </div>
);

/**
 * Q-F1/Q-F16: a real error surface. The previous code swallowed failures and rendered mock data,
 * which is why broken endpoints looked like working ones.
 */
export const ErrorState: React.FC<{ error: unknown; onRetry?: () => void }> = ({
  error,
  onRetry,
}) => {
  const message =
    error instanceof ApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : 'Something went wrong.';

  return (
    <div className={ui.errorBanner}>
      <strong>Could not load this data.</strong> {message}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          style={{
            marginLeft: 'var(--space-3)',
            background: 'none',
            border: 'none',
            color: 'var(--color-red)',
            fontWeight: 700,
            cursor: 'pointer',
            textDecoration: 'underline',
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--fs-sm)',
          }}
        >
          Try again
        </button>
      )}
    </div>
  );
};

/** Standard async wrapper so every page handles loading and failure the same way. */
export const AsyncBoundary: React.FC<{
  isLoading: boolean;
  error: unknown;
  onRetry?: () => void;
  loadingLabel?: string;
  children: React.ReactNode;
}> = ({ isLoading, error, onRetry, loadingLabel, children }) => {
  if (isLoading) return <Spinner label={loadingLabel ?? 'Loading'} />;
  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  return <>{children}</>;
};

export { ui };
