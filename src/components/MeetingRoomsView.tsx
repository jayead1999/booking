import React, { useState, useEffect, useMemo } from 'react';
import {
  Presentation,
  Plus,
  Users,
  MonitorSpeaker,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  X,
  Building2,
  Briefcase,
} from 'lucide-react';
import { useFacility } from '../context/FacilityContext';
import { AllocationNature } from '../types/facility';
import {
  AVAILABLE_SERVICE_ADDONS,
  calculateTotalCharges,
  formatDateOnly,
  formatShortDateTime,
  getRoomLiveStatus,
} from '../utils/bookingLogic';

const HOURLY_SLOTS = [
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
  '18:00',
];

export const MeetingRoomsView: React.FC = () => {
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

  const meetingSpaces = useMemo(
    () => rooms.filter((r) => r.type === 'meeting'),
    [rooms]
  );

  const [selectedScheduleDate, setSelectedScheduleDate] =
    useState<string>(referenceDate);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  // Booking Modal Form State
  const [selectedVenueId, setSelectedVenueId] = useState<string>('MEET-B1');
  const [eventTitle, setEventTitle] = useState<string>('');
  const [hostName, setHostName] = useState<string>('');
  const [hostId, setHostId] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [organization, setOrganization] = useState<string>('');
  const [attendeeCount, setAttendeeCount] = useState<number>(12);
  const [allocationNature, setAllocationNature] =
    useState<AllocationNature>('official_admin');
  const [billingMode, setBillingMode] = useState<'hourly' | 'daily'>('hourly');
  const [startDateTime, setStartDateTime] = useState<string>(
    `${referenceDate}T14:00`
  );
  const [endDateTime, setEndDateTime] = useState<string>(
    `${referenceDate}T16:00`
  );
  const [purpose, setPurpose] = useState<string>('');
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([
    '4K Laser Projector',
    'Wireless Mics',
  ]);
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedScheduleDate(referenceDate);
  }, [referenceDate]);

  useEffect(() => {
    if (quickAllocateRoomId) {
      const target = meetingSpaces.find((r) => r.id === quickAllocateRoomId);
      if (target) {
        setSelectedVenueId(target.id);
        setSelectedEquipment(target.avSpecs.slice(0, 2));
        setModalOpen(true);
      }
      clearQuickAllocateRoom();
    }
  }, [quickAllocateRoomId, meetingSpaces, clearQuickAllocateRoom]);

  const selectedVenue =
    meetingSpaces.find((r) => r.id === selectedVenueId) || meetingSpaces[0];

  const chargeBreakdown = useMemo(() => {
    if (!selectedVenue) return null;
    return calculateTotalCharges({
      room: selectedVenue,
      startDateTime,
      endDateTime,
      allocationNature,
      billingMode,
      selectedAddons,
    });
  }, [
    selectedVenue,
    startDateTime,
    endDateTime,
    allocationNature,
    billingMode,
    selectedAddons,
  ]);

  const liveOverlap = useMemo(() => {
    if (!selectedVenue) return { hasOverlap: false };
    return validateOverlap(selectedVenue.id, startDateTime, endDateTime);
  }, [selectedVenue, startDateTime, endDateTime, validateOverlap]);

  const stepScheduleDate = (deltaDays: number) => {
    const d = new Date(`${selectedScheduleDate}T00:00:00`);
    d.setDate(d.getDate() + deltaDays);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setSelectedScheduleDate(`${yyyy}-${mm}-${dd}`);
  };

  const handleOpenSlotBooking = (venueId: string, hourStr?: string) => {
    const venue = meetingSpaces.find((v) => v.id === venueId) || meetingSpaces[0];
    setSelectedVenueId(venue.id);
    setSelectedEquipment(venue.avSpecs.slice(0, 2));
    setAttendeeCount(Math.min(15, venue.capacity));

    const startH = hourStr || '14:00';
    const startHourNum = parseInt(startH.split(':')[0], 10);
    const endHourNum = Math.min(20, startHourNum + 2);
    const endH = `${String(endHourNum).padStart(2, '0')}:00`;

    setStartDateTime(`${selectedScheduleDate}T${startH}`);
    setEndDateTime(`${selectedScheduleDate}T${endH}`);
    setFormError(null);
    setModalOpen(true);
  };

  const toggleEquipmentItem = (spec: string) => {
    setSelectedEquipment((prev) =>
      prev.includes(spec) ? prev.filter((item) => item !== spec) : [...prev, spec]
    );
  };

  const toggleAddonItem = (addonId: string) => {
    setSelectedAddons((prev) =>
      prev.includes(addonId)
        ? prev.filter((item) => item !== addonId)
        : [...prev, addonId]
    );
  };

  const handleSubmitVenueBooking = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!eventTitle.trim()) {
      setFormError('Event or meeting title is required.');
      return;
    }
    if (!hostName.trim()) {
      setFormError('Organizer or host name is required.');
      return;
    }
    if (!phone.trim()) {
      setFormError('Organizer contact phone is required.');
      return;
    }
    if (selectedVenue && attendeeCount > selectedVenue.capacity) {
      setFormError(
        `Expected attendee count (${attendeeCount}) exceeds ${selectedVenue.name} capacity (${selectedVenue.capacity} seats).`
      );
      return;
    }
    if (liveOverlap.hasOverlap) {
      setFormError(
        liveOverlap.reason || 'Selected time slot conflicts with an existing reservation.'
      );
      return;
    }

    const res = createBooking({
      facilityId: selectedVenueId,
      guestName: hostName,
      nationalOrEmployeeId: hostId.trim() || 'ORG-VERIFIED',
      phone,
      departmentOrOrg:
        organization.trim() ||
        (allocationNature === 'official_admin'
          ? 'Internal Department'
          : 'External Organization'),
      purpose: purpose.trim() || eventTitle.trim(),
      eventTitle: eventTitle.trim(),
      attendeeCount,
      equipmentChecklist: selectedEquipment,
      selectedAddons: allocationNature === 'paid_rental' ? selectedAddons : [],
      startDateTime,
      endDateTime,
      allocationNature,
      billingMode,
      totalCost: chargeBreakdown ? chargeBreakdown.totalCost : 0,
      status: 'Confirmed',
    });

    if (!res.success) {
      setFormError(res.error || 'Unable to book venue slot.');
      return;
    }

    setBannerMessage(
      `Scheduled "${res.booking?.eventTitle}" (${res.booking?.id}) in ${res.booking?.assetName} (${
        allocationNature === 'official_admin'
          ? 'Internal Office Use · $0.00'
          : `Commercial Rental · $${res.booking?.totalCost}`
      }).`
    );
    setEventTitle('');
    setHostName('');
    setHostId('');
    setPhone('');
    setOrganization('');
    setPurpose('');
    setSelectedAddons([]);
    setModalOpen(false);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-slate-900 dark:text-slate-100 tracking-tight">
            Meeting Rooms & Auditorium Management
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Executive boardrooms, 280-seat auditorium, AV equipment readiness, and hourly/daily commercial slot scheduler
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenSlotBooking('MEET-C1', '10:00')}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Reserve Venue / Auditorium
        </button>
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

      {/* Hourly & Daily Slot Scheduler Matrix */}
      <section
        aria-label="Hourly and Daily Venue Slot Scheduler"
        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden"
      >
        <div className="p-5 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display font-semibold text-base text-slate-900 dark:text-slate-100">
              Hourly & Daily Venue Slot Scheduler — {formatDateOnly(selectedScheduleDate)}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Prevents double-booking across identical time intervals · Click any open hour cell to reserve
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
                Internal Office ($0)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-indigo-600 inline-block" />
                Commercial Rent ($)
              </span>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => stepScheduleDate(-1)}
                aria-label="Previous day"
                className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="date"
                aria-label="Schedule date"
                value={selectedScheduleDate}
                onChange={(e) => {
                  if (e.target.value) setSelectedScheduleDate(e.target.value);
                }}
                className="px-2 py-1 text-xs font-mono bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => stepScheduleDate(1)}
                aria-label="Next day"
                className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-left min-w-[860px]">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60">
                <th className="py-3 px-3 w-48 text-xs font-semibold text-slate-600 dark:text-slate-300 border-r border-slate-200/80 dark:border-slate-800">
                  Meeting Venue / Auditorium
                </th>
                {HOURLY_SLOTS.map((hour) => (
                  <th
                    key={hour}
                    className="py-2.5 px-1 text-center font-mono text-xs font-medium text-slate-600 dark:text-slate-400 border-r border-slate-200/60 dark:border-slate-800/70 tabular-nums"
                  >
                    {hour}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
              {meetingSpaces.map((venue) => {
                const venueBookings = bookings.filter(
                  (b) => b.facilityId === venue.id && b.status !== 'Cancelled'
                );

                return (
                  <tr
                    key={venue.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
                  >
                    <td className="py-3 px-3 border-r border-slate-200/80 dark:border-slate-800">
                      <div className="font-display font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                        {venue.name}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                        {venue.capacity} Seats · ${venue.hourlyRate}/hr
                      </div>
                    </td>

                    {HOURLY_SLOTS.map((hour) => {
                      const slotStartMs = new Date(
                        `${selectedScheduleDate}T${hour}:00`
                      ).getTime();
                      const slotEndMs = slotStartMs + 60 * 60 * 1000;

                      const matchingBooking = venueBookings.find((b) => {
                        const bStart = new Date(b.startDateTime).getTime();
                        const bEnd = new Date(b.endDateTime).getTime();
                        return bStart < slotEndMs && bEnd > slotStartMs;
                      });

                      if (matchingBooking) {
                        const isInternal =
                          matchingBooking.allocationNature === 'official_admin';

                        return (
                          <td
                            key={hour}
                            className="p-1 border-r border-slate-100 dark:border-slate-800/60 overflow-hidden"
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedSlipBooking(matchingBooking)}
                              title={`${matchingBooking.eventTitle || matchingBooking.purpose} (${matchingBooking.guestName})`}
                              className={`w-full px-1.5 py-1.5 rounded text-left text-[10px] font-medium truncate transition-opacity hover:opacity-90 ${
                                isInternal
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-indigo-600 text-white'
                              }`}
                            >
                              <div className="truncate font-semibold">
                                {matchingBooking.guestName.split(' ')[0]}
                              </div>
                              <div className="font-mono text-[9px] opacity-90 truncate tabular-nums">
                                {isInternal ? '$0 Int' : `$${matchingBooking.totalCost}`}
                              </div>
                            </button>
                          </td>
                        );
                      }

                      return (
                        <td
                          key={hour}
                          className="p-1 border-r border-slate-100 dark:border-slate-800/60"
                        >
                          <button
                            type="button"
                            onClick={() => handleOpenSlotBooking(venue.id, hour)}
                            aria-label={`Book ${venue.name} at ${hour} on ${selectedScheduleDate}`}
                            className="w-full h-11 rounded border border-dashed border-transparent hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/40 text-[10px] text-transparent hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-all flex items-center justify-center"
                          >
                            + Slot
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

      {/* Venue Directory Cards */}
      <section aria-label="Venue Directory and AV Specifications" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-semibold text-lg text-slate-900 dark:text-slate-100">
            Venue Directory & AV Equipment Specifications
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Internal Office Meetings: Free ($0) · External Commercial Events: Hourly / Daily Tariff
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {meetingSpaces.map((venue) => {
            const live = getRoomLiveStatus(venue, bookings, referenceDate);
            const activeBk = live.currentBooking;

            return (
              <div
                key={venue.id}
                className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                        {venue.code} · {venue.floor}
                      </span>
                      <h3 className="font-display font-bold text-lg text-slate-900 dark:text-slate-100 mt-0.5">
                        {venue.name}
                      </h3>
                    </div>

                    <div className="text-right font-mono tabular-nums">
                      <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                        ${venue.hourlyRate}/hr
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        or ${venue.baseDailyRate}/full day
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {venue.description}
                  </p>

                  {/* Seat Capacity & AV Equipment */}
                  <div className="pt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-700 dark:text-slate-300">
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      Capacity: <strong className="font-mono">{venue.capacity} Seats</strong>
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                      <MonitorSpeaker className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      {venue.avSpecs.join(' · ')}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs">
                    <span className="text-slate-500 dark:text-slate-400 mr-1.5">
                      Today's Status:
                    </span>
                    <span
                      className={`font-mono font-semibold ${
                        live.status === 'Available'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-indigo-600 dark:text-indigo-400'
                      }`}
                    >
                      {live.status}
                    </span>
                    {activeBk && (
                      <span className="text-slate-500 dark:text-slate-400 ml-1.5">
                        ({activeBk.eventTitle || activeBk.guestName})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {activeBk && (
                      <button
                        type="button"
                        onClick={() => setSelectedSlipBooking(activeBk)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        Event Slip
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpenSlotBooking(venue.id)}
                      className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors"
                    >
                      Schedule Event Slot
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Venue & Auditorium Booking Modal */}
      {modalOpen && selectedVenue && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-label="Meeting Room and Auditorium Booking Modal"
        >
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                  <Presentation className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-base text-slate-900 dark:text-slate-100">
                    Schedule Meeting Room / Auditorium
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Configure Internal Office Meeting ($0) or External Commercial Rental
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close venue booking modal"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 dark:hover:text-slate-200 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={handleSubmitVenueBooking}
              className="p-6 space-y-5 max-h-[82vh] overflow-y-auto"
            >
              {/* Venue Selector & Internal vs External Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="venue-select"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Select Venue Space
                  </label>
                  <select
                    id="venue-select"
                    value={selectedVenueId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setSelectedVenueId(nextId);
                      const v = meetingSpaces.find((m) => m.id === nextId);
                      if (v) {
                        setSelectedEquipment(v.avSpecs.slice(0, 2));
                        setAttendeeCount(Math.min(attendeeCount, v.capacity));
                      }
                    }}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  >
                    {meetingSpaces.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} (Cap {v.capacity} · ${v.hourlyRate}/hr)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Booking Classification
                  </span>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setAllocationNature('official_admin')}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-colors ${
                        allocationNature === 'official_admin'
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5 shrink-0" />
                      Internal ($0)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllocationNature('paid_rental')}
                      className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-colors ${
                        allocationNature === 'paid_rental'
                          ? 'bg-indigo-600 text-white'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Briefcase className="w-3.5 h-3.5 shrink-0" />
                      Commercial Rent
                    </button>
                  </div>
                </div>
              </div>

              {/* Start / End Time & Billing Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="venue-start"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Start Date & Time
                  </label>
                  <input
                    id="venue-start"
                    type="datetime-local"
                    value={startDateTime}
                    onChange={(e) => setStartDateTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="venue-end"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    End Date & Time
                  </label>
                  <input
                    id="venue-end"
                    type="datetime-local"
                    value={endDateTime}
                    onChange={(e) => setEndDateTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="venue-billing-mode"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Tariff Calculation Mode
                  </label>
                  <select
                    id="venue-billing-mode"
                    value={billingMode}
                    onChange={(e) =>
                      setBillingMode(e.target.value as 'hourly' | 'daily')
                    }
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  >
                    <option value="hourly">
                      Hourly Slot (${selectedVenue.hourlyRate}/hr)
                    </option>
                    <option value="daily">
                      Full-Day Convention (${selectedVenue.baseDailyRate}/day)
                    </option>
                  </select>
                </div>
              </div>

              {liveOverlap.hasOverlap && (
                <div
                  role="alert"
                  className="p-3.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-200"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-semibold block">
                      Double-Booking Prevented
                    </strong>
                    <span>{liveOverlap.reason}</span>
                  </div>
                </div>
              )}

              {/* Event Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="venue-event-title"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Event / Meeting Title *
                  </label>
                  <input
                    id="venue-event-title"
                    type="text"
                    placeholder="e.g., Annual Regional FinTech Symposium"
                    value={eventTitle}
                    onChange={(e) => setEventTitle(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="venue-attendees"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Expected Attendees (Max {selectedVenue.capacity})
                  </label>
                  <input
                    id="venue-attendees"
                    type="number"
                    min={1}
                    max={selectedVenue.capacity}
                    value={attendeeCount}
                    onChange={(e) => setAttendeeCount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="venue-host"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Host / Organizer Name *
                  </label>
                  <input
                    id="venue-host"
                    type="text"
                    placeholder="e.g., Claire Sterling"
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="venue-phone"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Contact Phone *
                  </label>
                  <input
                    id="venue-phone"
                    type="tel"
                    placeholder="+1 (555) 488-2020"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="venue-org"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Department / Client Org
                  </label>
                  <input
                    id="venue-org"
                    type="text"
                    placeholder="e.g., Strategy Dept or External Corp"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              {/* AV Equipment Checklist */}
              <div>
                <span className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  AV Equipment Setup Checklist
                </span>
                <div className="flex flex-wrap gap-2">
                  {selectedVenue.avSpecs.map((spec) => {
                    const checked = selectedEquipment.includes(spec);
                    return (
                      <button
                        key={spec}
                        type="button"
                        onClick={() => toggleEquipmentItem(spec)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          checked
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-950/60 dark:border-indigo-700 dark:text-indigo-300'
                            : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {checked ? '✓ ' : '+ '}
                        {spec}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Commercial Rental Add-ons */}
              {allocationNature === 'paid_rental' && (
                <div>
                  <span className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Optional Commercial Event Service Add-ons
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {AVAILABLE_SERVICE_ADDONS.map((addon) => {
                      const active = selectedAddons.includes(addon.id);
                      return (
                        <button
                          key={addon.id}
                          type="button"
                          onClick={() => toggleAddonItem(addon.id)}
                          className={`p-2.5 rounded-lg border text-left flex items-center justify-between text-xs transition-colors ${
                            active
                              ? 'bg-indigo-50/80 border-indigo-400 text-indigo-900 dark:bg-indigo-950/60 dark:border-indigo-700 dark:text-indigo-200'
                              : 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300'
                          }`}
                        >
                          <span className="font-medium">{addon.name}</span>
                          <span className="font-mono font-semibold">+${addon.price}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Pricing Summary */}
              {chargeBreakdown && (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                  <div className="text-xs space-y-0.5">
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      Venue Fee Calculation ({selectedVenue.name})
                    </div>
                    <div className="font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                      {allocationNature === 'official_admin'
                        ? 'Internal Office Meeting → $0.00 Complimentary Allocation'
                        : `${chargeBreakdown.unitsCount} ${chargeBreakdown.unitLabel} × $${chargeBreakdown.unitRate} ($${chargeBreakdown.baseCharge}) + Add-ons ($${chargeBreakdown.addonsCharge})`}
                    </div>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    <div className="text-[11px] text-slate-500">Total Venue Charge</div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {allocationNature === 'official_admin' ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          $0.00 (Internal)
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
                  Confirm Venue Reservation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
