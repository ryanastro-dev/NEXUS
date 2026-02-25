import { describe, expect, it } from 'vitest';

import {
  buildVulnerabilityStats,
  classifyDeviceRisk,
  filterDevicesByRisk,
  mapHostsToDevices,
} from './helpers';
import type { DeviceWithVulns } from './types';

function createDevice(partial: Partial<DeviceWithVulns> = {}): DeviceWithVulns {
  return {
    id: 1,
    mac: 'aa:bb:cc:dd:ee:ff',
    last_ip: '192.168.1.10',
    vulnerabilities: [],
    port_warnings: [],
    security_grade: 'N/A',
    ...partial,
  };
}

describe('vulnerabilities helpers', () => {
  it('keeps no-finding devices in secure bucket even with missing grade metadata', () => {
    const device = createDevice({ security_grade: 'N/A' });
    expect(classifyDeviceRisk(device)).toBe('secure');
  });

  it('builds summary stats from the same classification used by risk filter', () => {
    const devices = [
      createDevice({ id: 1, mac: '00:00:00:00:00:01', last_ip: '192.168.1.2' }),
      createDevice({
        id: 2,
        mac: '00:00:00:00:00:02',
        last_ip: '192.168.1.3',
        vulnerabilities: [
          {
            cve_id: 'CVE-2025-0001',
            description: 'critical vuln',
            severity: 'critical',
          },
        ],
      }),
      createDevice({
        id: 3,
        mac: '00:00:00:00:00:03',
        last_ip: '192.168.1.4',
        port_warnings: [
          {
            port: 23,
            service: 'telnet',
            warning: 'insecure remote access',
            severity: 'high',
          },
        ],
      }),
    ];

    const stats = buildVulnerabilityStats(devices);
    expect(stats).toEqual({
      critical: 1,
      high: 1,
      medium: 0,
      secure: 1,
    });

    expect(filterDevicesByRisk(devices, 'critical')).toHaveLength(1);
    expect(filterDevicesByRisk(devices, 'high')).toHaveLength(1);
    expect(filterDevicesByRisk(devices, 'secure')).toHaveLength(1);
  });

  it('falls back to baseline risk score when finding severity text is missing', () => {
    const device = createDevice({
      port_warnings: [
        {
          port: 8080,
          service: 'http-alt',
          warning: 'unexpected exposure',
          severity: '',
        },
      ],
      risk_score: 52,
    });

    expect(classifyDeviceRisk(device)).toBe('high');
  });

  it('maps scan hosts to vulnerability cards with normalized defaults', () => {
    const devices = mapHostsToDevices([
      {
        ip: '192.168.1.5',
        mac: '00:00:00:00:00:05',
        risk_score: 33,
      },
    ]);

    expect(devices).toEqual([
      {
        id: 0,
        mac: '00:00:00:00:00:05',
        last_ip: '192.168.1.5',
        vendor: undefined,
        device_type: undefined,
        hostname: undefined,
        os_guess: undefined,
        custom_name: undefined,
        vulnerabilities: [],
        port_warnings: [],
        security_grade: 'N/A',
        risk_score: 33,
      },
    ]);
  });
});
