# NEXUS — Product Context Document

> **Purpose:** Comprehensive product reference for building the NEXUS landing website.
> Covers identity, design system, features, architecture, user flows, and technical details.

---

## 1. Product Identity

| Field              | Value                                                                                                                                                                                                                                                 |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Product Name**   | NEXUS                                                                                                                                                                                                                                                 |
| **Tagline**        | Smart Network Topology Mapper & Health Monitor                                                                                                                                                                                                        |
| **One-Liner**      | See everything on your network. Secure it. Monitor it.                                                                                                                                                                                                |
| **Version**        | v0.1.0                                                                                                                                                                                                                                                |
| **Type**           | Cross-platform native desktop application                                                                                                                                                                                                             |
| **Category**       | Network Intelligence / Cybersecurity / IT Operations                                                                                                                                                                                                  |
| **Elevator Pitch** | NEXUS is a Rust-powered desktop app that discovers every device on your local network in seconds, maps their connections in interactive topology graphs, grades their security posture, and monitors for changes 24/7 — all in one premium interface. |

### Target Audience

- Network administrators managing local infrastructure
- Cybersecurity analysts performing network audits
- IT professionals needing device inventory visibility
- University/academic researchers in networking and security
- Small business owners wanting network oversight

### Positioning

NEXUS is **not** a browser-based SaaS tool or a cloud agent. It's a **privacy-first native application** that runs entirely on the user's machine. All data stays local — encrypted in SQLite, never leaving the device.

---

## 2. Design System — Color Palette

### Brand Colors

| Token                | Hex       | RGB             | Role                                   |
| -------------------- | --------- | --------------- | -------------------------------------- |
| **Primary (Indigo)** | `#6366f1` | `99, 102, 241`  | Primary brand, buttons, links, accents |
| **Primary Hover**    | `#4f46e5` | `79, 70, 229`   | Hover state for primary                |
| **Primary Light**    | `#e0e7ff` | `224, 231, 255` | Light mode backgrounds                 |

### Accent Colors

| Token        | Hex       | Role                                           |
| ------------ | --------- | ---------------------------------------------- |
| **Blue**     | `#3b82f6` | Secondary accent, glow effects, router devices |
| **Sky**      | `#0ea5e9` | Gradients, topology, card highlights           |
| **Teal**     | `#14b8a6` | Success indicators, tertiary accent            |
| **Amber**    | `#f59e0b` | Warnings, server devices                       |
| **Red**      | `#ef4444` | Errors, offline status, IoT devices            |
| **Green**    | `#10b981` | Online status, switch devices                  |
| **Navy**     | `#1e40af` | Deep accent, enterprise contexts               |
| **Sapphire** | `#2563eb` | Deep blue accent                               |
| **Emerald**  | `#059669` | Success status (professional)                  |
| **Ruby**     | `#dc2626` | Error status (professional)                    |
| **Gold**     | `#fbbf24` | Achievement, performance highlights            |
| **Orange**   | `#f97316` | Camera devices, secondary warning              |

### Gradient System

| Name                | Definition                                                     | Usage                                     |
| ------------------- | -------------------------------------------------------------- | ----------------------------------------- |
| **Brand Gradient**  | `linear-gradient(135deg, #3b82f6, #0ea5e9, #14b8a6)`           | Hero text, premium buttons, progress bars |
| **Slate**           | `linear-gradient(135deg, #475569, #334155)`                    | Neutral cards, dark surfaces              |
| **Indigo**          | `linear-gradient(135deg, #0284c7, #2563eb)`                    | Active states, highlights                 |
| **Teal**            | `linear-gradient(135deg, #0d9488, #14b8a6)`                    | Success states                            |
| **Mesh Background** | `radial-gradient(ellipse, rgba(14,165,233,0.08), transparent)` | Subtle page backdrop                      |

### Dark Theme

