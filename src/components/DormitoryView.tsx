import React, { useState, useEffect, useMemo } from 'react';
import {
  BedDouble,
  Plus,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Wrench,
  Snowflake,
  Fan,
  X,
  ShieldCheck,
  CreditCard,
} from 'lucide-react';
import { useFacility } from '../context/FacilityContext';
import { ACStatus, AllocationNature } from '../types/facility';
import {
  calculateTotalCharges,
  formatShortDateTime,
  getRoomLiveStatus,
} from '../utils/bookingLogic';

export const DormitoryView: React.FC = () => {
  const {
    rooms,
    bookings,
    referenceDate,
    rateConfig,
    createBooking,
    validateOverlap,
    toggleRoomMaintenance,
    setSelectedSlipBooking,
    quickAllocateRoomId,
    clearQuickAllocateRoom,
  } = useFacility();

  const dormRooms = useMemo(
    () => rooms.filter((r) => r.type === 'dormitory'),
    [rooms]
  );

  const [acFilter, setAcFilter] = useState<ACStatus | 'all'>('all');
  const [timelineOffsetDays, setTimelineOffsetDays] = useState<number>(-1);
  const [modalOpen, setModalOpen] = useState<boolean>(false);

  // Allocation Modal Form State
  const [selectedRoomId, setSelectedRoomId] = useState<string>('DORM-201');
  const [guestName, setGuestName] = useState<string>('');
  const [nationalOrEmployeeId, setNationalOrEmployeeId] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [departmentOrOrg, setDepartmentOrOrg] = useState<string>('');
  const [allocationNature, setAllocationNature] =
    useState<AllocationNature>('official_admin');
  const [purpose, setPurpose] = useState<string>('');
  const [checkInDate, setCheckInDate] = useState<string>(`${referenceDate}T14:00`);
  const [checkOutDate, setCheckOutDate] = useState<string>('2026-10-25T11:00');
  const [formError, setFormError] = useState<string | null>(null);
  const [bookingSuccessBanner, setBookingSuccessBanner] = useState<string | null>(
    null
  );

  // Open modal automatically if routed via Quick Allocation from Dashboard or Search
  useEffect(() => {
    if (quickAllocateRoomId) {
      const target = dormRooms.find((r) => r.id === quickAllocateRoomId);
      if (target) {
        setSelectedRoomId(target.id);
        setModalOpen(true);
      }
      clearQuickAllocateRoom();
    }
  }, [quickAllocateRoomId, dormRooms, clearQuickAllocateRoom]);

  const filteredDormRooms = dormRooms.filter((r) =>
    acFilter === 'all' ? true : r.acStatus === acFilter
  );

  // Generate 10-day Gantt Calendar window around referenceDate + timelineOffsetDays
  const timelineDays = useMemo(() => {
    const base = new Date(`${referenceDate}T00:00:00`);
    const days: { dateStr: string; label: string; weekday: string; isToday: boolean }[] = [];
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 0; i < 10; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + timelineOffsetDays + i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      days.push({
        dateStr,
        label: `${months[d.getMonth()]} ${d.getDate()}`,
        weekday: weekdays[d.getDay()],
        isToday: dateStr === referenceDate,
      });
    }
    return days;
  }, [referenceDate, timelineOffsetDays]);

  const selectedRoomObj =
    dormRooms.find((r) => r.id === selectedRoomId) || dormRooms[0];

  // Live charge calculation & overlap check inside modal
  const chargeBreakdown = useMemo(() => {
    if (!selectedRoomObj) return null;
    return calculateTotalCharges({
      room: selectedRoomObj,
      startDateTime: checkInDate,
      endDateTime: checkOutDate,
      allocationNature,
      billingMode: 'daily',
    });
  }, [selectedRoomObj, checkInDate, checkOutDate, allocationNature]);

  const liveOverlap = useMemo(() => {
    if (!selectedRoomObj) return { hasOverlap: false };
    return validateOverlap(selectedRoomObj.id, checkInDate, checkOutDate);
  }, [selectedRoomObj, checkInDate, checkOutDate, validateOverlap]);

  const handleOpenModalForRoom = (roomId: string, startDateStr?: string) => {
    setSelectedRoomId(roomId);
    if (startDateStr) {
      setCheckInDate(`${startDateStr}T14:00`);
      const nextD = new Date(`${startDateStr}T14:00`);
      nextD.setDate(nextD.getDate() + 2);
      const yyyy = nextD.getFullYear();
      const mm = String(nextD.getMonth() + 1).padStart(2, '0');
      const dd = String(nextD.getDate()).padStart(2, '0');
      setCheckOutDate(`${yyyy}-${mm}-${dd}T11:00`);
    }
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmitAllocation = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!guestName.trim()) {
      setFormError('Guest or employee full name is required.');
      return;
    }
    if (!nationalOrEmployeeId.trim()) {
      setFormError('National ID, Passport, or Employee ID is required.');
      return;
    }
    if (!phone.trim()) {
      setFormError('Contact phone number is required.');
      return;
    }
    if (!purpose.trim()) {
      setFormError(
        allocationNature === 'official_admin'
          ? 'Official purpose (e.g., Official Duty, VIP Guest, Audit Team) is mandatory for complimentary allocations.'
          : 'Please specify the stay purpose or remarks.'
      );
      return;
    }
    if (liveOverlap.hasOverlap) {
      setFormError(
        liveOverlap.reason || 'Selected dates overlap with an existing booking.'
      );
      return;
    }

    const result = createBooking({
      facilityId: selectedRoomId,
      guestName,
      nationalOrEmployeeId,
      phone,
      departmentOrOrg: departmentOrOrg.trim() || 'General Administration',
      purpose,
      startDateTime: checkInDate,
      endDateTime: checkOutDate,
      allocationNature,
      billingMode: 'daily',
      totalCost: chargeBreakdown ? chargeBreakdown.totalCost : 0,
      status: 'Confirmed',
    });

    if (!result.success) {
      setFormError(result.error || 'Could not create dormitory allocation.');
      return;
    }

    setBookingSuccessBanner(
      `Confirmed allocation ${result.booking?.id} for ${result.booking?.guestName} in ${result.booking?.assetName} (${
        allocationNature === 'official_admin'
          ? 'Official Admin · $0 Complimentary'
          : `Paid Rental · $${result.booking?.totalCost}`
      }).`
    );
    setGuestName('');
    setNationalOrEmployeeId('');
    setPhone('');
    setDepartmentOrOrg('');
    setPurpose('');
    setModalOpen(false);
  };

  return (
    <div className="space-y-8">
      {/* Header & Primary Action */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-900 dark:text-slate-100 tracking-tight">
            Dormitory & Guest Room Allocation
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Standard Tiers: <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">${rateConfig.dormitoryAcDailyRate}/day (AC)</span> ·{' '}
            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">${rateConfig.dormitoryNonAcDailyRate}/day (Non-AC)</span> · Official Admin allocations locked at <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">$0.00</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* AC vs Non-AC Filter */}
          <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
            {(['all', 'AC', 'Non-AC'] as const).map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => setAcFilter(tier)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  acFilter === tier
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {tier === 'all' ? 'All Tiers (8)' : `${tier} Rooms`}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => handleOpenModalForRoom('DORM-102')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Allocate Dormitory Room
          </button>
        </div>
      </div>

      {/* Confirmation Banner */}
      {bookingSuccessBanner && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-between gap-3 text-sm text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{bookingSuccessBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setBookingSuccessBanner(null)}
            aria-label="Dismiss confirmation banner"
            className="text-xs font-medium underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Interactive Multi-Day Gantt / Timeline Calendar */}
      <section
        aria-label="Dormitory Interactive Multi-Day Booking Calendar"
        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden"
      >
        <div className="p-5 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display font-semibold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Interactive Multi-Day Occupancy Gantt Timeline
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Click any open date cell to allocate a room, or click an occupied bar to inspect the guest slip
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mr-2">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
                Official Admin ($0)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-indigo-600 inline-block" />
                Paid Rental ($)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" />
                Pending Approval
              </span>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setTimelineOffsetDays((d) => d - 5)}
                aria-label="Previous 5 days"
                className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setTimelineOffsetDays(-1)}
                className="px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 rounded"
              >
                Reset Window
              </button>
              <button
                type="button"
                onClick={() => setTimelineOffsetDays((d) => d + 5)}
                aria-label="Next 5 days"
                className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Gantt Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left min-w-[920px]">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60">
                <th className="py-3 px-4 w-60 text-xs font-semibold text-slate-600 dark:text-slate-300 border-r border-slate-200/80 dark:border-slate-800">
                  Dormitory Room & Tier
                </th>
                {timelineDays.map((day) => (
                  <th
                    key={day.dateStr}
                    className={`py-2.5 px-2 text-center border-r border-slate-200/60 dark:border-slate-800/70 font-mono ${
                      day.isToday
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="text-[11px] font-normal">{day.weekday}</div>
                    <div className="text-xs font-semibold tabular-nums">{day.label}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
              {filteredDormRooms.map((room) => {
                const roomBookings = bookings.filter(
                  (b) => b.facilityId === room.id && b.status !== 'Cancelled'
                );

                return (
                  <tr
                    key={room.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
                  >
                    {/* Room Column */}
                    <td className="py-3 px-4 border-r border-slate-200/80 dark:border-slate-800">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-display font-semibold text-xs text-slate-900 dark:text-slate-100">
                            {room.name}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                            {room.acStatus} · {room.capacity} Beds · ${room.baseDailyRate}/d
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Date Cells */}
                    {timelineDays.map((day) => {
                      if (room.maintenanceMode) {
                        return (
                          <td
                            key={day.dateStr}
                            className="p-1.5 border-r border-slate-100 dark:border-slate-800/60 bg-amber-50/30 dark:bg-amber-950/10 text-center"
                          >
                            <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400">
                              Maint
                            </span>
                          </td>
                        );
                      }

                      const cellStart = new Date(`${day.dateStr}T00:00:00`).getTime();
                      const cellEnd = new Date(`${day.dateStr}T23:59:59`).getTime();

                      const activeBooking = roomBookings.find((b) => {
                        const bStart = new Date(b.startDateTime).getTime();
                        const bEnd = new Date(b.endDateTime).getTime();
                        return bStart <= cellEnd && bEnd > cellStart;
                      });

                      if (activeBooking) {
                        const isOfficial =
                          activeBooking.allocationNature === 'official_admin';
                        const isPending = activeBooking.status === 'Pending';

                        return (
                          <td
                            key={day.dateStr}
                            className="p-1 border-r border-slate-100 dark:border-slate-800/60"
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedSlipBooking(activeBooking)}
                              title={`${activeBooking.id}: ${activeBooking.guestName} (${activeBooking.purpose})`}
                              className={`w-full px-1.5 py-1.5 rounded text-left text-[11px] font-medium truncate transition-opacity hover:opacity-90 ${
                                isPending
                                  ? 'bg-amber-500 text-white'
                                  : isOfficial
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-indigo-600 text-white'
                              }`}
                            >
                              <div className="truncate font-semibold leading-tight">
                                {activeBooking.guestName.split(' ')[0]}
                              </div>
                              <div className="font-mono text-[10px] opacity-90 tabular-nums">
                                {isOfficial ? '$0 Free' : `$${activeBooking.totalCost}`}
                              </div>
                            </button>
                          </td>
                        );
                      }

                      return (
                        <td
                          key={day.dateStr}
                          className={`p-1 border-r border-slate-100 dark:border-slate-800/60 ${
                            day.isToday ? 'bg-indigo-50/20 dark:bg-indigo-950/10' : ''
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleOpenModalForRoom(room.id, day.dateStr)}
                            aria-label={`Allocate ${room.name} on ${day.label}`}
                            className="w-full h-10 rounded border border-dashed border-transparent hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/40 text-[10px] text-transparent hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-all flex items-center justify-center"
                          >
                            + Book
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Room Catalog & Inventory Cards */}
      <section aria-label="Dormitory Room Catalog and Inventory" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold text-lg text-slate-900 dark:text-slate-100">
            Room Catalog & Tier Inventory ({filteredDormRooms.length})
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Select a room to allocate dates or toggle maintenance lock
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {filteredDormRooms.map((room) => {
            const live = getRoomLiveStatus(room, bookings, referenceDate);
            const currentBk = live.currentBooking;

            return (
              <div
                key={room.id}
                className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
                        <span>{room.code}</span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-200">
                          {room.acStatus === 'AC' ? (
                            <Snowflake className="w-3.5 h-3.5 text-sky-500" />
                          ) : (
                            <Fan className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          {room.acStatus}
                        </span>
                      </div>
                      <h3 className="font-display font-semibold text-base text-slate-900 dark:text-slate-100 mt-1">
                        {room.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {room.floor} · {room.capacity} Bed Capacity
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="font-mono font-bold text-lg text-slate-900 dark:text-slate-100 tabular-nums">
                        ${room.baseDailyRate}
                      </span>
                      <span className="block text-[10px] text-slate-400 font-mono">
                        / day rental
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {room.description}
                  </p>

                  {/* Specs */}
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {room.avSpecs.join(' · ')}
                  </div>

                  {/* Current Occupancy Info */}
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/80 text-xs">
                    <div className="flex items-center justify-between font-medium">
                      <span className="text-slate-500 dark:text-slate-400">Desk Status:</span>
                      <span
                        className={`font-mono font-semibold ${
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
                    {currentBk && (
                      <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
                        Guest: <strong>{currentBk.guestName}</strong> ({currentBk.id})
                        <div className="font-mono text-slate-400 mt-0.5 tabular-nums">
                          Until {formatShortDateTime(currentBk.endDateTime)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => toggleRoomMaintenance(room.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    {room.maintenanceMode ? 'End Maint' : 'Maint'}
                  </button>

                  {currentBk ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedSlipBooking(currentBk)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        Guest Slip
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenModalForRoom(room.id)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors"
                      >
                        Future Dates
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={room.maintenanceMode}
                      onClick={() => handleOpenModalForRoom(room.id)}
                      className="flex-1 py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white disabled:text-slate-500 text-xs font-medium transition-colors text-center"
                    >
                      {room.maintenanceMode ? 'Unavailable' : 'Allocate Room'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Room Allocation Modal */}
      {modalOpen && selectedRoomObj && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-label="Dormitory Room Allocation Modal"
        >
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                  <BedDouble className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-base text-slate-900 dark:text-slate-100">
                    Allocate Dormitory & Guest Room
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Automatic overlap prevention & Official ($0) vs Rental rate calculation
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close room allocation modal"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 dark:hover:text-slate-200 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitAllocation} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
              {/* Select Room & Booking Nature Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="dorm-room-select"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Select Dormitory Room
                  </label>
                  <select
                    id="dorm-room-select"
                    value={selectedRoomId}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  >
                    {dormRooms.map((r) => (
                      <option key={r.id} value={r.id} disabled={r.maintenanceMode}>
                        {r.name} ({r.acStatus} · ${r.baseDailyRate}/day)
                        {r.maintenanceMode ? ' [MAINTENANCE]' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Booking Nature & Billing Policy
                  </span>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setAllocationNature('official_admin')}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-colors ${
                        allocationNature === 'official_admin'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                      Official ($0)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllocationNature('paid_rental')}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-colors ${
                        allocationNature === 'paid_rental'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5 shrink-0" />
                      Guest Rental
                    </button>
                  </div>
                </div>
              </div>

              {/* Date Range Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="dorm-checkin"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Check-In Date & Time
                  </label>
                  <input
                    id="dorm-checkin"
                    type="datetime-local"
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
                <div>
                  <label
                    htmlFor="dorm-checkout"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Check-Out Date & Time
                  </label>
                  <input
                    id="dorm-checkout"
                    type="datetime-local"
                    value={checkOutDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
              </div>

              {/* Instant Overlap Validation Status */}
              {liveOverlap.hasOverlap && (
                <div
                  role="alert"
                  className="p-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80 flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-200"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold block">
                      Schedule Conflict Detected (Overlap Prevention Active)
                    </strong>
                    <span>{liveOverlap.reason}</span>
                  </div>
                </div>
              )}

              {/* Guest Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="dorm-guest-name"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Guest / Employee Full Name *
                  </label>
                  <input
                    id="dorm-guest-name"
                    type="text"
                    placeholder="e.g., Dr. Evelyn Vance"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="dorm-guest-id"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    National ID / Passport / Employee ID *
                  </label>
                  <input
                    id="dorm-guest-id"
                    type="text"
                    placeholder="e.g., EMP-77410 or PASS-9021"
                    value={nationalOrEmployeeId}
                    onChange={(e) => setNationalOrEmployeeId(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="dorm-guest-phone"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Contact Phone Number *
                  </label>
                  <input
                    id="dorm-guest-phone"
                    type="tel"
                    placeholder="e.g., +1 (555) 409-2210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="dorm-guest-dept"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Department / Organization
                  </label>
                  <input
                    id="dorm-guest-dept"
                    type="text"
                    placeholder="e.g., Internal Audit / Regional HQ"
                    value={departmentOrOrg}
                    onChange={(e) => setDepartmentOrOrg(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* Purpose Entry with Official Presets */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <label
                    htmlFor="dorm-purpose"
                    className="text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    {allocationNature === 'official_admin'
                      ? 'Official Administrative Purpose (Required for $0 Waiver) *'
                      : 'Booking Purpose / Remarks *'}
                  </label>
                  {allocationNature === 'official_admin' && (
                    <div className="flex items-center gap-1.5">
                      {['Official Duty', 'VIP Guest', 'Audit Team'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setPurpose(preset)}
                          className="px-2 py-0.5 text-[11px] rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60"
                        >
                          + {preset}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  id="dorm-purpose"
                  type="text"
                  placeholder={
                    allocationNature === 'official_admin'
                      ? 'Specify official mandate (e.g., Official Duty - Annual Statutory Audit)'
                      : 'Specify stay reason (e.g., Employee Transit Stay / Visiting Consultant)'
                  }
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
              </div>

              {/* Smart Pricing Calculation Summary Box */}
              {chargeBreakdown && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Smart Pricing Assessment ({selectedRoomObj.acStatus} Tier)
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                      {allocationNature === 'official_admin' ? (
                        <span>
                          {chargeBreakdown.unitsCount} {chargeBreakdown.unitLabel} × $
                          {chargeBreakdown.unitRate}/day → Waived (Official Admin)
                        </span>
                      ) : (
                        <span>
                          Duration: {chargeBreakdown.unitsCount} {chargeBreakdown.unitLabel} ×
                          Daily Rate ${chargeBreakdown.unitRate}/day
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Total Payable Fee
                    </div>
                    <div className="font-mono font-bold text-2xl text-slate-900 dark:text-slate-100 tabular-nums">
                      {allocationNature === 'official_admin' ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          $0.00 (Complimentary)
                        </span>
                      ) : (
                        `$${chargeBreakdown.totalCost.toLocaleString()}.00`
                      )}
                    </div>
                  </div>
                </div>
              )}

              {formError && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300"
                >
                  {formError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={liveOverlap.hasOverlap}
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white disabled:text-slate-500 text-xs font-medium transition-colors"
                >
                  Confirm Room Allocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
