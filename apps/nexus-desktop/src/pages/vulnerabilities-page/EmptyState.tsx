import { Shield } from 'lucide-react';

import { CARD } from './constants';
import type { VulnerabilityFilter } from './types';

interface VulnerabilitiesEmptyStateProps {
  hasScanResult: boolean;
  filter: VulnerabilityFilter;
}

export function VulnerabilitiesEmptyState({
  hasScanResult,
  filter,
}: VulnerabilitiesEmptyStateProps) {
  return (
    <div className={`${CARD} py-16 text-center`}>
      <Shield className="mx-auto mb-4 h-16 w-16 text-text-muted opacity-50" />
      <p className="text-text-muted">
        {hasScanResult
          ? `No devices found${filter !== 'all' ? ' for this filter' : ''}`
          : 'Run a scan to see device vulnerabilities'}
      </p>
    </div>
  );
}
