import type { VulnerabilitiesCopy } from '../types';

export const VULNERABILITIES_COPY_MY: VulnerabilitiesCopy = {
      header: {
        kicker: 'Security Intelligence',
        title: 'Vulnerability Center',
        noData: 'Scan data မရရှိသေးပါ။',
        scanning: 'Risk signal များ စကင်/သုံးသပ်နေသည်...',
        subtitle: 'Discovered asset များ၏ vulnerability signal နှင့် port warning များကို စစ်ဆေးပါ။',
      },
      emptyState: {
        headline: 'Vulnerability analysis အတွက် အသင့်',
        description:
          'CVE insight, port warning နှင့် risk-classified signal များရရှိရန် scan စတင်ပါ။',
        cveInsights: 'CVE Insights',
        portWarnings: 'Port Warnings',
        riskFilters: 'Risk Filters',
        hintTauri: 'ညာဘက်အပေါ် Start Scan ခလုတ်ဖြင့် စတင်ပါ။',
        hintBrowser: 'Scanning enable လုပ်ရန် npm run tauri dev ဖြင့် run လုပ်ပါ။',
      },
      summary: {
        critical: 'Critical',
        high: 'High Risk',
        medium: 'Medium Risk',
        secure: 'Secure',
      },
      listEmpty: {
        filteredTitle: 'ဤ filter ထဲတွင် vulnerability မရှိပါ',
        defaultTitle: 'Vulnerability မတွေ့ပါ',
        filteredDescription: 'အခြား risk filter သို့ပြောင်းပြီး device များကို စစ်ဆေးပါ။',
        noFindings: 'Known vulnerability သို့ security warning မတွေ့ပါ။',
        noScanData: 'Discovered asset များ၏ vulnerability နှင့် port risk ကိုကြည့်ရန် scan run လုပ်ပါ။',
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
        allClearDescription: 'Known vulnerability သို့ security warning မတွေ့ပါ။',
        openDrillDown: 'Open Drill-Down',
        moreFindings: '+{count} more',
      },
    };
