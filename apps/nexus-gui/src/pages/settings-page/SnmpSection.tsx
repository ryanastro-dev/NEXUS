import { Network } from 'lucide-react';
import { useLanguage } from '../../hooks/useLanguage';
import { AppToggle } from './AppToggle';

interface SnmpSectionProps {
  panelClassName: string;
  snmpEnabled: boolean;
  onToggle: () => void;
}

export function SnmpSection({ panelClassName, snmpEnabled, onToggle }: SnmpSectionProps) {
  const { copy } = useLanguage();
  const snmpCopy = copy.settings.snmp;

  return (
    <div className={`${panelClassName} p-5`}>
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="rounded-lg bg-accent-blue/10 p-2">
            <Network className="h-5 w-5 text-accent-blue" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-text-primary">{snmpCopy.title}</h3>
            <p className="mt-0.5 text-xs text-text-muted">
              {snmpCopy.description}
            </p>
          </div>
        </div>
        <AppToggle enabled={snmpEnabled} onToggle={onToggle} />
      </div>
    </div>
  );
}
