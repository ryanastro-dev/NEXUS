import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, Cpu, Hash, Network } from "lucide-react";

import CoreEngineToolPanel from "../components/tools/CoreEngineToolPanel";
import DesktopModeNotice from "../components/common/DesktopModeNotice";
import MacLookupToolPanel from "../components/tools/MacLookupToolPanel";
import PingToolPanel from "../components/tools/PingToolPanel";
import PortScanToolPanel from "../components/tools/PortScanToolPanel";
import { useLanguage } from "../hooks/useLanguage";
import { PANEL_CARD } from "../lib/ui-classes";
import { isTauri } from "../lib/runtime/is-tauri";

type Tab = "ping" | "portscan" | "maclookup" | "engine";
type TabConfig = { id: Tab; label: string; icon: typeof Activity };

const CARD = PANEL_CARD;

export default function Tools() {
  const { copy } = useLanguage();
  const toolsCopy = copy.tools;
  const tauriAvailable = isTauri();
  const [activeTab, setActiveTab] = useState<Tab>("ping");
  const tabs: TabConfig[] = [
    { id: "ping", label: toolsCopy.tabs.ping, icon: Activity },
    { id: "portscan", label: toolsCopy.tabs.portScan, icon: Hash },
    { id: "maclookup", label: toolsCopy.tabs.macLookup, icon: Network },
    { id: "engine", label: toolsCopy.tabs.coreEngine, icon: Cpu },
  ];

  return (
    <div className="relative h-full overflow-hidden bg-bg-primary p-3 sm:p-4 lg:p-5">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-16 -left-16 h-80 w-80 rounded-full bg-cyan-300/15 blur-3xl dark:bg-cyan-500/10" />
        <div className="absolute top-20 right-0 h-96 w-96 rounded-full bg-teal-300/10 blur-3xl dark:bg-teal-500/10" />
      </div>

      <div className="relative z-10 flex h-full min-h-0 flex-col gap-3">
        <motion.section
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${CARD} shrink-0 p-3.5 sm:p-4`}
        >
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">
              {toolsCopy.header.kicker}
            </p>
            <h1 className="text-2xl font-black text-text-primary sm:text-3xl">
              {toolsCopy.header.title}
            </h1>
            <p className="max-w-2xl text-sm text-text-secondary">
              {toolsCopy.header.subtitle}
            </p>
          </div>
        </motion.section>

        {!tauriAvailable ? (
          <DesktopModeNotice message={toolsCopy.header.desktopNotice} />
        ) : null}

        <div className={`${CARD} shrink-0 p-2`}>
          <div className="flex flex-wrap items-center gap-1.5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <div key={tab.id} className="relative flex">
                  {active && (
                    <motion.div
                      layoutId="toolsTabs"
                      className="absolute inset-0 rounded-lg bg-gradient-to-r from-accent-blue to-accent-sapphire shadow-lg shadow-accent-blue/30"
                      initial={false}
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <button
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative z-10 flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors ${
                      active
                        ? "text-white"
                        : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === "ping" && <PingToolPanel />}
              {activeTab === "portscan" && <PortScanToolPanel />}
              {activeTab === "maclookup" && <MacLookupToolPanel />}
              {activeTab === "engine" && <CoreEngineToolPanel />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
