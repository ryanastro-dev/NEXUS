import type { Page } from '../../../router';

export type AppLanguage = 'en' | 'my';

export const APP_LANGUAGE_STORAGE_KEY = 'nexus-language';
export const DEFAULT_APP_LANGUAGE: AppLanguage = 'en';

interface PageInfoText {
  title: string;
  subtitle: string;
}

export interface SidebarCopy {
  groups: {
    main: string;
    security: string;
    utilities: string;
    system: string;
  };
  items: Record<Page, string>;
  collapseSidebar: string;
  expandSidebar: string;
  appSubtitle: string;
}

export interface HeaderCopy {
  pageInfo: Record<Page, PageInfoText>;
  status: {
    scanning: string;
    complete: string;
    ready: string;
  };
  scanButton: {
    start: string;
    stop: string;
    done: string;
  };
  notifications: string;
  themeMode: {
    light: string;
    system: string;
    dark: string;
  };
  languageMode: {
    label: string;
    english: string;
    myanmar: string;
    shortEnglish: string;
    shortMyanmar: string;
  };
}

export interface CommonCopy {
  select: {
    defaultPlaceholder: string;
    searchPlaceholder: string;
    noOptionsFound: string;
  };
  scanProgress: {
    scanning: string;
    initializing: string;
    devicesFound: string;
    phases: {
      arpDiscovery: string;
      icmpPing: string;
      tcpProbe: string;
      dnsLookup: string;
    };
  };
  monitoringPanel: {
    title: string;
    active: string;
    intervalSeconds: string;
    intervalMinute: string;
    intervalMinutes: string;
    stopLiveMonitor: string;
    startLiveMonitor: string;
    scans: string;
    online: string;
    total: string;
    recentEvents: string;
    clear: string;
    noEventsYet: string;
  };
  alertPanel: {
    title: string;
    clearAll: string;
    loadingAlerts: string;
    noNewAlerts: string;
    caughtUp: string;
    devicePrefix: string;
    justNow: string;
    minutesAgo: string;
    hoursAgo: string;
    daysAgo: string;
  };
  recentEventsPanel: {
    title: string;
    subtitle: string;
    noRecentEvents: string;
  };
  bandwidthChart: {
    title: string;
    subtitle: string;
    live: string;
    noTelemetry: string;
    peak: string;
    average: string;
    current: string;
    unitMbps: string;
  };
  latencyChart: {
    title: string;
    subtitle: string;
    noTelemetry: string;
    min: string;
    average: string;
    max: string;
    unitMs: string;
  };
  labels: {
    unknown: string;
  };
  accessibility: {
    userMenu: string;
    breadcrumb: string;
    quickActionsMenu: string;
  };
  adminProfile: {
    defaultName: string;
    proLicense: string;
  };
  routerFallback: {
    routeFailedTitle: string;
    routeFailedMessage: string;
    retryRoute: string;
    routeGuard: string;
    pageNotFound: string;
    routeNotFoundMessage: string;
    goToDashboard: string;
  };
}

export interface DashboardCopy {
  loadingCommandCenter: string;
  header: {
    kicker: string;
    title: string;
    subtitle: string;
    refresh: string;
    stopLiveMonitor: string;
    startLiveMonitor: string;
    monitoring: string;
    monitoringActive: string;
    monitoringIdle: string;
    scanCycles: string;
    nextScan: string;
    riskTier: string;
    lastSync: string;
    nextScanStopped: string;
    nextScanScanningNow: string;
    nextScanEverySeconds: string;
    nextScanDueNow: string;
  };
  kpi: {
    active24h: string;
    knownDevices: string;
    securityScore: string;
    gradePrefix: string;
    noData: string;
    unidentified: string;
    unidentifiedSubtitle: string;
    criticalAlerts: string;
    criticalAlertSingular: string;
    criticalAlertPlural: string;
  };
  throughput: {
    scanThroughput: string;
    legendHostsFound: string;
    legendDurationSeconds: string;
    discoveryRate: string;
    hostsPerSecond: string;
    notAvailable: string;
    securityPosture: string;
    security: string;
    stability: string;
    compliance: string;
    noInsightsAvailable: string;
  };
  activity: {
    deviceComposition: string;
    liveActivityStream: string;
    clearView: string;
    live: string;
    paused: string;
    noRecentEvents: string;
    eventPrefix: string;
    eventUnknown: string;
    eventMonitoringStarted: string;
    eventMonitoringStopped: string;
    eventScanStarted: string;
    eventScanProgress: string;
    eventScanCompleted: string;
    eventNewDevice: string;
    eventDeviceOffline: string;
    eventDeviceOnline: string;
    eventIpChanged: string;
    eventErrorPrefix: string;
  };
  meta: {
    averageLatency: string;
    noData: string;
    averageLatencyDescription: string;
    riskDevices: string;
    riskDevicesDescription: string;
    lastScan: string;
    never: string;
    lastScanDescription: string;
  };
}

