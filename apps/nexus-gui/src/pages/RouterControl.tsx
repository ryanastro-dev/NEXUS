import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  ListChecks,
  RefreshCw,
  Shield,
  Wifi,
} from 'lucide-react';
import { tauriClient } from '../lib/api/tauri-client';
import type {
  RouterCapabilities,
  RouterClient,
  RouterPolicyAction,
  RouterProviderKind,
  RouterStatus,
} from '../lib/api/types';
import { PANEL_CARD } from '../lib/ui-classes';
import { isTauri } from '../lib/runtime/is-tauri';
import { useLanguage } from '../hooks/useLanguage';
import DesktopModeNotice from '../components/common/DesktopModeNotice';
import { toast } from '../components/common/Toast';
import Select from '../components/common/Select';

const CARD = PANEL_CARD;

const PROVIDER_DEFAULT_PORT: Record<RouterProviderKind, string> = {
  mock: '',
  laptop_ap: '',
  mikrotik: '8728',
  cisco: '22',
};

function defaultPortForProvider(provider: RouterProviderKind): string {
  return PROVIDER_DEFAULT_PORT[provider];
}

function normalizeError(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return fallback;
}

function enrichRouterError(
  message: string,
  provider: RouterProviderKind,
  copy: {
    laptopPrivilegeAction: string;
    laptopResolveIpAction: string;
  },
): string {
  const normalized = message.trim();
  const lower = normalized.toLowerCase();

  if (provider !== 'laptop_ap') {
    return normalized;
  }

  const privilegeTokens = [
    'permission denied',
    'operation not permitted',
    'access is denied',
    'requires elevation',
    'administrator/root privileges',
  ];
  const isPrivilegeError = privilegeTokens.some((token) => lower.includes(token));
  if (isPrivilegeError) {
    return `${normalized} ${copy.laptopPrivilegeAction}`;
  }

  if (lower.includes('unable to resolve ip for mac') || lower.includes('arp table')) {
    return `${normalized} ${copy.laptopResolveIpAction}`;
  }

  return normalized;
}

