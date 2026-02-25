/**
 * TanStack Router — Code-based route definitions with hash history.
 *
 * Uses hash history (`/#/topology`, `/#/devices`, …) so routing works
 * reliably inside Tauri's `tauri://localhost/` origin as well as the
 * standalone Vite dev-server at `http://localhost:1420`.
 */

import { lazy } from "react";
import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
} from "@tanstack/react-router";
import { createHashHistory } from "@tanstack/history";
import RootLayout from "./App";
import {
  RouterErrorFallback,
  RouterNotFoundFallback,
} from "./components/common/RouterFallbacks";

// ---------------------------------------------------------------------------
// Lazy page imports (kept identical to prior implementation)
// ---------------------------------------------------------------------------
const Dashboard = lazy(() => import("./pages/Dashboard"));
const TopologyView = lazy(() => import("./pages/TopologyView"));
const DeviceList = lazy(() => import("./pages/DeviceList"));
const Settings = lazy(() => import("./pages/Settings"));
const Reports = lazy(() => import("./pages/Reports"));
const Vulnerabilities = lazy(() => import("./pages/Vulnerabilities"));
const Alerts = lazy(() => import("./pages/Alerts"));
const Tools = lazy(() => import("./pages/Tools"));
const RouterControl = lazy(() => import("./pages/RouterControl"));
const ComponentDemo = lazy(() => import("./pages/ComponentDemo"));

// ---------------------------------------------------------------------------
// Page → path mapping (single source of truth)
// ---------------------------------------------------------------------------
export type Page =
  | "dashboard"
  | "topology"
  | "devices"
  | "vulnerabilities"
  | "alerts"
  | "tools"
  | "router"
  | "reports"
  | "settings"
  | "demo";

export const PAGE_PATHS: Record<Page, string> = {
  dashboard: "/",
  topology: "/topology",
  devices: "/devices",
  vulnerabilities: "/vulnerabilities",
  alerts: "/alerts",
  tools: "/tools",
  router: "/router",
  reports: "/reports",
  settings: "/settings",
  demo: "/demo",
};

/** Derive the `Page` key from a pathname (hash-stripped). */
export function pageFromPath(pathname: string): Page {
  const match = (Object.entries(PAGE_PATHS) as [Page, string][]).find(
    ([, path]) => path === pathname,
  );
  return match?.[0] ?? "dashboard";
}

// ---------------------------------------------------------------------------
// Route tree
// ---------------------------------------------------------------------------
const rootRoute = createRootRoute({
  component: RootLayout,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: lazyRouteComponent(() => import("./pages/Dashboard")),
});

const topologyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/topology",
  component: lazyRouteComponent(() => import("./pages/TopologyView")),
});

const devicesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/devices",
  component: lazyRouteComponent(() => import("./pages/DeviceList")),
});

const vulnerabilitiesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/vulnerabilities",
  component: lazyRouteComponent(() => import("./pages/Vulnerabilities")),
});

const alertsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/alerts",
  component: lazyRouteComponent(() => import("./pages/Alerts")),
});

const toolsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/tools",
  component: lazyRouteComponent(() => import("./pages/Tools")),
});

const routerControlRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/router",
  component: lazyRouteComponent(() => import("./pages/RouterControl")),
});

const reportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reports",
  component: lazyRouteComponent(() => import("./pages/Reports")),
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: lazyRouteComponent(() => import("./pages/Settings")),
});

const demoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/demo",
  component: lazyRouteComponent(() => import("./pages/ComponentDemo")),
});

const routeTree = rootRoute.addChildren([
  dashboardRoute,
  topologyRoute,
  devicesRoute,
  vulnerabilitiesRoute,
  alertsRoute,
  toolsRoute,
  routerControlRoute,
  reportsRoute,
  settingsRoute,
  demoRoute,
]);

// ---------------------------------------------------------------------------
// Router instance
// ---------------------------------------------------------------------------
const hashHistory = createHashHistory();

export const router = createRouter({
  routeTree,
  history: hashHistory,
  defaultPreload: "intent",
  defaultErrorComponent: RouterErrorFallback,
  defaultNotFoundComponent: RouterNotFoundFallback,
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Keep lazy imports referenced so tree-shaking doesn't remove them
void Dashboard;
void TopologyView;
void DeviceList;
void Settings;
void Reports;
void Vulnerabilities;
void Alerts;
void Tools;
void RouterControl;
void ComponentDemo;