export interface ReportsCopy {
  exportButton: string;
  exportingButton: string;
  scanDataRequired: string;
  states: {
    exportHub: string;
    title: string;
    emptySubtitle: string;
    emptyHeadline: string;
    emptyBody: string;
    emptyHintTauri: string;
    emptyHintBrowser: string;
    preparingShowcasePdf: string;
    downloadShowcasePdf: string;
    scanningSubtitle: string;
    collectingScanData: string;
    unlockAfterDiscovery: string;
    contentSubtitle: string;
  };
  chips: {
    hosts: string;
    subnet: string;
    formats: string;
    notAvailable: string;
  };
  messages: {
    noActiveHosts: string;
  };
  cards: {
    showcaseReport: {
      title: string;
      description: string;
    };
    scanReport: {
      title: string;
      description: string;
    };
    securityReport: {
      title: string;
      description: string;
    };
    deviceList: {
      title: string;
      description: string;
    };
    scanResults: {
      title: string;
      description: string;
    };
    topologyData: {
      title: string;
      description: string;
    };
    rawScanData: {
      title: string;
      description: string;
    };
  };
}

export interface SettingsCopy {
  hero: {
    kicker: string;
    title: string;
    subtitle: string;
  };
  groups: {
    runtime: {
      title: string;
      badge: string;
    };
    manual: {
      title: string;
      badge: string;
    };
    experimental: {
      title: string;
      badge: string;
    };
  };
  actions: {
    resetAll: string;
    saving: string;
    saved: string;
    saveAll: string;
  };
  toasts: {
    settingsApplied: string;
    settingsApplyFailed: string;
    settingsReset: string;
    syncSuccess: string;
    syncFailure: string;
    aiApplySuccess: string;
    aiApplyFailure: string;
    diagnosticsPassed: string;
    diagnosticsFailed: string;
    diagnosticsWithWarnings: string;
  };
  notices: {
    applyRuntimeFailedPrefix: string;
    onlineSyncComplete: string;
    dbSyncFailedPrefix: string;
    diagnosticsFailedPrefix: string;
  };
  configuration: {
    scannerConfiguration: string;
    preferredInterface: string;
    autoDetectRecommended: string;
    tcpPortsToProbe: string;
    tcpPortsPlaceholder: string;
    runtimeContext: string;
    detectedInterfaces: string;
    dbPath: string;
    scanSchema: string;
    notAvailable: string;
    unavailable: string;
    runtimeDiagnostics: string;
    run: string;
    running: string;
    interfaces: string;
    icmpClient: string;
    monitor: string;
    arpDeferred: string;
    arpHighWatermark: string;
    arpDroppedOverCap: string;
    available: string;
    unavailableState: string;
    monitorRunning: string;
    monitorStopped: string;
    noRuntimeWarnings: string;
  };
  monitoring: {
    title: string;
    startupBehavior: string;
    autoStartEnabled: string;
    manualStartOnly: string;
    monitoringInterval: string;
    currentStatus: string;
    active: string;
    idle: string;
    activeInterval: string;
    scansCompleted: string;
    devicesOnline: string;
    stoppedMessage: string;
    intervalSeconds10: string;
    intervalSeconds30: string;
    intervalMinute1: string;
    intervalMinute5: string;
    intervalMinute10: string;
    intervalMinute30: string;
    intervalHour1: string;
  };
  snmp: {
    title: string;
    description: string;
  };
  ai: {
    title: string;
    subtitle: string;
    autoAiTitle: string;
    autoAiDescription: string;
    aiMode: string;
    modeLocal: string;
    modeCloud: string;
    modeHybrid: string;
    modeHelp: string;
    timeoutMs: string;
    localProvider: string;
    cloudProvider: string;
    endpoint: string;
    model: string;
    apiKey: string;
    sensitiveAllowed: string;
    sensitiveRedacted: string;
    applying: string;
    applyAiSettings: string;
    checking: string;
    runAiCheck: string;
    runtimeEnabled: string;
    runtimeMode: string;
    timeout: string;
    yes: string;
    no: string;
    unavailable: string;
    configured: string;
    reachable: string;
    latency: string;
    notAvailable: string;
  };
  vulnerabilityDb: {
    title: string;
    autoUpdate: string;
    details: string;
    syncRange: string;
    rangeLatest1000: string;
    rangeLatest5000: string;
    rangeLast30Days: string;
    rangeLast90Days: string;
    embeddedCves: string;
    downloadedCves: string;
    totalCves: string;
    lastUpdated: string;
    never: string;
    updating: string;
    updateNow: string;
  };
  demo: {
    title: string;
    description: string;
  };
}