| Token                    | Hex                      | Usage                  |
| ------------------------ | ------------------------ | ---------------------- |
| **Background Primary**   | `#050810`                | Main app background    |
| **Background Secondary** | `#0c1120`                | Cards, surfaces        |
| **Background Tertiary**  | `#151d2e`                | Hover surfaces, inputs |
| **Background Hover**     | `#1e2942`                | Interactive hover      |
| **Background Elevated**  | `#1a2338`                | Modals, dialogs        |
| **Text Primary**         | `#f1f5f9`                | Headings, body         |
| **Text Secondary**       | `#94a3b8`                | Labels, descriptions   |
| **Text Muted**           | `#64748b`                | Captions, placeholders |
| **Border**               | `rgba(255,255,255,0.08)` | Card/component borders |
| **Card Background**      | `rgba(12,17,32,0.8)`     | Glass card fill        |
| **Glass Background**     | `rgba(12,17,32,0.7)`     | Glassmorphism panels   |
| **Glass Border**         | `rgba(255,255,255,0.08)` | Glassmorphism borders  |

### Light Theme

| Token                    | Hex                     | Usage             |
| ------------------------ | ----------------------- | ----------------- |
| **Background Primary**   | `#f9fafb`               | Main background   |
| **Background Secondary** | `#ffffff`               | Cards, surfaces   |
| **Background Tertiary**  | `#f3f4f6`               | Hover, inputs     |
| **Background Hover**     | `#e5e7eb`               | Interactive hover |
| **Text Primary**         | `#111827`               | Headings, body    |
| **Text Secondary**       | `#6b7280`               | Labels            |
| **Text Muted**           | `#9ca3af`               | Captions          |
| **Border**               | `#e5e7eb`               | Borders           |
| **Glass Background**     | `rgba(255,255,255,0.9)` | Glass panels      |
| **Glass Border**         | `rgba(229,231,235,0.8)` | Glass borders     |

### Device Type Colors (Consistent across themes)

| Device       | Hex       | Token                    |
| ------------ | --------- | ------------------------ |
| Router       | `#3b82f6` | `--color-device-router`  |
| Switch       | `#10b981` | `--color-device-switch`  |
| Access Point | `#0ea5e9` | `--color-device-ap`      |
| Server       | `#f59e0b` | `--color-device-server`  |
| PC           | `#6b7280` | `--color-device-pc`      |
| Mobile       | `#14b8a6` | `--color-device-mobile`  |
| IoT          | `#ef4444` | `--color-device-iot`     |
| Printer      | `#14b8a6` | `--color-device-printer` |
| Camera       | `#f97316` | `--color-device-camera`  |
| Unknown      | `#9ca3af` | `--color-device-unknown` |

### Status Colors

| Status           | Dark                  | Light     |
| ---------------- | --------------------- | --------- |
| Online / Success | `#22c55e` / `#059669` | `#047857` |
| Offline / Error  | `#ef4444` / `#dc2626` | `#b91c1c` |
| Warning          | `#f59e0b` / `#d97706` | `#b45309` |
| Info             | `#0ea5e9` / `#0284c7` | `#0369a1` |

---

## 3. Typography

| Property           | Value                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------ |
| **Primary Font**   | Inter                                                                                      |
| **Fallback**       | `-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif` |
| **Monospace**      | Geist Mono → `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas`                       |
| **Font Smoothing** | `antialiased` (WebKit + Moz)                                                               |
| **User Select**    | Disabled globally, enabled on inputs/code blocks                                           |

### Sizing Guidelines (for landing page)

| Element          | Size    | Weight           |
| ---------------- | ------- | ---------------- |
| Hero Title       | 48–64px | 800 (Extra Bold) |
| Section Heading  | 28–32px | 700 (Bold)       |
| Sub-heading      | 18–20px | 600 (Semibold)   |
| Body             | 16px    | 400 (Regular)    |
| Caption / Label  | 12–14px | 500 (Medium)     |
| Code / Monospace | 14px    | 400              |

---

## 4. Visual Effects & Motion

### Glassmorphism

- **Backdrop blur:** `blur(20px) saturate(180%)`
- **Background:** Semi-transparent with theme-aware opacity
- **Border:** 1px solid with low-opacity white/gray
- **Shadow:** Layered (ambient + inset highlight)

### Glow Effects

- **Blue glow:** `0 0 30px rgba(59, 130, 246, 0.4), 0 0 60px rgba(59, 130, 246, 0.2)`
- **Purple glow:** `0 0 30px rgba(14, 165, 233, 0.4)`
- **Green glow:** `0 0 30px rgba(16, 185, 129, 0.4)`
- Use for CTAs, active states, and premium card hover

