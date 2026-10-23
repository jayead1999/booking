import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDaysBetween,
  calculateHoursBetween,
  calculateTotalCharges,
  checkBookingOverlap,
  computeDashboardMetrics,
} from './bookingLogic';
import { BookingRecord, RoomAsset } from '../types/facility';

const mockAcDorm: RoomAsset = {
  id: 'DORM-201',
  code: 'RM-201',
  name: 'Room 201 - Executive Suite',
  type: 'dormitory',
  floor: '2nd Floor',
  capacity: 2,
  acStatus: 'AC',
  baseDailyRate: 40,
  maintenanceMode: false,
  avSpecs: ['Wi-Fi', 'Work Desk'],
  description: 'AC VIP Guest Room',
};

const mockNonAcDorm: RoomAsset = {
  id: 'DORM-101',
  code: 'RM-101',
  name: 'Room 101 - Standard Twin',
  type: 'dormitory',
  floor: '1st Floor',
  capacity: 2,
  acStatus: 'Non-AC',
  baseDailyRate: 20,
  maintenanceMode: false,
  avSpecs: ['Wi-Fi'],
  description: 'Standard Non-AC Room',
};

const mockBoardroom: RoomAsset = {
  id: 'MEET-B1',
  code: 'MR-401',
  name: 'Executive Boardroom',
  type: 'meeting',
  floor: '4th Floor',
  capacity: 18,
  acStatus: 'AC',
  baseDailyRate: 420,
  hourlyRate: 65,
  maintenanceMode: false,
  avSpecs: ['Projector', 'VC Setup', 'Boundary Mics'],
  description: 'Executive conference venue',
};

test('calculateDaysBetween computes billing days accurately', () => {
  assert.equal(calculateDaysBetween('2026-10-22T14:00', '2026-10-25T11:00'), 3);
  assert.equal(calculateDaysBetween('2026-10-22T09:00', '2026-10-22T18:00'), 1);
  assert.equal(calculateDaysBetween('2026-10-25T12:00', '2026-10-22T12:00'), 0);
});

test('calculateHoursBetween computes slot duration accurately', () => {
  assert.equal(calculateHoursBetween('2026-10-22T09:00', '2026-10-22T13:00'), 4);
  assert.equal(calculateHoursBetween('2026-10-22T14:00', '2026-10-22T15:30'), 1.5);
});

test('calculateTotalCharges locks Official/Admin bookings to $0 complimentary', () => {
  const result = calculateTotalCharges({
    room: mockAcDorm,
    startDateTime: '2026-10-22T14:00',
    endDateTime: '2026-10-26T11:00',
    allocationNature: 'official_admin',
  });
  assert.equal(result.totalCost, 0);
  assert.equal(result.isComplimentary, true);
  assert.equal(result.unitsCount, 4);
});

test('calculateTotalCharges calculates AC ($40/day) vs Non-AC ($20/day) rental accurately', () => {
  const acResult = calculateTotalCharges({
    room: mockAcDorm,
    startDateTime: '2026-10-22T12:00',
    endDateTime: '2026-10-25T12:00',
    allocationNature: 'paid_rental',
  });
  assert.equal(acResult.unitsCount, 3);
  assert.equal(acResult.totalCost, 120);

  const nonAcResult = calculateTotalCharges({
    room: mockNonAcDorm,
    startDateTime: '2026-10-22T12:00',
    endDateTime: '2026-10-25T12:00',
    allocationNature: 'paid_rental',
  });
  assert.equal(nonAcResult.unitsCount, 3);
  assert.equal(nonAcResult.totalCost, 60);
});

test('calculateTotalCharges includes hourly rates and service add-ons for external meeting rentals', () => {
  const meetingRental = calculateTotalCharges({
    room: mockBoardroom,
    startDateTime: '2026-10-22T09:00',
    endDateTime: '2026-10-22T13:00',
    allocationNature: 'paid_rental',
    billingMode: 'hourly',
    selectedAddons: ['addon-av-tech', 'addon-catering'], // 60 + 85 = 145
  });
  assert.equal(meetingRental.unitsCount, 4);
  assert.equal(meetingRental.baseCharge, 260); // 4 * 65
  assert.equal(meetingRental.addonsCharge, 145);
  assert.equal(meetingRental.totalCost, 405);
});

