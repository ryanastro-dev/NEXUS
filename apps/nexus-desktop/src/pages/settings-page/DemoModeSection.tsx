import { Zap } from 'lucide-react';
import { AppToggle } from './AppToggle';

interface DemoModeSectionProps {
  panelClassName: string;
  demoMode: boolean;
  onToggle: () => void;
}

export function DemoModeSection({ panelClassName, demoMode, onToggle }: DemoModeSectionProps) {
  return (
    <div className={`${panelClassName} p-5`}>
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="rounded-lg bg-accent-red/10 p-2">
            <Zap className="h-5 w-5 text-accent-red" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-text-primary">Demo Mode</h3>
            <p className="mt-0.5 text-xs text-text-muted">Use mock data for demonstration.</p>
          </div>
        </div>
        <AppToggle enabled={demoMode} onToggle={onToggle} />
      </div>
    </div>
  );
}
