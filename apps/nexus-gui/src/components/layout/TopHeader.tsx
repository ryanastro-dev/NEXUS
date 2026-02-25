import {
  Bell,
  Sun,
  Monitor,
  Moon,
  Languages,
  Play,
  CircleStop,
  Loader2,
  Circle,
  CheckCircle,
  Bot,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { ScanStatus } from '../../hooks/useScan';
import { deriveAiPillState, useAiStatus } from '../../hooks/useAiStatus';
import { useLanguage } from '../../hooks/useLanguage';
import { useTheme } from '../../hooks/useTheme';
import type { Page } from '../../router';

interface TopHeaderProps {
  currentPage?: Page;
  isScanning?: boolean;
  scanStatus?: ScanStatus;
  onStartScan?: () => void;
  onStopScan?: () => void;
  onNavigateToAlerts?: () => void;
  unreadAlertsCount?: number;
}

// Status Pill Component
function StatusPill({
  scanStatus,
  labels,
}: {
  scanStatus: ScanStatus;
  labels: {
    scanning: string;
    complete: string;
    ready: string;
  };
}) {
  const getStatusConfig = () => {
    switch (scanStatus) {
      case 'scanning':
        return {
          bgColor: 'bg-orange-500/10',
          textColor: 'text-orange-600',
          icon: <Loader2 className="w-4 h-4 animate-spin" />,
          text: labels.scanning,
        };
      case 'complete':
        return {
          bgColor: 'bg-green-500/10',
          textColor: 'text-green-600',
          icon: <CheckCircle className="w-4 h-4" />,
          text: labels.complete,
        };
      case 'ready':
      default:
        return {
          bgColor: 'bg-green-500/10',
          textColor: 'text-green-600',
          icon: <Circle className="w-2 h-2 fill-current" />,
          text: labels.ready,
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 ${config.bgColor} ${config.textColor}`}
      key={scanStatus}
    >
      {config.icon}
      <span className="text-xs font-medium">{config.text}</span>
    </div>
  );
}

function AiStatusPill() {
  const aiSnapshot = useAiStatus();
  const aiState = deriveAiPillState(aiSnapshot);

  const toneClasses = {
    success: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-300',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-300',
    danger: 'bg-rose-500/10 text-rose-600 dark:text-rose-300',
    neutral: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
  } as const;

  const icon =
    aiState.tone === 'success' ? (
      <Bot className="h-3.5 w-3.5" />
    ) : aiState.tone === 'warning' ? (
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
    ) : aiState.tone === 'danger' ? (
      <ShieldAlert className="h-3.5 w-3.5" />
    ) : (
      <AlertTriangle className="h-3.5 w-3.5" />
    );

  return (
    <div
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 ${toneClasses[aiState.tone]}`}
      key={`${aiState.label}-${aiState.tone}`}
      title={aiState.detail}
    >
      {icon}
      <span className="text-xs font-medium">{aiState.label}</span>
    </div>
  );
}

function ThemeModeControl() {
  const { themeMode, setThemeMode } = useTheme();
  const { copy } = useLanguage();

  const options: Array<{
    id: 'light' | 'system' | 'dark';
    label: string;
    icon: ReactNode;
  }> = [
    { id: 'light', label: copy.header.themeMode.light, icon: <Sun className="h-4 w-4" /> },
    { id: 'system', label: copy.header.themeMode.system, icon: <Monitor className="h-4 w-4" /> },
    { id: 'dark', label: copy.header.themeMode.dark, icon: <Moon className="h-4 w-4" /> },
  ];

  return (
    <div className="flex items-center rounded-full border border-theme bg-bg-tertiary/75 p-1 shadow-sm">
      {options.map((option) => {
        const isActive = themeMode === option.id;

        return (
          <motion.button
            key={option.id}
            onClick={() => setThemeMode(option.id)}
            className={`relative flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
              isActive
                ? 'text-text-primary'
                : 'text-text-muted hover:text-text-primary'
            }`}
            title={option.label}
            aria-label={`${option.label} theme`}
            whileTap={{ scale: 0.96 }}
          >
            {isActive && (
              <motion.span
                className="absolute inset-0 rounded-full border border-theme bg-bg-secondary shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
                layoutId="theme-mode-pill"
                transition={{ type: 'spring', stiffness: 500, damping: 34 }}
              />
            )}
            <span className="relative z-10">{option.icon}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

function LanguageModeControl() {
  const { language, setLanguage, copy } = useLanguage();
  const options: Array<{ id: 'en' | 'my'; label: string; title: string }> = [
    {
      id: 'en',
      label: copy.header.languageMode.shortEnglish,
      title: copy.header.languageMode.english,
    },
    {
      id: 'my',
      label: copy.header.languageMode.shortMyanmar,
      title: copy.header.languageMode.myanmar,
    },
  ];

  return (
    <div
      className="flex items-center rounded-full border border-theme bg-bg-tertiary/75 p-1 shadow-sm"
      title={copy.header.languageMode.label}
    >
      <Languages className="ml-1 mr-1 h-3.5 w-3.5 text-text-muted" />
      {options.map((option) => {
        const isActive = language === option.id;

        return (
          <motion.button
            key={option.id}
            onClick={() => setLanguage(option.id)}
            className={`relative flex h-7 items-center justify-center rounded-full px-2 text-[11px] font-semibold transition-colors ${
              isActive ? 'text-text-primary' : 'text-text-muted hover:text-text-primary'
            }`}
            title={option.title}
            whileTap={{ scale: 0.96 }}
          >
            {isActive && (
              <motion.span
                className="absolute inset-0 rounded-full border border-theme bg-bg-secondary shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
                layoutId="language-mode-pill"
                transition={{ type: 'spring', stiffness: 500, damping: 34 }}
              />
            )}
            <span className="relative z-10">{option.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

export default function TopHeader({
  currentPage = 'dashboard',
  isScanning = false,
  scanStatus = 'ready',
  onStartScan,
  onStopScan,
  onNavigateToAlerts,
  unreadAlertsCount = 0,
}: TopHeaderProps) {
  const handleScanToggle = () => {
    if (isScanning) {
      onStopScan?.();
    } else {
      onStartScan?.();
    }
  };
  const { copy } = useLanguage();

  const { title, subtitle } = copy.header.pageInfo[currentPage] || copy.header.pageInfo.dashboard;

  // Button configuration based on scanStatus
  const getButtonConfig = () => {
    switch (scanStatus) {
      case 'scanning':
        return {
          bgColor: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/30',
          icon: <CircleStop className="w-4 h-4" />,
          text: copy.header.scanButton.stop,
          disabled: false,
        };
      case 'complete':
        return {
          bgColor: 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg shadow-green-500/30',
          icon: <CheckCircle className="w-4 h-4" />,
          text: copy.header.scanButton.done,
          disabled: true, // Disable clicking during complete state
        };
      case 'ready':
      default:
        return {
          bgColor: 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 shadow-lg shadow-cyan-500/30',
          icon: <Play className="w-4 h-4 fill-current" />,
          text: copy.header.scanButton.start,
          disabled: false,
        };
    }
  };

  const buttonConfig = getButtonConfig();

  return (
    <header className="h-16 bg-bg-secondary border-b border-theme flex items-center justify-between px-4 gap-4">
      {/* Left: Page Title & Subtitle */}
      <div className="flex flex-col">
        <h1
          className="text-[1.35rem] font-bold leading-tight text-text-primary"
        >
          {title}
        </h1>
        <p
          className="text-xs text-text-muted"
        >
          {subtitle}
        </p>
      </div>

      {/* Right: Status Pill + Actions */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Status Indicator Pill */}
        <StatusPill scanStatus={scanStatus} labels={copy.header.status} />
        <AiStatusPill />

        {/* Language Mode Control */}
        <LanguageModeControl />

        {/* Theme Mode Control */}
        <ThemeModeControl />

        {/* Notification Bell */}
        <button
          onClick={onNavigateToAlerts}
          className="relative rounded-lg p-2 transition-colors hover:bg-bg-hover"
          aria-label={copy.header.notifications}
        >
          <Bell className="h-[18px] w-[18px] text-text-secondary" />
          {unreadAlertsCount > 0 && (
            <span
              className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent-red px-1 text-[10px] font-bold text-white"
            >
              {unreadAlertsCount > 9 ? '9+' : unreadAlertsCount}
            </span>
          )}
        </button>

        {/* Scan Control Button */}
        <button
          onClick={handleScanToggle}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all ${buttonConfig.bgColor}`}
          disabled={buttonConfig.disabled || (!onStartScan && !onStopScan)}
        >
          {buttonConfig.icon}
          <span>{buttonConfig.text}</span>
        </button>
      </div>
    </header>
  );
}
