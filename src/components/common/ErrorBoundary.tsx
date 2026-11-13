import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('Application rendering failed:', error, info.componentStack);
  }

  render(): React.ReactNode {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] p-6 text-center">
        <div className="max-w-md space-y-3">
          <h1 className="font-serif text-xl font-bold text-[var(--color-text)]">Something went wrong</h1>
          <p className="text-sm text-[var(--color-text-secondary)]">
            The page could not be displayed. Reload the app, and contact the operator if the problem continues.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white"
          >
            Reload
          </button>
        </div>
      </main>
    );
  }
}
