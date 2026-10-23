import {
  AllocationNature,
  BookingRecord,
  FacilityType,
  RoomAsset,
  RoomOperationalStatus,
  ServiceAddon,
} from '../types/facility';

export const AVAILABLE_SERVICE_ADDONS: ServiceAddon[] = [
  { id: 'addon-av-tech', name: 'Dedicated AV Technician', price: 60 },
  { id: 'addon-catering', name: 'Refreshment & Tea Service', price: 85 },
  { id: 'addon-recording', name: 'HD Event Recording & Stream', price: 120 },
  { id: 'addon-pa', name: 'Extra Wireless Mic & PA Pack', price: 45 },
];

/**
 * Calculates number of billing days between two ISO date/datetime strings.
 * Rounds up partial days and guarantees at least 1 day when end > start.
 */
export function calculateDaysBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return 0;
  }
  const diffHours = (end - start) / (1000 * 60 * 60);
  // If same calendar date or <= 24 hours, count as 1 day; otherwise ceil to days
  return Math.max(1, Math.ceil(diffHours / 24));
}

/**
 * Calculates number of billing hours between two ISO datetime strings.
 */
export function calculateHoursBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return 0;
  }
  const diffHours = (end - start) / (1000 * 60 * 60);
  return Math.max(1, Math.round(diffHours * 2) / 2);
}

export interface ChargeCalculationInput {
  room: RoomAsset;
  startDateTime: string;
  endDateTime: string;
  allocationNature: AllocationNature;
  billingMode?: 'daily' | 'hourly';
  selectedAddons?: string[];
}

export interface ChargeBreakdown {
  totalCost: number;
  baseCharge: number;
  addonsCharge: number;
  unitsCount: number;
  unitLabel: string;
  unitRate: number;
  isComplimentary: boolean;
}

/**
 * Calculates total charges for a booking across Dormitory, Meeting Room, or Classroom.
 * Official / Administrative bookings are strictly $0 (Complimentary).
 */
export function calculateTotalCharges(input: ChargeCalculationInput): ChargeBreakdown {
  const {
    room,
    startDateTime,
    endDateTime,
    allocationNature,
    billingMode = room.type === 'dormitory' ? 'daily' : 'hourly',
    selectedAddons = [],
  } = input;

  const isHourly = room.type !== 'dormitory' && billingMode === 'hourly';
  const unitsCount = isHourly
    ? calculateHoursBetween(startDateTime, endDateTime)
    : calculateDaysBetween(startDateTime, endDateTime);
  const unitLabel = isHourly ? (unitsCount === 1 ? 'hr' : 'hrs') : unitsCount === 1 ? 'day' : 'days';
  const unitRate = isHourly ? (room.hourlyRate ?? Math.round(room.baseDailyRate / 6)) : room.baseDailyRate;

  if (allocationNature === 'official_admin') {
    return {
      totalCost: 0,
      baseCharge: 0,
      addonsCharge: 0,
      unitsCount,
      unitLabel,
      unitRate,
      isComplimentary: true,
    };
  }

  if (unitsCount <= 0) {
    return {
      totalCost: 0,
      baseCharge: 0,
      addonsCharge: 0,
      unitsCount: 0,
      unitLabel,
      unitRate,
      isComplimentary: false,
    };
  }

  const baseCharge = Math.round(unitsCount * unitRate);
  const addonsCharge = selectedAddons.reduce((sum, addonId) => {
    const found = AVAILABLE_SERVICE_ADDONS.find((a) => a.id === addonId);
    return sum + (found ? found.price : 0);
  }, 0);

  return {
    totalCost: baseCharge + addonsCharge,
    baseCharge,
    addonsCharge,
    unitsCount,
    unitLabel,
    unitRate,
    isComplimentary: false,
  };
}

export interface OverlapResult {
  hasOverlap: boolean;
  conflictingBooking?: BookingRecord;
  reason?: string;
}

/**
 * Validates that a candidate booking does not intersect any active booking
 * for the same room/facility asset.
 * Touching boundaries (endA === startB) are allowed for turnover.
 */
export function checkBookingOverlap(
  existingBookings: BookingRecord[],
  candidate: {
    facilityId: string;
    startDateTime: string;
    endDateTime: string;
    excludeBookingId?: string;
  }
): OverlapResult {
  const startMs = new Date(candidate.startDateTime).getTime();
  const endMs = new Date(candidate.endDateTime).getTime();

  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    return {
      hasOverlap: true,
      reason: 'Please provide valid check-in and check-out dates and times.',
    };
  }

  if (endMs <= startMs) {
    return {
      hasOverlap: true,
      reason: 'End date/time must be after the start date/time.',
    };
  }

  const activeStatuses = new Set(['Confirmed', 'Pending', 'Checked-In']);

  for (const booking of existingBookings) {
    if (booking.id === candidate.excludeBookingId) continue;
    if (booking.facilityId !== candidate.facilityId) continue;
    if (!activeStatuses.has(booking.status)) continue;

    const existingStart = new Date(booking.startDateTime).getTime();
    const existingEnd = new Date(booking.endDateTime).getTime();

    // Two intervals [startMs, endMs) and [existingStart, existingEnd) intersect iff startMs < existingEnd && endMs > existingStart
    if (startMs < existingEnd && endMs > existingStart) {
      return {
        hasOverlap: true,
        conflictingBooking: booking,
        reason: `Conflicts with existing booking ${booking.id} (${booking.guestName}) from ${formatShortDateTime(
          booking.startDateTime
        )} to ${formatShortDateTime(booking.endDateTime)}.`,
      };
    }
  }

  return { hasOverlap: false };
}

