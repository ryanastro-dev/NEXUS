export interface VulnerabilityInfo {
  cve_id: string;
  description: string;
  severity: string;
  cvss_score?: number;
}

export interface PortWarning {
  port: number;
  service: string;
  warning: string;
  severity: string;
  recommendation?: string;
}

export interface DeviceWithVulns {
  id: number;
  mac: string;
  last_ip: string;
  vendor?: string;
  device_type?: string;
  hostname?: string;
  os_guess?: string;
  custom_name?: string;
  vulnerabilities?: VulnerabilityInfo[];
  port_warnings?: PortWarning[];
  security_grade?: string;
}

export interface ScanHostLike {
  mac: string;
  ip: string;
  vendor?: string;
  device_type?: string;
  hostname?: string;
  os_guess?: string;
  vulnerabilities?: VulnerabilityInfo[];
  port_warnings?: PortWarning[];
  security_grade?: string;
}

export interface VulnerabilityStats {
  critical: number;
  high: number;
  medium: number;
  secure: number;
}

export type VulnerabilityFilter = 'all' | 'critical' | 'high' | 'medium';