export interface TopologyCopy {
  emptyState: {
    badge: string;
    title: string;
    description: string;
    featureDiscoveryTitle: string;
    featureDiscoveryDetail: string;
    featureRiskTitle: string;
    featureRiskDetail: string;
    featureControlsTitle: string;
    featureControlsDetail: string;
    startDiscovery: string;
    tauriUnavailable: string;
  };
  loadingState: {
    badge: string;
    title: string;
    description: string;
    currentPhase: string;
    elapsed: string;
    progressLabel: string;
  };
  stages: {
    interfaceHandshake: {
      title: string;
      detail: string;
    };
    hostDiscovery: {
      title: string;
      detail: string;
    };
    serviceProfiling: {
      title: string;
      detail: string;
    };
    graphSynthesis: {
      title: string;
      detail: string;
    };
    fallbackTitle: string;
  };
  controls: {
    twoDView: string;
    threeDView: string;
    standardTheme: string;
    cyberTheme: string;
    meshTheme: string;
    starlinkTheme: string;
    startAutoPlay: string;
    stopAutoPlay: string;
    autoPlayBadge: string;
    aiRequiredForReport: string;
    generateNetworkReport: string;
    lockNodes: string;
    unlockNodes: string;
  };
  assistant: {
    networkReport: string;
    buildingSummary: string;
    hostsSummary: string;
    troubleshoot: string;
    collectingTroubleshoot: string;
    aiSource: string;
    aiSourceAiPowered: string;
    aiSourceRuleBased: string;
    provider: string;
    aiError: string;
  };
  liveMonitor: {
    title: string;
    compactView: string;
    rawView: string;
    compact: string;
    raw: string;
    troubleshoot: string;
    working: string;
    stateIdle: string;
    stateMonitoring: string;
    stateScanning: string;
    stateConnected: string;
    stateUnavailable: string;
    eventMonitoringStarted: string;
    eventMonitoringStopped: string;
    eventScanStarted: string;
    eventScanProgress: string;
    eventScanCompleted: string;
    eventNewDevice: string;
    eventDeviceOffline: string;
    eventDeviceOnline: string;
    eventIpChanged: string;
    eventMonitoringError: string;
    eventUnknownNetwork: string;
    eventEngineUpdate: string;
    eventScanStageBoundary: string;
    eventEnginePhase: string;
    eventScanPersisted: string;
    eventScanCancelled: string;
    eventUnknownEngine: string;
    separatorNewScanStarted: string;
    separatorMonitoringStarted: string;
    separatorNewActivity: string;
    emptyUnavailable: string;
    emptyNoEvents: string;
    emptyStartScan: string;
  };
}

