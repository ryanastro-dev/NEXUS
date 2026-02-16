import { Network } from 'lucide-react';
import { AppToggle } from './AppToggle';

interface SnmpSectionProps {
  panelClassName: string;
  snmpEnabled: boolean;
  onToggle: () => void;
}

export function SnmpSection({ panelClassName, snmpEnabled, onToggle }: SnmpSectionProps) {
  return (
    <div className={`${panelClassName} p-5`}>
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="rounded-lg bg-accent-blue/10 p-2">
            <Network className="h-5 w-5 text-accent-blue" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-text-primary">SNMP Settings</h3>
            <p className="mt-0.5 text-xs text-text-muted">
              Enable SNMP to gather detailed device information like system description and uptime.
            </p>
          </div>
        </div>
        <AppToggle enabled={snmpEnabled} onToggle={onToggle} />
      </div>
    </div>
  );
}
