import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useDeviceDetailStore } from '../../store/device-detail-store';
import { SecurityCard } from './SecurityCard';
import type { DeviceWithVulns } from './types';

function createDevice(overrides: Partial<DeviceWithVulns> = {}): DeviceWithVulns {
  return {
    id: 7,
    mac: 'AA:BB:CC:DD:EE:07',
    last_ip: '192.168.1.7',
    vendor: 'Cisco',
    hostname: 'edge-router',
    device_type: 'ROUTER',
    os_guess: 'IOS',
    risk_score: 72,
    vulnerabilities: [
      {
        cve_id: 'CVE-2025-9999',
        description: 'Remote code execution vulnerability',
        severity: 'critical',
        cvss_score: 9.8,
      },
    ],
    port_warnings: [
      {
        port: 23,
        service: 'telnet',
        warning: 'Plaintext remote shell enabled',
        severity: 'high',
      },
    ],
    security_grade: 'D',
    ...overrides,
  };
}

describe('SecurityCard', () => {
  beforeEach(() => {
    useDeviceDetailStore.setState({ selectedDevice: null });
  });

  it('opens global drill-down with normalized host payload', () => {
    const device = createDevice();
    render(<SecurityCard device={device} />);

    fireEvent.click(screen.getByRole('button', { name: /open drill-down/i }));

    const selectedDevice = useDeviceDetailStore.getState().selectedDevice;
    expect(selectedDevice).toBeTruthy();
    expect(selectedDevice).toMatchObject({
      ip: device.last_ip,
      mac: device.mac,
      vendor: device.vendor,
      hostname: device.hostname,
      device_type: device.device_type,
      os_guess: device.os_guess,
      discovery_method: 'VULN_PAGE',
      risk_score: device.risk_score,
      security_grade: device.security_grade,
    });
    expect(selectedDevice?.open_ports).toEqual([]);
    expect(selectedDevice?.vulnerabilities).toEqual(device.vulnerabilities);
    expect(selectedDevice?.port_warnings).toEqual(device.port_warnings);
  });
});
