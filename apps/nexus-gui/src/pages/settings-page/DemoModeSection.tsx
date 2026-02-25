import { Zap } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { AppToggle } from './AppToggle';

interface DemoModeSectionProps {
  panelClassName: string;
  demoMode: boolean;
  onToggle: () => void;
}

export function DemoModeSection({ panelClassName, demoMode, onToggle }: DemoModeSectionProps) {
  const { copy } = useLanguage();
  const demoCopy = copy.settings.demo;

  return (
    <div className={`${panelClassName} p-5`}>
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="rounded-lg bg-accent-red/10 p-2">
            <Zap className="h-5 w-5 text-accent-red" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-text-primary">{demoCopy.title}</h3>
            <p className="mt-0.5 text-xs text-text-muted">{demoCopy.description}</p>
          </div>
        </div>
        <AppToggle enabled={demoMode} onToggle={onToggle} />
      </div>
    </div>
  );
}