export interface DevicesCopy {
  header: {
    kicker: string;
    title: string;
    noData: string;
    scanning: string;
    subtitle: string;
    discovered: string;
  };
  emptyState: {
    headline: string;
    description: string;
    liveInventory: string;
    onlineOfflineStatus: string;
    riskOverview: string;
    hintTauri: string;
    hintBrowser: string;
  };
  controls: {
    searchPlaceholder: string;
    showingOf: string;
    noSearchMatch: string;
    noDevicesFound: string;
  };
  tabs: {
    all: string;
    online: string;
    warning: string;
    offline: string;
  };
  card: {
    statusOnline: string;
    statusWarning: string;
    statusOffline: string;
    unknownDevice: string;
    unknownVendor: string;
    unknownLastSeen: string;
    justNow: string;
    notAvailable: string;
    noOpenPorts: string;
    ipAddress: string;
    responseTime: string;
    openPorts: string;
    vendor: string;
    riskScore: string;
    securityGrade: string;
    lastSeen: string;
  };
  modal: {
    close: string;
    header: {
      aiDisabledHint: string;
      runAiRemediation: string;
      analyzing: string;
    };
    summary: {
      status: string;
      online: string;
      offline: string;
      riskScore: string;
    };
    network: {
      title: string;
      ipAddress: string;
      macAddress: string;
      vendor: string;
      unknownVendor: string;
      discovery: string;
      latency: string;
      ttl: string;
      osDetection: string;
    };
    persisted: {
      title: string;
      firstSeen: string;
      lastSeen: string;
      lastKnownIp: string;
      customName: string;
      notes: string;
    };
    ports: {
      openPorts: string;
    };
    security: {
      title: string;
      securityGrade: string;
      findings: string;
      noKnownFindings: string;
      aiRemediation: string;
      generatingActions: string;
      clickRunHint: string;
      aiSource: string;
      aiSourceAiPowered: string;
      aiSourceRuleBased: string;
      provider: string;
      aiError: string;
      cvss: string;
      portLabel: string;
      recommendationPrefix: string;
    };
    system: {
      title: string;
      uptime: string;
    };
  };
}

export interface VulnerabilitiesCopy {
  header: {
    kicker: string;
    title: string;
    noData: string;
    scanning: string;
    subtitle: string;
  };
  emptyState: {
    headline: string;
    description: string;
    cveInsights: string;
    portWarnings: string;
    riskFilters: string;
    hintTauri: string;
    hintBrowser: string;
  };
  summary: {
    critical: string;
    high: string;
    medium: string;
    secure: string;
  };
  listEmpty: {
    filteredTitle: string;
    defaultTitle: string;
    filteredDescription: string;
    noFindings: string;
    noScanData: string;
  };
  card: {
    unknownVendor: string;
    ip: string;
    mac: string;
    knownVulnerabilities: string;
    portSecurityWarnings: string;
    cvss: string;
    port: string;
    allClearTitle: string;
    allClearDescription: string;
    openDrillDown: string;
    moreFindings: string;
  };
}

export interface AlertsCopy {
  header: {
    kicker: string;
    title: string;
    noData: string;
    subtitle: string;
    refresh: string;
  };
  emptyState: {
    headline: string;
    description: string;
    hintTauri: string;
    hintBrowser: string;
  };
  scanningState: {
    subtitle: string;
    headline: string;
    description: string;
  };
  stats: {
    unread: string;
    critical: string;
    warnings: string;
    total: string;
  };
  toolbar: {
    critical: string;
    warnings: string;
    info: string;
    unread: string;
    markAllRead: string;
    clearAll: string;
  };
  list: {
    loading: string;
    allClearTitle: string;
    noAlertsYet: string;
    noFilterMatch: string;
    new: string;
    markAsRead: string;
  };
  footer: {
    showingOf: string;
  };
  relativeTime: {
    justNow: string;
    minutesAgo: string;
    hoursAgo: string;
    daysAgo: string;
  };
}

