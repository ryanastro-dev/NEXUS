import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

import { PANEL_CARD } from '../../lib/ui-classes';

interface AppCrashFallbackProps {
  title?: string;
  message?: string;
  error?: unknown;
  stack?: string | null;
  onRetry?: () => void;
  onReload?: () => void;
  retryLabel?: string;
}

function stringifyError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown application error';
}

export default function AppCrashFallback({
  title = 'Something went wrong',
  message = 'NEXUS encountered an unexpected error. Please retry or restart the desktop app.',
  error,
  stack,
  onRetry,
  onReload,
  retryLabel = 'Try Again',
}: AppCrashFallbackProps) {
  const showDiagnostics = import.meta.env.DEV && (error || stack);

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg-primary p-4 sm:p-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -left-20 h-96 w-96 rounded-full bg-cyan-300/10 blur-3xl dark:bg-cyan-500/10" />
        <div className="absolute right-0 bottom-0 h-[28rem] w-[28rem] rounded-full bg-rose-300/10 blur-3xl dark:bg-rose-500/10" />
      </div>

      <div className="relative z-10 flex min-h-[calc(100vh-2rem)] items-center justify-center">
        <section className={`${PANEL_CARD} w-full max-w-2xl p-6 sm:p-7`}>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-rose-300/50 bg-rose-100/70 text-rose-700 dark:border-rose-500/35 dark:bg-rose-500/15 dark:text-rose-300">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">
                Runtime Safeguard
              </p>
              <h1 className="mt-1 text-2xl font-black text-text-primary sm:text-3xl">{title}</h1>
              <p className="mt-2 text-sm text-text-secondary">{message}</p>
            </div>
          </div>

          {showDiagnostics ? (
            <details className="mt-5 rounded-xl border border-theme bg-bg-tertiary/60 p-3">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">
                Developer Diagnostics
              </summary>
              {error ? (
                <p className="mt-2 break-all font-mono text-xs text-rose-600 dark:text-rose-300">
                  {stringifyError(error)}
                </p>
              ) : null}
              {stack ? (
                <pre className="mt-2 max-h-56 overflow-auto rounded-lg border border-theme bg-bg-secondary p-2 text-[11px] leading-relaxed text-text-muted">
                  {stack}
                </pre>
              ) : null}
            </details>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-2.5">
            {onRetry ? (
              <button
                onClick={onRetry}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-theme bg-bg-secondary px-4 text-sm font-semibold text-text-primary transition-colors hover:bg-bg-hover"
              >
                <RotateCcw className="h-4 w-4" />
                {retryLabel}
              </button>
            ) : null}
            {onReload ? (
              <button
                onClick={onReload}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-accent-blue to-accent-sapphire px-4 text-sm font-semibold text-white shadow-lg shadow-accent-blue/30 transition-all hover:brightness-110"
              >
                <RefreshCw className="h-4 w-4" />
                Restart App
              </button>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
