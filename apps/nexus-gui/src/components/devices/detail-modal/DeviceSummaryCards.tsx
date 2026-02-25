import clsx from 'clsx';
import { AlertTriangle, Wifi, WifiOff } from 'lucide-react';

import { useLanguage } from '../../../hooks/useLanguage';
import { getDeviceRiskLevel } from './utils';

interface DeviceSummaryCardsProps {
  isDark: boolean;
  isOnline: boolean;
  riskScore: number;
}

export function DeviceSummaryCards({ isDark, isOnline, riskScore }: DeviceSummaryCardsProps) {
  const { copy } = useLanguage();
  const modalCopy = copy.devices.modal;
  const riskLevel = getDeviceRiskLevel(riskScore);

  return (
    <div className="grid grid-cols-2 gap-3">
      <div
        className={clsx(
          'rounded-lg border p-3',
          isOnline
            ? isDark
              ? 'border-emerald-500/30 bg-emerald-500/10'
              : 'border-emerald-200 bg-emerald-50'
            : isDark
              ? 'border-red-500/30 bg-red-500/10'
              : 'border-red-200 bg-red-50',
        )}
      >
        <div className="flex items-center gap-2">
          <div
            className={clsx(
              'flex h-8 w-8 items-center justify-center rounded-lg',
              isOnline
                ? isDark
                  ? 'bg-emerald-500/20'
                  : 'bg-emerald-100'
                : isDark
                  ? 'bg-red-500/20'
                  : 'bg-red-100',
            )}
          >
            {isOnline ? (
              <Wifi className="h-4 w-4 text-emerald-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
          </div>
          <div>
            <p className={clsx('text-[10px] font-medium uppercase tracking-wide', isDark ? 'text-slate-500' : 'text-slate-600')}>
              {modalCopy.summary.status}
            </p>
            <p className={clsx('text-base font-bold', isOnline ? 'text-emerald-500' : 'text-red-500')}>
              {isOnline ? modalCopy.summary.online : modalCopy.summary.offline}
            </p>
          </div>
        </div>
      </div>

      <div
        className={clsx(
          'rounded-lg border p-3',
          riskLevel === 'low'
            ? isDark
              ? 'border-emerald-500/30 bg-emerald-500/10'
              : 'border-emerald-200 bg-emerald-50'
            : riskLevel === 'medium'
              ? isDark
                ? 'border-amber-500/30 bg-amber-500/10'
                : 'border-amber-200 bg-amber-50'
              : isDark
                ? 'border-red-500/30 bg-red-500/10'
                : 'border-red-200 bg-red-50',
        )}
      >
        <div className="flex items-center gap-2">
          <div
            className={clsx(
              'flex h-8 w-8 items-center justify-center rounded-lg',
              riskLevel === 'low'
                ? isDark
                  ? 'bg-emerald-500/20'
                  : 'bg-emerald-100'
                : riskLevel === 'medium'
                  ? isDark
                    ? 'bg-amber-500/20'
                    : 'bg-amber-100'
                  : isDark
                    ? 'bg-red-500/20'
                    : 'bg-red-100',
            )}
          >
            <AlertTriangle
              className={clsx(
                'h-4 w-4',
                riskLevel === 'low'
                  ? 'text-emerald-500'
                  : riskLevel === 'medium'
                    ? 'text-amber-500'
                    : 'text-red-500',
              )}
            />
          </div>
          <div>
            <p className={clsx('text-[10px] font-medium uppercase tracking-wide', isDark ? 'text-slate-500' : 'text-slate-600')}>
              {modalCopy.summary.riskScore}
            </p>
            <p
              className={clsx(
                'text-base font-bold',
                riskLevel === 'low'
                  ? 'text-emerald-500'
                  : riskLevel === 'medium'
                    ? 'text-amber-500'
                    : 'text-red-500',
              )}
            >
              {riskScore}/100
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
