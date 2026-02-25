import type { ReportsCopy } from '../types';

export const REPORTS_COPY_EN: ReportsCopy = {
      exportButton: 'Export',
      exportingButton: 'Exporting...',
      scanDataRequired: 'Scan data is required',
      states: {
        exportHub: 'Export Hub',
        title: 'Reports & Artifacts',
        emptySubtitle: 'Generate production-grade exports for audits, handoffs, and automation.',
        emptyHeadline: 'Exports are ready when scan data is available',
        emptyBody: 'Run a scan first, then export CSV, JSON, and PDF artifacts from this page.',
        emptyHintTauri: 'Use the top-right Start Scan button to begin.',
        emptyHintBrowser: 'Run with `npm run tauri dev` to enable scanning.',
        preparingShowcasePdf: 'Preparing Showcase PDF...',
        downloadShowcasePdf: 'Download Pre-Generated Showcase PDF',
        scanningSubtitle: 'Preparing scan artifacts...',
        collectingScanData: 'Collecting scan data...',
        unlockAfterDiscovery: 'Export actions will unlock once discovery completes.',
        contentSubtitle:
          'Generate production-grade reports and structured exports for audits, handoffs, and automation.',
      },
      chips: {
        hosts: 'Hosts',
        subnet: 'Subnet',
        formats: 'Formats',
        notAvailable: 'N/A',
      },
      messages: {
        noActiveHosts: 'Scan completed but no active hosts were found. Exports are currently disabled.',
      },
      cards: {
        showcaseReport: {
          title: 'Showcase Report',
          description:
            'Pre-generated offline demo PDF with executive summary and inventory highlights for judges.',
        },
        scanReport: {
          title: 'Scan Report',
          description:
            'Professional PDF report with network analysis, device inventory, and statistics.',
        },
        securityReport: {
          title: 'Security Report',
          description: 'Network health assessment with security recommendations and risk analysis.',
        },
        deviceList: {
          title: 'Device List',
          description: 'Export all discovered devices to CSV format for spreadsheet analysis.',
        },
        scanResults: {
          title: 'Scan Results',
          description: 'Export current scan results to CSV with all device details and metrics.',
        },
        topologyData: {
          title: 'Topology Data',
          description:
            'Export network topology structure as JSON for custom visualization or analysis.',
        },
        rawScanData: {
          title: 'Raw Scan Data',
          description: 'Export complete scan result with all metadata in JSON format.',
        },
      },
    };
