import { CoreEngineActionsCard, CoreEngineResultsColumn, useCoreEngineTools } from './core-engine';

export default function CoreEngineToolPanel() {
  const {
    interfaces,
    selectedInterface,
    setSelectedInterface,
    scanLoading,
    scanError,
    scanResult,
    insightsLoading,
    insightsError,
    insightsResult,
    loadIterations,
    setLoadIterations,
    loadConcurrency,
    setLoadConcurrency,
    loadLoading,
    loadError,
    loadResult,
    engineEvents,
    exportingAiJson,
    aiReadinessLoading,
    aiReady,
    aiReadinessMessage,
    aiActionTelemetry,
    aiOverlaySummary,
    aiProviderLabel,
    handleScanWithAi,
    handleAiInsights,
    handleLoadTest,
    handleExportAiScanJson,
  } = useCoreEngineTools();

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <CoreEngineActionsCard
        interfaces={interfaces}
        selectedInterface={selectedInterface}
        onSelectedInterfaceChange={setSelectedInterface}
        scanLoading={scanLoading}
        insightsLoading={insightsLoading}
        loadIterations={loadIterations}
        onLoadIterationsChange={setLoadIterations}
        loadConcurrency={loadConcurrency}
        onLoadConcurrencyChange={setLoadConcurrency}
        loadLoading={loadLoading}
        aiReadinessLoading={aiReadinessLoading}
        aiReady={aiReady}
        aiReadinessMessage={aiReadinessMessage}
        onScanWithAi={() => {
          void handleScanWithAi();
        }}
        onAiInsights={() => {
          void handleAiInsights();
        }}
        onLoadTest={() => {
          void handleLoadTest();
        }}
      />

      <CoreEngineResultsColumn
        scanResult={scanResult}
        insightsResult={insightsResult}
        loadResult={loadResult}
        engineEvents={engineEvents}
        scanError={scanError}
        insightsError={insightsError}
        loadError={loadError}
        exportingAiJson={exportingAiJson}
        aiActionTelemetry={aiActionTelemetry}
        aiOverlaySummary={aiOverlaySummary}
        aiProviderLabel={aiProviderLabel}
        onExportAiScanJson={() => {
          void handleExportAiScanJson();
        }}
      />
    </div>
  );
}
