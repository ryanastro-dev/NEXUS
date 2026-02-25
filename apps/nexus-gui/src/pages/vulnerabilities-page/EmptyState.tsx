import { Shield } from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'framer-motion';

import { useLanguage } from '../../hooks/useLanguage';
import { CARD } from './constants';
import type { VulnerabilityFilter } from './types';

interface VulnerabilitiesEmptyStateProps {
  hasScanResult: boolean;
  filter: VulnerabilityFilter;
  className?: string;
}

export function VulnerabilitiesEmptyState({
  hasScanResult,
  filter,
  className,
}: VulnerabilitiesEmptyStateProps) {
  const { copy } = useLanguage();
  const vulnerabilitiesCopy = copy.vulnerabilities;
  const isFiltered = filter !== 'all';
  const title = isFiltered
    ? vulnerabilitiesCopy.listEmpty.filteredTitle
    : vulnerabilitiesCopy.listEmpty.defaultTitle;
  const description = isFiltered
    ? vulnerabilitiesCopy.listEmpty.filteredDescription
    : hasScanResult
      ? vulnerabilitiesCopy.listEmpty.noFindings
      : vulnerabilitiesCopy.listEmpty.noScanData;

  return (
    <motion.div
      className={clsx(
        CARD,
        'flex min-h-[260px] items-center justify-center text-center',
        className,
      )}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="mx-auto flex w-full max-w-xl flex-col items-center justify-center px-6 py-10">
        <Shield className="mb-3 h-10 w-10 text-text-muted/70" />
        <h3 className="text-xl font-semibold text-text-primary">{title}</h3>
        <p className="mt-2 text-sm text-text-secondary">{description}</p>
      </div>
    </motion.div>
  );
}
