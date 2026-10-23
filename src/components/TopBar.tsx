import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Bell,
  Sun,
  Moon,
  Calendar,
  X,
  CheckCheck,
  ArrowUpRight,
  ChevronRight,
  Menu,
} from 'lucide-react';
import { useFacility } from '../context/FacilityContext';
import { ActiveModule } from '../types/facility';
import { formatDateOnly } from '../utils/bookingLogic';

const MODULE_LABELS: Record<ActiveModule, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Executive Dashboard',
    subtitle: 'Live facility utilization, rental revenue ledger, and 48-hour arrival desk feed',
  },
  dormitory: {
    title: 'Dormitory & Guest Room Allocation',
    subtitle: 'AC ($40/day) & Non-AC ($20/day) inventory, multi-day Gantt schedule, and complimentary vs rental billing',
  },
  meeting: {
    title: 'Meeting Rooms & Auditorium Management',
    subtitle: 'Boardrooms, convention halls, AV equipment specs, and commercial slot scheduler',
  },
  classrooms: {
    title: 'Classroom & Training Session Timetable',
    subtitle: 'Multi-room hourly matrix, cohort batch scheduling, and instructor directory',
  },
  directory: {
    title: 'Master Booking Directory & Billing Ledger',
    subtitle: 'Unified historical, active, and upcoming reservation registry across all facility assets',
  },
  settings: {
    title: 'Facility Rate Tiers & System Configuration',
    subtitle: 'Manage standard daily rates, commercial add-on fees, and demo dataset controls',
  },
};

