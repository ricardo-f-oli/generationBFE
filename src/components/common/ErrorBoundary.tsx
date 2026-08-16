import React from 'react';

interface State {
  error: Error | null;
}

/** Q-F16: a render error used to blank the whole application with no way back. */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Unhandled UI error', error);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--space-6)',
          fontFamily: 'var(--font-body)',
          background: 'var(--surface-page)',
        }}
      >
        <div
          style={{
            maxWidth: 520,
            border: '2px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-6)',
            background: 'var(--color-white)',
          }}
        >
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--fs-xl)',
              margin: '0 0 var(--space-3)',
            }}
          >
            Something went wrong
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 'var(--fs-sm)', lineHeight: 1.5 }}>
            The page hit an unexpected error. Reloading usually clears it. If it keeps happening,
            let the team know what you were doing at the time.
          </p>
          <button
            type="button"
            onClick={() => window.location.assign('/dashboard')}
            style={{
              marginTop: 'var(--space-4)',
              padding: 'var(--space-3) var(--space-5)',
              background: 'var(--color-red)',
              color: 'var(--color-white)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 'var(--tracking-wide)',
              fontSize: 'var(--fs-xs)',
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }
}