### Animations

| Effect          | Duration | Easing      | Usage                         |
| --------------- | -------- | ----------- | ----------------------------- |
| Float           | 4s       | ease-in-out | Hero elements, badges         |
| Shimmer         | 2s       | ease-in-out | Progress bars, loading states |
| Fade Pulse      | 3s       | ease-in-out | Status dots, loading text     |
| Card Hover      | 0.3s     | ease        | Cards lift 2px + glow border  |
| Page Transition | 0.3s     | spring      | Framer Motion page enters     |

### Noise Texture

SVG fractal noise overlay at 2.5% opacity (dark) / 1.5% opacity (light) for organic premium feel.

---

## 5. Features (Marketing Copy)

### Hero Feature: Network Discovery

> Scan your entire local network in seconds. NEXUS uses ARP, ICMP, and TCP probes simultaneously to find every device — even those hiding behind firewalls.

### Feature Grid (suggested 2×3 or 3×2 cards)

| Icon | Title                       | Description                                                                                       |
| ---- | --------------------------- | ------------------------------------------------------------------------------------------------- |
| 🔍   | **Multi-Protocol Scanning** | ARP + ICMP + TCP + SNMP + mDNS. Layer-2 through Layer-7 discovery in a single sweep.              |
| 🗺️   | **Interactive Topology**    | Drag, zoom, and explore your network's connection graph with automatic hierarchical layout.       |
| 🛡️   | **Security Grading**        | Every device gets an A–F security grade based on open ports, vulnerabilities, and risk profile.   |
| 📡   | **24/7 Monitoring**         | Background monitor catches new devices, IP changes, and disappearances in real time.              |
| 📊   | **Health Dashboard**        | Composite health score combining security, stability, and compliance into one number.             |
| 📤   | **Export Everything**       | CSV, JSON, and professional PDF reports — scan results, security assessments, device inventories. |

### Secondary Features (bullet list or smaller cards)

- **OS Fingerprinting** — TTL-based operating system classification
- **Device Type Inference** — Auto-detects routers, PCs, phones, IoT, cameras, printers
- **MAC Vendor Lookup** — IEEE OUI database with randomized-MAC detection
- **Built-in Ping & Port Scanner** — Network tools without leaving the app
- **Alert Deduplication** — Smart noise reduction with composite dedupe keys
- **AES-256-GCM Encryption** — Database exports encrypted with machine-bound keys
- **Demo Mode** — Pre-loaded mock data for showcasing the app without a live network
- **Command Palette** — `Ctrl+K` instant navigation to any page or action

---

## 6. System Architecture

### Layered Design

```
┌────────────────────────────────────────────────┐
│  NEXUS Desktop Application                     │
│                                                │
│  ┌──────────────────────────────────────────┐  │
│  │ PRESENTATION LAYER                       │  │
│  │ React 19 + TypeScript + Vite             │  │
│  │ Tailwind CSS 4 · Framer Motion           │  │
│  │ React Flow · Recharts · cmdk             │  │
│  │ 9 Pages · 30+ Components                 │  │
│  └────────────────┬─────────────────────────┘  │
│                   │ Tauri IPC                   │
│  ┌────────────────┴─────────────────────────┐  │
│  │ BRIDGE LAYER                             │  │
│  │ Tauri v2 · 30+ Typed Commands            │  │
│  │ State Management · Event Emission        │  │
│  └────────────────┬─────────────────────────┘  │
└───────────────────┼─────────────────────────────┘
                    │
┌───────────────────┴─────────────────────────────┐
│ CORE ENGINE (nexus-core · Rust Library)         │
│                                                 │
│ ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│ │ Scanner  │ │ Network  │ │ Database         │ │
│ │ ARP      │ │ Device   │ │ SQLite + Schema  │ │
│ │ ICMP     │ │ DNS      │ │ Encryption       │ │
│ │ TCP      │ │ Vendor   │ │ Migrations       │ │
│ │ SNMP     │ │ Subnet   │ │ Queries          │ │
│ │ Passive  │ │ Infer    │ │                  │ │
│ └──────────┘ └──────────┘ └──────────────────┘ │
│ ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│ │ Monitor  │ │ Alerts   │ │ Insights         │ │
│ │ Watcher  │ │ Detector │ │ Health Scoring   │ │
│ │ Events   │ │ Dedupe   │ │ Security Grade   │ │
│ │ Passive  │ │ Types    │ │ Recommendations  │ │
│ │ Scan     │ │          │ │ Vuln Filtering   │ │
│ └──────────┘ └──────────┘ └──────────────────┘ │
│ ┌──────────────────────────────────────────┐   │
│ │ Exports: CSV · JSON · PDF                │   │
│ │ Logging: Tracing + File Appender         │   │
│ └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### Data Flow

```
User clicks "Scan" → Tauri IPC → AppContext creates scan
  → ARP packets sent via pnet (raw sockets)
  → Responses collected → ICMP pings in parallel (surge-ping)
  → TCP port probes (tokio::net) → DNS reverse lookup
  → SNMP enrichment (optional) → mDNS passive merge
  → Device type inference + risk scoring + security grading
  → Results persisted to SQLite + alerts generated
  → ScanResult emitted via Tauri event → UI renders topology