export function formatShortDateTime(isoStr: string): string {
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return isoStr;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const day = d.getDate();
  const hours = d.getHours().toString().padStart(2, '0');
  const mins = d.getMinutes().toString().padStart(2, '0');
  return `${month} ${day}, ${hours}:${mins}`;
}

export function formatDateOnly(isoStr: string): string {
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return isoStr;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/**
 * Determines whether a room is currently Occupied, Under Maintenance, or Available
 * on a given reference date (e.g. '2026-10-22').
 */
export function getRoomLiveStatus(
  room: RoomAsset,
  bookings: BookingRecord[],
  referenceDateStr: string = '2026-10-22'
): {
  status: RoomOperationalStatus;
  currentBooking?: BookingRecord;
} {
  if (room.maintenanceMode) {
    return { status: 'Maintenance' };
  }

  const dayStart = new Date(`${referenceDateStr}T00:00:00`).getTime();
  const dayEnd = new Date(`${referenceDateStr}T23:59:59`).getTime();

  // Prioritize Checked-In or Confirmed bookings active today
  const activeToday = bookings.find((b) => {
    if (b.facilityId !== room.id) return false;
    if (b.status !== 'Checked-In' && b.status !== 'Confirmed') return false;
    const bStart = new Date(b.startDateTime).getTime();
    const bEnd = new Date(b.endDateTime).getTime();
    return bStart <= dayEnd && bEnd > dayStart;
  });

  if (activeToday) {
    return { status: 'Occupied', currentBooking: activeToday };
  }

  return { status: 'Available' };
}

export interface DashboardKPIs {
  totalRooms: number;
  bookableRooms: number;
  occupiedTodayCount: number;
  maintenanceCount: number;
  availableTodayCount: number;
  occupancyRatePercent: number;
  activeAllocationsTotal: number;
  activeByFacility: Record<FacilityType, number>;
  totalRentalRevenue: number;
  todayRentalRevenue: number;
  pendingArrivalsTodayCount: number;
}

/**
 * Computes Executive Dashboard KPI metrics deterministically for a reference date.
 */
export function computeDashboardMetrics(
  rooms: RoomAsset[],
  bookings: BookingRecord[],
  referenceDateStr: string = '2026-10-22'
): DashboardKPIs {
  let occupiedTodayCount = 0;
  let maintenanceCount = 0;
  let availableTodayCount = 0;

  for (const room of rooms) {
    const live = getRoomLiveStatus(room, bookings, referenceDateStr);
    if (live.status === 'Maintenance') {
      maintenanceCount++;
    } else if (live.status === 'Occupied') {
      occupiedTodayCount++;
    } else {
      availableTodayCount++;
    }
  }

  const bookableRooms = Math.max(1, rooms.length - maintenanceCount);
  const occupancyRatePercent = Math.round((occupiedTodayCount / bookableRooms) * 100);

  const activeByFacility: Record<FacilityType, number> = {
    dormitory: 0,
    meeting: 0,
    classroom: 0,
  };

  let totalRentalRevenue = 0;
  let todayRentalRevenue = 0;
  let pendingArrivalsTodayCount = 0;

  const dayStart = new Date(`${referenceDateStr}T00:00:00`).getTime();
  const dayEnd = new Date(`${referenceDateStr}T23:59:59`).getTime();

  for (const b of bookings) {
    if (b.status === 'Cancelled') continue;

    const bStart = new Date(b.startDateTime).getTime();
    const bEnd = new Date(b.endDateTime).getTime();
    const isActiveOrUpcoming = b.status === 'Checked-In' || b.status === 'Confirmed' || b.status === 'Pending';

    if (isActiveOrUpcoming) {
      activeByFacility[b.facilityType] = (activeByFacility[b.facilityType] || 0) + 1;
    }

    if (b.allocationNature === 'paid_rental' && b.status !== 'Pending') {
      totalRentalRevenue += b.totalCost;
      if (bStart <= dayEnd && bEnd >= dayStart) {
        todayRentalRevenue += b.totalCost;
      }
    }

    // Incoming arrivals scheduled for reference date or pending requests
    const startsToday = b.startDateTime.startsWith(referenceDateStr);
    if (
      (startsToday && (b.status === 'Confirmed' || b.status === 'Pending')) ||
      b.status === 'Pending'
    ) {
      pendingArrivalsTodayCount++;
    }
  }

  const activeAllocationsTotal =
    activeByFacility.dormitory + activeByFacility.meeting + activeByFacility.classroom;

  return {
    totalRooms: rooms.length,
    bookableRooms,
    occupiedTodayCount,
    maintenanceCount,
    availableTodayCount,
    occupancyRatePercent,
    activeAllocationsTotal,
    activeByFacility,
    totalRentalRevenue,
    todayRentalRevenue,
    pendingArrivalsTodayCount,
  };
}
