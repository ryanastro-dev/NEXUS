import type { VulnerabilitiesCopy } from '../types';

export const VULNERABILITIES_COPY_EN: VulnerabilitiesCopy = {
      header: {
        kicker: 'Security Intelligence',
        title: 'Vulnerability Center',
        noData: 'No scan data available yet.',
        scanning: 'Scanning and analyzing risk signals...',
        subtitle: 'Inspect vulnerability signals and port-level warnings across discovered assets.',
      },
      emptyState: {
        headline: 'Ready for vulnerability analysis',
        description:
          'Start a scan to generate CVE insights, port warnings, and risk-classified device security signals.',
        cveInsights: 'CVE Insights',
        portWarnings: 'Port Warnings',
        riskFilters: 'Risk Filters',
        hintTauri: 'Use the top-right Start Scan button to begin.',
        hintBrowser: 'Run with npm run tauri dev to enable scanning.',
      },
      summary: {
        critical: 'Critical',
        high: 'High Risk',
        medium: 'Medium Risk',
        secure: 'Secure',
      },
      listEmpty: {
        filteredTitle: 'No vulnerabilities in this filter',
        defaultTitle: 'No vulnerabilities found',
        filteredDescription: 'Try another risk filter to inspect additional devices.',
        noFindings: 'No known vulnerabilities or security warnings were detected.',
        noScanData:
          'Run a scan to build vulnerability and port-risk visibility for discovered assets.',
      },
      card: {
        unknownVendor: 'Unknown Vendor',
        ip: 'IP:',
        mac: 'MAC:',
        knownVulnerabilities: 'Known Vulnerabilities ({count})',
        portSecurityWarnings: 'Port Security Warnings ({count})',
        cvss: 'CVSS',
        port: 'Port {port} - {service}',
        allClearTitle: 'All Clear',
        allClearDescription: 'No known vulnerabilities or security warnings found.',
        openDrillDown: 'Open Drill-Down',
        moreFindings: '+{count} more',
      },
    };
