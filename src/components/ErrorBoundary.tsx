/**
 * FlowPass — ErrorBoundary Component
 *
 * A class-based React error boundary that catches unhandled JavaScript
 * errors in the component tree and displays a user-friendly fallback UI
 * instead of a white screen. Essential for production stability.
 *
 * @see https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  /** Child components to protect from crashes */
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[FlowPass ErrorBoundary] Caught error:', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-surface border border-white/10 rounded-2xl p-8 text-center shadow-2xl">
            <div className="w-16 h-16 bg-stop/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-heading font-bold text-white mb-2">
              Something went wrong
            </h2>
            <p className="text-dim mb-6">
              FlowPass encountered an unexpected error. Your data is safe.
            </p>
            {this.state.error && (
              <div className="bg-background border border-white/5 rounded-lg p-4 mb-6 text-left">
                <p className="text-xs text-stop font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-white text-background font-bold rounded-lg hover:bg-white/90 transition-colors"
            >
              Reload FlowPass
            </button>
            <p className="text-xs text-dim mt-4">
              If this persists, contact the event organiser.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
