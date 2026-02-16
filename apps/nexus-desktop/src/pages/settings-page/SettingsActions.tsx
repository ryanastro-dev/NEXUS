import { RefreshCw, Save } from 'lucide-react';

interface SettingsActionsProps {
  hasChanges: boolean;
  saveStatus: 'idle' | 'saving' | 'saved';
  onReset: () => void;
  onSave: () => void;
}

export function SettingsActions({
  hasChanges,
  saveStatus,
  onReset,
  onSave,
}: SettingsActionsProps) {
  return (
    <div className="mt-6 flex items-center justify-between">
      <button
        onClick={onReset}
        className="flex items-center gap-2 rounded-lg border-2 border-theme px-4 py-2 text-text-secondary transition-all hover:border-accent-blue hover:text-text-primary"
      >
        <RefreshCw className="h-4 w-4" />
        <span className="text-sm font-medium">Reset to Defaults</span>
      </button>

      <button
        onClick={onSave}
        disabled={!hasChanges && saveStatus === 'idle'}
        className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-bold shadow-lg transition-all ${
          saveStatus === 'saved'
            ? 'bg-accent-green text-white'
            : hasChanges
              ? 'bg-slate-800 text-white hover:bg-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800'
              : 'cursor-not-allowed bg-gray-400 text-gray-200'
        }`}
      >
        <Save className="h-4 w-4" />
        {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved!' : 'Save Settings'}
      </button>
    </div>
  );
}
