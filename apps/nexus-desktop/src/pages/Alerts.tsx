import {
  AlertsHeader,
  AlertsList,
  AlertsStatsGrid,
  AlertsToolbar,
  useAlertsData,
} from './alerts-page';

export default function Alerts() {
  const {
    alerts,
    loading,
    filter,
    stats,
    filteredAlerts,
    setFilter,
    loadAlerts,
    markAsRead,
    markAllAsRead,
    clearAll,
  } = useAlertsData();

  return (
    <div className="relative flex-1 overflow-y-auto bg-bg-primary p-4 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-16 -left-16 h-80 w-80 rounded-full bg-cyan-300/15 blur-3xl dark:bg-cyan-500/10" />
        <div className="absolute top-20 right-0 h-96 w-96 rounded-full bg-amber-300/10 blur-3xl dark:bg-amber-500/10" />
      </div>

      <div className="relative z-10 space-y-6">
        <AlertsHeader
          loading={loading}
          onRefresh={() => {
            void loadAlerts();
          }}
        />

        <AlertsStatsGrid stats={stats} />

        <AlertsToolbar
          filter={filter}
          stats={stats}
          hasAlerts={alerts.length > 0}
          onFilterChange={setFilter}
          onMarkAllAsRead={() => {
            void markAllAsRead();
          }}
          onClearAll={() => {
            void clearAll();
          }}
        />

        <div className="space-y-3">
          <AlertsList
            loading={loading}
            alerts={alerts}
            filteredAlerts={filteredAlerts}
            onMarkAsRead={(alertId) => {
              void markAsRead(alertId);
            }}
          />
        </div>

        {!loading && filteredAlerts.length > 0 && (
          <div className="text-center text-sm text-text-muted">
            Showing {filteredAlerts.length} of {alerts.length} unread alerts
          </div>
        )}
      </div>
    </div>
  );
}
