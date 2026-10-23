import React from 'react';
import {
  LayoutDashboard,
  BedDouble,
  Presentation,
  GraduationCap,
  FolderKanban,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Building2,
} from 'lucide-react';
import { useFacility } from '../context/FacilityContext';
import { ActiveModule } from '../types/facility';

interface NavItem {
  id: ActiveModule;
  label: string;
  shortLabel: string;
  icon: React.FC<{ className?: string }>;
  countKey?: 'dormitory' | 'meeting' | 'classroom' | 'directory';
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard Overview',
    shortLabel: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'dormitory',
    label: 'Dormitory & Guest Rooms',
    shortLabel: 'Dormitory',
    icon: BedDouble,
    countKey: 'dormitory',
  },
  {
    id: 'meeting',
    label: 'Meeting & Auditorium',
    shortLabel: 'Meetings',
    icon: Presentation,
    countKey: 'meeting',
  },
  {
    id: 'classrooms',
    label: 'Classrooms & Training',
    shortLabel: 'Classrooms',
    icon: GraduationCap,
    countKey: 'classroom',
  },
  {
    id: 'directory',
    label: 'Master Booking Directory',
    shortLabel: 'Directory',
    icon: FolderKanban,
    countKey: 'directory',
  },
  {
    id: 'settings',
    label: 'Rates & System Settings',
    shortLabel: 'Settings',
    icon: Settings,
  },
];

export const Sidebar: React.FC = () => {
  const {
    theme,
    activeModule,
    setActiveModule,
    sidebarCollapsed,
    setSidebarCollapsed,
    kpis,
    bookings,
  } = useFacility();

  const activeBookingsCount = bookings.filter((b) => b.status !== 'Cancelled').length;

  const getBadgeCount = (key?: NavItem['countKey']) => {
    if (!key) return null;
    if (key === 'directory') return activeBookingsCount;
    return kpis.activeByFacility[key];
  };

  return (
    <aside
      aria-label="Primary Facility Navigation"
      className={`h-screen flex flex-col shrink-0 border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 select-none ${
        sidebarCollapsed ? 'w-18' : 'w-[268px]'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveModule('dashboard')}
          className="flex items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg overflow-hidden"
        >
          <div className="w-9 h-9 rounded-lg bg-slate-900 dark:bg-slate-800 border border-slate-700/50 flex items-center justify-center p-1.5 text-white shrink-0 shadow-sm overflow-hidden">
            <img
              src="/syntor-it-logo/PNG/logo.png"
              alt="Syntor IT"
              className="w-full h-full object-contain"
            />
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <span className="block font-display font-bold text-base tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap">
                Syntor It
              </span>
              <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Facility & Booking Desk
              </span>
            </div>
          )}
        </button>

        <button
          type="button"
          onClick={() => setSidebarCollapsed((prev) => !prev)}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors shrink-0"
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-2.5 space-y-1 overflow-y-auto" aria-label="Facility Modules">
        {!sidebarCollapsed && (
          <div className="px-2.5 pb-2 text-[11px] font-medium text-slate-400 dark:text-slate-500">
            Core Modules
          </div>
        )}
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeModule === item.id;
          const count = getBadgeCount(item.countKey);

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveModule(item.id)}
              title={sidebarCollapsed ? item.label : undefined}
              aria-current={isActive ? 'page' : undefined}
              className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                />
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </div>

              {!sidebarCollapsed && count !== null && (
                <span
                  className={`font-mono text-xs tabular-nums ${
                    isActive
                      ? 'text-indigo-600 dark:text-indigo-300 font-semibold'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Live Desk Capacity Summary Footer */}
      <div className="p-3 border-t border-slate-200/80 dark:border-slate-800">
        {!sidebarCollapsed ? (
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-1.5">
              <span>Live Capacity Load</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                {kpis.occupancyRatePercent}%
              </span>
            </div>
            <progress
              value={Math.min(100, kpis.occupancyRatePercent)}
              max={100}
              className="w-full h-1.5 rounded-full overflow-hidden mb-2 accent-indigo-600 dark:accent-indigo-500"
            />
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              <span>{kpis.availableTodayCount} Open</span>
              <span>·</span>
              <span>{kpis.occupiedTodayCount} In Use</span>
              <span>·</span>
              <span>{kpis.maintenanceCount} Maint</span>
            </div>
          </div>
        ) : (
          <div
            className="flex flex-col items-center py-1 text-center font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums"
            title={`Live Occupancy: ${kpis.occupancyRatePercent}%`}
          >
            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
              {kpis.occupancyRatePercent}%
            </span>
            <span className="text-[10px]">Load</span>
          </div>
        )}
      </div>
    </aside>
  );
};
