import type { RouterControlCopy } from '../types';

export const ROUTER_CONTROL_COPY_EN: RouterControlCopy = {
      providers: {
        mock: 'Mock (Recommended for local test)',
        laptopAp: 'Laptop AP Fallback',
        mikrotik: 'MikroTik (Primary target)',
        cisco: 'Cisco (Primary target)',
      },
      policyActions: {
        deny: 'Deny / Block',
        allow: 'Allow',
        limitBandwidth: 'Limit Bandwidth',
        prioritize: 'Prioritize',
      },
      placeholders: {
        address: '192.168.88.1',
        username: 'admin',
        password: 'secret',
        portMikrotik: '8728 (MikroTik API)',
        portCisco: '22 (SSH)',
        portOptional: 'Optional (provider-specific)',
        policyTarget: 'AA:BB:CC:DD:EE:FF',
        policyValue: 'e.g. 10mbit',
        noIp: 'No IP',
      },
      errors: {
        unknown: 'Unknown error',
        laptopPrivilegeAction:
          'Action: relaunch app as Administrator (Windows) or sudo/root (Linux).',
        laptopResolveIpAction:
          'Action: connect target device to hotspot first, then refresh clients and retry.',
        configureDesktopOnly:
          'Router provider configuration is available only in the NEXUS desktop app.',
        portRange: 'Port must be between 1 and 65535.',
        clientControlDesktopOnly: 'Client control actions require the NEXUS desktop runtime.',
        policyDesktopOnly: 'Policy automation is available only in the NEXUS desktop app.',
        policyTargetRequired: 'Policy target is required.',
      },
      header: {
        kicker: 'Router Control Plane',
        title: 'Admin Router Access',
        subtitle:
          'Configure provider adapters and run client-level actions from one unified control surface.',
        refresh: 'Refresh',
        desktopNotice:
          'Router adapters run through Tauri IPC. Start with npm run tauri dev to configure providers and execute client controls.',
      },
      sections: {
        providerConfiguration: 'Provider Configuration',
        runtimeStatus: 'Runtime Status',
        capabilityMatrix: 'Capability Matrix',
        connectedClients: 'Connected Clients',
        policyAction: 'Policy Action',
      },
      labels: {
        provider: 'Provider',
        address: 'Address',
        username: 'Username',
        password: 'Password',
        port: 'Port',
        runtimeProvider: 'Provider',
        connection: 'Connection',
        capabilities: 'Capabilities',
        target: 'Target (MAC/IP)',
        action: 'Action',
        valueOptional: 'Value (optional)',
      },
      buttons: {
        applyProvider: 'Apply Provider',
        applyingProvider: 'Applying...',
        block: 'Block',
        unblock: 'Unblock',
        applyPolicy: 'Apply Policy',
        applyingPolicy: 'Applying...',
      },
      states: {
        unknown: 'unknown',
        connected: 'Connected',
        notConnected: 'Not Connected',
        enabledCount: '{enabled}/{total} enabled',
        noClients: 'No clients returned by current provider.',
        providerSwitched: "Provider switched to '{provider}'.",
        providerConfigured: 'Router provider configured: {provider}',
        desktopRequiredForPolicy: 'Desktop runtime required for policy operations.',
        providerNoPolicySupport: 'Current provider does not support policy API.',
      },
      capabilities: {
        listClients: 'List Clients',
        blockClient: 'Block Client',
        unblockClient: 'Unblock Client',
        applyPolicy: 'Apply Policy',
        trafficStats: 'Traffic Stats',
        qos: 'QoS',
        vlan: 'VLAN',
        dhcpLeases: 'DHCP Leases',
      },
    };
