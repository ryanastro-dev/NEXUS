import type {
  DeviceWithVulns,
  ScanHostLike,
  VulnerabilityFilter,
  VulnerabilityStats,
} from './types';

export function mapHostsToDevices(activeHosts?: ScanHostLike[]): DeviceWithVulns[] {
  if (!activeHosts) {
    return [];
  }

  return activeHosts.map((host) => ({
    id: 0,
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
    critical: devices.filter((device) => device.security_grade === 'F').length,
    high: devices.filter((device) => device.security_grade === 'D').length,
    medium: devices.filter((device) => device.security_grade === 'C').length,
    secure: devices.filter((device) => {
      const grade = device.security_grade || '';
      return grade === 'A' || grade === 'B' || grade === '' || grade === 'N/A';
    }).length,
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

    if (filter === 'critical') {
      return device.security_grade === 'F';
    }

    if (filter === 'high') {
      return device.security_grade === 'D';
    }

    if (filter === 'medium') {
      return device.security_grade === 'C';
    }

    return true;
  });
}
