import { useState } from 'react';
import { AlertTriangle, CheckCircle, Shield, X } from 'lucide-react';
import { motion } from 'framer-motion';

import {
  DEFAULT_GRADE_CLASS,
  DEFAULT_PORT_WARNING_SEVERITY_CLASS,
  GRADE_COLORS,
  PORT_WARNING_SEVERITY_COLORS,
} from './constants';
import type { DeviceWithVulns } from './types';

interface SecurityCardProps {
  device: DeviceWithVulns;
}

function truncateText(value: string, max = 112): string {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max - 1).trimEnd()}...`;
}

export function SecurityCard({ device }: SecurityCardProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const grade = device.security_grade || 'N/A';
  const gradeClass =
    GRADE_COLORS[grade as keyof typeof GRADE_COLORS] || DEFAULT_GRADE_CLASS;

  const vulnerabilities = device.vulnerabilities ?? [];
  const portWarnings = device.port_warnings ?? [];
  const isSecure = vulnerabilities.length === 0 && portWarnings.length === 0;
  const visibleVulnerabilities = vulnerabilities.slice(0, 1);
  const visiblePortWarnings = portWarnings.slice(0, 1);
  const hiddenVulnerabilityCount = Math.max(0, vulnerabilities.length - visibleVulnerabilities.length);
  const hiddenPortWarningCount = Math.max(0, portWarnings.length - visiblePortWarnings.length);
  const hiddenFindingCount = hiddenVulnerabilityCount + hiddenPortWarningCount;
  const hasOverflowFindings = hiddenFindingCount > 0;

  return (
    <>
      <div className="flex h-full min-h-[236px] flex-col rounded-2xl border border-slate-200/70 bg-white/85 p-3.5 shadow-sm backdrop-blur-sm transition-all hover:border-accent-blue/30 dark:border-slate-800 dark:bg-slate-950/65">
        <div className="mb-3 flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="mb-1 text-xl font-bold leading-tight text-text-primary">{device.last_ip}</h3>
            <p className="truncate text-sm text-text-muted">{device.vendor || 'Unknown Vendor'}</p>
            <div className="mt-1.5 flex items-center gap-2 text-xs text-text-muted">
              <span>IP: {device.last_ip}</span>
              <span>•</span>
              <span>MAC: {device.mac}</span>
            </div>
          </div>

          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl font-bold ${gradeClass}`}
          >
            {grade}
          </div>
        </div>

        {vulnerabilities.length > 0 && (
          <div className="mb-2.5">
            <div className="mb-2 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-accent-red" />
              <h4 className="text-xs font-bold uppercase tracking-wide text-accent-red">
                Known Vulnerabilities ({vulnerabilities.length})
              </h4>
            </div>

            <div className="space-y-1.5">
              {visibleVulnerabilities.map((vulnerability) => (
                <div
                  key={vulnerability.cve_id}
                  className="rounded-xl border border-accent-red/10 bg-accent-red/5 p-2.5"
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-accent-red">
                      {vulnerability.cve_id}
                    </span>
                    {vulnerability.cvss_score && (
                      <span className="rounded bg-accent-red/10 px-1.5 py-0.5 text-[10px] font-bold text-accent-red">
                        CVSS {vulnerability.cvss_score.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed text-text-secondary">
                    {truncateText(vulnerability.description)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {portWarnings.length > 0 && (
          <div className="mb-2.5">
            <div className="mb-2 flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-accent-blue" />
              <h4 className="text-xs font-bold uppercase tracking-wide text-accent-blue">
                Port Security Warnings ({portWarnings.length})
              </h4>
            </div>

            <div className="space-y-1.5">
              {visiblePortWarnings.map((warning) => {
                const severityClass =
                  PORT_WARNING_SEVERITY_COLORS[
                    warning.severity as keyof typeof PORT_WARNING_SEVERITY_COLORS
                  ] || DEFAULT_PORT_WARNING_SEVERITY_CLASS;

                return (
                  <div key={warning.port} className={`rounded-xl border p-2.5 ${severityClass}`}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs font-bold">
                        Port {warning.port} - {warning.service}
                      </span>
                      <span className="rounded bg-current/10 px-1.5 py-0.5 text-[10px] font-bold uppercase">
                        {warning.severity}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-text-secondary">
                      {truncateText(warning.warning)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!isSecure && hasOverflowFindings && (
          <div className="mt-auto pt-1.5">
            <button
              onClick={() => setIsDetailsOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              View all findings
              <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] text-slate-500 dark:bg-slate-900 dark:text-slate-300">
                +{hiddenFindingCount} more
              </span>
            </button>
          </div>
        )}

        {isSecure && (
          <div className="mt-auto py-6 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-accent-green/10">
              <CheckCircle className="h-8 w-8 text-accent-green" />
            </div>
            <h4 className="mb-1 text-lg font-bold text-text-primary">All Clear</h4>
            <p className="text-sm text-text-muted">
              No known vulnerabilities or security warnings found.
            </p>
          </div>
        )}
      </div>

      {isDetailsOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-black/75"
            onClick={() => setIsDetailsOpen(false)}
          />
          <motion.aside
            className="absolute right-0 top-0 z-10 h-full w-full max-w-[620px] border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
            initial={{ x: '100%', opacity: 0.92 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          >
            <div className="flex h-full flex-col">
              <div className="border-b border-slate-200 bg-slate-100 px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      Security Findings • {device.last_ip}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {vulnerabilities.length} vulnerabilities, {portWarnings.length} port warnings
                    </p>
                  </div>
                  <button
                    onClick={() => setIsDetailsOpen(false)}
                    className="rounded-md border border-slate-300 p-1.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                    aria-label="Close findings details"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {vulnerabilities.length > 0 && (
                  <section className="mb-4">
                    <div className="mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-accent-red" />
                      <h4 className="text-sm font-bold uppercase tracking-wide text-accent-red">
                        Known Vulnerabilities ({vulnerabilities.length})
                      </h4>
                    </div>
                    <div className="space-y-2.5">
                      {vulnerabilities.map((vulnerability) => (
                        <div
                          key={`full-${vulnerability.cve_id}`}
                          className="rounded-xl border border-accent-red/10 bg-accent-red/5 p-3.5"
                        >
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <span className="font-mono text-sm font-bold text-accent-red">
                              {vulnerability.cve_id}
                            </span>
                            {vulnerability.cvss_score && (
                              <span className="rounded bg-accent-red/10 px-2 py-0.5 text-xs font-bold text-accent-red">
                                CVSS {vulnerability.cvss_score.toFixed(1)}
                              </span>
                            )}
                          </div>
                          <p className="text-sm leading-relaxed text-text-secondary">
                            {vulnerability.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {portWarnings.length > 0 && (
                  <section>
                    <div className="mb-3 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-accent-blue" />
                      <h4 className="text-sm font-bold uppercase tracking-wide text-accent-blue">
                        Port Security Warnings ({portWarnings.length})
                      </h4>
                    </div>
                    <div className="space-y-2.5">
                      {portWarnings.map((warning, index) => {
                        const severityClass =
                          PORT_WARNING_SEVERITY_COLORS[
                            warning.severity as keyof typeof PORT_WARNING_SEVERITY_COLORS
                          ] || DEFAULT_PORT_WARNING_SEVERITY_CLASS;

                        return (
                          <div key={`full-port-${warning.port}-${index}`} className={`rounded-xl border p-3.5 ${severityClass}`}>
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <span className="text-sm font-bold">
                                Port {warning.port} - {warning.service}
                              </span>
                              <span className="rounded bg-current/10 px-2 py-0.5 text-xs font-bold uppercase">
                                {warning.severity}
                              </span>
                            </div>
                            <p className="text-sm leading-relaxed text-text-secondary">
                              {warning.warning}
                              {warning.recommendation && (
                                <>
                                  {' '}
                                  → {warning.recommendation}
                                </>
                              )}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
              </div>
            </div>
          </motion.aside>
        </div>
      )}
    </>
  );
}
