import { MonitorCog } from 'lucide-react';

import { PANEL_CARD } from '../../lib/ui-classes';

interface DesktopModeNoticeProps {
  title?: string;
  message?: string;
  className?: string;
}

export default function DesktopModeNotice({
  title = 'Browser mode detected',
  message = 'Connect to the NEXUS desktop app (Tauri) for full scan, export, and router control features.',
  className = '',
}: DesktopModeNoticeProps) {
  return (
    <section
      className={`${PANEL_CARD} border-amber-300/60 bg-amber-100/80 p-3 text-amber-800 dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-300 ${className}`.trim()}
    >
      <div className="flex items-start gap-2.5">
        <MonitorCog className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em]">{title}</p>
          <p className="mt-1 text-xs sm:text-sm">{message}</p>
        </div>
      </div>
    </section>
  );
}
