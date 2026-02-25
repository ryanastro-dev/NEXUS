import type { AlertsCopy } from '../types';

export const ALERTS_COPY_MY: AlertsCopy = {
      header: {
        kicker: 'Security Events',
        title: 'Alert Center',
        noData: 'Scan event မရှိသေးပါ။',
        subtitle:
          'Critical event များကို ဦးစားပေးပြီး warning များ triage လုပ်ကာ security finding များဖြေရှင်းပါ။',
        refresh: 'Refresh',
      },
      emptyState: {
        headline: 'Alerts stream အတွက် အသင့်',
        description:
          'Security alert, device event နှင့် triage signal များရရှိရန် network scan စတင်ပါ။',
        hintTauri: 'ညာဘက်အပေါ် Start Scan ခလုတ်ဖြင့် စတင်ပါ။',
        hintBrowser: 'Scanning enable လုပ်ရန် npm run tauri dev ဖြင့် run လုပ်ပါ။',
      },
      scanningState: {
        subtitle: 'Live event များ စုဆောင်းနေသည်...',
        headline: 'Alert timeline တည်ဆောက်နေသည်...',
        description: 'Discovery event နှင့် security signal များကို realtime စုဆောင်းနေသည်။',
      },
      stats: {
        unread: 'Unread Alerts',
        critical: 'Critical',
        warnings: 'Warnings',
        total: 'Total',
      },
      toolbar: {
        critical: 'Critical',
        warnings: 'Warnings',
        info: 'Info',
        unread: 'Unread',
        markAllRead: 'အားလုံးဖတ်ပြီး',
        clearAll: 'အားလုံးရှင်းမည်',
      },
      list: {
        loading: 'Alert များဖွင့်တင်နေသည်...',
        allClearTitle: 'All Clear!',
        noAlertsYet: 'Alert မရှိသေးပါ။ သင့် network ကို monitoring လုပ်နေပါသည်။',
        noFilterMatch: 'လက်ရှိ filter နှင့် ကိုက်ညီသော alert မရှိပါ။',
        new: 'NEW',
        markAsRead: 'ဖတ်ပြီးအဖြစ်မှတ်',
      },
      footer: {
        showingOf: 'Alert စုစုပေါင်း {total} မှ {shown} ကိုပြထားသည်',
      },
      relativeTime: {
        justNow: 'ယခုလေးတင်',
        minutesAgo: '{count} မိနစ်ခန့်က',
        hoursAgo: '{count} နာရီခန့်က',
        daysAgo: '{count} ရက်ခန့်က',
      },
    };