export interface ToolsCopy {
  header: {
    kicker: string;
    title: string;
    subtitle: string;
    desktopNotice: string;
  };
  tabs: {
    ping: string;
    portScan: string;
    macLookup: string;
    coreEngine: string;
  };
  ping: {
    configuration: string;
    targetHost: string;
    targetPlaceholder: string;
    packetCount: string;
    packet4: string;
    packet1: string;
    packet10: string;
    start: string;
    running: string;
    output: string;
    ready: string;
    processing: string;
    sent: string;
    received: string;
    lost: string;
    avg: string;
    sending: string;
    pingStats: string;
    replyFrom: string;
    requestTimedOut: string;
  };
  portScan: {
    configuration: string;
    targetIp: string;
    targetPlaceholder: string;
    startPort: string;
    endPort: string;
    invalidTargetHint: string;
    start: string;
    running: string;
    results: string;
    openCount: string;
    noOpenPorts: string;
    unknownService: string;
  };
  macLookup: {
    configuration: string;
    macAddress: string;
    placeholder: string;
    lookup: string;
    lookingUp: string;
    examples: string;
    vendorInformation: string;
    enterMac: string;
    randomizedMac: string;
    randomizedDescription: string;
    vendor: string;
    vendorNotFound: string;
  };
  coreEngine: {
    actionsTitle: string;
    interface: string;
    autoDetect: string;
    scanWithAi: string;
    scanning: string;
    checkingAi: string;
    aiInsights: string;
    generating: string;
    loadTest: string;
    iterations: string;
    concurrency: string;
    runLoadTest: string;
    running: string;
    outputTitle: string;
    resultScanWithAi: string;
    resultAiInsights: string;
    resultLoadTest: string;
    liveEngineEvents: string;
    runActionHint: string;
    exportAiJson: string;
    exporting: string;
    interfaceLabel: string;
    hosts: string;
    duration: string;
    aiSource: string;
    aiSourceAiPowered: string;
    aiSourceRuleBased: string;
    aiOverlay: string;
    available: string;
    notAvailable: string;
    aiError: string;
    healthScore: string;
    grade: string;
    issues: string;
    successfulScans: string;
    failedScans: string;
    wallTime: string;
    avgScan: string;
    scanError: string;
    insightsError: string;
    loadError: string;
    aiOverlaySummary: string;
    provider: string;
    aiLatencyTelemetryTitle: string;
    telemetryStatusLabel: string;
    telemetryStartMsLabel: string;
    telemetryEndMsLabel: string;
    telemetryDurationMsLabel: string;
    telemetryAverageMsLabel: string;
    telemetrySamplesLabel: string;
    telemetryStatusIdle: string;
    telemetryStatusRunning: string;
    telemetryStatusSuccess: string;
    telemetryStatusError: string;
    telemetryNotCaptured: string;
    warningPrefix: string;
    errorPrefix: string;
    phasePrefix: string;
    persistedPrefix: string;
    cancelledPrefix: string;
    unknownEvent: string;
    readinessChecking: string;
    readinessNotReady: string;
    readinessDisabled: string;
    readinessUnavailable: string;
    readinessReady: string;
    readinessLocalNotReachable: string;
    readinessCloudNotReachable: string;
    readinessHybridUnavailable: string;
    readinessNoProvider: string;
    readinessCheckFailed: string;
    tauriExportUnavailable: string;
    exportFailed: string;
  };
}

export interface RouterControlCopy {
  providers: {
    mock: string;
    laptopAp: string;
    mikrotik: string;
    cisco: string;
  };
  policyActions: {
    deny: string;
    allow: string;
    limitBandwidth: string;
    prioritize: string;
  };
  placeholders: {
    address: string;
    username: string;
    password: string;
    portMikrotik: string;
    portCisco: string;
    portOptional: string;
    policyTarget: string;
    policyValue: string;
    noIp: string;
  };
  errors: {
    unknown: string;
    laptopPrivilegeAction: string;
    laptopResolveIpAction: string;
    configureDesktopOnly: string;
    portRange: string;
    clientControlDesktopOnly: string;
    policyDesktopOnly: string;
    policyTargetRequired: string;
  };
  header: {
    kicker: string;
    title: string;
    subtitle: string;
    refresh: string;
    desktopNotice: string;
  };
  sections: {
    providerConfiguration: string;
    runtimeStatus: string;
    capabilityMatrix: string;
    connectedClients: string;
    policyAction: string;
  };
  labels: {
    provider: string;
    address: string;
    username: string;
    password: string;
    port: string;
    runtimeProvider: string;
    connection: string;
    capabilities: string;
    target: string;
    action: string;
    valueOptional: string;
  };
  buttons: {
    applyProvider: string;
    applyingProvider: string;
    block: string;
    unblock: string;
    applyPolicy: string;
    applyingPolicy: string;
  };
  states: {
    unknown: string;
    connected: string;
    notConnected: string;
    enabledCount: string;
    noClients: string;
    providerSwitched: string;
    providerConfigured: string;
    desktopRequiredForPolicy: string;
    providerNoPolicySupport: string;
  };
  capabilities: {
    listClients: string;
    blockClient: string;
    unblockClient: string;
    applyPolicy: string;
    trafficStats: string;
    qos: string;
    vlan: string;
    dhcpLeases: string;
  };
}

export interface AppCopy {
  common: CommonCopy;
  header: HeaderCopy;
  sidebar: SidebarCopy;
  dashboard: DashboardCopy;
  reports: ReportsCopy;
  settings: SettingsCopy;
  topology: TopologyCopy;
  devices: DevicesCopy;
  vulnerabilities: VulnerabilitiesCopy;
  alerts: AlertsCopy;
  tools: ToolsCopy;
  routerControl: RouterControlCopy;
}
