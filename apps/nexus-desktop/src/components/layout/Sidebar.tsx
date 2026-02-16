import {
  LayoutDashboard,
  Network,
  List,
  Shield,
  Bell,
  Wrench,
  FileText,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { useState } from 'react';
import AdminProfile from './AdminProfile';
import { useSidebarCollapse } from '../../hooks/useSidebarCollapse';
import type { LucideIcon } from 'lucide-react';

type Page = 'dashboard' | 'topology' | 'devices' | 'vulnerabilities' | 'alerts' | 'tools' | 'reports' | 'settings' | 'profile' | 'demo';

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

interface NavItemData {
  id: Page;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

interface NavGroupData {
  title: string;
  items: NavItemData[];
}

const NAV_GROUPS: NavGroupData[] = [
  {
    title: 'MAIN',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'topology', label: 'Topology Map', icon: Network },
      { id: 'devices', label: 'Device List', icon: List },
    ],
  },
  {
    title: 'SECURITY',
    items: [
      { id: 'vulnerabilities', label: 'Vulnerabilities', icon: Shield },
      { id: 'alerts', label: 'Alerts', icon: Bell },
    ],
  },
  {
    title: 'UTILITIES',
    items: [
      { id: 'tools', label: 'Tools', icon: Wrench },
      { id: 'reports', label: 'Reports', icon: FileText },
    ],
  },
  {
    title: 'SYSTEM',
    items: [{ id: 'settings', label: 'Settings', icon: Settings }],
  },
];

export default function Sidebar({ 
  currentPage, 
  onNavigate,
}: SidebarProps) {
  const { isCollapsed, toggle } = useSidebarCollapse();
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const showCollapsedToggle = isCollapsed && isSidebarHovered;
  const sidebarTransition = isCollapsed
    ? ({ type: 'spring', stiffness: 430, damping: 40, mass: 0.62 } as const)
    : ({ type: 'spring', stiffness: 350, damping: 34, mass: 0.72 } as const);

  return (
    <motion.aside
      className={clsx(
        'bg-bg-elevated border-r border-theme relative flex h-full flex-col overflow-x-hidden',
        'will-change-[width]'
      )}
      initial={false}
      animate={{ width: isCollapsed ? 72 : 240 }}
      transition={sidebarTransition}
      onMouseEnter={() => setIsSidebarHovered(true)}
      onMouseLeave={() => setIsSidebarHovered(false)}
    >
      {/* Logo Section */}
      <div className={clsx('h-16 border-b border-theme', isCollapsed ? 'px-2' : 'px-3.5')}>
        {!isCollapsed ? (
          <div className="flex h-full items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="h-9 w-9 shrink-0 flex items-center justify-center">
                <img src="/icon.png" alt="NetMapper Pro" className="w-full h-full object-contain" />
              </div>
              <motion.div
                className="overflow-hidden"
                initial={false}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
              >
                <h1 className="text-[1.38rem] font-bold text-text-primary whitespace-nowrap leading-tight">NetMapper</h1>
                <p className="text-[11px] text-text-muted whitespace-nowrap">Pro Edition</p>
              </motion.div>
            </div>

            <button
              onClick={toggle}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-muted
                         transition-colors hover:bg-bg-hover hover:text-text-primary
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/40"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="relative h-9 w-9">
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                initial={false}
                animate={{
                  opacity: showCollapsedToggle ? 0 : 1,
                  scale: showCollapsedToggle ? 0.92 : 1,
                }}
                transition={{ duration: 0.12, ease: 'easeOut' }}
              >
                <img src="/icon.png" alt="NetMapper Pro" className="h-9 w-9 object-contain" />
              </motion.div>

              <motion.button
                onClick={toggle}
                className="absolute inset-0 flex items-center justify-center rounded-md text-text-muted
                           transition-colors hover:bg-bg-hover hover:text-text-primary
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/40"
                initial={false}
                animate={{
                  opacity: showCollapsedToggle ? 1 : 0,
                  scale: showCollapsedToggle ? 1 : 0.92,
                }}
                transition={{ duration: 0.12, ease: 'easeOut' }}
                style={{ pointerEvents: showCollapsedToggle ? 'auto' : 'none' }}
                tabIndex={showCollapsedToggle ? 0 : -1}
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </motion.button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.title} className="mb-4">
            <motion.div
              className="mb-1.5 h-5 overflow-hidden px-3"
              initial={false}
              animate={{
                opacity: isCollapsed ? 0 : 1,
              }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
              style={{ visibility: isCollapsed ? 'hidden' : 'visible' }}
              aria-hidden={isCollapsed}
            >
              <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
                {group.title}
              </span>
            </motion.div>

            {/* Nav Items */}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                
                return (
                  <motion.button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={clsx(
                      'group relative flex h-10 w-full items-center rounded-lg transition-colors duration-150',
                      isCollapsed ? 'justify-center px-0' : 'gap-2.5 px-3',
                      isActive
                        ? 'bg-accent-blue/10 text-accent-blue font-medium'
                        : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                    )}
                    whileHover={{ x: isCollapsed ? 0 : 2 }}
                    whileTap={{ scale: 0.98 }}
                    title={isCollapsed ? item.label : undefined}
                  >
                    {/* Icon */}
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    
                    <motion.span
                      className="flex-1 overflow-hidden whitespace-nowrap text-left text-[13px] font-medium"
                      initial={false}
                      animate={{
                        maxWidth: isCollapsed ? 0 : 128,
                        opacity: isCollapsed ? 0 : 1,
                        x: isCollapsed ? -6 : 0,
                      }}
                      transition={{
                        maxWidth: { duration: isCollapsed ? 0.1 : 0.16, ease: 'easeOut' },
                        opacity: { duration: 0.1, delay: isCollapsed ? 0 : 0.04 },
                        x: { duration: 0.1, delay: isCollapsed ? 0 : 0.04 },
                      }}
                      aria-hidden={isCollapsed}
                    >
                      {item.label}
                    </motion.span>

                    {/* Badge */}
                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        className={clsx(
                          'bg-accent-red text-white text-xs font-bold rounded-full',
                          isCollapsed 
                            ? 'absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center text-[10px]'
                            : 'px-2 py-0.5'
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                    
                    {/* Active Indicator */}
                    {isActive && (
                      <motion.span
                        layoutId="sidebar-active-indicator"
                        className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full bg-accent-blue"
                        transition={{ type: 'spring', stiffness: 520, damping: 36 }}
                      />
                    )}

                    {/* Tooltip on hover when collapsed */}
                    {isCollapsed && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-bg-elevated border border-theme rounded-md
                                      opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none
                                      whitespace-nowrap text-xs text-text-primary shadow-lg z-50">
                        {item.label}
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Admin Profile */}
      <div>
        <AdminProfile isCollapsed={isCollapsed} />
      </div>
    </motion.aside>
  );
}
