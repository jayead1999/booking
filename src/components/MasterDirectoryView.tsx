import React, { useState, useMemo } from 'react';
import {
  Search,
  Download,
  CheckCircle2,
  LogOut,
  Ban,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useFacility } from '../context/FacilityContext';
import {
  AllocationNature,
  BookingStatus,
  FacilityType,
} from '../types/facility';
import { formatShortDateTime } from '../utils/bookingLogic';

const PAGE_SIZE = 8;

export const MasterDirectoryView: React.FC = () => {
  const {
    bookings,
    updateBookingStatus,
    cancelBooking,
    setSelectedSlipBooking,
    globalSearch,
  } = useFacility();

  const [localSearch, setLocalSearch] = useState<string>('');
  const [facilityFilter, setFacilityFilter] = useState<FacilityType | 'all'>('all');
  const [natureFilter, setNatureFilter] = useState<AllocationNature | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);

  const effectiveQuery = (localSearch || globalSearch).trim().toLowerCase();

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (facilityFilter !== 'all' && b.facilityType !== facilityFilter) {
        return false;
      }
      if (natureFilter !== 'all' && b.allocationNature !== natureFilter) {
        return false;
      }
      if (statusFilter !== 'all' && b.status !== statusFilter) {
        return false;
      }
      if (effectiveQuery) {
        const hay = [
          b.id,
          b.assetName,
          b.guestName,
          b.nationalOrEmployeeId,
          b.phone,
          b.departmentOrOrg,
          b.purpose,
          b.eventTitle || '',
          b.batchCode || '',
          b.instructorName || '',
        ]
          .join(' ')
          .toLowerCase();
        if (!hay.includes(effectiveQuery)) return false;
      }
      return true;
    });
  }, [bookings, facilityFilter, natureFilter, statusFilter, effectiveQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedBookings = filteredBookings.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  // Summary totals for filtered rows
  const filteredSummary = useMemo(() => {
    let paidCount = 0;
    let adminCount = 0;
    let totalRevenue = 0;
    for (const b of filteredBookings) {
      if (b.status === 'Cancelled') continue;
      if (b.allocationNature === 'official_admin') {
        adminCount++;
      } else {
        paidCount++;
        totalRevenue += b.totalCost;
      }
    }
    return { paidCount, adminCount, totalRevenue };
  }, [filteredBookings]);

  const handleExportCsv = () => {
    const headers = [
      'Booking ID',
      'Facility Type',
      'Specific Asset',
      'Booked By',
      'ID/Ref',
      'Contact Phone',
      'Affiliation',
      'Start Date/Time',
      'End Date/Time',
      'Allocation Type',
      'Total Fee ($)',
      'Status',
      'Purpose',
    ];
    const rows = filteredBookings.map((b) => [
      b.id,
      b.facilityType,
      `"${b.assetName.replace(/"/g, '""')}"`,
      `"${b.guestName.replace(/"/g, '""')}"`,
      b.nationalOrEmployeeId,
      `"${b.phone}"`,
      `"${b.departmentOrOrg.replace(/"/g, '""')}"`,
      b.startDateTime,
      b.endDateTime,
      b.allocationNature === 'official_admin' ? 'Official Admin (Free)' : 'Paid Rental',
      b.totalCost,
      b.status,
      `"${b.purpose.replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Syntor It-Master-Booking-Ledger.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatFacilityTypeLabel = (type: FacilityType) => {
    if (type === 'dormitory') return 'Dormitory';
    if (type === 'meeting') return 'Meeting Room';
    return 'Classroom';
  };

  return (
    <div className="space-y-6">
      {/* Header & CSV Export */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-900 dark:text-slate-100 tracking-tight">
            Master Booking Directory & Billing Ledger
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Unified searchable registry across Dormitory, Meeting Rooms, and Classrooms ·{' '}
            <span className="font-mono font-medium text-slate-800 dark:text-slate-200 tabular-nums">
              {filteredSummary.adminCount} Official ($0) · {filteredSummary.paidCount} Paid Rentals ($
              {filteredSummary.totalRevenue.toLocaleString()})
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
        >
          <Download className="w-4 h-4" />
          Export Ledger CSV
        </button>
      </div>

      {/* Filter Bar */}
      <section
        aria-label="Master Directory Filters"
        className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
      >
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="search"
            value={localSearch}
            onChange={(e) => {
              setLocalSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search #BK-1082, guest, room, org..."
            aria-label="Search Master Booking Directory"
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
          />
        </div>

        <div>
          <select
            aria-label="Filter by Facility Category"
            value={facilityFilter}
            onChange={(e) => {
              setFacilityFilter(e.target.value as FacilityType | 'all');
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
          >
            <option value="all">All Facility Categories</option>
            <option value="dormitory">Dormitory & Guest Rooms</option>
            <option value="meeting">Meeting Rooms & Auditorium</option>
            <option value="classroom">Classrooms & Training Labs</option>
          </select>
        </div>

        <div>
          <select
            aria-label="Filter by Allocation Billing Type"
            value={natureFilter}
            onChange={(e) => {
              setNatureFilter(e.target.value as AllocationNature | 'all');
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
          >
            <option value="all">All Billing Types (Admin & Paid)</option>
            <option value="official_admin">Official Admin [Free $0]</option>
            <option value="paid_rental">Paid Rental [Commercial / Guest]</option>
          </select>
        </div>

        <div>
          <select
            aria-label="Filter by Reservation Status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as BookingStatus | 'all');
              setCurrentPage(1);
            }}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
          >
            <option value="all">All Reservation Statuses</option>
            <option value="Checked-In">Checked-In</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Pending">Pending</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </section>

      {/* Unified Master Data Table */}
      <section
        aria-label="Master Booking Registry Table"
        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <th className="py-3 px-3">Booking ID</th>
                <th className="py-3 px-3">Facility & Specific Asset</th>
                <th className="py-3 px-3">Booked By</th>
                <th className="py-3 px-3">Duration</th>
                <th className="py-3 px-3">Allocation Type</th>
                <th className="py-3 px-3 text-right">Total Fee</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800 text-xs">
              {paginatedBookings.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-12 px-4 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    No reservations match your active filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedBookings.map((b) => {
                  const isOfficial = b.allocationNature === 'official_admin';

                  return (
                    <tr
                      key={b.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      {/* Booking ID */}
                      <td className="py-3 px-3 font-mono font-semibold text-indigo-600 dark:text-indigo-400 whitespace-nowrap tabular-nums">
                        <button
                          type="button"
                          onClick={() => setSelectedSlipBooking(b)}
                          className="hover:underline"
                        >
                          #{b.id}
                        </button>
                      </td>

                      {/* Facility Type & Specific Asset */}
                      <td className="py-3 px-3 max-w-[200px]">
                        <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                          {b.assetName}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          <span className="font-mono">{formatFacilityTypeLabel(b.facilityType)}</span> ·{' '}
                          {b.eventTitle || b.purpose}
                        </div>
                      </td>

                      {/* Booked By */}
                      <td className="py-3 px-3 max-w-[170px]">
                        <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                          {b.guestName}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                          {b.phone} · {b.departmentOrOrg}
                        </div>
                      </td>

                      {/* Duration */}
                      <td className="py-3 px-2.5 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap tabular-nums">
                        <div>{formatShortDateTime(b.startDateTime)}</div>
                        <div className="text-[11px] text-slate-400">
                          to {formatShortDateTime(b.endDateTime)}
                        </div>
                      </td>

                      {/* Allocation Type */}
                      <td className="py-3 px-2.5 whitespace-nowrap">
                        {isOfficial ? (
                          <span className="font-medium text-emerald-700 dark:text-emerald-400">
                            Official [Free]
                          </span>
                        ) : (
                          <span className="font-medium text-indigo-700 dark:text-indigo-400">
                            Paid Rental
                          </span>
                        )}
                      </td>

                      {/* Total Fee */}
                      <td className="py-3 px-2.5 text-right font-mono font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap tabular-nums">
                        {isOfficial ? (
                          <span className="text-emerald-600 dark:text-emerald-400">$0</span>
                        ) : (
                          `$${b.totalCost.toLocaleString()}`
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-2.5 whitespace-nowrap font-mono font-semibold">
                        <span
                          className={
                            b.status === 'Checked-In'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : b.status === 'Confirmed'
                              ? 'text-indigo-600 dark:text-indigo-400'
                              : b.status === 'Pending'
                              ? 'text-amber-600 dark:text-amber-400'
                              : b.status === 'Completed'
                              ? 'text-slate-500 dark:text-slate-400'
                              : 'text-rose-600 dark:text-rose-400 line-through'
                          }
                        >
                          {b.status}
                        </span>
                      </td>

                      {/* Quick Actions */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {(b.status === 'Confirmed' || b.status === 'Pending') && (
                            <button
                              type="button"
                              onClick={() => updateBookingStatus(b.id, 'Checked-In')}
                              title={`Check-In ${b.guestName} (#${b.id})`}
                              aria-label={`Check-In ${b.id}`}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-medium transition-colors"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Check-In
                            </button>
                          )}

                          {b.status === 'Checked-In' && (
                            <button
                              type="button"
                              onClick={() => updateBookingStatus(b.id, 'Completed')}
                              title={`Check-Out ${b.guestName} (#${b.id})`}
                              aria-label={`Check-Out ${b.id}`}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-medium transition-colors"
                            >
                              <LogOut className="w-3 h-3" />
                              Check-Out
                            </button>
                          )}

                          {b.status !== 'Cancelled' && b.status !== 'Completed' && (
                            <button
                              type="button"
                              onClick={() => cancelBooking(b.id)}
                              title={`Cancel booking #${b.id}`}
                              aria-label={`Cancel booking ${b.id}`}
                              className="p-1.5 rounded border border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedSlipBooking(b)}
                            title={`View & Print Slip #${b.id}`}
                            aria-label={`Slip ${b.id}`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-medium transition-colors"
                          >
                            <FileText className="w-3 h-3" />
                            Slip
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-5 py-3.5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
          <div className="font-mono tabular-nums">
            Showing {filteredBookings.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–
            {Math.min(safePage * PAGE_SIZE, filteredBookings.length)} of{' '}
            {filteredBookings.length} reservations
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-white dark:hover:bg-slate-800"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <span className="px-2 font-mono tabular-nums">
              Page {safePage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-white dark:hover:bg-slate-800"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
