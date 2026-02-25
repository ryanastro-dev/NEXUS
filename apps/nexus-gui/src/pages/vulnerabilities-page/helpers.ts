import type {
  DeviceWithVulns,
  ScanHostLike,
  VulnerabilityFilter,
  VulnerabilityStats,
} from './types';

type RiskBucket = Exclude<VulnerabilityFilter, 'all'>;

function normalizeSecurityGrade(grade?: string): string {
  return (grade ?? '').trim().toUpperCase();
}

function normalizeSeverity(severity?: string): string {
  return (severity ?? '').trim().toUpperCase();
}

function gradeRiskScore(grade?: string): number | null {
  const normalized = normalizeSecurityGrade(grade);
  if (normalized === 'F') {
    return 3;
  }
  if (normalized === 'D') {
    return 2;
  }
  if (normalized === 'C') {
    return 1;
  }
  if (normalized === 'A' || normalized === 'B') {
    return 0;
  }

  return null;
}

function severityRiskScore(severity?: string): number | null {
  const normalized = normalizeSeverity(severity);
  if (normalized === 'CRITICAL') {
    return 3;
  }
  if (normalized === 'HIGH') {
    return 2;
  }
  if (normalized === 'MEDIUM' || normalized === 'LOW' || normalized === 'INFO') {
    return 1;
  }

  return null;
}

function vulnerabilityRiskScore(device: DeviceWithVulns): number {
  const vulnerabilities = device.vulnerabilities ?? [];
  let maxScore = 0;

  for (const vulnerability of vulnerabilities) {
    const severityScore = severityRiskScore(vulnerability.severity);
    if (severityScore !== null) {
      maxScore = Math.max(maxScore, severityScore);
      continue;
    }

    const cvssScore = vulnerability.cvss_score;
    if (typeof cvssScore === 'number' && Number.isFinite(cvssScore)) {
      if (cvssScore >= 9) {
        maxScore = Math.max(maxScore, 3);
        continue;
      }
      if (cvssScore >= 7) {
        maxScore = Math.max(maxScore, 2);
        continue;
      }
      if (cvssScore >= 4) {
        maxScore = Math.max(maxScore, 1);
        continue;
      }
    }

    // Keep unknown severities visible in at least the medium bucket.
    maxScore = Math.max(maxScore, 1);
  }

  return maxScore;
}

function portWarningRiskScore(device: DeviceWithVulns): number {
  const portWarnings = device.port_warnings ?? [];
  let maxScore = 0;

  for (const warning of portWarnings) {
    const severityScore = severityRiskScore(warning.severity);
    if (severityScore !== null) {
      maxScore = Math.max(maxScore, severityScore);
      continue;
    }

    // Keep unknown severities visible in at least the medium bucket.
    maxScore = Math.max(maxScore, 1);
  }

  return maxScore;
}

function baselineRiskScore(riskScore?: number): number {
  if (!Number.isFinite(riskScore)) {
    return 0;
  }

  if ((riskScore ?? 0) >= 75) {
    return 3;
  }
  if ((riskScore ?? 0) >= 50) {
    return 2;
  }
  if ((riskScore ?? 0) >= 30) {
    return 1;
  }
  return 0;
}

function riskBucketFromScore(score: number): RiskBucket {
  if (score >= 3) {
    return 'critical';
  }
  if (score >= 2) {
    return 'high';
  }
  if (score >= 1) {
    return 'medium';
  }
  return 'secure';
}

export function classifyDeviceRisk(device: DeviceWithVulns): RiskBucket {
  const vulnerabilities = device.vulnerabilities ?? [];
  const portWarnings = device.port_warnings ?? [];
  const hasFindings = vulnerabilities.length > 0 || portWarnings.length > 0;

  // Keep page/card behavior consistent: no findings means "secure".
  if (!hasFindings) {
    return 'secure';
  }

  const score = Math.max(
    gradeRiskScore(device.security_grade) ?? 0,
    vulnerabilityRiskScore(device),
    portWarningRiskScore(device),
    baselineRiskScore(device.risk_score),
  );

  if (score <= 0) {
    return 'medium';
  }

  return riskBucketFromScore(score);
}

export function mapHostsToDevices(activeHosts?: ScanHostLike[]): DeviceWithVulns[] {
  if (!activeHosts) {
    return [];
  }

  return activeHosts.map((host, index) => ({
    id: index,
    mac: host.mac,
    last_ip: host.ip,
    vendor: host.vendor,
    device_type: host.device_type,
    hostname: host.hostname,
    os_guess: host.os_guess,
    custom_name: undefined,
    vulnerabilities: host.vulnerabilities || [],
    port_warnings: host.port_warnings || [],
    security_grade: host.security_grade || 'N/A',
    risk_score: Number.isFinite(host.risk_score) ? host.risk_score : undefined,
  }));
}

export function buildVulnerabilityStats(devices: DeviceWithVulns[]): VulnerabilityStats {
  const stats: VulnerabilityStats = {
    critical: 0,
    high: 0,
    medium: 0,
    secure: 0,
  };

  for (const device of devices) {
    const risk = classifyDeviceRisk(device);
    if (risk === 'critical') {
      stats.critical += 1;
      continue;
    }
    if (risk === 'high') {
      stats.high += 1;
      continue;
    }
    if (risk === 'medium') {
      stats.medium += 1;
      continue;
    }
    stats.secure += 1;
  }

  return stats;
}

export function filterDevicesByRisk(
  devices: DeviceWithVulns[],
  filter: VulnerabilityFilter,
): DeviceWithVulns[] {
  return devices.filter((device) => {
    if (filter === 'all') {
      return true;
    }

    const risk = classifyDeviceRisk(device);

    if (filter === 'critical') {
      return risk === 'critical';
    }

    if (filter === 'high') {
      return risk === 'high';
    }

    if (filter === 'medium') {
      return risk === 'medium';
    }

    if (filter === 'secure') {
      return risk === 'secure';
    }

    return true;
  });
}
