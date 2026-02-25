import type { ErrorComponentProps } from '@tanstack/react-router';
import { Home, RouteOff } from 'lucide-react';

import { PANEL_CARD } from '../../lib/ui-classes';
import { useLanguage } from '../../hooks/useLanguage';
import AppCrashFallback from './AppCrashFallback';

function goToDashboard() {
  window.location.hash = '#/';
}

export function RouterErrorFallback({ error, reset }: ErrorComponentProps) {
  const { copy } = useLanguage();
  const fallbackCopy = copy.common.routerFallback;

  return (
    <AppCrashFallback
      title={fallbackCopy.routeFailedTitle}
      message={fallbackCopy.routeFailedMessage}
      error={error}
      onRetry={reset}
      onReload={() => {
        window.location.reload();
      }}
      retryLabel={fallbackCopy.retryRoute}
    />
  );
}

export function RouterNotFoundFallback(_props: unknown) {
  const { copy } = useLanguage();
  const fallbackCopy = copy.common.routerFallback;

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg-primary p-4 sm:p-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -left-20 h-96 w-96 rounded-full bg-cyan-300/10 blur-3xl dark:bg-cyan-500/10" />
        <div className="absolute right-0 bottom-0 h-[28rem] w-[28rem] rounded-full bg-slate-300/10 blur-3xl dark:bg-slate-500/10" />
      </div>

      <div className="relative z-10 flex min-h-[calc(100vh-2rem)] items-center justify-center">
        <section className={`${PANEL_CARD} w-full max-w-xl p-6 sm:p-7`}>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-300/50 bg-amber-100/70 text-amber-700 dark:border-amber-500/35 dark:bg-amber-500/15 dark:text-amber-300">
              <RouteOff className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">
                {fallbackCopy.routeGuard}
              </p>
              <h1 className="mt-1 text-2xl font-black text-text-primary sm:text-3xl">
                {fallbackCopy.pageNotFound}
              </h1>
              <p className="mt-2 text-sm text-text-secondary">
                {fallbackCopy.routeNotFoundMessage}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={goToDashboard}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-accent-blue to-accent-sapphire px-4 text-sm font-semibold text-white shadow-lg shadow-accent-blue/30 transition-all hover:brightness-110"
            >
              <Home className="h-4 w-4" />
              {fallbackCopy.goToDashboard}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
