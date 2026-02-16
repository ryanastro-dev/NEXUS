<div align="center">

# 🌐 NEXUS — Smart Network Topology Mapper & Health Monitor

**NetMapper Pro `v0.3.1`**

A production-grade, cross-platform desktop application for real-time local network discovery, interactive topology visualization, continuous health monitoring, and security-focused analysis.

Built with **Rust** · **Tauri v2** · **React 19** · **TypeScript** · **SQLite**

[![Build](https://img.shields.io/badge/build-passing-brightgreen)](#verification-commands)
[![Version](https://img.shields.io/badge/version-0.3.1-blue)](#changelog)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey)](#requirements)

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
  - [Network Discovery & Scanning](#1--network-discovery--scanning)
  - [Real-Time Monitoring & Alerts](#2--real-time-monitoring--alerts)
  - [Interactive Topology Visualization](#3--interactive-topology-visualization)
  - [Security Analysis & Vulnerability Assessment](#4--security-analysis--vulnerability-assessment)
  - [Network Health Scoring & Insights](#5--network-health-scoring--insights)
  - [Data Export & Reporting](#6--data-export--reporting)
  - [Built-in Network Tools](#7--built-in-network-tools)
  - [Database & Data Security](#8--database--data-security)
  - [Modern Desktop UI](#9--modern-desktop-ui)
  - [Demo Mode](#10--demo-mode)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Layout](#project-layout)
- [Requirements](#requirements)
- [Quick Start](#quick-start)
- [Build](#build)
- [Verification Commands](#verification-commands)
- [Runtime Logs](#runtime-logs)
- [Troubleshooting](#troubleshooting)
- [CI/CD](#cicd)
- [Changelog](#changelog)
- [Project Upgrade Roadmap](#-project-upgrade-roadmap)
- [License](#license)
- [🇲🇲 မြန်မာဘာသာ (Myanmar Language)](#-မြနမဘသ-myanmar-language)
  - [ပရောဂျက်အကြောင်း အကျဉ်းချုပ်](#-ပရောဂျကအကြောငး-အကျဉးချုပ)
  - [အဓိက Feature များ](#-အဓိက-feature-များ)
  - [Tech Stack (နည်းပညာ Stack)](#️-tech-stack-နညးပညာ-stack)
  - [System Requirements (စနစ်လိုအပ်ချက်များ)](#-system-requirements-စနစလိုအပချကများ)
  - [Quick Start (စတင်နည်း)](#-quick-start-စတငနည)
  - [Build (Production Build)](#️-build-production-build)

---

## Overview

**NEXUS (NetMapper Pro)** is a high-performance desktop application that combines multi-protocol network scanning, interactive topology mapping, continuous background monitoring, and security analysis into a single unified tool. It is designed for network administrators, cybersecurity analysts, and IT professionals who need real-time visibility into their local network.

The application performs Layer-2 (ARP) and Layer-3 (ICMP) host discovery, probes TCP services, resolves DNS hostnames, identifies device vendors via MAC OUI lookup, fingerprints operating systems via TTL analysis, and enriches data via SNMP and mDNS passive discovery — all within seconds. Scan results are persisted in an encrypted SQLite database, visualized on an interactive topology graph, and continuously monitored for changes.

---

## Key Features

### 1. 🔍 Network Discovery & Scanning

| Capability                  | Description                                                                                                                                                     |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Active ARP Scanning**     | Layer-2 host discovery using raw ARP packets via `pnet`. Detects all devices on the local subnet even if ICMP is blocked.                                       |
| **ICMP Ping Probing**       | Measures round-trip latency (RTT) and captures TTL values for OS fingerprinting. Runs in parallel with ARP for speed.                                           |
| **TCP Port Probing**        | Scans 20+ common service ports (HTTP, HTTPS, SSH, Telnet, FTP, RDP, SMB, DNS, MQTT, etc.) to detect running services.                                           |
| **DNS Hostname Resolution** | Reverse DNS lookup for all discovered hosts to resolve human-readable hostnames.                                                                                |
| **MAC Vendor Lookup**       | Identifies device manufacturers using the IEEE OUI database (`mac_oui` crate). Detects randomized/locally-administered MAC addresses.                           |
| **OS Fingerprinting**       | Guesses the operating system (Windows, Linux/macOS, Network Device) based on ICMP TTL values.                                                                   |
| **Device Type Inference**   | Automatically classifies devices as Router, Switch, Server, PC, Mobile, IoT, Printer, or Unknown based on vendor, hostname, open ports, and gateway heuristics. |
| **SNMP Enrichment**         | Optional SNMPv2c polling for system description, hostname, uptime, and LLDP/CDP neighbor discovery for topology mapping.                                        |
| **Passive mDNS Discovery**  | Listens for Multicast DNS (Bonjour/Avahi) service announcements to discover devices without active probing.                                                     |
| **Passive ARP Monitoring**  | Captures ARP traffic passively to detect new devices joining the network in real time.                                                                          |
| **Risk Score Calculation**  | Computes a 0–100 risk score per device based on device type, open ports, and MAC randomization status.                                                          |

### 2. 📡 Real-Time Monitoring & Alerts

| Capability                  | Description                                                                                                                                   |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Background Monitor Loop** | Configurable interval-based scanning (default: every 60 seconds) that runs in the background via an async Tokio task.                         |
| **Device Lifecycle Events** | Detects and emits events for: **New Device**, **Device Offline**, **Device Back Online**, **IP Address Changed**, and **Open Port Detected**. |
| **Live Event Emission**     | Pushes monitor events to the frontend in real time via Tauri's event system (`monitor-event` channel).                                        |
| **Alert Persistence**       | All alerts are saved to the SQLite database with timestamps, severity levels, and device associations.                                        |
| **Alert Deduplication**     | Smart dedupe logic prevents repeated alerts for the same event within a configurable time window using composite dedupe keys.                 |
| **Unread/Read Workflow**    | Alerts have read/unread status. Users can mark individual alerts as read, mark all as read, or clear all alerts.                              |
| **Idempotent Start**        | Starting the monitor when it's already running is a no-op, preventing duplicate monitoring loops.                                             |
| **Auto-Start Integration**  | Monitor can be configured to auto-start on application launch via the Settings page.                                                          |

### 3. 🗺️ Interactive Topology Visualization

| Capability             | Description                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| **Graph-Based Layout** | Uses `@xyflow/react` (React Flow) with `dagre` auto-layout for hierarchical network topology graphs. |
| **Device Nodes**       | Each device is rendered as an interactive node showing IP, MAC, device type icon, and status.        |
| **Connection Edges**   | Connections between devices are drawn based on subnet relationships and SNMP/LLDP neighbor data.     |
| **Zoom & Pan**         | Full zoom, pan, and fit-to-view controls for navigating large network topologies.                    |
| **Theme-Aware**        | Topology colors and styles adapt to the current light/dark theme.                                    |
| **Layout Algorithms**  | Multiple layout strategies with configurable node spacing and ranking.                               |

### 4. 🛡️ Security Analysis & Vulnerability Assessment

| Capability                   | Description                                                                                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Security Grading (A–F)**   | Each device receives a letter grade based on a penalty-point system that considers vulnerabilities, port warnings, risk score, and MAC randomization.                     |
| **CVE Database**             | Embedded CVE vulnerability cache seeded with known vulnerabilities for common vendors (Cisco, Netgear, TP-Link, D-Link, etc.). Matched against discovered device vendors. |
| **Port Security Warnings**   | Detects insecure open ports (Telnet/23, FTP/21, RDP/3389, etc.) and generates actionable warnings with severity ratings and recommendations.                              |
| **Vulnerability Filtering**  | Context-aware filtering of CVE entries based on device vendor, open ports, and device type for relevant results.                                                          |
| **Security Recommendations** | Auto-generated, prioritized (Critical → Info) security report with affected device lists and remediation advice.                                                          |
| **Vulnerabilities Page**     | Dedicated UI page showing all detected vulnerabilities, port warnings, and security grades across the network.                                                            |

### 5. 📊 Network Health Scoring & Insights

| Capability                       | Description                                                                                                                       |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Overall Health Score (0–100)** | Composite score calculated from three weighted components: Security (40 pts), Stability (30 pts), and Compliance (30 pts).        |
| **Health Grade (A–F)**           | Letter grade derived from the overall score for quick assessment.                                                                 |
| **Score Breakdown**              | Detailed breakdown showing individual scores for security posture, network stability (ICMP response rate), and device compliance. |
| **Actionable Insights**          | Auto-generated insight messages (e.g., "⚠️ 3 high-risk devices detected", "🔒 2 devices using randomized MACs").                  |
| **Device Distribution**          | Statistical breakdown of device types, vendor distribution, and risk level distribution across the network.                       |
| **Network Statistics**           | Total devices, scan count, alert count, and historical trend data served via API.                                                 |

### 6. 📤 Data Export & Reporting

| Capability              | Description                                                                                                                  |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **CSV Export**          | Export all known devices or current scan results to CSV format with all fields.                                              |
| **JSON Export**         | Export full scan results or topology data to structured JSON for integration with other tools.                               |
| **PDF Scan Report**     | Generate a professional PDF report containing scan summary, device inventory, and network statistics. Built with `printpdf`. |
| **PDF Security Report** | Generate a dedicated network health and security assessment PDF with health scores, security grades, and recommendations.    |
| **File Save Dialog**    | Native OS file save dialog integration via Tauri's `dialog` and `fs` plugins for choosing export destinations.               |
| **Reports Page**        | A dedicated UI page to generate and download all report types in one place.                                                  |

### 7. 🧰 Built-in Network Tools

| Tool                  | Description                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Ping Tool**         | Ping any host with configurable count. Returns per-packet latency, TTL, status, and packet loss statistics.   |
| **Port Scanner**      | Scan custom port ranges on any target host. Shows port status (open/closed), service name, and response time. |
| **MAC Vendor Lookup** | Look up the manufacturer of any MAC address using the embedded OUI database.                                  |
| **Tools Page**        | Unified UI page with all three tools in an easy-to-use tabbed interface.                                      |

### 8. 🗄️ Database & Data Security

| Capability                   | Description                                                                                                                                     |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Local SQLite Storage**     | All data (scans, devices, device history, alerts, CVE cache, port warnings) stored locally in a SQLite database via `rusqlite`.                 |
| **AES-256-GCM Encryption**   | Database exports are encrypted using AES-256-GCM with machine-bound keys derived via Argon2id KDF.                                              |
| **Machine-Bound Keys**       | Encryption keys are derived from machine-specific identifiers (machine UID, username, hostname) so exports are tied to the originating machine. |
| **Legacy Key Compatibility** | Backward-compatible decryption of older exports encrypted with the previous SHA-256 key derivation.                                             |
| **Schema Migrations**        | Automatic, backward-compatible schema migrations (e.g., adding `dedupe_key` column to existing `alerts` tables).                                |
| **Performance Indexes**      | Strategic database indexes on frequently queried columns (timestamps, MAC addresses, scan IDs, alert status).                                   |
| **Database Path API**        | The database file path is queryable from the frontend for debugging purposes.                                                                   |

### 9. 🎨 Modern Desktop UI

| Feature                      | Description                                                                                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Mission Control Design**   | A premium, modern "Mission Control" design language with consistent typography, spacing, and component styling.                                   |
| **9 Full Pages**             | **Dashboard**, **Topology View**, **Device List**, **Vulnerabilities**, **Alerts**, **Tools**, **Reports**, **Settings**, and **Component Demo**. |
| **Dark / Light Theme**       | Full theme support with a toggle. Sophisticated, non-generic color palettes for both modes. All components are theme-aware.                       |
| **Bento Grid Dashboard**     | Dashboard uses a Bento-style grid layout with stat cards, health gauges, device charts, recent alerts, and quick actions.                         |
| **Animated Charts**          | Recharts-powered interactive charts (bar, pie, line) with animated counters (`react-countup`) and circular progress bars.                         |
| **Sidebar Navigation**       | Collapsible sidebar with icon + label navigation, powered by `lucide-react` icons.                                                                |
| **Custom Title Bar**         | Frameless window with a custom-built title bar (minimize, maximize, close) and drag-to-move support.                                              |
| **Device Detail Modal**      | Click any device to view full details: IP, MAC, vendor, OS, open ports, risk score, security grade, and history.                                  |
| **Keyboard Shortcuts**       | Global keyboard shortcuts for navigation and common actions (Ctrl+K for command palette, etc.).                                                   |
| **Command Palette**          | `cmdk`-powered command palette for quick access to any page or action.                                                                            |
| **Lazy-Loaded Routes**       | URL-based page navigation with React lazy loading for optimal bundle splitting.                                                                   |
| **Framer Motion Animations** | Smooth page transitions and micro-animations using Framer Motion.                                                                                 |
| **Virtualized Lists**        | `@tanstack/react-virtual` for performant rendering of large device lists.                                                                         |
| **Toast Notifications**      | `sonner` toast notifications for scan status, export success, and error feedback.                                                                 |
| **Responsive Layout**        | Minimum window size of 1000×700 with responsive internal layouts.                                                                                 |

### 10. 🎮 Demo Mode

| Feature            | Description                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------- |
| **Mock Scan Data** | Pre-loaded realistic network scan data with diverse device types, vendors, and security profiles. |
| **Mock Alerts**    | Sample alerts for showcasing the alerting UI without a live network.                              |
| **Demo Toggle**    | Hooks to switch between live scanning and demo mode for presentations and testing.                |

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     Desktop UI (Tauri v2)                │
│  ┌────────────────────────────────────────────────────┐  │
│  │         React 19 + TypeScript + Vite               │  │
│  │  ┌──────────┬──────────┬───────────┬────────────┐  │  │
│  │  │Dashboard │Topology  │ Devices   │   Alerts   │  │  │
│  │  │          │ View     │ List      │            │  │  │
│  │  ├──────────┼──────────┼───────────┼────────────┤  │  │
│  │  │ Vulns    │ Tools    │ Reports   │  Settings  │  │  │
│  │  └──────────┴──────────┴───────────┴────────────┘  │  │
│  └──────────────────┬─────────────────────────────────┘  │
│                     │ Tauri IPC (invoke / events)         │
│  ┌──────────────────┴─────────────────────────────────┐  │
│  │         Tauri Bridge (commands.rs)                  │  │
│  │  29 Commands: scan, monitor, alerts, export, ...   │  │
│  └──────────────────┬─────────────────────────────────┘  │
└─────────────────────┼────────────────────────────────────┘
                      │
┌─────────────────────┴────────────────────────────────────┐
│                Rust Core Library (nexus-core)             │
│  ┌─────────┬──────────┬──────────┬──────────┬─────────┐  │
│  │Scanner  │ Network  │ Database │ Monitor  │ Insights│  │
│  │ARP/ICMP │ Device   │ SQLite   │ Watcher  │ Health  │  │
│  │TCP/SNMP │ DNS/Vendor│ Encrypt │ Events   │ Security│  │
│  │mDNS     │ Subnet   │ Schema  │ Passive  │ Reports │  │
│  └─────────┴──────────┴──────────┴──────────┴─────────┘  │
│  ┌──────────┬───────────┬──────────┐                     │
│  │ Alerts   │ Exports   │ Logging  │                     │
│  │ Detector │ CSV/JSON  │ Tracing  │                     │
│  │ Dedupe   │ PDF       │ Files    │                     │
│  └──────────┴───────────┴──────────┘                     │
└──────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer             | Technology                   | Details                                                                     |
| ----------------- | ---------------------------- | --------------------------------------------------------------------------- |
| **Backend Core**  | Rust                         | `nexus-core` crate — network scanning, data processing, insights engine      |
| **Desktop Shell** | Tauri v2                     | Native desktop wrapper with IPC bridge, 29 typed commands                   |
| **Frontend**      | React 19 + TypeScript        | Vite-powered SPA with Tailwind CSS 4, Framer Motion, Recharts               |
| **Topology**      | @xyflow/react + dagre        | Interactive graph visualization with hierarchical layout                    |
| **Database**      | SQLite (rusqlite)            | Bundled, zero-config local storage with AES-256-GCM encryption              |
| **Networking**    | pnet, surge-ping, dns-lookup | Raw packet crafting, ICMP, DNS resolution                                   |
| **SNMP**          | snmp2                        | SNMPv2c device enrichment and neighbor discovery                            |
| **mDNS**          | mdns-sd                      | Passive multicast DNS service discovery                                     |
| **Vendor DB**     | mac_oui                      | IEEE OUI database for MAC-to-vendor mapping                                 |
| **Encryption**    | aes-gcm, argon2, sha2        | AES-256-GCM encryption with Argon2id key derivation                         |
| **PDF**           | printpdf                     | Programmatic PDF report generation                                          |
| **Logging**       | tracing + tracing-appender   | Structured logging with file rotation                                       |
| **CI/CD**         | GitHub Actions               | Automated cross-platform builds and releases via `tauri-action`             |

---

## Project Layout

```text
.
├── crate/nexus-core/src/       # Rust core engine source
│   ├── app.rs                  # App command dispatch & execution context
│   ├── lib.rs                  # Library exports
│   ├── cli.rs                  # CLI argument parsing & usage text
│   ├── models.rs               # Data models (ScanResult, HostInfo, etc.)
│   ├── config.rs               # Configuration
│   ├── scanner/                # Network scanning engines
│   │   ├── arp.rs              #   Active ARP scanner
│   │   ├── icmp.rs             #   ICMP ping prober
│   │   ├── tcp.rs              #   TCP port scanner
│   │   ├── snmp.rs             #   SNMP enrichment
│   │   └── passive/            #   Passive discovery
│   │       ├── arp.rs          #     Passive ARP capture
│   │       └── mdns.rs         #     mDNS listener
│   ├── network/                # Network utilities
│   │   ├── device.rs           #   Device type inference & risk scoring
│   │   ├── dns.rs              #   DNS hostname resolution
│   │   ├── interface.rs        #   Network interface detection
│   │   ├── subnet.rs           #   Subnet calculation
│   │   └── vendor.rs           #   MAC vendor lookup
│   ├── database/               # Data persistence
│   │   ├── schema.rs           #   Table definitions & migrations
│   │   ├── queries.rs          #   CRUD operations
│   │   ├── models.rs           #   Database record types
│   │   ├── connection.rs       #   Connection management
│   │   ├── encryption.rs       #   AES-256-GCM encryption
│   │   └── seed_cves.rs        #   Embedded CVE database
│   ├── alerts/                 # Alert system
│   │   ├── detector.rs         #   Alert detection logic
│   │   └── types.rs            #   Alert types & severity
│   ├── monitor/                # Background monitoring
│   │   ├── watcher.rs          #   Monitor loop & lifecycle
│   │   ├── events.rs           #   Event types
│   │   └── passive_integration.rs  # Passive scanner integration
│   ├── insights/               # Analytics & reporting
│   │   ├── health.rs           #   Network health scoring
│   │   ├── security.rs         #   Security grading (A–F)
│   │   ├── recommendations.rs  #   Security recommendations
│   │   ├── distribution.rs     #   Device distribution stats
│   │   └── vulnerability_filter.rs  # CVE context filtering
│   ├── exports/                # Data export engines
│   │   ├── csv.rs              #   CSV exporter
│   │   ├── json.rs             #   JSON exporter
│   │   └── pdf.rs              #   PDF report generator
│   └── logging/                # Structured logging
│       └── mod.rs              #   Tracing setup & file appender
├── crate/nexus-core/tests/     # Rust integration tests
├── apps/nexus-desktop/         # Frontend application
│   ├── src/                    # React source
│   │   ├── App.tsx             #   App shell & routing
│   │   ├── main.tsx            #   Entry point
│   │   ├── index.css           #   Global styles
│   │   ├── pages/              #   Page components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── TopologyView.tsx
│   │   │   ├── DeviceList.tsx
│   │   │   ├── Vulnerabilities.tsx
│   │   │   ├── Alerts.tsx
│   │   │   ├── Tools.tsx
│   │   │   ├── Reports.tsx
│   │   │   └── Settings.tsx
│   │   ├── components/         #   Reusable UI components
│   │   │   ├── layout/         #     Sidebar, TitleBar, etc.
│   │   │   ├── dashboard/      #     Dashboard-specific widgets
│   │   │   ├── topology/       #     Topology graph components
│   │   │   ├── bento/          #     Bento grid cards
│   │   │   ├── charts/         #     Chart components
│   │   │   ├── devices/        #     Device detail components
│   │   │   └── common/         #     Shared UI components
│   │   ├── hooks/              #   Custom React hooks
│   │   │   ├── useScan.tsx     #     Scan execution
│   │   │   ├── useMonitoring.tsx#    Monitor control
│   │   │   ├── useDatabase.tsx #     Database queries
│   │   │   ├── useExport.tsx   #     Export functions
│   │   │   ├── useTheme.tsx    #     Theme management
│   │   │   └── useKeyboardShortcuts.ts
│   │   └── lib/                #   Utilities
│   │       ├── api/            #     Typed Tauri command client
│   │       ├── topology-layout.ts  # Graph layout algorithms
│   │       └── mock-data.ts    #     Demo mode data
│   ├── src-tauri/              # Tauri backend bridge
│   │   ├── src/
│   │   │   ├── commands.rs     #   29 IPC commands
│   │   │   ├── demo_data.rs    #   Demo mock data
│   │   │   └── main.rs         #   Tauri app entry
│   │   └── tauri.conf.json     #   Tauri configuration
│   └── package.json
├── Cargo.toml                  # Workspace manifest
├── CHANGELOG.md
└── CODE_REVIEW_2026.md
```

---

## Requirements

### Common

- **Rust** toolchain (stable, 2021 edition)
- **Node.js** 18+ and **npm**
- **Tauri v2 CLI** (`npm install @tauri-apps/cli`)

### Windows

- [Npcap](https://npcap.com/) installed (recommended with WinPcap compatibility mode)
- Visual Studio Build Tools (MSVC C++ toolchain)
- Run as **Administrator** for raw packet access

### Linux

- `libpcap-dev` and standard build tools (`build-essential`)
- `libwebkit2gtk-4.1-dev`, `libayatana-appindicator3-dev` (for Tauri)

### macOS

- `libpcap` (typically pre-installed or via Homebrew)
- Xcode Command Line Tools

---

## Quick Start

### Development (Full Desktop App)

```bash
# Install frontend dependencies
npm --prefix apps/nexus-desktop ci

# Launch Tauri dev mode (backend + frontend hot-reload)
npm --prefix apps/nexus-desktop run tauri dev
```

### Frontend Only (No Backend)

```bash
npm --prefix apps/nexus-desktop run dev
# Opens at http://localhost:1420
```

### Core Engine Checks

```bash
cargo test -p nexus-core --all-targets
# Runs core engine unit/integration coverage
```

---

## Build

### Production Desktop Build

```bash
cd apps/nexus-desktop
npm run tauri build
```

This produces platform-specific installers:

- **Windows**: `.msi` (WiX) and `.exe` (NSIS)
- **Linux**: `.AppImage` and `.deb`
- **macOS**: `.dmg` and `.app`

### Frontend Only Build

```bash
npm --prefix apps/nexus-desktop run build
```

---

## Verification Commands

Run from the repository root:

```bash
# Rust checks
cargo check --all-targets          # Type checking
cargo clippy --all-targets         # Linting
cargo test --all-targets           # Unit tests
cargo test --test alerts_dedupe_integration  # Integration test

# Frontend build
npm --prefix apps/nexus-desktop run build

# Tauri environment check
npm --prefix apps/nexus-desktop run tauri info
```

---

## Runtime Logs

Logs are written to your local app data directory:

| OS      | Path                                            |
| ------- | ----------------------------------------------- |
| Windows | `C:\Users\<you>\AppData\Local\netmapper\logs\`  |
| Linux   | `~/.local/share/netmapper/logs/`                |
| macOS   | `~/Library/Application Support/netmapper/logs/` |

---

## Troubleshooting

### "No valid interface found" when pressing Start Scan

**Common causes:**

- Npcap not installed or not configured for WinPcap compatibility
- Application not running with Administrator/root privileges
- Virtual adapter presenting placeholder data (`0.0.0.0/0`)

**Solutions:**

1. Confirm Npcap is installed with WinPcap compatibility mode.
2. Run the app as **Administrator** (Windows) or with `sudo` (Linux/macOS).
3. Disable unused virtual adapters (VPN, Docker, Hyper-V).
4. Ensure your active NIC has a valid IPv4 address.

### Repeated scan/monitor log spam

- Monitor start is idempotent, but stale dev processes can overlap.
- Stop all previous `tauri dev` sessions before restarting.

### Build fails on Windows

- Ensure Npcap SDK is available (the `build.rs` script searches common install paths).
- Verify MSVC build tools are installed.

---

## CI/CD

The project uses **GitHub Actions** with `tauri-action` for automated cross-platform builds:

- **Trigger**: Push a version tag (`v*`) to create a release.
- **Platforms**: Windows (x64), Linux (x64), macOS (Intel + Apple Silicon).
- **Artifacts**: Installers are automatically uploaded to the GitHub Release.

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for release history and notable updates.

---

## 🚀 Project Upgrade Roadmap

This section outlines the planned enhancements to elevate NEXUS to **production-level quality** and ensure a **unique, impressive** presence at the TU Project Show 2026.

### Priority 1 — "WOW Factor" Features

Features that make NEXUS **stand out** from other projects:

| Feature                                 | Description                                                                                                                                                                                                              | Impact                      |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- |
| **🤖 AI-Powered Network Intelligence**  | Integrate local LLM (Ollama) or API (Gemini/OpenAI) for natural language network analysis. Chat-based queries like "Show me suspicious devices", auto anomaly detection, predictive analytics, and AI-generated reports. | 🔥 #1 unique differentiator |
| **🗺️ 3D Interactive Topology Map**      | Upgrade from 2D to a 3D force-directed graph using Three.js / react-three-fiber with real-time device status animations, rotate/zoom/pan controls.                                                                       | 🎨 High visual impact       |
| **📱 Network Timeline / Activity Feed** | Visual timeline of all network events with time-range filtering, device filtering, and animated transitions.                                                                                                             | 📊 Great for live demos     |

### Priority 2 — Production-Level Quality

| Feature                     | Status         | Enhancement                                          |
| --------------------------- | -------------- | ---------------------------------------------------- |
| Port risk analysis          | ✅ Implemented | Enhanced CVE database lookup                         |
| Security recommendations    | ✅ Implemented | AI-generated recommendations                         |
| Network health score        | ✅ Implemented | Historical trend graphs                              |
| **Bandwidth monitoring**    | ❌ Planned     | Per-device bandwidth usage tracking                  |
| **Network traffic heatmap** | ❌ Planned     | Device-to-device traffic visualization               |
| **Rogue device detection**  | ❌ Planned     | Trusted device whitelist + unknown device alerts     |
| **Desktop notifications**   | ❌ Planned     | OS-level notifications via Tauri notification plugin |
| **Sound alerts**            | ❌ Planned     | Audio alerts for critical events                     |
| **Custom alert rules**      | ❌ Planned     | User-defined rules (e.g., "Alert if port 22 opens")  |
| **Multi-network support**   | ❌ Planned     | Multiple subnet scanning + comparison view           |

### Priority 3 — UI/UX Polish (Show-Ready)

| Enhancement                  | Status                                           |
| ---------------------------- | ------------------------------------------------ |
| Animated counters            | ✅ Implemented (react-countup)                   |
| Smooth page transitions      | ✅ Implemented (framer-motion)                   |
| Command palette (Ctrl+K)     | ✅ Implemented (cmdk)                            |
| **Live data streaming**      | Planned — real-time WebSocket-like updates       |
| **Network map minimap**      | Planned — mini topology in dashboard corner      |
| **Custom dashboard widgets** | Planned — user-configurable dashboard layout     |
| **Onboarding tour**          | Planned — first-time user guide with tooltips    |
| **PDF report branding**      | Planned — project logo + professional formatting |
| **Multi-language toggle**    | Planned — Myanmar/English in-app toggle          |

### Priority 4 — Technical Production Hardening

| Area        | Item                      | Description                                         |
| ----------- | ------------------------- | --------------------------------------------------- |
| Performance | Scan speed                | Parallel scan optimization (batch ARP + async ICMP) |
| Performance | Database indexing         | Query optimization for large device histories       |
| Performance | Memory management         | Long-running monitor memory profiling               |
| Reliability | Error recovery            | Auto-retry for failed scans                         |
| Reliability | Crash reporting           | Error boundary + local crash logs                   |
| Reliability | Data backup               | Database auto-backup before risky operations        |
| Reliability | Graceful shutdown         | Clean monitor/scan stop on app close                |
| Testing     | Frontend unit tests       | Vitest-based component testing                      |
| Testing     | Full pipeline integration | End-to-end scan pipeline integration test           |
| Testing     | E2E tests                 | Playwright desktop automation tests                 |

### Recommended Implementation Timeline

| Week       | Focus                   | Features                                                                     |
| ---------- | ----------------------- | ---------------------------------------------------------------------------- |
| **Week 1** | High Impact, Quick Wins | AI Chat Assistant (API-based), Desktop Notifications, Rogue Device Detection |
| **Week 2** | Visual Impact           | 3D Topology View, Network Timeline, Dashboard Minimap                        |
| **Week 3** | Polish & Production     | Custom Alert Rules, PDF Report Branding, Onboarding Tour, E2E Tests          |

### Why These Upgrades Make NEXUS Unique

| Feature                     | Uniqueness                                                        |
| --------------------------- | ----------------------------------------------------------------- |
| **AI Network Intelligence** | Network tool + AI integration — rare at university-level projects |
| **3D Topology**             | Exceptional visual impact for judge/audience impressions          |
| **Rust + Tauri**            | Unique tech stack — most students use Python/Electron             |
| **Real-time Monitoring**    | Live network events provide excellent demo impact                 |
| **Security Insights + AI**  | Practical cybersecurity value with real-world applicability       |

---

## License

This project is developed for academic and research purposes at Technological University.
No `LICENSE` file is currently included in this repository.

---

<div align="center">

# 🇲🇲 မြန်မာဘာသာ (Myanmar Language)

</div>

---

## 📖 ပရောဂျက်အကြောင်း အကျဉ်းချုပ်

**NEXUS (NetMapper Pro)** သည် Local Network ထဲရှိ စက်ပစ္စည်းအားလုံးကို ရှာဖွေ၊ မြေပုံရေးဆွဲ၊ စောင့်ကြည့်စစ်ဆေး၊ နှင့် လုံခြုံရေးအားနည်းချက်များ ပိုင်းခြားခွဲခြမ်းစိတ်ဖြာနိုင်သော Cross-platform Desktop Application တစ်ခုဖြစ်ပါသည်။ **Rust**, **Tauri v2**, **React 19**, **TypeScript** နှင့် **SQLite** တို့ဖြင့် တည်ဆောက်ထားပါသည်။

---

## 🔑 အဓိက Feature များ

### 1. 🔍 Network ရှာဖွေခြင်းနှင့် Scanning

- **Active ARP Scanning** — Layer-2 တွင် Raw ARP Packet များသုံး၍ Local Subnet ပေါ်ရှိ စက်ပစ္စည်းအားလုံးကို ရှာဖွေနိုင်ပါသည်။ ICMP ပိတ်ထားသော စက်တွေကိုပါ တွေ့ရှိနိုင်ပါသည်။
- **ICMP Ping** — Round-trip Latency (ms) နှင့် TTL တန်ဖိုးကို တိုင်းတာ၍ OS ကို ခန့်မှန်းနိုင်ပါသည်။
- **TCP Port Scanning** — HTTP, SSH, Telnet, FTP, RDP, SMB, DNS, MQTT စသော Common Port 20+ ခုကို Scan ပြုလုပ်ပါသည်။
- **DNS Hostname Resolution** — တွေ့ရှိသော Host အားလုံးအတွက် Reverse DNS Lookup ပြုလုပ်ပါသည်။
- **MAC Vendor Lookup** — IEEE OUI Database သုံး၍ Device ထုတ်လုပ်သူကို ခွဲခြားသိရှိနိုင်ပါသည်။ Randomized MAC များကိုလည်း ခွဲခြားနိုင်ပါသည်။
- **OS Fingerprinting** — ICMP TTL အပေါ်အခြေခံ၍ Windows, Linux/macOS, Network Device ဟု ခန့်မှန်းပါသည်။
- **Device Type ခွဲခြားခြင်း** — Router, Switch, Server, PC, Mobile, IoT, Printer စသဖြင့် အလိုအလျောက် ခွဲခြားပါသည်။
- **SNMP Enrichment** — SNMPv2c အသုံးပြု၍ System Description, Hostname, Uptime နှင့် LLDP/CDP Neighbor Data ကို ရယူနိုင်ပါသည်။
- **Passive mDNS Discovery** — Multicast DNS (Bonjour/Avahi) ကြော်ငြာချက်များကို နားထောင်၍ Active Probe မလုပ်ဘဲ Device များကို ရှာဖွေနိုင်ပါသည်။
- **Passive ARP Monitoring** — ARP Traffic ကို Passively ဖမ်းယူ၍ Network ထဲ ဝင်လာသော Device အသစ်များကို Real-time တွင် တွေ့ရှိနိုင်ပါသည်။
- **Risk Score (0–100)** — Device Type, Open Port, MAC Randomization စသည်တို့ကို ခြုံငုံစဉ်းစား၍ Risk Score တွက်ချက်ပါသည်။

### 2. 📡 Real-Time Monitoring နှင့် Alert များ

- **Background Monitor** — သတ်မှတ်ထားသော အချိန်ကြား (Default: 60 စက္ကန့်) တိုင်း Background တွင် Auto-scan ပြုလုပ်ပါသည်။
- **Device Lifecycle Events** — Device အသစ်တွေ့ရှိ, Device Offline, Device ပြန်လာ, IP ပြောင်းလဲ, Open Port တွေ့ရှိ စသော Event များကို ထုတ်ပြပါသည်။
- **Live Event Push** — Tauri Event System မှတစ်ဆင့် Frontend သို့ Real-time Event များ ပေး​ပို့ပါသည်။
- **Alert သိမ်းဆည်းခြင်း** — Alert အားလုံးကို SQLite Database ထဲတွင် Timestamp, Severity, Device Information တို့နှင့်တကွ သိမ်းဆည်းပါသည်။
- **Alert Deduplication** — ထပ်တူ Alert များကို Smart Dedupe Logic ဖြင့် စစ်ထုတ်ပါသည်။
- **Read/Unread Status** — Alert တစ်ခုချင်းစီ (သို့) အားလုံးကို Read/Unread/Clear ပြုလုပ်နိုင်ပါသည်။

### 3. 🗺️ Interactive Topology Visualization

- **Graph-Based Layout** — React Flow + Dagre Algorithm သုံး၍ Hierarchical Network Topology Graph ကို ပြသပါသည်။
- **Interactive Nodes** — Device တစ်ခုချင်းစီကို IP, MAC, Device Type Icon, Status တို့ဖြင့် ပြသပါသည်။
- **Zoom & Pan** — ကြီးမားသော Network ကို Navigate လုပ်ရန် Zoom, Pan, Fit-to-View ရှိပါသည်။
- **Theme-Aware** — Light/Dark Theme နှင့် အလိုအလျောက် ပြောင်းလဲပါသည်။

### 4. 🛡️ Security Analysis နှင့် Vulnerability Assessment

- **Security Grade (A–F)** — Vulnerability, Port Warning, Risk Score များကို ခြုံငုံစဉ်းစား၍ Device တစ်ခုချင်းစီကို Letter Grade ပေးပါသည်။
- **CVE Database** — Cisco, Netgear, TP-Link, D-Link စသော Vendor များအတွက် Known Vulnerability Data ပါဝင်ပါသည်။
- **Port Security Warning** — Telnet, FTP, RDP စသော Insecure Port များအတွက် Warning နှင့် Recommendation ပေးပါသည်။
- **Security Report** — Priority အလိုက် (Critical → Info) စီစဉ်ထားသော Security Recommendation Report ကို အလိုအလျောက် ဖန်တီးပါသည်။

### 5. 📊 Network Health Scoring

- **Overall Score (0–100)** — Security (40), Stability (30), Compliance (30) သုံးခုကို ပေါင်းစပ်တွက်ချက်ပါသည်။
- **Health Grade (A–F)** — အမြန်အကဲဖြတ်ရန် Letter Grade ပြသပါသည်။
- **Score Breakdown** — Security Posture, Network Stability (ICMP Response Rate), Device Compliance အသီးသီး ခွဲပြပါသည်။
- **Insights** — "⚠️ High-risk devices 3 ခု တွေ့ရှိ" ကဲ့သို့ Actionable Insight Message များ ပေးပါသည်။

### 6. 📤 Data Export နှင့် Reporting

- **CSV Export** — Device List (သို့) Scan Result ကို CSV ဖိုင်အဖြစ် Export ပြုလုပ်နိုင်ပါသည်။
- **JSON Export** — Scan Result (သို့) Topology Data ကို JSON Format ဖြင့် Export ပြုလုပ်နိုင်ပါသည်။
- **PDF Scan Report** — Scan Summary, Device Inventory, Network Stats ပါဝင်သော Professional PDF Report ဖန်တီးနိုင်ပါသည်။
- **PDF Security Report** — Health Score, Security Grade, Recommendation ပါဝင်သော Security Assessment PDF ဖန်တီးနိုင်ပါသည်။
- **Native Save Dialog** — OS ရဲ့ File Save Dialog ဖြင့် Export Location ရွေးချယ်နိုင်ပါသည်။

### 7. 🧰 Built-in Network Tools

- **Ping Tool** — Host ကို Ping ရိုက်၍ Latency, TTL, Packet Loss တို့ကို ကြည့်ရှုနိုင်ပါသည်။
- **Port Scanner** — Target Host ပေါ်ရှိ Custom Port Range ကို Scan ပြုလုပ်နိုင်ပါသည်။
- **MAC Vendor Lookup** — MAC Address ကို ရိုက်ထည့်၍ Manufacturer ကို ရှာဖွေနိုင်ပါသည်။

### 8. 🗄️ Database နှင့် Data Security

- **Local SQLite** — Data အားလုံးကို စက်တွင်းတွင် SQLite Database ဖြင့် သိမ်းဆည်းပါသည်။
- **AES-256-GCM Encryption** — Database Export ကို AES-256-GCM ဖြင့် Encrypt ပြုလုပ်ပါသည်။ Key ကို Machine ID မှ Argon2id KDF ဖြင့် Derive လုပ်ပါသည်။
- **Schema Migration** — Database Schema ပြောင်းလဲမှုများကို အလိုအလျောက် Backward-compatible ဖြစ်အောင် Migration ပြုလုပ်ပါသည်။

### 9. 🎨 Modern Desktop UI

- **Mission Control Design** — Premium, Modern Design Language ဖြင့် တသမတ်တည်း ဒီဇိုင်းထားပါသည်။
- **Page (၉) ခု** — Dashboard, Topology, Devices, Vulnerabilities, Alerts, Tools, Reports, Settings, Component Demo။
- **Dark / Light Theme** — Theme Toggle ဖြင့် Dark Mode နှင့် Light Mode ကူးပြောင်းနိုင်ပါသည်။
- **Bento Grid Dashboard** — Stat Cards, Health Gauge, Charts, Recent Alerts, Quick Actions ပါဝင်သော Dashboard Layout။
- **Animated Charts** — Recharts + React CountUp ဖြင့် Interactive Charts နှင့် Animated Counters။
- **Custom Title Bar** — Frameless Window ဖြင့် Custom Minimize/Maximize/Close Buttons။
- **Keyboard Shortcuts** — Ctrl+K Command Palette နှင့် Global Keyboard Shortcuts။
- **Lazy Loading** — Page များကို Lazy Load ပြုလုပ်၍ Performance ကောင်းမွန်ပါသည်။

### 10. 🎮 Demo Mode

- Scan Data အတုနှင့် Alert Data အတုပါဝင်၍ Live Network မရှိဘဲ Application ကို စမ်းသပ်/သရုပ်ပြနိုင်ပါသည်။

---

## 🛠️ Tech Stack (နည်းပညာ Stack)

| Layer         | နည်းပညာ               | ရှင်းလင်းချက်                                      |
| ------------- | --------------------- | -------------------------------------------------- |
| Backend       | Rust                  | Network Scanning, Data Processing, Insights Engine |
| Desktop Shell | Tauri v2              | Native Desktop Wrapper, IPC Bridge, 29 Commands    |
| Frontend      | React 19 + TypeScript | Vite SPA, Tailwind CSS 4, Framer Motion, Recharts  |
| Database      | SQLite (rusqlite)     | Local Storage, AES-256-GCM Encryption              |
| Networking    | pnet, surge-ping      | Raw Packet, ICMP Ping                              |
| CI/CD         | GitHub Actions        | Cross-platform Auto Build & Release                |

---

## 📦 System Requirements (စနစ်လိုအပ်ချက်များ)

### Common

- Rust Toolchain (Stable)
- Node.js 18+ နှင့် npm

### Windows

- Npcap (WinPcap Compatibility Mode ဖွင့်ထားရန်)
- Visual Studio Build Tools (C++ Toolchain)
- **Administrator အဖြစ် Run ရန်**

### Linux

- `libpcap-dev`, `build-essential`
- `libwebkit2gtk-4.1-dev`

### macOS

- `libpcap` (Homebrew မှ)
- Xcode Command Line Tools

---

## 🚀 Quick Start (စတင်နည်း)

```bash
# Frontend Dependencies Install
npm --prefix apps/nexus-desktop ci

# Desktop App Development Mode
npm --prefix apps/nexus-desktop run tauri dev

# Frontend Only Mode
npm --prefix apps/nexus-desktop run dev

# Core Engine Check
cargo test -p nexus-core --all-targets
```

---

## 🏗️ Build (Production Build)

```bash
cd apps/nexus-desktop
npm run tauri build
```

Platform အလိုက် Installer ထွက်ပါသည်:

- **Windows**: `.msi` နှင့် `.exe`
- **Linux**: `.AppImage` နှင့် `.deb`
- **macOS**: `.dmg` နှင့် `.app`

---

> **NEXUS** — Network ကို ပို၍ ရှင်းလင်းမြင်သာ၊ လုံခြုံမှုရှိ၊ ထိန်းချုပ်နိုင်စေရန် ဖန်တီးထားသော Smart Desktop Tool။
