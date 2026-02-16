import clsx from 'clsx';
import { X } from 'lucide-react';

interface DeviceModalHeaderProps {
  isDark: boolean;
  isOnline: boolean;
  title: string;
  subtitle: string;
  onClose: () => void;
}

export function DeviceModalHeader({
  isDark,
  isOnline,
  title,
  subtitle,
  onClose,
}: DeviceModalHeaderProps) {
  return (
    <div
      className={clsx(
        'relative flex items-center justify-between border-b p-4',
        isDark ? 'border-white/10 bg-[#0f1419]' : 'border-slate-200 bg-slate-50',
      )}
    >
      <div className="flex items-center gap-3">
        <div className={clsx('h-2.5 w-2.5 rounded-full', isOnline ? 'bg-emerald-500' : 'bg-red-500')} />
        <div>
          <h2 className={clsx('text-lg font-bold tracking-tight', isDark ? 'text-white' : 'text-slate-900')}>
            {title}
          </h2>
          <p className={clsx('mt-0.5 text-xs font-medium', isDark ? 'text-slate-400' : 'text-slate-600')}>
            {subtitle}
          </p>
        </div>
      </div>
      <button
        onClick={onClose}
        className={clsx(
          'rounded-lg p-2 transition-colors',
          isDark
            ? 'text-slate-400 hover:bg-white/10 hover:text-white'
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
        )}
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}
