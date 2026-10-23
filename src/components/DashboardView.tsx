import React, { useState } from 'react';
import {
  Building,
  CalendarCheck2,
  DollarSign,
  UserCheck,
  ArrowRight,
  Clock,
  CheckCircle2,
  Wrench,
  Plus,
  FileText,
} from 'lucide-react';
import { useFacility } from '../context/FacilityContext';
import { FacilityType, RoomOperationalStatus } from '../types/facility';
import {
  formatShortDateTime,
  getRoomLiveStatus,
} from '../utils/bookingLogic';

export const DashboardView: React.FC = () => {
  const {
    rooms,
    bookings,
    referenceDate,
    kpis,
    setActiveModule,
    openQuickAllocationForRoom,
    setSelectedSlipBooking,
    updateBookingStatus,
  } = useFacility();

  const [categoryFilter, setCategoryFilter] = useState<FacilityType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<RoomOperationalStatus | 'all'>('all');

  // Filter rooms for Live Facility Quick-Status Board
  const filteredBoardRooms = rooms.filter((room) => {
    if (categoryFilter !== 'all' && room.type !== categoryFilter) return false;
    if (statusFilter !== 'all') {
      const live = getRoomLiveStatus(room, bookings, referenceDate);
      if (live.status !== statusFilter) return false;
    }
    return true;
  });

  // Chronological Upcoming Timeline Feed (Next 48 Hours from referenceDate)
  const timelineStartMs = new Date(`${referenceDate}T00:00:00`).getTime();
  const timelineEndMs = timelineStartMs + 72 * 60 * 60 * 1000; // 72h window around desk date

  const upcomingTimeline = bookings
    .filter((b) => {
      if (b.status === 'Cancelled' || b.status === 'Completed') return false;
      const startMs = new Date(b.startDateTime).getTime();
      const endMs = new Date(b.endDateTime).getTime();
      return endMs >= timelineStartMs && startMs <= timelineEndMs;
    })
    .sort(
      (a, b) =>
        new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
    );

  return (
    <div className="space-y-8">
      {/* Top Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-900 dark:text-slate-100 tracking-tight">
            Facility Operations Overview
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Real-time room occupancy, rental billing ledger, and arrival dispatch for{' '}
            <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
              {referenceDate}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setActiveModule('directory')}
            className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            Open Billing Ledger
          </button>
          <button
            type="button"
            onClick={() => openQuickAllocationForRoom('DORM-102')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            New Room Allocation
          </button>
        </div>
      </div>

      {/* 4 KPI Metric Cards */}
      <section aria-label="Key Performance Indicators" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Occupancy Rate */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Today's Occupancy Rate
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono font-bold text-3xl text-slate-900 dark:text-slate-100 tabular-nums">
                {kpis.occupancyRatePercent}%
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                ({kpis.occupiedTodayCount}/{kpis.bookableRooms} active spaces)
              </span>
            </div>
            <progress
              value={Math.min(100, kpis.occupancyRatePercent)}
              max={100}
              className="w-full h-1.5 rounded-full overflow-hidden mt-3 accent-indigo-600 dark:accent-indigo-500"
            />
            <div className="mt-2.5 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              {kpis.availableTodayCount} Available · {kpis.maintenanceCount} Maintenance
            </div>
          </div>
        </div>

        {/* Card 2: Active Allocations Split */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Active Allocations
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CalendarCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono font-bold text-3xl text-slate-900 dark:text-slate-100 tabular-nums">
                {kpis.activeAllocationsTotal}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                ongoing & confirmed
              </span>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-mono tabular-nums">
              <span>Dorms: {kpis.activeByFacility.dormitory}</span>
              <span>·</span>
              <span>Meetings: {kpis.activeByFacility.meeting}</span>
              <span>·</span>
              <span>Class: {kpis.activeByFacility.classroom}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Rental Revenue */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Rental Revenue (Paid)
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono font-bold text-3xl text-slate-900 dark:text-slate-100 tabular-nums">
                ${kpis.totalRentalRevenue.toLocaleString()}
              </span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                ${kpis.todayRentalRevenue.toLocaleString()} active today
              </span>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400">
              Official / Admin allocations billed at $0.00
            </div>
          </div>
        </div>

        {/* Card 4: Pending Check-ins / Arrivals */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Pending Requests & Check-Ins
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono font-bold text-3xl text-slate-900 dark:text-slate-100 tabular-nums">
                {kpis.pendingArrivalsTodayCount}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                awaiting desk action
              </span>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Scheduled for arrival verification
              </span>
              <button
                type="button"
                onClick={() => setActiveModule('directory')}
                className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
              >
                Review <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Split: Live Facility Quick-Status Board (8 cols) + Upcoming 48h Timeline Feed (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Live Facility Quick-Status Board */}
        <section
          aria-label="Live Facility Quick-Status Board"
          className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden"
        >
          <div className="p-5 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display font-semibold text-base text-slate-900 dark:text-slate-100">
                Live Facility Quick-Status Board
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time availability across Dormitories, Meeting Venues, and Classrooms for immediate desk check-in
              </p>
            </div>

            {/* Interactive Segmented Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200/60 dark:border-slate-800">
                {(
                  [
                    { id: 'all', label: 'All (16)' },
                    { id: 'dormitory', label: 'Dorms (8)' },
                    { id: 'meeting', label: 'Meetings (4)' },
                    { id: 'classroom', label: 'Classrooms (4)' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setCategoryFilter(tab.id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                      categoryFilter === tab.id
                        ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <select
                aria-label="Filter rooms by operational status"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as RoomOperationalStatus | 'all')
                }
                className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              >
                <option value="all">All Statuses</option>
                <option value="Available">Available Only</option>
                <option value="Occupied">Occupied Only</option>
                <option value="Maintenance">Under Maintenance</option>
              </select>
            </div>
          </div>

          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredBoardRooms.map((room) => {
              const live = getRoomLiveStatus(room, bookings, referenceDate);
              const bk = live.currentBooking;

              return (
                <div
                  key={room.id}
                  className="p-4 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                          {room.code} · {room.acStatus} · Cap {room.capacity}
                        </span>
                        <h3 className="font-display font-semibold text-sm text-slate-900 dark:text-slate-100 mt-0.5">
                          {room.name}
                        </h3>
                      </div>

                      <span
                        className={`text-xs font-mono font-semibold whitespace-nowrap ${
                          live.status === 'Available'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : live.status === 'Occupied'
                            ? 'text-indigo-600 dark:text-indigo-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {live.status}
                      </span>
                    </div>

                    {live.status === 'Occupied' && bk ? (
                      <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
                        <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          {bk.guestName}{' '}
                          <span className="font-mono text-slate-400">({bk.id})</span>
                        </div>
                        <div className="font-mono text-[11px] text-slate-500 tabular-nums">
                          {formatShortDateTime(bk.startDateTime)} →{' '}
                          {formatShortDateTime(bk.endDateTime)}
                        </div>
                      </div>
                    ) : live.status === 'Maintenance' ? (
                      <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/80 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{room.description}</span>
                      </div>
                    ) : (
                      <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        Rate: ${room.baseDailyRate}/day
                        {room.hourlyRate ? ` · $${room.hourlyRate}/hr` : ''} · {room.floor}
                      </div>
                    )}
                  </div>

                  {/* Quick Desk Footer Action */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 capitalize">
                      {room.type === 'dormitory'
                        ? 'Dormitory Asset'
                        : room.type === 'meeting'
                        ? 'Meeting Venue'
                        : 'Training Classroom'}
                    </span>

                    {live.status === 'Available' && (
                      <button
                        type="button"
                        onClick={() => openQuickAllocationForRoom(room.id)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Allocate Space <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {live.status === 'Occupied' && bk && (
                      <div className="flex items-center gap-2">
                        {bk.status === 'Confirmed' && (
                          <button
                            type="button"
                            onClick={() => updateBookingStatus(bk.id, 'Checked-In')}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-medium transition-colors"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Check-In
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedSlipBooking(bk)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400"
                        >
                          <FileText className="w-3.5 h-3.5" /> Slip
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Upcoming 48-Hour Timeline Feed */}
        <section
          aria-label="Upcoming 48-Hour Timeline Feed"
          className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden"
        >
          <div className="p-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="font-display font-semibold text-base text-slate-900 dark:text-slate-100">
                Upcoming Timeline Feed
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Arrivals, sessions & check-outs (48h window)
              </p>
            </div>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[560px] overflow-y-auto">
            {upcomingTimeline.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                No scheduled arrivals or events in this window.
              </div>
            ) : (
              upcomingTimeline.map((item) => (
                <div
                  key={item.id}
                  className="p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 mb-1">
                    <span>
                      {formatShortDateTime(item.startDateTime)} →{' '}
                      {formatShortDateTime(item.endDateTime)}
                    </span>
                    <span
                      className={`font-semibold ${
                        item.status === 'Checked-In'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : item.status === 'Pending'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-indigo-600 dark:text-indigo-400'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div className="font-display font-semibold text-sm text-slate-900 dark:text-slate-100">
                    {item.eventTitle || item.guestName}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    {item.assetName} · {item.guestName}
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-xs">
                    <span className="font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                      #{item.id} ·{' '}
                      {item.allocationNature === 'official_admin'
                        ? 'Official ($0)'
                        : `Rental ($${item.totalCost})`}
                    </span>

                    <div className="flex items-center gap-2">
                      {(item.status === 'Confirmed' || item.status === 'Pending') && (
                        <button
                          type="button"
                          onClick={() => updateBookingStatus(item.id, 'Checked-In')}
                          className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                          Check-In
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedSlipBooking(item)}
                        className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Details →
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
