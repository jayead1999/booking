import React, { useState, useEffect, useMemo } from 'react';
import {
  GraduationCap,
  Plus,
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  X,
  Repeat,
  Users,
} from 'lucide-react';
import { useFacility } from '../context/FacilityContext';
import { AllocationNature } from '../types/facility';
import {
  calculateTotalCharges,
  formatDateOnly,
  formatShortDateTime,
} from '../utils/bookingLogic';

const CLASSROOM_HOURS = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
];

export const ClassroomsView: React.FC = () => {
  const {
    rooms,
    bookings,
    referenceDate,
    createBooking,
    validateOverlap,
    setSelectedSlipBooking,
    quickAllocateRoomId,
    clearQuickAllocateRoom,
  } = useFacility();

  const classrooms = useMemo(
    () => rooms.filter((r) => r.type === 'classroom'),
    [rooms]
  );

  // View Mode: Day Matrix vs Week Schedule vs Room-by-Room
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'room'>('day');
  const [timetableDate, setTimetableDate] = useState<string>(referenceDate);
  const [instructorQuery, setInstructorQuery] = useState<string>('');
  const [batchQuery, setBatchQuery] = useState<string>('');
  const [roomFilterId, setRoomFilterId] = useState<string>('all');

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  // Session Modal Form State
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('CLS-T1');
  const [moduleTitle, setModuleTitle] = useState<string>('');
  const [instructorName, setInstructorName] = useState<string>('');
  const [batchCode, setBatchCode] = useState<string>('');
  const [studentCount, setStudentCount] = useState<number>(25);
  const [recurrencePattern, setRecurrencePattern] = useState<
    'None' | 'Daily' | 'Mon/Wed/Fri' | 'Tue/Thu' | 'Weekly'
  >('Mon/Wed/Fri');
  const [allocationNature, setAllocationNature] =
    useState<AllocationNature>('official_admin');
  const [phone, setPhone] = useState<string>('');
  const [department, setDepartment] = useState<string>('L&D Training Academy');
  const [startDateTime, setStartDateTime] = useState<string>(
    `${referenceDate}T14:00`
  );
  const [endDateTime, setEndDateTime] = useState<string>(
    `${referenceDate}T16:00`
  );
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setTimetableDate(referenceDate);
  }, [referenceDate]);

  useEffect(() => {
    if (quickAllocateRoomId) {
      const target = classrooms.find((r) => r.id === quickAllocateRoomId);
      if (target) {
        setSelectedClassroomId(target.id);
        setModalOpen(true);
      }
      clearQuickAllocateRoom();
    }
  }, [quickAllocateRoomId, classrooms, clearQuickAllocateRoom]);

  const displayedClassrooms = classrooms.filter((c) =>
    roomFilterId === 'all' ? true : c.id === roomFilterId
  );

  // All classroom bookings filtered by instructor / batch / room
  const filteredClassroomBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (b.facilityType !== 'classroom' || b.status === 'Cancelled') return false;
      if (roomFilterId !== 'all' && b.facilityId !== roomFilterId) return false;
      if (instructorQuery.trim()) {
        const q = instructorQuery.toLowerCase();
        const instr = (b.instructorName || b.guestName).toLowerCase();
        if (!instr.includes(q)) return false;
      }
      if (batchQuery.trim()) {
        const q = batchQuery.toLowerCase();
        const batch = (b.batchCode || '').toLowerCase();
        const title = (b.eventTitle || b.purpose).toLowerCase();
        if (!batch.includes(q) && !title.includes(q)) return false;
      }
      return true;
    });
  }, [bookings, roomFilterId, instructorQuery, batchQuery]);

  const selectedClassroomObj =
    classrooms.find((c) => c.id === selectedClassroomId) || classrooms[0];

  const chargeBreakdown = useMemo(() => {
    if (!selectedClassroomObj) return null;
    return calculateTotalCharges({
      room: selectedClassroomObj,
      startDateTime,
      endDateTime,
      allocationNature,
      billingMode: 'hourly',
    });
  }, [selectedClassroomObj, startDateTime, endDateTime, allocationNature]);

  const liveOverlap = useMemo(() => {
    if (!selectedClassroomObj) return { hasOverlap: false };
    return validateOverlap(selectedClassroomObj.id, startDateTime, endDateTime);
  }, [selectedClassroomObj, startDateTime, endDateTime, validateOverlap]);

  const handleOpenCellSchedule = (roomId: string, hourStr: string) => {
    setSelectedClassroomId(roomId);
    const startH = parseInt(hourStr.split(':')[0], 10);
    const endH = Math.min(18, startH + 2);
    setStartDateTime(`${timetableDate}T${hourStr}`);
    setEndDateTime(`${timetableDate}T${String(endH).padStart(2, '0')}:00`);
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmitSession = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!moduleTitle.trim()) {
      setFormError('Training module or subject title is required.');
      return;
    }
    if (!instructorName.trim()) {
      setFormError('Assigned instructor or trainer name is required.');
      return;
    }
    if (!batchCode.trim()) {
      setFormError('Batch / Cohort identifier (e.g., BATCH-2026-Q4B) is required.');
      return;
    }
    if (selectedClassroomObj && studentCount > selectedClassroomObj.capacity) {
      setFormError(
        `Student count (${studentCount}) exceeds ${selectedClassroomObj.name} capacity (${selectedClassroomObj.capacity} seats).`
      );
      return;
    }
    if (liveOverlap.hasOverlap) {
      setFormError(
        liveOverlap.reason || 'This classroom is already booked during the selected slot.'
      );
      return;
    }

    const res = createBooking({
      facilityId: selectedClassroomId,
      guestName: instructorName.trim(),
      instructorName: instructorName.trim(),
      nationalOrEmployeeId: batchCode.trim(),
      batchCode: batchCode.trim(),
      phone: phone.trim() || '+1 (555) 010-2026',
      departmentOrOrg: department.trim() || 'Training Academy',
      purpose: `${moduleTitle.trim()} (${batchCode.trim()})`,
      eventTitle: moduleTitle.trim(),
      attendeeCount: studentCount,
      recurrencePattern,
      startDateTime,
      endDateTime,
      allocationNature,
      billingMode: 'hourly',
      totalCost: chargeBreakdown ? chargeBreakdown.totalCost : 0,
      status: 'Confirmed',
    });

    if (!res.success) {
      setFormError(res.error || 'Could not schedule classroom session.');
      return;
    }

    setBannerMessage(
      `Scheduled training session "${res.booking?.eventTitle}" (${res.booking?.batchCode}) with ${res.booking?.instructorName} in ${res.booking?.assetName}.`
    );
    setModuleTitle('');
    setInstructorName('');
    setBatchCode('');
    setModalOpen(false);
  };

  return (
    <div className="space-y-8">
      {/* Header & View Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-900 dark:text-slate-100 tracking-tight">
            Classroom & Training Session Timetable
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Multi-room hourly matrix, instructor assignments, cohort batch tracking, and recurring session schedules
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Segmented Control */}
          <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
            {(
              [
                { id: 'day', label: 'Day Matrix' },
                { id: 'week', label: 'Week List' },
                { id: 'room', label: 'Room-by-Room' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setViewMode(tab.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  viewMode === tab.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => handleOpenCellSchedule('CLS-T1', '14:00')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Schedule Session
          </button>
        </div>
      </div>

      {bannerMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-3 text-sm text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{bannerMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setBannerMessage(null)}
            className="text-xs font-medium underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter & Query Controls Bar */}
      <section
        aria-label="Classroom Filter and Query Controls"
        className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"
      >
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={instructorQuery}
            onChange={(e) => setInstructorQuery(e.target.value)}
            placeholder="Filter by Instructor (e.g., Hannah, Sanjay)..."
            aria-label="Filter by Instructor Name"
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
          />
        </div>

        <div className="relative flex items-center">
          <Filter className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={batchQuery}
            onChange={(e) => setBatchQuery(e.target.value)}
            placeholder="Filter by Batch ID or Topic (e.g., SEC-COHORT)..."
            aria-label="Filter by Batch ID or Module Topic"
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
          />
        </div>

        <div>
          <select
            aria-label="Filter by Classroom"
            value={roomFilterId}
            onChange={(e) => setRoomFilterId(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
          >
            <option value="all">All Classrooms (4 Rooms)</option>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label
            htmlFor="classroom-matrix-date"
            className="text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0"
          >
            Date:
          </label>
          <input
            id="classroom-matrix-date"
            type="date"
            value={timetableDate}
            onChange={(e) => {
              if (e.target.value) setTimetableDate(e.target.value);
            }}
            className="w-full px-3 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100"
          />
        </div>
      </section>

      {/* VIEW 1: Room Timetable Matrix (Classrooms Horizontal, Hourly Blocks Vertical) */}
      {viewMode === 'day' && (
        <section
          aria-label="Classroom Hourly Timetable Matrix"
          className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden"
        >
          <div className="p-5 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display font-semibold text-base text-slate-900 dark:text-slate-100">
                Room Timetable Matrix — {formatDateOnly(timetableDate)}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Classrooms displayed across the horizontal axis · Hourly blocks along the vertical axis
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Click any empty cell to assign a training module
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left min-w-[820px]">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60">
                  <th className="py-3 px-4 w-28 font-mono text-xs font-semibold text-slate-600 dark:text-slate-300 border-r border-slate-200/80 dark:border-slate-800">
                    Time Block
                  </th>
                  {displayedClassrooms.map((room) => (
                    <th
                      key={room.id}
                      className="py-3 px-4 border-r border-slate-200/60 dark:border-slate-800/70"
                    >
                      <div className="font-display font-semibold text-xs text-slate-900 dark:text-slate-100">
                        {room.name}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                        {room.code} · {room.capacity} Seats · {room.acStatus}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                {CLASSROOM_HOURS.map((hour) => {
                  const nextHour = `${String(parseInt(hour.split(':')[0], 10) + 1).padStart(
                    2,
                    '0'
                  )}:00`;

                  return (
                    <tr
                      key={hour}
                      className="hover:bg-slate-50/40 dark:hover:bg-slate-800/20 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono text-xs font-medium text-slate-600 dark:text-slate-400 border-r border-slate-200/80 dark:border-slate-800 whitespace-nowrap tabular-nums">
                        {hour} – {nextHour}
                      </td>

                      {displayedClassrooms.map((room) => {
                        const slotStartMs = new Date(
                          `${timetableDate}T${hour}:00`
                        ).getTime();
                        const slotEndMs = slotStartMs + 60 * 60 * 1000;

                        const session = filteredClassroomBookings.find((b) => {
                          if (b.facilityId !== room.id) return false;
                          const bStart = new Date(b.startDateTime).getTime();
                          const bEnd = new Date(b.endDateTime).getTime();
                          return bStart < slotEndMs && bEnd > slotStartMs;
                        });

                        if (session) {
                          const isPaid = session.allocationNature === 'paid_rental';
                          return (
                            <td
                              key={room.id}
                              className="p-1.5 border-r border-slate-100 dark:border-slate-800/60"
                            >
                              <button
                                type="button"
                                onClick={() => setSelectedSlipBooking(session)}
                                className={`w-full p-2.5 rounded-lg text-left transition-opacity hover:opacity-95 ${
                                  isPaid
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-emerald-600 text-white'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2 text-[11px] font-mono opacity-90">
                                  <span>{session.batchCode || session.id}</span>
                                  <span>
                                    {session.recurrencePattern &&
                                    session.recurrencePattern !== 'None'
                                      ? session.recurrencePattern
                                      : 'Single'}
                                  </span>
                                </div>
                                <div className="font-display font-semibold text-xs mt-0.5 truncate">
                                  {session.eventTitle || session.purpose}
                                </div>
                                <div className="text-[11px] opacity-90 mt-0.5 truncate">
                                  Instructor: {session.instructorName || session.guestName} ·{' '}
                                  {session.attendeeCount || 25} trainees
                                </div>
                              </button>
                            </td>
                          );
                        }

                        return (
                          <td
                            key={room.id}
                            className="p-1.5 border-r border-slate-100 dark:border-slate-800/60"
                          >
                            <button
                              type="button"
                              onClick={() => handleOpenCellSchedule(room.id, hour)}
                              aria-label={`Schedule session in ${room.name} at ${hour}`}
                              className="w-full h-14 rounded-lg border border-dashed border-transparent hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 text-xs text-transparent hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-all flex items-center justify-center"
                            >
                              + Assign Session ({hour})
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
      )}

      {/* VIEW 2: Week / All Scheduled Sessions List */}
      {viewMode === 'week' && (
        <section
          aria-label="Weekly Training Cohort Schedule"
          className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden"
        >
          <div className="p-5 border-b border-slate-200/80 dark:border-slate-800">
            <h2 className="font-display font-semibold text-base text-slate-900 dark:text-slate-100">
              Active & Upcoming Training Sessions ({filteredClassroomBookings.length})
            </h2>
          </div>
          <div className="divide-y divide-slate-200/70 dark:divide-slate-800">
            {filteredClassroomBookings.map((session) => (
              <div
                key={session.id}
                className="p-5 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      {session.batchCode || session.id}
                    </span>
                    <span>·</span>
                    <span>{session.assetName}</span>
                    <span>·</span>
                    <span>
                      {formatShortDateTime(session.startDateTime)} →{' '}
                      {formatShortDateTime(session.endDateTime)}
                    </span>
                  </div>
                  <h3 className="font-display font-semibold text-base text-slate-900 dark:text-slate-100">
                    {session.eventTitle || session.purpose}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                    <span>
                      Instructor: <strong>{session.instructorName || session.guestName}</strong>
                    </span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {session.attendeeCount || 25} Students
                    </span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1">
                      <Repeat className="w-3.5 h-3.5" />
                      Recurrence: {session.recurrencePattern || 'None'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedSlipBooking(session)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Session Slip →
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* VIEW 3: Room-by-Room Breakdown */}
      {viewMode === 'room' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {displayedClassrooms.map((room) => {
            const roomSessions = filteredClassroomBookings.filter(
              (b) => b.facilityId === room.id
            );

            return (
              <div
                key={room.id}
                className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-xs text-slate-500">
                        {room.code} · {room.floor} · {room.acStatus}
                      </span>
                      <h3 className="font-display font-bold text-base text-slate-900 dark:text-slate-100 mt-0.5">
                        {room.name}
                      </h3>
                    </div>
                    <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Cap {room.capacity} Seats
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {room.avSpecs.join(' · ')}
                  </p>

                  <div className="mt-4 space-y-2">
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Assigned Sessions ({roomSessions.length})
                    </div>
                    {roomSessions.length === 0 ? (
                      <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 text-xs text-slate-500">
                        No sessions matching current filter.
                      </div>
                    ) : (
                      roomSessions.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => setSelectedSlipBooking(s)}
                          className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-2 cursor-pointer hover:border-indigo-400"
                        >
                          <div>
                            <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                              {s.eventTitle || s.purpose}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {s.batchCode} · {s.instructorName || s.guestName} ·{' '}
                              {formatShortDateTime(s.startDateTime)}
                            </div>
                          </div>
                          <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400">
                            {s.recurrencePattern || 'Single'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenCellSchedule(room.id, '10:00')}
                  className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors"
                >
                  Schedule Cohort in {room.code}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Session Scheduling Modal */}
      {modalOpen && selectedClassroomObj && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-label="Classroom Session Scheduling Modal"
        >
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-base text-slate-900 dark:text-slate-100">
                    Schedule Classroom & Training Session
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Assign instructor, cohort batch ID, and recurrence timetable
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close session scheduling modal"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 dark:hover:text-slate-200 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleSubmitSession}
              className="p-6 space-y-4 max-h-[82vh] overflow-y-auto"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="cls-room-select"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Select Classroom / Lab
                  </label>
                  <select
                    id="cls-room-select"
                    value={selectedClassroomId}
                    onChange={(e) => setSelectedClassroomId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  >
                    {classrooms.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (Cap {c.capacity} · ${c.hourlyRate}/hr)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="cls-recurrence"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Recurring Schedule Option
                  </label>
                  <select
                    id="cls-recurrence"
                    value={recurrencePattern}
                    onChange={(e) =>
                      setRecurrencePattern(
                        e.target.value as
                          | 'None'
                          | 'Daily'
                          | 'Mon/Wed/Fri'
                          | 'Tue/Thu'
                          | 'Weekly'
                      )
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  >
                    <option value="None">Single Session (No Recurrence)</option>
                    <option value="Mon/Wed/Fri">Every Monday / Wednesday / Friday</option>
                    <option value="Tue/Thu">Every Tuesday / Thursday</option>
                    <option value="Daily">Daily Cohort Intensive</option>
                    <option value="Weekly">Weekly Seminar Slot</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="cls-module-title"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Subject / Training Module Title *
                </label>
                <input
                  id="cls-module-title"
                  type="text"
                  placeholder="e.g., Cloud Security & Zero-Trust Architecture"
                  value={moduleTitle}
                  onChange={(e) => setModuleTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="cls-instructor"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Assigned Instructor *
                  </label>
                  <input
                    id="cls-instructor"
                    type="text"
                    placeholder="e.g., Prof. Hannah Abbott"
                    value={instructorName}
                    onChange={(e) => setInstructorName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="cls-batch"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Batch / Cohort ID *
                  </label>
                  <input
                    id="cls-batch"
                    type="text"
                    placeholder="e.g., BATCH-2026-Q4B"
                    value={batchCode}
                    onChange={(e) => setBatchCode(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="cls-capacity"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Trainee Count (Max {selectedClassroomObj.capacity})
                  </label>
                  <input
                    id="cls-capacity"
                    type="number"
                    min={1}
                    max={selectedClassroomObj.capacity}
                    value={studentCount}
                    onChange={(e) => setStudentCount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="cls-start"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Session Start Date & Time
                  </label>
                  <input
                    id="cls-start"
                    type="datetime-local"
                    value={startDateTime}
                    onChange={(e) => setStartDateTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="cls-end"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Session End Date & Time
                  </label>
                  <input
                    id="cls-end"
                    type="datetime-local"
                    value={endDateTime}
                    onChange={(e) => setEndDateTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              {liveOverlap.hasOverlap && (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 flex items-start gap-2 text-xs text-rose-800 dark:text-rose-200"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{liveOverlap.reason}</span>
                </div>
              )}

              {/* Internal Academy vs External Partner Rental */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAllocationNature('official_admin')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                      allocationNature === 'official_admin'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Internal Training ($0)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllocationNature('paid_rental')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                      allocationNature === 'paid_rental'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    External Partner Rental
                  </button>
                </div>

                <div className="text-right font-mono tabular-nums">
                  <span className="text-xs text-slate-500 block">Session Charge</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {allocationNature === 'official_admin'
                      ? '$0.00'
                      : `$${chargeBreakdown?.totalCost || 0}.00`}
                  </span>
                </div>
              </div>

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
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={liveOverlap.hasOverlap}
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-medium transition-colors"
                >
                  Assign Classroom Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