```

---

## 7. How It Works (User Flow)

### Step 1: Install

Download the native installer for your platform. No Docker, no cloud accounts, no subscriptions.

### Step 2: Scan

Click **Start Scan** — NEXUS sends ARP/ICMP/TCP probes across your subnet and discovers every device within seconds. Each device is classified, graded, and risk-scored automatically.

### Step 3: Explore

View your network as an **interactive topology graph** or a sortable **device table**. Click any device for full details: IP, MAC, vendor, OS guess, open ports, security grade, and vulnerability matches.

### Step 4: Monitor

Enable **background monitoring** — NEXUS continuously scans at configurable intervals and pushes alerts when devices join, leave, change IP, or expose new ports.

### Step 5: Export

Generate **PDF reports**, export to **CSV/JSON**, or review your network's **health score** on the dashboard. All data stays encrypted on your machine.

---

## 8. Tech Stack (for "Built With" section)

### Core

| Technology     | Version           | Purpose                                 |
| -------------- | ----------------- | --------------------------------------- |
| **Rust**       | Stable (2024 ed.) | Core scanning engine, security analysis |
| **Tauri**      | v2                | Native desktop shell, IPC bridge        |
| **React**      | 19                | Frontend UI framework                   |
| **TypeScript** | 5.8+              | Type-safe frontend development          |
| **Vite**       | 7+                | Build tool and dev server               |

### UI

| Library                        | Purpose                            |
| ------------------------------ | ---------------------------------- |
| **Tailwind CSS 4**             | Utility-first styling              |
| **Framer Motion**              | Page transitions, micro-animations |
| **Recharts**                   | Interactive charts and graphs      |
| **@xyflow/react**              | Topology graph visualization       |
| **dagre**                      | Hierarchical graph layout          |
| **cmdk**                       | Command palette (Ctrl+K)           |
| **lucide-react**               | Icon library                       |
| **sonner**                     | Toast notifications                |
| **react-countup**              | Animated number counters           |
| **react-circular-progressbar** | Gauge widgets                      |
| **@tanstack/react-virtual**    | Virtualized list rendering         |

### Networking

| Crate          | Purpose                  |
| -------------- | ------------------------ |
| **pnet**       | Raw ARP packet crafting  |
| **surge-ping** | Async ICMP ping          |
| **snmp2**      | SNMPv2c device polling   |
| **mdns-sd**    | Multicast DNS discovery  |
| **dns-lookup** | Reverse DNS resolution   |
| **mac_oui**    | IEEE OUI vendor database |

### Data & Security

| Crate        | Purpose                   |
| ------------ | ------------------------- |
| **rusqlite** | SQLite database (bundled) |
| **aes-gcm**  | AES-256-GCM encryption    |
| **argon2**   | Key derivation (Argon2id) |
| **chrono**   | Date/time handling        |
| **serde**    | Serialization framework   |

### DevOps

| Tool               | Purpose                          |
| ------------------ | -------------------------------- |
| **GitHub Actions** | CI/CD pipeline                   |
| **tauri-action**   | Cross-platform build and release |
| **vitest**         | Frontend unit testing            |
| **eslint**         | Code linting                     |

---

## 9. Key Differentiators

| Differentiator              | Description                                                                         |
| --------------------------- | ----------------------------------------------------------------------------------- |
| ⚡ **Rust Performance**     | Native-speed scanning — no Python GIL, no Electron overhead                         |
| 🔒 **Privacy-First**        | All data stays local. AES-256-GCM encrypted exports. No cloud, no telemetry.        |
| 🖥️ **Truly Cross-Platform** | Single codebase produces native installers for Windows, Linux, and macOS            |
| 🧠 **AI-Ready**             | Architecture supports Ollama (local) and Gemini (API) for natural-language analysis |
| 🎨 **Premium UX**           | Glassmorphism, mesh gradients, micro-animations — not a typical developer tool UI   |
| 📊 **Holistic View**        | Discovery + Security + Monitoring + Reporting in one app                            |
| 🔧 **Zero Config**          | Install → Scan. No Docker, no YAML files, no cloud accounts                         |

---

## 10. Platform Support

| Platform    | Installer                   | Architecture          | Requirements                   |
| ----------- | --------------------------- | --------------------- | ------------------------------ |
| **Windows** | `.msi` (WiX), `.exe` (NSIS) | x64                   | Npcap, Administrator           |
| **Linux**   | `.AppImage`, `.deb`         | x64                   | libpcap-dev, libwebkit2gtk-4.1 |
| **macOS**   | `.dmg`, `.app`              | Intel + Apple Silicon | Xcode CLI Tools                |

---

## 11. Pages & Screens

| Page                | Purpose           | Key Components                                                             |
| ------------------- | ----------------- | -------------------------------------------------------------------------- |
| **Dashboard**       | Overview hub      | Bento grid, stat cards, health gauge, charts, recent alerts, quick actions |
| **Topology View**   | Network graph     | Interactive React Flow canvas, device nodes, connection edges              |
| **Device List**     | Device inventory  | Sortable/filterable table, device detail modal                             |
| **Vulnerabilities** | Security overview | CVE matches, port warnings, security grades                                |
| **Alerts**          | Event log         | Timeline of network events, read/unread status, bulk actions               |
| **Tools**           | Network utilities | Ping, Port Scanner, MAC Lookup — tabbed interface                          |
| **Reports**         | Export center     | Generate and download CSV, JSON, PDF reports                               |
| **Settings**        | Configuration     | Scan interval, auto-start monitoring, theme toggle, interface selection    |

---

## 12. Screenshots & Assets Guidance

### Naming Convention

```
nexus-dashboard-dark.png
nexus-dashboard-light.png
nexus-topology-dark.png
nexus-scan-progress.png
nexus-device-detail.png
nexus-alerts.png
nexus-security-grades.png
nexus-tools-ping.png
nexus-export-pdf.png
nexus-splash.png
```

### Recommended Screenshot Set (for landing page)

1. **Hero shot** — Dashboard in dark mode (full window)
2. **Topology** — Network graph with 10+ devices
3. **Device detail** — Modal showing full device information
4. **Security** — Vulnerabilities page with A–F grades
5. **Monitoring** — Alerts page showing live events
6. **Light mode** — Dashboard in light theme (shows versatility)
7. **Splash** — App launch / splash screen

### Asset Colors for Marketing

- Hero gradient: `linear-gradient(135deg, #6366f1, #0ea5e9, #14b8a6)` ← brand gradient
- CTA button: `linear-gradient(135deg, #3b82f6, #0ea5e9)` ← blue → sky
- Background: `#050810` (dark) or `#f9fafb` (light)

---

## 13. Copy Snippets (for landing page sections)

### Hero

> **See your network. Secure it. Monitor it.**
>
> NEXUS discovers every device on your local network, grades their security,
> and watches for changes — all from one native desktop app.

### About

> Built with Rust for raw performance and Tauri for a native desktop experience,
> NEXUS combines multi-protocol network scanning, interactive topology mapping,
> and AI-ready security analysis into a single, privacy-first application.

### CTA

> Download NEXUS — free, open, and built for professionals who demand visibility.

### Stats Bar (suggested)

> **30+** Tauri Commands · **20+** Ports Scanned · **9** Full Pages · **3** Platforms

---

_Generated for NEXUS v0.1.0 · February 2026_
