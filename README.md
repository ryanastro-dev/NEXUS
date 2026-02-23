<div align="center">

# NEXUS

**Smart Network Topology Mapper & Health Monitor**

`v0.1.0`

A cross-platform desktop application for real-time network discovery, interactive topology visualization, continuous health monitoring, and AI-powered security analysis.

Built with **Rust** · **Tauri v2** · **React 19** · **TypeScript** · **SQLite**

[![Build](https://img.shields.io/badge/build-passing-brightgreen)](#verification)
[![Version](https://img.shields.io/badge/version-0.1.0-6366f1)](#changelog)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux%20%7C%20macOS-lightgrey)](#requirements)
[![Rust](https://img.shields.io/badge/rust-stable-orange)](#tech-stack)
[![License](https://img.shields.io/badge/license-academic-blue)](#license)

</div>

---

## What is NEXUS?

**NEXUS** is a high-performance network intelligence platform that discovers every device on your local network, maps their connections in an interactive topology graph, and continuously monitors for changes — all from a single native desktop application. It combines multi-protocol scanning (ARP, ICMP, TCP, SNMP, mDNS), security vulnerability assessment with A–F grading, and AI-powered analysis into one unified tool.

---

## Features

### 🔍 Network Discovery

Multi-protocol scanning engine that finds every device on your subnet — even those blocking ICMP.

- **ARP + ICMP + TCP** — Layer-2/3 host discovery, latency measurement, and service detection
- **20+ port probes** — HTTP, SSH, Telnet, FTP, RDP, SMB, DNS, MQTT, and more
- **OS fingerprinting** — TTL-based OS classification (Windows / Linux / macOS / Network Device)
- **Device inference** — Auto-classifies as Router, PC, Mobile, IoT, Printer, Camera, etc.
- **MAC vendor lookup** — IEEE OUI database with randomized-MAC detection
- **SNMP enrichment** — System description, uptime, and LLDP/CDP neighbor discovery
- **Passive discovery** — mDNS + ARP listeners detect devices without active probing

### 📡 Real-Time Monitoring

Background monitor loop with configurable intervals and live event streaming.

- **Device lifecycle events** — New, Offline, Back Online, IP Changed, Open Port Detected
- **Live push to UI** — Tauri event channels deliver updates instantly
- **Alert deduplication** — Smart composite dedupe keys prevent noise
- **Read/unread workflow** — Mark individual or bulk alerts
- **Auto-start** — Configurable auto-monitoring on app launch

### 🗺️ Topology Visualization

Interactive network graph powered by React Flow with hierarchical auto-layout.

- **Dagre layout** — Automatic hierarchical arrangement
- **Device nodes** — IP, MAC, type icon, online/offline status
- **SNMP edges** — Neighbor-based connection mapping
- **Zoom, pan, fit** — Navigate topologies of any size
- **Theme-aware** — Full dark/light mode adaptation

### 🛡️ Security Analysis

Vulnerability assessment and security grading for every device.

- **A–F security grades** — Penalty-based scoring per device
- **CVE database** — Embedded vulnerability cache for major vendors
- **Port warnings** — Detects insecure open ports (Telnet, FTP, RDP) with remediation advice
- **Risk scoring** — 0–100 composite score per device
- **Security reports** — Auto-generated prioritized recommendations

### 📊 Health Scoring

Composite network health assessment with actionable insights.

- **Overall score (0–100)** — Security (40%) + Stability (30%) + Compliance (30%)
- **Health grade (A–F)** — Quick network posture assessment
- **Device distribution** — Type, vendor, and risk breakdowns
- **Actionable insights** — Auto-generated recommendations

### 📤 Export & Reporting

Multiple export formats with native OS save dialogs.

- **CSV** — Device lists with all fields
- **JSON** — Structured scan and topology data
- **PDF Scan Report** — Device inventory, statistics, and summary
- **PDF Security Report** — Health scores, grades, and recommendations

### 🧰 Built-in Tools

Network utilities accessible from a unified tabbed interface.

- **Ping** — Configurable count, per-packet latency, TTL, packet loss stats
- **Port Scanner** — Custom port ranges on any target host
- **MAC Lookup** — Instant manufacturer identification

### 🎨 Desktop Experience

Premium native application with 9 full pages.

- **Mission Control design** — Consistent premium design language
- **Dark / Light theme** — Sophisticated palettes, instant toggle
- **Bento grid dashboard** — Stat cards, health gauges, charts, quick actions
- **Command palette** — `Ctrl+K` for instant navigation (cmdk)
- **Animated charts** — Recharts + CountUp with smooth transitions
- **Custom title bar** — Frameless window with drag-to-move
- **Framer Motion** — Page transitions and micro-animations
- **Virtualized lists** — Performant rendering of large device lists
- **Demo mode** — Pre-loaded mock data for presentations

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  NEXUS Desktop (Tauri v2)            │
│  ┌───────────────────────────────────────────────┐  │
│  │        React 19 · TypeScript · Vite           │  │
│  │  Dashboard│Topology│Devices│Alerts│Vulns│...  │  │
│  └─────────────────────┬─────────────────────────┘  │
│                        │ IPC (invoke / events)       │
│  ┌─────────────────────┴─────────────────────────┐  │
│  │        Tauri Bridge · 30+ Commands            │  │
│  └─────────────────────┬─────────────────────────┘  │
└────────────────────────┼────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────┐
│              nexus-core (Rust Library)               │
│  Scanner │ Network │ Database │ Monitor │ Insights  │
│  ARP/ICMP│ Device  │ SQLite   │ Watcher │ Health    │
│  TCP/SNMP│ DNS/OUI │ AES-256  │ Events  │ Security  │
│  mDNS    │ Subnet  │ Migrate  │ Passive │ Reports   │
│  ────────┴─────────┴──────────┴─────────┴────────── │
│  Alerts · Exports (CSV/JSON/PDF) · Tracing          │
└─────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer             | Technology            | Purpose                                              |
| ----------------- | --------------------- | ---------------------------------------------------- |
| **Core Engine**   | Rust (stable)         | Network scanning, security analysis, data processing |
| **Desktop Shell** | Tauri v2              | Native window, IPC bridge, 30+ typed commands        |
| **Frontend**      | React 19 + TypeScript | Vite SPA, Tailwind CSS 4, Framer Motion, Recharts    |
| **Topology**      | @xyflow/react + dagre | Interactive graph with hierarchical layout           |
| **Database**      | SQLite (rusqlite)     | Local storage with AES-256-GCM encryption            |
| **Networking**    | pnet, surge-ping      | Raw packets, ICMP, SNMP, mDNS                        |
| **Encryption**    | aes-gcm + argon2      | AES-256-GCM with Argon2id key derivation             |
| **CI/CD**         | GitHub Actions        | Cross-platform builds via tauri-action               |

---

## Project Layout

```
.
├── crate/nexus-core/          # Rust core engine
│   └── src/
│       ├── scanner/           # ARP, ICMP, TCP, SNMP, passive
│       ├── network/           # Device inference, DNS, vendor, subnet
│       ├── database/          # SQLite, schema, encryption
│       ├── monitor/           # Background watcher, events
│       ├── alerts/            # Detection, deduplication
│       ├── insights/          # Health scoring, security grading
│       ├── exports/           # CSV, JSON, PDF
│       └── logging/           # Structured tracing
├── apps/nexus-gui/        # Desktop application
│   ├── src/                   # React frontend
│   │   ├── pages/             # 9 page components
│   │   ├── components/        # UI component library
│   │   ├── hooks/             # useScan, useMonitoring, etc.
│   │   └── lib/api/           # Typed Tauri client
│   └── src-tauri/             # Tauri backend bridge
│       ├── src/commands/      # IPC command handlers
│       └── tauri.conf.json    # App configuration
└── Cargo.toml                 # Workspace manifest
```

---

## Requirements

|                | Windows                                           | Linux                                      | macOS                     |
| -------------- | ------------------------------------------------- | ------------------------------------------ | ------------------------- |
| **Runtime**    | [Npcap](https://npcap.com/) (WinPcap compat mode) | `libpcap-dev`                              | `libpcap` (pre-installed) |
| **Build**      | MSVC Build Tools                                  | `build-essential`, `libwebkit2gtk-4.1-dev` | Xcode CLI Tools           |
| **Privileges** | Run as Administrator                              | `sudo` or `cap_net_raw`                    | `sudo`                    |
| **Common**     | Rust stable, Node.js 18+, npm                     |                                            |                           |

---

## Quick Start

```bash
# 1. Install frontend dependencies
npm --prefix apps/nexus-gui ci

# 2. Launch development mode (backend + frontend hot-reload)
npm --prefix apps/nexus-gui run tauri dev

# 3. Run core engine tests
cargo test -p nexus-core --all-targets
```

### Frontend Only (no backend)

```bash
npm --prefix apps/nexus-gui run dev
# → http://localhost:1420
```

---

## Build

```bash
cd apps/nexus-gui
npm run tauri build
```

**Output:**

- Windows: `.msi` (WiX) + `.exe` (NSIS)
- Linux: `.AppImage` + `.deb`
- macOS: `.dmg` + `.app`

---

## Verification

```bash
cargo check --all-targets          # Type checking
cargo clippy --all-targets         # Linting
cargo test --all-targets           # Unit + integration tests
npm --prefix apps/nexus-gui run build   # Frontend build
```

---

## Runtime Logs

| OS      | Path                                            |
| ------- | ----------------------------------------------- |
| Windows | `%LOCALAPPDATA%\netmapper\logs\`                |
| Linux   | `~/.local/share/netmapper/logs/`                |
| macOS   | `~/Library/Application Support/netmapper/logs/` |

---

## CI/CD

Automated cross-platform builds via **GitHub Actions** + `tauri-action`.

- **Trigger:** Push version tag (`v*`)
- **Platforms:** Windows (x64), Linux (x64), macOS (Intel + Apple Silicon)
- **Artifacts:** Installers uploaded to GitHub Release

---

## License

This project is developed for academic and research purposes at Technological University.

---

<details>
<summary><strong>🇲🇲 မြန်မာဘာသာ (Myanmar Language)</strong></summary>

---

## 📖 ပရောဂျက်အကြောင်း အကျဉ်းချုပ်

**NEXUS** သည် Local Network ထဲရှိ စက်ပစ္စည်းအားလုံးကို ရှာဖွေ၊ မြေပုံရေးဆွဲ၊ စောင့်ကြည့်စစ်ဆေး၊ နှင့် လုံခြုံရေးအားနည်းချက်များ ပိုင်းခြားခွဲခြမ်းစိတ်ဖြာနိုင်သော Cross-platform Desktop Application တစ်ခုဖြစ်ပါသည်။ **Rust**, **Tauri v2**, **React 19**, **TypeScript** နှင့် **SQLite** တို့ဖြင့် တည်ဆောက်ထားပါသည်။

---

## 🔑 အဓိက Feature များ

### 1. 🔍 Network ရှာဖွေခြင်းနှင့် Scanning

- **Active ARP Scanning** — Layer-2 တွင် Raw ARP Packet များသုံး၍ Local Subnet ပေါ်ရှိ စက်ပစ္စည်းအားလုံးကို ရှာဖွေနိုင်ပါသည်။
- **ICMP Ping** — Round-trip Latency (ms) နှင့် TTL တန်ဖိုးကို တိုင်းတာ၍ OS ကို ခန့်မှန်းနိုင်ပါသည်။
- **TCP Port Scanning** — HTTP, SSH, Telnet, FTP, RDP, SMB, DNS, MQTT စသော Common Port 20+ ခုကို Scan ပြုလုပ်ပါသည်။
- **DNS Hostname Resolution** — တွေ့ရှိသော Host အားလုံးအတွက် Reverse DNS Lookup ပြုလုပ်ပါသည်။
- **MAC Vendor Lookup** — IEEE OUI Database သုံး၍ Device ထုတ်လုပ်သူကို ခွဲခြားသိရှိနိုင်ပါသည်။
- **OS Fingerprinting** — ICMP TTL အပေါ်အခြေခံ၍ Windows, Linux/macOS, Network Device ဟု ခန့်မှန်းပါသည်။
- **Device Type ခွဲခြားခြင်း** — Router, Switch, Server, PC, Mobile, IoT, Printer စသဖြင့် အလိုအလျောက် ခွဲခြားပါသည်။
- **SNMP Enrichment** — SNMPv2c အသုံးပြု၍ System Description, Hostname, Uptime နှင့် LLDP/CDP Neighbor Data ကို ရယူနိုင်ပါသည်။
- **Passive mDNS Discovery** — Multicast DNS ကြော်ငြာချက်များကို နားထောင်၍ Device များကို ရှာဖွေနိုင်ပါသည်။
- **Risk Score (0–100)** — Device Type, Open Port, MAC Randomization စသည်တို့ကို ခြုံငုံစဉ်းစား၍ Risk Score တွက်ချက်ပါသည်။

### 2. 📡 Real-Time Monitoring နှင့် Alert များ

- **Background Monitor** — သတ်မှတ်ထားသော အချိန်ကြား (Default: 60 စက္ကန့်) တိုင်း Auto-scan ပြုလုပ်ပါသည်။
- **Device Lifecycle Events** — Device အသစ်တွေ့ရှိ, Offline, ပြန်လာ, IP ပြောင်းလဲ စသော Event များ ထုတ်ပြပါသည်။
- **Alert Deduplication** — ထပ်တူ Alert များကို Smart Dedupe Logic ဖြင့် စစ်ထုတ်ပါသည်။

### 3. 🗺️ Topology Visualization

- **Graph-Based Layout** — React Flow + Dagre Algorithm သုံး၍ Network Topology Graph ပြသပါသည်။
- **Interactive Nodes** — Device တစ်ခုချင်းစီကို IP, MAC, Device Type Icon, Status တို့ဖြင့် ပြသပါသည်။
- **Dark / Light Theme** — Theme Toggle ဖြင့် Dark Mode နှင့် Light Mode ကူးပြောင်းနိုင်ပါသည်။

### 4. 🛡️ Security Analysis

- **Security Grade (A–F)** — Device တစ်ခုချင်းစီကို Letter Grade ပေးပါသည်။
- **CVE Database** — Known Vulnerability Data ပါဝင်ပါသည်။
- **Port Security Warning** — Insecure Port များအတွက် Warning နှင့် Recommendation ပေးပါသည်။

### 5. 📤 Export & Reporting

- **CSV / JSON / PDF** — Device List, Scan Result, Security Report များကို Export ပြုလုပ်နိုင်ပါသည်။

---

## 🛠️ Tech Stack

| Layer    | နည်းပညာ               | ရှင်းလင်းချက်                                      |
| -------- | --------------------- | -------------------------------------------------- |
| Backend  | Rust                  | Network Scanning, Data Processing, Insights Engine |
| Desktop  | Tauri v2              | Native Desktop Wrapper, IPC Bridge                 |
| Frontend | React 19 + TypeScript | Vite SPA, Tailwind CSS 4, Framer Motion            |
| Database | SQLite                | Local Storage, AES-256-GCM Encryption              |
| CI/CD    | GitHub Actions        | Cross-platform Auto Build & Release                |

---

## 🚀 Quick Start (စတင်နည်း)

```bash
npm --prefix apps/nexus-gui ci
npm --prefix apps/nexus-gui run tauri dev
```

Platform အလိုက် Installer ထွက်ရှိနိုင်ပါသည်:

- **Windows**: `.msi` နှင့် `.exe`
- **Linux**: `.AppImage` နှင့် `.deb`
- **macOS**: `.dmg` နှင့် `.app`

---

> **NEXUS** — Network ကို ပို၍ ရှင်းလင်းမြင်သာ၊ လုံခြုံမှုရှိ၊ ထိန်းချုပ်နိုင်စေရန် ဖန်တီးထားသော Smart Desktop Tool။

</details>
