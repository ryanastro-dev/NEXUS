import { motion } from 'framer-motion';
import { Lock, Unlock, Zap, Grid3x3, Share2, FileText, Loader2, Play, Pause } from 'lucide-react';
import { useAiStatus } from '../../hooks/useAiStatus';
import { useLanguage } from '../../hooks/useLanguage';

export type MappingDesign = 'default' | 'cyber' | 'mesh';

interface TopologyControlsProps {
  isLocked: boolean;
  onLockToggle: () => void;
  mappingDesign: MappingDesign;
  onDesignChange: (design: MappingDesign) => void;
  isAutoPlay?: boolean;
  onAutoPlayToggle?: () => void;
  onGenerateReport?: () => void;
  isGeneratingReport?: boolean;
}

export default function TopologyControls({
  isLocked,
  onLockToggle,
  mappingDesign,
  onDesignChange,
  isAutoPlay = false,
  onAutoPlayToggle,
  onGenerateReport,
  isGeneratingReport = false,
}: TopologyControlsProps) {
  const { copy } = useLanguage();
  const topologyCopy = copy.topology;
  const { settings } = useAiStatus();
  const isAiDisabled = !settings?.enabled || settings?.mode === 'disabled';

  const getButtonClass = (isActive: boolean, isLock?: boolean) => {
    const base = 'flex items-center justify-center w-8 h-8 rounded-lg border-none cursor-pointer transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
    
    if (isLock && isActive) {
      return `${base} bg-orange-500/20 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400`;
    }
    
    if (isActive) {
      return `${base} bg-cyan-500/15 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-300`;
    }
    
    return `${base} bg-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50`;
  };

  return (
    <motion.div
      className="absolute left-4 top-4 z-10 flex items-center gap-1 p-1.5 
                 bg-white/95 dark:bg-slate-900/95 
                 rounded-xl 
                 border border-slate-200/50 dark:border-slate-700/50 
                 backdrop-blur-xl 
                 shadow-lg dark:shadow-2xl dark:shadow-black/40
                 transition-colors duration-300"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      {/* Theme Buttons */}
      <button
        onClick={() => onDesignChange('default')}
        title={topologyCopy.controls.standardTheme}
        className={getButtonClass(mappingDesign === 'default')}
      >
        <Grid3x3 size={16} />
      </button>
      
      <button
        onClick={() => onDesignChange('cyber')}
        title={topologyCopy.controls.cyberTheme}
        className={getButtonClass(mappingDesign === 'cyber')}
      >
        <Zap size={16} />
      </button>
      
      <button
        onClick={() => onDesignChange('mesh')}
        title={topologyCopy.controls.meshTheme}
        className={getButtonClass(mappingDesign === 'mesh')}
      >
        <Share2 size={16} />
      </button>

      {onAutoPlayToggle && (
        <div className="flex items-center gap-1">
          <button
            onClick={onAutoPlayToggle}
            title={isAutoPlay ? topologyCopy.controls.stopAutoPlay : topologyCopy.controls.startAutoPlay}
            className={getButtonClass(isAutoPlay)}
          >
            {isAutoPlay ? <Pause size={16} /> : <Play size={16} />}
          </button>
          {isAutoPlay && (
            <span className="inline-flex items-center gap-1 rounded-md bg-cyan-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse" />
              {topologyCopy.controls.autoPlayBadge}
            </span>
          )}
        </div>
      )}

      {onGenerateReport && (
        <button
          onClick={onGenerateReport}
          disabled={isGeneratingReport || isAiDisabled}
          title={
            isAiDisabled
              ? topologyCopy.controls.aiRequiredForReport
              : topologyCopy.controls.generateNetworkReport
          }
          className={getButtonClass(false)}
        >
          {isGeneratingReport ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
        </button>
      )}

      {/* Divider */}
      <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-0.5" />

      {/* Lock Button */}
      <button
        onClick={onLockToggle}
        title={isLocked ? topologyCopy.controls.unlockNodes : topologyCopy.controls.lockNodes}
        className={getButtonClass(isLocked, true)}
      >
        {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
      </button>
    </motion.div>
  );
}
