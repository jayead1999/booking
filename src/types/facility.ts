export type FacilityType = 'dormitory' | 'meeting' | 'classroom';

export type ACStatus = 'AC' | 'Non-AC';

export type RoomOperationalStatus = 'Available' | 'Occupied' | 'Maintenance';

export type AllocationNature = 'official_admin' | 'paid_rental';

export type BookingStatus =
  | 'Confirmed'
  | 'Pending'
  | 'Checked-In'
  | 'Completed'
  | 'Cancelled';

export interface ServiceAddon {
  id: string;
  name: string;
  price: number;
}

export interface RoomAsset {
  id: string;
  code: string;
  name: string;
  type: FacilityType;
  floor: string;
  capacity: number;
  acStatus: ACStatus;
  baseDailyRate: number;
  hourlyRate?: number;
  maintenanceMode: boolean;
  avSpecs: string[];
  description: string;
}

export interface BookingRecord {
  id: string;
  facilityId: string;
  facilityType: FacilityType;
  assetName: string;
  // Guest / Organizer / Instructor details
  guestName: string;
  nationalOrEmployeeId: string;
  phone: string;
  departmentOrOrg: string;
  purpose: string;
  // Timestamps (ISO 8601 strings e.g. '2026-10-22T09:00')
  startDateTime: string;
  endDateTime: string;
  // Billing & Classification
  allocationNature: AllocationNature;
  billingMode?: 'daily' | 'hourly';
  selectedAddons?: string[];
  totalCost: number;
  status: BookingStatus;
  // Meeting / Classroom specific metadata
  eventTitle?: string;
  attendeeCount?: number;
  equipmentChecklist?: string[];
  instructorName?: string;
  batchCode?: string;
  recurrencePattern?: 'None' | 'Daily' | 'Mon/Wed/Fri' | 'Tue/Thu' | 'Weekly';
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  category: 'checkin' | 'booking' | 'maintenance' | 'billing';
  relatedBookingId?: string;
}

export interface RateConfig {
  dormitoryAcDailyRate: number;
  dormitoryNonAcDailyRate: number;
  cateringPerHeadRate: number;
  avTechSupportFlatFee: number;
  recordingPackageFlatFee: number;
}

export type ActiveModule =
  | 'dashboard'
  | 'dormitory'
  | 'meeting'
  | 'classrooms'
  | 'directory'
  | 'settings';