export const TopBar: React.FC<{ onMobileMenuToggle: () => void }> = ({ onMobileMenuToggle }) => {
  const {
    theme,
    toggleTheme,
    activeModule,
    setActiveModule,
    referenceDate,
    setReferenceDate,
    rooms,
    bookings,
    notifications,
    markAllNotificationsRead,
    markNotificationRead,
    globalSearch,
    setGlobalSearch,
    setSelectedSlipBooking,
    openQuickAllocationForRoom,
    kpis,
  } = useFacility();

  const [notifOpen, setNotifOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const trimmedQuery = globalSearch.trim().toLowerCase();
  const matchingRooms = trimmedQuery
    ? rooms
        .filter(
          (r) =>
            r.name.toLowerCase().includes(trimmedQuery) ||
            r.code.toLowerCase().includes(trimmedQuery) ||
            r.type.toLowerCase().includes(trimmedQuery) ||
            r.acStatus.toLowerCase().includes(trimmedQuery)
        )
        .slice(0, 4)
    : [];

  const matchingBookings = trimmedQuery
    ? bookings
        .filter(
          (b) =>
            b.id.toLowerCase().includes(trimmedQuery) ||
            b.guestName.toLowerCase().includes(trimmedQuery) ||
            b.assetName.toLowerCase().includes(trimmedQuery) ||
            b.departmentOrOrg.toLowerCase().includes(trimmedQuery) ||
            (b.batchCode && b.batchCode.toLowerCase().includes(trimmedQuery)) ||
            (b.instructorName && b.instructorName.toLowerCase().includes(trimmedQuery))
        )
        .slice(0, 5)
    : [];

  const currentMeta = MODULE_LABELS[activeModule];

  return (
    <>
      <header className="h-16 px-4 lg:px-8 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-4 shrink-0">
        {/* Left Zone: Mobile Menu + Breadcrumb Trail */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onMobileMenuToggle}
            aria-label="Toggle navigation menu"
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Menu className="w-5 h-5" />
          </button>

          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm min-w-0">
            <button
              type="button"
              onClick={() => setActiveModule('dashboard')}
              className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors whitespace-nowrap hidden sm:inline"
            >
              Facility Admin
            </button>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0 hidden sm:inline" />
            <span className="font-display font-semibold text-slate-900 dark:text-slate-100 truncate">
              {currentMeta.title}
            </span>
          </nav>
        </div>

        {/* Center Zone: Global Search Input across Rooms, Booking IDs & Guests */}
        <div ref={searchContainerRef} className="relative flex-1 max-w-md">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
            <input
              type="search"
              value={globalSearch}
              onFocus={() => setSearchFocused(true)}
              onChange={(e) => {
                setGlobalSearch(e.target.value);
                setSearchFocused(true);
              }}
              placeholder="Search room (301), booking (#BK-1082), guest, batch..."
              aria-label="Global Search across rooms, booking IDs, and guests"
              className="w-full pl-9 pr-8 py-1.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all"
            />
            {globalSearch && (
              <button
                type="button"
                onClick={() => setGlobalSearch('')}
                aria-label="Clear search query"
                className="absolute right-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Instant Global Search Results Popover */}
          {searchFocused && trimmedQuery.length > 0 && (
            <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden max-h-96 overflow-y-auto">
              {matchingRooms.length === 0 && matchingBookings.length === 0 ? (
                <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                  No rooms or bookings matching "{globalSearch}"
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {matchingRooms.length > 0 && (
                    <div className="p-2">
                      <div className="px-2 py-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                        Facility Spaces ({matchingRooms.length})
                      </div>
                      {matchingRooms.map((room) => (
                        <button
                          key={room.id}
                          type="button"
                          onClick={() => {
                            openQuickAllocationForRoom(room.id);
                            setSearchFocused(false);
                          }}
                          className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors"
                        >
                          <div>
                            <div className="text-sm font-medium text-slate-800 dark:text-slate-100">
                              {room.name}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {room.code} · {room.floor} · {room.acStatus} · Cap {room.capacity}
                            </div>
                          </div>
                          <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                            Allocate <ArrowUpRight className="w-3.5 h-3.5" />
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {matchingBookings.length > 0 && (
                    <div className="p-2">
                      <div className="px-2 py-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                        Reservations & Ledger ({matchingBookings.length})
                      </div>
                      {matchingBookings.map((bk) => (
                        <button
                          key={bk.id}
                          type="button"
                          onClick={() => {
                            setSelectedSlipBooking(bk);
                            setSearchFocused(false);
                          }}
                          className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                              <span className="font-mono text-indigo-600 dark:text-indigo-400 mr-1.5">
                                #{bk.id}
                              </span>
                              {bk.guestName}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {bk.assetName} · {bk.status} ·{' '}
                              {bk.allocationNature === 'official_admin'
                                ? 'Official ($0)'
                                : `$${bk.totalCost}`}
                            </div>
                          </div>
                          <span className="text-xs text-slate-400 shrink-0">View Slip</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="p-2 bg-slate-50 dark:bg-slate-950/60 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveModule('directory');
                        setSearchFocused(false);
                      }}
                      className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline px-2 py-1"
                    >
                      View all results in Master Directory →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Zone: Desk Date Selector, Quick Status Metrics, Notifications, Theme Toggle */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Quick Status Summary (Desktop) */}
          <div className="hidden xl:flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 pr-2 border-r border-slate-200 dark:border-slate-800 font-mono tabular-nums">
            <span>
              Avail: <strong className="text-emerald-600 dark:text-emerald-400">{kpis.availableTodayCount}</strong>
            </span>
            <span>·</span>
            <span>
              Occ: <strong className="text-indigo-600 dark:text-indigo-400">{kpis.occupiedTodayCount}</strong>
            </span>
            <span>·</span>
            <span>
              Arrivals: <strong className="text-amber-600 dark:text-amber-400">{kpis.pendingArrivalsTodayCount}</strong>
            </span>
          </div>

          {/* Active Desk Date Picker */}
          <div className="hidden md:flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <label htmlFor="desk-reference-date" className="sr-only">
              Active Desk Date
            </label>
            <input
              id="desk-reference-date"
              type="date"
              value={referenceDate}
              onChange={(e) => {
                if (e.target.value) setReferenceDate(e.target.value);
              }}
              className="text-xs font-mono tabular-nums bg-transparent text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
            />
          </div>

          {/* Notification Center Trigger */}
          <button
            type="button"
            onClick={() => setNotifOpen(true)}
            aria-label={`Open notifications (${unreadCount} unread)`}
            className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-indigo-600 text-white font-mono text-[10px] font-semibold flex items-center justify-center tabular-nums">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors whitespace-nowrap"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden sm:inline">Dark</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Secondary Context Bar */}
      <div className="px-4 lg:px-8 py-2.5 bg-slate-100/70 dark:bg-slate-900/50 border-b border-slate-200/70 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-400">
        <p className="truncate">{currentMeta.subtitle}</p>
        <div className="flex items-center gap-3 font-mono tabular-nums shrink-0">
          <span>Desk Date: {formatDateOnly(referenceDate)}</span>
          <span>·</span>
          <span>
            Paid Rental Ledger:{' '}
            <strong className="text-slate-900 dark:text-slate-100">
              ${kpis.totalRentalRevenue.toLocaleString()}
            </strong>
          </span>
        </div>
      </div>

      {/* Notification Center Slide-Over Drawer */}
      {notifOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-label="Notification Center"
        >
          <div className="w-full max-w-md bg-white dark:bg-slate-900 h-full border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="font-display font-semibold text-base text-slate-900 dark:text-slate-100">
                  Desk Notifications & Alerts
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Real-time check-in alerts, maintenance flags, and billing updates
                </p>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllNotificationsRead}
                    className="flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline px-2 py-1"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setNotifOpen(false)}
                  aria-label="Close notifications drawer"
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  No notifications recorded.
                </div>
              ) : (
                notifications.map((n) => {
                  const relatedBk = n.relatedBookingId
                    ? bookings.find((b) => b.id === n.relatedBookingId)
                    : undefined;

                  return (
                    <div
                      key={n.id}
                      onClick={() => markNotificationRead(n.id)}
                      className={`p-4 transition-colors cursor-pointer ${
                        n.read
                          ? 'bg-white dark:bg-slate-900'
                          : 'bg-indigo-50/40 dark:bg-indigo-950/20'
                      } hover:bg-slate-50 dark:hover:bg-slate-800/50`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {n.title}
                        </span>
                        {!n.read && (
                          <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-semibold shrink-0">
                            New
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-2">
                        {n.message}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span>{n.timestamp}</span>
                        {relatedBk && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              markNotificationRead(n.id);
                              setSelectedSlipBooking(relatedBk);
                              setNotifOpen(false);
                            }}
                            className="text-indigo-600 dark:text-indigo-400 hover:underline font-sans font-medium"
                          >
                            Open Slip #{relatedBk.id} →
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
