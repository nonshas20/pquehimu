import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { RotateCcw, AlertCircle } from './HugeIcons';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by HIMU ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    sessionStorage.removeItem('himu_chunk_refreshed');
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isChunkError =
        this.state.error?.message?.toLowerCase().includes('dynamically imported') ||
        this.state.error?.message?.toLowerCase().includes('failed to fetch') ||
        this.state.error?.message?.toLowerCase().includes('mime type');

      return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white border border-neutral-200 p-6 shadow-2xl text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
              <AlertCircle className="h-7 w-7" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-neutral-900">
                {isChunkError ? 'System Update Available' : 'Interface Error'}
              </h3>
              <p className="mt-1 text-xs text-neutral-500 leading-relaxed">
                {isChunkError
                  ? 'A new version of the HIMU IT Equipment Tracker was recently deployed. Please reload the page to load the latest modules.'
                  : 'An unexpected issue occurred while rendering this component. You can reload to continue safely.'}
              </p>
            </div>

            {this.state.error && (
              <div className="rounded-xl bg-neutral-50 p-2.5 text-left text-[11px] font-mono text-neutral-600 border border-neutral-200/80 max-h-24 overflow-y-auto">
                {this.state.error.message}
              </div>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 rounded-2xl border border-neutral-200 bg-white py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition active:scale-95"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition active:scale-95"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
