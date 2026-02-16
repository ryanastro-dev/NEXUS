import clsx from 'clsx';

interface InfoCardProps {
  label: string;
  value: string;
  isDark: boolean;
  mono?: boolean;
  span2?: boolean;
  accent?: string;
}

export function InfoCard({
  label,
  value,
  isDark,
  mono = false,
  span2 = false,
  accent,
}: InfoCardProps) {
  return (
    <div
      className={clsx(
        'rounded-lg border p-2.5 transition-colors',
        isDark
          ? 'border-white/10 bg-white/5 hover:border-white/20'
          : 'border-slate-200 bg-slate-50 hover:border-blue-300',
        span2 && 'col-span-2',
      )}
    >
      <p
        className={clsx(
          'mb-1 text-[10px] font-medium uppercase tracking-wide',
          isDark ? 'text-slate-500' : 'text-slate-600',
        )}
      >
        {label}
      </p>
      <p
        className={clsx(
          'truncate text-xs font-semibold transition-colors',
          mono ? 'font-mono text-blue-500' : isDark ? 'text-white' : 'text-slate-900',
          accent && 'bg-clip-text text-transparent',
        )}
        style={accent ? { backgroundImage: `linear-gradient(135deg, ${accent}, ${accent}AA)` } : undefined}
      >
        {value}
      </p>
    </div>
  );
}
