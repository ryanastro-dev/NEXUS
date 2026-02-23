import type {
  DeviceWithVulns,
  ScanHostLike,
  VulnerabilityFilter,
  VulnerabilityStats,
} from './types';

function normalizeSecurityGrade(grade?: string): string {
  return (grade ?? '').trim().toUpperCase();
}

function isSecureGrade(grade?: string): boolean {
  const normalized = normalizeSecurityGrade(grade);
  return normalized === 'A' || normalized === 'B';
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
  }));
}

export function buildVulnerabilityStats(devices: DeviceWithVulns[]): VulnerabilityStats {
  return {
    critical: devices.filter((device) => normalizeSecurityGrade(device.security_grade) === 'F').length,
    high: devices.filter((device) => normalizeSecurityGrade(device.security_grade) === 'D').length,
    medium: devices.filter((device) => normalizeSecurityGrade(device.security_grade) === 'C').length,
    secure: devices.filter((device) => isSecureGrade(device.security_grade)).length,
  };
}

export function filterDevicesByRisk(
  devices: DeviceWithVulns[],
  filter: VulnerabilityFilter,
): DeviceWithVulns[] {
  return devices.filter((device) => {
    if (filter === 'all') {
      return true;
    }

    const grade = normalizeSecurityGrade(device.security_grade);

    if (filter === 'critical') {
      return grade === 'F';
    }

    if (filter === 'high') {
      return grade === 'D';
    }

    if (filter === 'medium') {
      return grade === 'C';
    }

    if (filter === 'secure') {
      return isSecureGrade(grade);
    }

    return true;
  });
}

