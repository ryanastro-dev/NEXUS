import { AlertTriangle, CheckCircle, Shield } from 'lucide-react';

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

export function SecurityCard({ device }: SecurityCardProps) {
  const grade = device.security_grade || 'N/A';
  const gradeClass =
    GRADE_COLORS[grade as keyof typeof GRADE_COLORS] || DEFAULT_GRADE_CLASS;

  const vulnerabilities = device.vulnerabilities ?? [];
  const portWarnings = device.port_warnings ?? [];
  const isSecure = vulnerabilities.length === 0 && portWarnings.length === 0;

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white/85 p-6 shadow-sm backdrop-blur-sm transition-all hover:border-accent-blue/30 dark:border-slate-800 dark:bg-slate-950/65">
      <div className="mb-6 flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="mb-1 text-xl font-bold text-text-primary">{device.last_ip}</h3>
          <p className="text-sm text-text-muted">{device.vendor || 'Unknown Vendor'}</p>
          <div className="mt-2 flex items-center gap-2 text-xs text-text-muted">
            <span>IP: {device.last_ip}</span>
            <span>•</span>
            <span>MAC: {device.mac}</span>
          </div>
        </div>

        <div
          className={`h-16 w-16 shrink-0 rounded-2xl text-3xl font-bold ${gradeClass} flex items-center justify-center`}
        >
          {grade}
        </div>
      </div>

      {vulnerabilities.length > 0 && (
        <div className="mb-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-accent-red" />
            <h4 className="text-sm font-bold uppercase tracking-wide text-accent-red">
              Known Vulnerabilities ({vulnerabilities.length})
            </h4>
          </div>

          <div className="space-y-2">
            {vulnerabilities.map((vulnerability) => (
              <div
                key={vulnerability.cve_id}
                className="rounded-xl border border-accent-red/10 bg-accent-red/5 p-4"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <span className="font-mono text-sm font-bold text-accent-red">
                    {vulnerability.cve_id}
                  </span>
                  {vulnerability.cvss_score && (
                    <span className="rounded bg-accent-red/10 px-2 py-0.5 text-sm font-bold text-accent-red">
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
        </div>
      )}

      {portWarnings.length > 0 && (
        <div className="mb-4">
          <div className="mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4 text-accent-blue" />
            <h4 className="text-sm font-bold uppercase tracking-wide text-accent-blue">
              Port Security Warnings ({portWarnings.length})
            </h4>
          </div>

          <div className="space-y-2">
            {portWarnings.map((warning) => {
              const severityClass =
                PORT_WARNING_SEVERITY_COLORS[
                  warning.severity as keyof typeof PORT_WARNING_SEVERITY_COLORS
                ] || DEFAULT_PORT_WARNING_SEVERITY_CLASS;

              return (
                <div key={warning.port} className={`rounded-xl border p-4 ${severityClass}`}>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-bold">
                      Port {warning.port} - {warning.service}
                    </span>
                    <span className="rounded bg-current/10 px-2 py-0.5 text-xs font-bold uppercase">
                      {warning.severity}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-text-secondary">
                    {warning.warning}
                    {warning.recommendation && <> → Use HTTPS (port 443)</>}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isSecure && (
        <div className="py-8 text-center">
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
  );
}