test('checkBookingOverlap blocks overlapping dates and allows non-overlapping or cancelled dates', () => {
  const existing: BookingRecord[] = [
    {
      id: 'BK-1001',
      facilityId: 'DORM-201',
      facilityType: 'dormitory',
      assetName: 'Room 201 - Executive Suite',
      guestName: 'Dr. Aris Thorne',
      nationalOrEmployeeId: 'EMP-8821',
      phone: '+1 555-0142',
      departmentOrOrg: 'Internal Audit',
      purpose: 'Annual Audit Inspection',
      startDateTime: '2026-10-22T14:00',
      endDateTime: '2026-10-25T11:00',
      allocationNature: 'official_admin',
      totalCost: 0,
      status: 'Checked-In',
      createdAt: '2026-10-20T10:00',
    },
    {
      id: 'BK-1002',
      facilityId: 'DORM-201',
      facilityType: 'dormitory',
      assetName: 'Room 201 - Executive Suite',
      guestName: 'Cancelled Guest',
      nationalOrEmployeeId: 'EMP-9910',
      phone: '+1 555-0199',
      departmentOrOrg: 'Finance',
      purpose: 'Cancelled Visit',
      startDateTime: '2026-10-26T14:00',
      endDateTime: '2026-10-28T11:00',
      allocationNature: 'paid_rental',
      totalCost: 80,
      status: 'Cancelled',
      createdAt: '2026-10-20T10:00',
    },
  ];

  // Intersecting middle
  const overlapCheck = checkBookingOverlap(existing, {
    facilityId: 'DORM-201',
    startDateTime: '2026-10-23T12:00',
    endDateTime: '2026-10-26T11:00',
  });
  assert.equal(overlapCheck.hasOverlap, true);
  assert.equal(overlapCheck.conflictingBooking?.id, 'BK-1001');

  // Exact boundary turnover (check-in right at 11:00 check-out of BK-1001)
  const turnoverCheck = checkBookingOverlap(existing, {
    facilityId: 'DORM-201',
    startDateTime: '2026-10-25T11:00',
    endDateTime: '2026-10-26T11:00',
  });
  assert.equal(turnoverCheck.hasOverlap, false);

  // Overlaps only with a Cancelled booking -> should be allowed
  const cancelledSlotCheck = checkBookingOverlap(existing, {
    facilityId: 'DORM-201',
    startDateTime: '2026-10-26T15:00',
    endDateTime: '2026-10-27T11:00',
  });
  assert.equal(cancelledSlotCheck.hasOverlap, false);
});

test('computeDashboardMetrics calculates occupancy rate and revenue accurately', () => {
  const rooms: RoomAsset[] = [mockAcDorm, mockNonAcDorm, mockBoardroom];
  const bookings: BookingRecord[] = [
    {
      id: 'BK-2001',
      facilityId: 'DORM-201',
      facilityType: 'dormitory',
      assetName: 'Room 201',
      guestName: 'Elena Rostova',
      nationalOrEmployeeId: 'PASS-7741',
      phone: '+1 555-0192',
      departmentOrOrg: 'Partner Delegation',
      purpose: 'Guest Stay',
      startDateTime: '2026-10-21T14:00',
      endDateTime: '2026-10-24T11:00',
      allocationNature: 'paid_rental',
      totalCost: 120,
      status: 'Checked-In',
      createdAt: '2026-10-19T09:00',
    },
    {
      id: 'BK-2002',
      facilityId: 'MEET-B1',
      facilityType: 'meeting',
      assetName: 'Executive Boardroom',
      guestName: 'Marcus Vance',
      nationalOrEmployeeId: 'EMP-3012',
      phone: '+1 555-0118',
      departmentOrOrg: 'Strategy Group',
      purpose: 'Q4 Executive Briefing',
      startDateTime: '2026-10-22T10:00',
      endDateTime: '2026-10-22T16:00',
      allocationNature: 'official_admin',
      totalCost: 0,
      status: 'Confirmed',
      createdAt: '2026-10-20T09:00',
    },
  ];

  const metrics = computeDashboardMetrics(rooms, bookings, '2026-10-22');
  assert.equal(metrics.totalRooms, 3);
  assert.equal(metrics.occupiedTodayCount, 2);
  assert.equal(metrics.occupancyRatePercent, 67);
  assert.equal(metrics.totalRentalRevenue, 120);
  assert.equal(metrics.pendingArrivalsTodayCount, 1);
});