export default function RouterControl() {
  const { copy } = useLanguage();
  const routerCopy = copy.routerControl;
  const tauriAvailable = isTauri();
  const [provider, setProvider] = useState<RouterProviderKind>('mock');
  const [address, setAddress] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [port, setPort] = useState('');

  const [status, setStatus] = useState<RouterStatus | null>(null);
  const [capabilities, setCapabilities] = useState<RouterCapabilities | null>(null);
  const [clients, setClients] = useState<RouterClient[]>([]);

  const [policyTarget, setPolicyTarget] = useState('');
  const [policyAction, setPolicyAction] = useState<RouterPolicyAction>('deny');
  const [policyValue, setPolicyValue] = useState('');

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [isApplyingPolicy, setIsApplyingPolicy] = useState(false);
  const [pendingMacs, setPendingMacs] = useState<Record<string, boolean>>({});

  const [error, setError] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  const providerOptions: Array<{ value: RouterProviderKind; label: string }> = useMemo(
    () => [
      { value: 'mock', label: routerCopy.providers.mock },
      { value: 'laptop_ap', label: routerCopy.providers.laptopAp },
      { value: 'mikrotik', label: routerCopy.providers.mikrotik },
      { value: 'cisco', label: routerCopy.providers.cisco },
    ],
    [routerCopy.providers],
  );

  const policyActionOptions: Array<{ value: RouterPolicyAction; label: string }> = useMemo(
    () => [
      { value: 'deny', label: routerCopy.policyActions.deny },
      { value: 'allow', label: routerCopy.policyActions.allow },
      { value: 'limit_bandwidth', label: routerCopy.policyActions.limitBandwidth },
      { value: 'prioritize', label: routerCopy.policyActions.prioritize },
    ],
    [routerCopy.policyActions],
  );

  const loadRouterSnapshot = useCallback(async () => {
    if (!tauriAvailable) {
      setStatus(null);
      setCapabilities(null);
      setClients([]);
      setError(null);
      setClientError(null);
      return;
    }

    setIsRefreshing(true);
    setError(null);
    setClientError(null);

    try {
      const [statusResult, capabilitiesResult] = await Promise.all([
        tauriClient.getRouterStatus(),
        tauriClient.getRouterCapabilities(),
      ]);

      setStatus(statusResult);
      setCapabilities(capabilitiesResult);
      setProvider(statusResult.provider);
      setAddress(statusResult.address ?? '');
      setPort((current) =>
        current.trim().length > 0 ? current : defaultPortForProvider(statusResult.provider)
      );

      try {
        const clientResult = await tauriClient.listRouterClients();
        setClients(clientResult);
      } catch (listError) {
        setClients([]);
        setClientError(normalizeError(listError, routerCopy.errors.unknown));
      }
    } catch (snapshotError) {
      setError(normalizeError(snapshotError, routerCopy.errors.unknown));
    } finally {
      setIsRefreshing(false);
    }
  }, [tauriAvailable, routerCopy.errors.unknown]);

  useEffect(() => {
    void loadRouterSnapshot();
  }, [loadRouterSnapshot]);

  const capabilityList = useMemo(() => {
    if (!capabilities) {
      return [];
    }
    return [
      { label: routerCopy.capabilities.listClients, enabled: capabilities.list_clients },
      { label: routerCopy.capabilities.blockClient, enabled: capabilities.block_client },
      { label: routerCopy.capabilities.unblockClient, enabled: capabilities.unblock_client },
      { label: routerCopy.capabilities.applyPolicy, enabled: capabilities.apply_policy },
      { label: routerCopy.capabilities.trafficStats, enabled: capabilities.traffic_stats },
      { label: routerCopy.capabilities.qos, enabled: capabilities.qos },
      { label: routerCopy.capabilities.vlan, enabled: capabilities.vlan },
      { label: routerCopy.capabilities.dhcpLeases, enabled: capabilities.dhcp_leases },
    ];
  }, [capabilities, routerCopy.capabilities]);

  const enabledCapabilityCount = capabilityList.filter((item) => item.enabled).length;
  const canBlock = capabilities?.block_client === true;
  const canUnblock = capabilities?.unblock_client === true;
  const canApplyPolicy = capabilities?.apply_policy === true;
  const portPlaceholder =
    provider === 'mikrotik'
      ? routerCopy.placeholders.portMikrotik
      : provider === 'cisco'
        ? routerCopy.placeholders.portCisco
        : routerCopy.placeholders.portOptional;
  const fieldClass =
    'mt-1 w-full rounded-lg border border-theme bg-bg-tertiary px-2.5 py-2 text-sm text-text-primary outline-none ring-accent-blue/30 focus:ring-2';
  const statusTileClass = 'rounded-lg border border-theme bg-bg-tertiary/40 p-2.5';

  const handleProviderChange = (nextProvider: RouterProviderKind) => {
    setProvider(nextProvider);
    setPort(defaultPortForProvider(nextProvider));
  };

  const handleConfigure = async () => {
    if (!tauriAvailable) {
      setError(routerCopy.errors.configureDesktopOnly);
      return;
    }

    setError(null);
    setLastMessage(null);
    setIsConfiguring(true);

    const parsedPort = port.trim().length > 0 ? Number.parseInt(port.trim(), 10) : null;
    if (parsedPort !== null && (!Number.isFinite(parsedPort) || parsedPort <= 0 || parsedPort > 65535)) {
      setIsConfiguring(false);
      setError(routerCopy.errors.portRange);
      return;
    }

    try {
      const configured = await tauriClient.configureRouter({
        provider,
        address: address.trim() || null,
        username: username.trim() || null,
        password: password.trim() || null,
        port: parsedPort,
      });

      setStatus(configured);
      setLastMessage(routerCopy.states.providerSwitched.replace('{provider}', configured.provider));
      toast.success(routerCopy.states.providerConfigured.replace('{provider}', configured.provider));
      await loadRouterSnapshot();
    } catch (configureError) {
      const message = enrichRouterError(
        normalizeError(configureError, routerCopy.errors.unknown),
        provider,
        {
          laptopPrivilegeAction: routerCopy.errors.laptopPrivilegeAction,
          laptopResolveIpAction: routerCopy.errors.laptopResolveIpAction,
        },
      );
      setError(message);
      toast.error(message);
    } finally {
      setIsConfiguring(false);
    }
  };

  const handleToggleBlock = async (client: RouterClient) => {
    if (!tauriAvailable) {
      setError(routerCopy.errors.clientControlDesktopOnly);
      return;
    }

    if ((client.blocked && !canUnblock) || (!client.blocked && !canBlock)) {
      return;
    }

    setPendingMacs((prev) => ({ ...prev, [client.mac]: true }));
    try {
      const result = client.blocked
        ? await tauriClient.unblockRouterClient(client.mac)
        : await tauriClient.blockRouterClient(client.mac);
      setLastMessage(result.message);
      toast.success(result.message);
      await loadRouterSnapshot();
    } catch (toggleError) {
      const message = enrichRouterError(
        normalizeError(toggleError, routerCopy.errors.unknown),
        provider,
        {
          laptopPrivilegeAction: routerCopy.errors.laptopPrivilegeAction,
          laptopResolveIpAction: routerCopy.errors.laptopResolveIpAction,
        },
      );
      setError(message);
      toast.error(message);
    } finally {
      setPendingMacs((prev) => ({ ...prev, [client.mac]: false }));
    }
  };

  const handleApplyPolicy = async () => {
    if (!tauriAvailable) {
      setError(routerCopy.errors.policyDesktopOnly);
      return;
    }

    const target = policyTarget.trim();
    if (!target) {
      setError(routerCopy.errors.policyTargetRequired);
      return;
    }

    setIsApplyingPolicy(true);
    setError(null);
    setLastMessage(null);
    try {
      const result = await tauriClient.applyRouterPolicy({
        target,
        action: policyAction,
        value: policyValue.trim() || null,
      });
      setLastMessage(result.message);
      toast.success(result.message);
    } catch (applyError) {
      const message = enrichRouterError(
        normalizeError(applyError, routerCopy.errors.unknown),
        provider,
        {
          laptopPrivilegeAction: routerCopy.errors.laptopPrivilegeAction,
          laptopResolveIpAction: routerCopy.errors.laptopResolveIpAction,
        },
      );
      setError(message);
      toast.error(message);
    } finally {
      setIsApplyingPolicy(false);
    }
  };

  return (
    <div className="relative h-full overflow-hidden bg-bg-primary p-3 sm:p-4 lg:p-5">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-14 -left-12 h-80 w-80 rounded-full bg-cyan-300/15 blur-3xl dark:bg-cyan-500/10" />
        <div className="absolute top-24 right-2 h-96 w-96 rounded-full bg-blue-300/10 blur-3xl dark:bg-blue-500/10" />
      </div>

      <div className="relative z-10 flex h-full min-h-0 flex-col gap-3 overflow-y-auto pr-1">
        <motion.section
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${CARD} shrink-0 p-4`}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">
                {routerCopy.header.kicker}
              </p>
              <h1 className="text-2xl font-black text-text-primary sm:text-3xl">
                {routerCopy.header.title}
              </h1>
              <p className="max-w-3xl text-sm text-text-secondary">
                {routerCopy.header.subtitle}
              </p>
            </div>
            <button
              onClick={() => void loadRouterSnapshot()}
              disabled={!tauriAvailable || isRefreshing}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-theme bg-bg-secondary px-3 text-sm font-semibold text-text-primary transition-colors hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {routerCopy.header.refresh}
            </button>
          </div>
        </motion.section>

        {!tauriAvailable ? (
          <DesktopModeNotice message={routerCopy.header.desktopNotice} />
        ) : null}

        {(error || lastMessage) && (
          <section className={`${CARD} shrink-0 p-3`}>
            {error ? (
              <div className="flex items-start gap-2 rounded-lg border border-rose-300/60 bg-rose-100/70 p-2.5 text-sm text-rose-700 dark:border-rose-500/35 dark:bg-rose-500/10 dark:text-rose-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : null}
            {lastMessage ? (
              <div className="mt-2 flex items-start gap-2 rounded-lg border border-emerald-300/60 bg-emerald-100/70 p-2.5 text-sm text-emerald-700 dark:border-emerald-500/35 dark:bg-emerald-500/10 dark:text-emerald-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{lastMessage}</span>
              </div>
            ) : null}
          </section>
        )}

        <section className="grid grid-cols-1 gap-3 lg:grid-cols-5">
          <article className={`${CARD} p-3 lg:col-span-3`}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-text-secondary">
              {routerCopy.sections.providerConfiguration}
            </h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="text-xs font-medium text-text-secondary">
                {routerCopy.labels.provider}
                <Select
                  className="mt-1"
                  size="sm"
                  fullWidth
                  searchable={false}
                  options={providerOptions}
                  value={provider}
                  onChange={(value) => handleProviderChange(value as RouterProviderKind)}
                />
              </label>

              <label className="text-xs font-medium text-text-secondary">
                {routerCopy.labels.address}
                <input
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder={routerCopy.placeholders.address}
                  className={fieldClass}
                />
              </label>

              <label className="text-xs font-medium text-text-secondary">
                {routerCopy.labels.username}
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder={routerCopy.placeholders.username}
                  className={fieldClass}
                />
              </label>

              <label className="text-xs font-medium text-text-secondary">
                {routerCopy.labels.password}
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={routerCopy.placeholders.password}
                  type="password"
                  className={fieldClass}
                />
              </label>

              <label className="text-xs font-medium text-text-secondary sm:col-span-2">
                {routerCopy.labels.port}
                <input
                  value={port}
                  onChange={(event) => setPort(event.target.value)}
                  placeholder={portPlaceholder}
                  className={fieldClass}
                />
              </label>
            </div>
            <div className="mt-3">
              <button
                onClick={() => void handleConfigure()}
                disabled={!tauriAvailable || isConfiguring}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-accent-blue to-accent-sapphire px-4 text-sm font-semibold text-white shadow-lg shadow-accent-blue/30 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isConfiguring ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                {isConfiguring ? routerCopy.buttons.applyingProvider : routerCopy.buttons.applyProvider}
              </button>
            </div>
          </article>

          <article className={`${CARD} p-3 lg:col-span-2`}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-text-secondary">
              {routerCopy.sections.runtimeStatus}
            </h2>
            <div className="space-y-2">
              <div className={statusTileClass}>
                <p className="text-[11px] uppercase tracking-[0.12em] text-text-muted">
                  {routerCopy.labels.runtimeProvider}
                </p>
                <p className="mt-1 text-sm font-semibold text-text-primary">
                  {status?.provider ?? routerCopy.states.unknown}
                </p>
              </div>
              <div className={statusTileClass}>
                <p className="text-[11px] uppercase tracking-[0.12em] text-text-muted">
                  {routerCopy.labels.connection}
                </p>
                <p className="mt-1 text-sm font-semibold text-text-primary">
                  {status?.connected ? routerCopy.states.connected : routerCopy.states.notConnected}
                </p>
              </div>
              <div className={statusTileClass}>
                <p className="text-[11px] uppercase tracking-[0.12em] text-text-muted">
                  {routerCopy.labels.capabilities}
                </p>
                <p className="mt-1 text-sm font-semibold text-text-primary">
                  {capabilities
                    ? routerCopy.states.enabledCount
                        .replace('{enabled}', String(enabledCapabilityCount))
                        .replace('{total}', String(capabilityList.length))
                    : routerCopy.states.unknown}
                </p>
              </div>
            </div>
          </article>
        </section>

        <section className={`${CARD} p-3`}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-text-secondary">
            {routerCopy.sections.capabilityMatrix}
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {capabilityList.map((capability) => (
              <div
                key={capability.label}
                className={`rounded-lg border p-2 text-xs font-medium ${
                  capability.enabled
                    ? 'border-emerald-300/60 bg-emerald-100/70 text-emerald-700 dark:border-emerald-500/35 dark:bg-emerald-500/10 dark:text-emerald-300'
                    : 'border-theme bg-bg-tertiary/50 text-text-muted'
                }`}
              >
                {capability.label}
              </div>
            ))}
          </div>
          {status?.note ? (
            <p className="mt-3 text-xs text-text-muted">{status.note}</p>
          ) : null}
        </section>

        <section className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <article className={`${CARD} p-3 xl:col-span-2`}>
            <div className="mb-3 flex items-center gap-2">
              <Wifi className="h-4 w-4 text-accent-blue" />
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-text-secondary">
                {routerCopy.sections.connectedClients}
              </h2>
            </div>
            {clientError ? (
              <div className="rounded-lg border border-amber-300/60 bg-amber-100/70 p-2.5 text-sm text-amber-700 dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-300">
                {clientError}
              </div>
            ) : null}

            <div className="space-y-2">
              {clients.length === 0 ? (
                <div className="rounded-lg border border-theme bg-bg-secondary p-3 text-sm text-text-muted">
                  {routerCopy.states.noClients}
                </div>
              ) : (
                clients.map((client) => {
                  const isPending = pendingMacs[client.mac] === true;
                  const canToggle =
                    (client.blocked && canUnblock) || (!client.blocked && canBlock);
                  return (
                    <div
                      key={client.mac}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-theme bg-bg-secondary p-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-text-primary">
                          {client.hostname || client.mac}
                        </p>
                        <p className="truncate text-xs text-text-muted">
                          {client.ip || routerCopy.placeholders.noIp} · {client.mac}
                        </p>
                      </div>
                      <button
                        onClick={() => void handleToggleBlock(client)}
                        disabled={!tauriAvailable || !canToggle || isPending}
                        className={`inline-flex h-8 items-center gap-1 rounded-lg px-3 text-xs font-semibold transition-colors ${
                          client.blocked
                            ? 'bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 dark:text-emerald-300'
                            : 'bg-rose-500/15 text-rose-700 hover:bg-rose-500/25 dark:text-rose-300'
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        {isPending ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : client.blocked ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <Ban className="h-3.5 w-3.5" />
                        )}
                        {client.blocked ? routerCopy.buttons.unblock : routerCopy.buttons.block}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </article>

          <article className={`${CARD} p-3`}>
            <div className="mb-3 flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-accent-blue" />
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-text-secondary">
                {routerCopy.sections.policyAction}
              </h2>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-medium text-text-secondary">
                {routerCopy.labels.target}
                <input
                  value={policyTarget}
                  onChange={(event) => setPolicyTarget(event.target.value)}
                  placeholder={routerCopy.placeholders.policyTarget}
                  className={fieldClass}
                />
              </label>

              <label className="block text-xs font-medium text-text-secondary">
                {routerCopy.labels.action}
                <Select
                  className="mt-1"
                  size="sm"
                  fullWidth
                  searchable={false}
                  options={policyActionOptions}
                  value={policyAction}
                  onChange={(value) => setPolicyAction(value as RouterPolicyAction)}
                />
              </label>

              <label className="block text-xs font-medium text-text-secondary">
                {routerCopy.labels.valueOptional}
                <input
                  value={policyValue}
                  onChange={(event) => setPolicyValue(event.target.value)}
                  placeholder={routerCopy.placeholders.policyValue}
                  className={fieldClass}
                />
              </label>
            </div>

            <button
              onClick={() => void handleApplyPolicy()}
              disabled={!tauriAvailable || !canApplyPolicy || isApplyingPolicy}
              className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-accent-blue to-accent-sapphire px-3 text-sm font-semibold text-white shadow-lg shadow-accent-blue/30 transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isApplyingPolicy ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Shield className="h-4 w-4" />
              )}
              {isApplyingPolicy ? routerCopy.buttons.applyingPolicy : routerCopy.buttons.applyPolicy}
            </button>

            {!tauriAvailable ? (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-300">
                {routerCopy.states.desktopRequiredForPolicy}
              </p>
            ) : !canApplyPolicy ? (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-300">
                {routerCopy.states.providerNoPolicySupport}
              </p>
            ) : null}
          </article>
        </section>
      </div>
    </div>
  );
}
