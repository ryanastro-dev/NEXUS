import type { ReportsCopy } from '../types';

export const REPORTS_COPY_MY: ReportsCopy = {
      exportButton: 'ထုတ်ယူမည်',
      exportingButton: 'ထုတ်ယူနေသည်...',
      scanDataRequired: 'Scan data လိုအပ်ပါသည်',
      states: {
        exportHub: 'Export Hub',
        title: 'Reports & Artifacts',
        emptySubtitle: 'Audit, handoff နှင့် automation အတွက် report/export များ ပြုလုပ်ပါ။',
        emptyHeadline: 'Scan data ရှိလာပါက export များ အသင့်ဖြစ်ပါမည်',
        emptyBody: 'အရင်ဆုံး scan run လုပ်ပြီးမှ CSV, JSON, PDF artifact များကို ထုတ်ယူပါ။',
        emptyHintTauri: 'ညာဘက်အပေါ် Start Scan ခလုတ်ကို နှိပ်ပါ။',
        emptyHintBrowser: '`npm run tauri dev` ဖြင့် run လုပ်ပြီး scan ကို enable လုပ်ပါ။',
        preparingShowcasePdf: 'Showcase PDF ပြင်ဆင်နေသည်...',
        downloadShowcasePdf: 'Pre-Generated Showcase PDF ဒေါင်းလုပ်လုပ်မည်',
        scanningSubtitle: 'Scan artifacts ပြင်ဆင်နေသည်...',
        collectingScanData: 'Scan data စုဆောင်းနေသည်...',
        unlockAfterDiscovery: 'Discovery ပြီးပါက export actions များ အသင့်ဖြစ်ပါမည်။',
        contentSubtitle:
          'Audit, handoff နှင့် automation အတွက် production-grade reports/export များ ပြုလုပ်ပါ။',
      },
      chips: {
        hosts: 'Hosts',
        subnet: 'Subnet',
        formats: 'Formats',
        notAvailable: 'N/A',
      },
      messages: {
        noActiveHosts: 'Scan ပြီးသော်လည်း active hosts မတွေ့ပါ။ Export များကို ယခု disable ထားပါသည်။',
      },
      cards: {
        showcaseReport: {
          title: 'Showcase Report',
          description:
            'Judges အတွက် executive summary နှင့် inventory highlights ပါဝင်သော pre-generated offline demo PDF။',
        },
        scanReport: {
          title: 'Scan Report',
          description:
            'Network analysis, device inventory နှင့် statistics ပါဝင်သော professional PDF report။',
        },
        securityReport: {
          title: 'Security Report',
          description: 'Security recommendations နှင့် risk analysis ပါဝင်သော assessment report။',
        },
        deviceList: {
          title: 'Device List',
          description: 'တွေ့ရှိထားသော devices များအား CSV အဖြစ် spreadsheet analysis အတွက် ထုတ်ယူရန်။',
        },
        scanResults: {
          title: 'Scan Results',
          description: 'Device details နှင့် metrics အားလုံးပါတဲ့ scan results CSV ထုတ်ယူရန်။',
        },
        topologyData: {
          title: 'Topology Data',
          description: 'Custom visualization/analysis အတွက် network topology JSON ထုတ်ယူရန်။',
        },
        rawScanData: {
          title: 'Raw Scan Data',
          description: 'Metadata အပါအဝင် scan result အပြည့်အစုံ JSON ထုတ်ယူရန်။',
        },
      },
    };
