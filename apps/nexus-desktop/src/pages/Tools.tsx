import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, Cpu, Hash, Network } from "lucide-react";

import CoreEngineToolPanel from "../components/tools/CoreEngineToolPanel";
import MacLookupToolPanel from "../components/tools/MacLookupToolPanel";
import PingToolPanel from "../components/tools/PingToolPanel";
import PortScanToolPanel from "../components/tools/PortScanToolPanel";

type Tab = "ping" | "portscan" | "maclookup" | "engine";

const CARD =
  "rounded-2xl border border-slate-200/70 bg-white/85 backdrop-blur-sm shadow-sm dark:border-slate-800 dark:bg-slate-950/65";

export default function Tools() {
  const [activeTab, setActiveTab] = useState<Tab>("ping");

  return (
    <div className="relative flex-1 overflow-y-auto bg-bg-primary p-4 sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-16 -left-16 h-80 w-80 rounded-full bg-cyan-300/15 blur-3xl dark:bg-cyan-500/10" />
        <div className="absolute top-20 right-0 h-96 w-96 rounded-full bg-teal-300/10 blur-3xl dark:bg-teal-500/10" />
      </div>

      <div className="relative z-10 space-y-6">
        <motion.section
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${CARD} p-5 sm:p-6`}
        >
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-300">
              Operator Toolkit
            </p>
            <h1 className="text-2xl font-black text-text-primary sm:text-4xl">Network Tools</h1>
            <p className="max-w-2xl text-sm text-text-secondary sm:text-base">
              Run active diagnostics for reachability, open ports, and vendor fingerprinting.
            </p>
          </div>
        </motion.section>

        <div className={`${CARD} flex flex-wrap items-center gap-2 p-3`}>
          <button
            onClick={() => setActiveTab("ping")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeTab === "ping"
                ? "bg-accent-blue text-white shadow-lg shadow-accent-blue/30"
                : "bg-bg-secondary text-text-secondary hover:bg-bg-hover hover:text-text-primary"
            }`}
          >
            <Activity className="h-4 w-4" />
            Ping Tool
          </button>

          <button
            onClick={() => setActiveTab("portscan")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeTab === "portscan"
                ? "bg-accent-blue text-white shadow-lg shadow-accent-blue/30"
                : "bg-bg-secondary text-text-secondary hover:bg-bg-hover hover:text-text-primary"
            }`}
          >
            <Hash className="h-4 w-4" />
            Port Scanner
          </button>

          <button
            onClick={() => setActiveTab("maclookup")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeTab === "maclookup"
                ? "bg-accent-blue text-white shadow-lg shadow-accent-blue/30"
                : "bg-bg-secondary text-text-secondary hover:bg-bg-hover hover:text-text-primary"
            }`}
          >
            <Network className="h-4 w-4" />
            MAC Lookup
          </button>

          <button
            onClick={() => setActiveTab("engine")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              activeTab === "engine"
                ? "bg-accent-blue text-white shadow-lg shadow-accent-blue/30"
                : "bg-bg-secondary text-text-secondary hover:bg-bg-hover hover:text-text-primary"
            }`}
          >
            <Cpu className="h-4 w-4" />
            Core Engine
          </button>
        </div>

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
  );
}
