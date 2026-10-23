import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  ActiveModule,
  BookingRecord,
  BookingStatus,
  FacilityType,
  NotificationItem,
  RateConfig,
  RoomAsset,
} from '../types/facility';
import {
  INITIAL_BOOKINGS,
  INITIAL_NOTIFICATIONS,
  INITIAL_RATE_CONFIG,
  INITIAL_ROOMS,
  REFERENCE_TODAY,
} from '../data/mockData';
import {
  checkBookingOverlap,
  computeDashboardMetrics,
  DashboardKPIs,
  OverlapResult,
} from '../utils/bookingLogic';

interface CreateBookingPayload {
  facilityId: string;
  guestName: string;
  nationalOrEmployeeId: string;
  phone: string;
  departmentOrOrg: string;
  purpose: string;
  startDateTime: string;
  endDateTime: string;
  allocationNature: 'official_admin' | 'paid_rental';
  billingMode?: 'daily' | 'hourly';
  selectedAddons?: string[];
  totalCost: number;
  status?: BookingStatus;
  eventTitle?: string;
  attendeeCount?: number;
  equipmentChecklist?: string[];
  instructorName?: string;
  batchCode?: string;
  recurrencePattern?: 'None' | 'Daily' | 'Mon/Wed/Fri' | 'Tue/Thu' | 'Weekly';
}

interface FacilityContextValue {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  activeModule: ActiveModule;
  setActiveModule: (mod: ActiveModule) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  referenceDate: string;
  setReferenceDate: (dateStr: string) => void;
  rooms: RoomAsset[];
  bookings: BookingRecord[];
  notifications: NotificationItem[];
  rateConfig: RateConfig;
  globalSearch: string;
  setGlobalSearch: (q: string) => void;
  activeFacilityFilter: FacilityType | 'all';
  setActiveFacilityFilter: (f: FacilityType | 'all') => void;
  kpis: DashboardKPIs;
  // CRUD operations
  createBooking: (payload: CreateBookingPayload) => {
    success: boolean;
    booking?: BookingRecord;
    error?: string;
  };
  validateOverlap: (
    facilityId: string,
    startDateTime: string,
    endDateTime: string,
    excludeBookingId?: string
  ) => OverlapResult;
  updateBookingStatus: (bookingId: string, newStatus: BookingStatus) => void;
  cancelBooking: (bookingId: string) => void;
  toggleRoomMaintenance: (roomId: string) => void;
  updateRateConfig: (newConfig: Partial<RateConfig>) => void;
  markAllNotificationsRead: () => void;
  markNotificationRead: (id: string) => void;
  resetDemoData: () => void;
  selectedSlipBooking: BookingRecord | null;
  setSelectedSlipBooking: (b: BookingRecord | null) => void;
  quickAllocateRoomId: string | null;
  openQuickAllocationForRoom: (roomId: string) => void;
  clearQuickAllocateRoom: () => void;
}

const FacilityContext = createContext<FacilityContextValue | undefined>(undefined);

const STORAGE_KEYS = {
  THEME: 'nexus_facility_theme_v1',
  ROOMS: 'nexus_facility_rooms_v1',
  BOOKINGS: 'nexus_facility_bookings_v1',
  NOTIFICATIONS: 'nexus_facility_notifs_v1',
  RATES: 'nexus_facility_rates_v1',
};

export const FacilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.THEME);
      if (saved === 'dark' || saved === 'light') return saved;
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch {
      // ignore storage errors
    }
    return 'light';
  });

  const [activeModule, setActiveModule] = useState<ActiveModule>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [referenceDate, setReferenceDate] = useState<string>(REFERENCE_TODAY);
  const [globalSearch, setGlobalSearch] = useState<string>('');
  const [activeFacilityFilter, setActiveFacilityFilter] = useState<FacilityType | 'all'>('all');
  const [selectedSlipBooking, setSelectedSlipBooking] = useState<BookingRecord | null>(null);
  const [quickAllocateRoomId, setQuickAllocateRoomId] = useState<string | null>(null);

  const [rooms, setRooms] = useState<RoomAsset[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ROOMS);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_ROOMS;
  });

  const [bookings, setBookings] = useState<BookingRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_BOOKINGS;
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_NOTIFICATIONS;
  });

  const [rateConfig, setRateConfig] = useState<RateConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.RATES);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return INITIAL_RATE_CONFIG;
  });

  // Sync dark mode class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(rooms));
    } catch {
      // ignore
    }
  }, [rooms]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
    } catch {
      // ignore
    }
  }, [bookings]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    } catch {
      // ignore
    }
  }, [notifications]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.RATES, JSON.stringify(rateConfig));
    } catch {
      // ignore
    }
  }, [rateConfig]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const setTheme = (next: 'light' | 'dark') => {
    setThemeState(next);
  };

  const validateOverlap = (
    facilityId: string,
    startDateTime: string,
    endDateTime: string,
    excludeBookingId?: string
  ): OverlapResult => {
    return checkBookingOverlap(bookings, {
      facilityId,
      startDateTime,
      endDateTime,
      excludeBookingId,
    });
  };

  const createBooking = (payload: CreateBookingPayload) => {
    const room = rooms.find((r) => r.id === payload.facilityId);
    if (!room) {
      return { success: false, error: 'Selected facility room was not found.' };
    }
    if (room.maintenanceMode) {
      return {
        success: false,
        error: `${room.name} is currently under maintenance and cannot be allocated.`,
      };
    }

    const overlap = validateOverlap(
      payload.facilityId,
      payload.startDateTime,
      payload.endDateTime
    );
    if (overlap.hasOverlap) {
      return {
        success: false,
        error: overlap.reason || 'Selected dates intersect with an existing booking.',
      };
    }

    const nextNumber = 1096 + bookings.length;
    const newBooking: BookingRecord = {
      id: `BK-${nextNumber}`,
      facilityId: room.id,
      facilityType: room.type,
      assetName: room.name,
      guestName: payload.guestName.trim(),
      nationalOrEmployeeId: payload.nationalOrEmployeeId.trim() || 'EMP-VERIFIED',
      phone: payload.phone.trim(),
      departmentOrOrg: payload.departmentOrOrg.trim(),
      purpose: payload.purpose.trim(),
      startDateTime: payload.startDateTime,
      endDateTime: payload.endDateTime,
      allocationNature: payload.allocationNature,
      billingMode: payload.billingMode || (room.type === 'dormitory' ? 'daily' : 'hourly'),
      selectedAddons: payload.selectedAddons || [],
      totalCost: payload.allocationNature === 'official_admin' ? 0 : payload.totalCost,
      status: payload.status || 'Confirmed',
      eventTitle: payload.eventTitle,
      attendeeCount: payload.attendeeCount,
      equipmentChecklist: payload.equipmentChecklist,
      instructorName: payload.instructorName,
      batchCode: payload.batchCode,
      recurrencePattern: payload.recurrencePattern,
      createdAt: `${referenceDate}T10:00`,
    };

    setBookings((prev) => [newBooking, ...prev]);

    const newNotif: NotificationItem = {
      id: `NOTIF-${Date.now()}`,
      title: `New Allocation Confirmed · ${newBooking.id}`,
      message: `${newBooking.guestName} allocated to ${room.name} (${
        newBooking.allocationNature === 'official_admin'
          ? 'Official Admin · $0'
          : `Paid Rental · $${newBooking.totalCost}`
      }).`,
      timestamp: 'Just now',
      read: false,
      category: 'booking',
      relatedBookingId: newBooking.id,
    };
    setNotifications((prev) => [newNotif, ...prev]);

    return { success: true, booking: newBooking };
  };

  const updateBookingStatus = (bookingId: string, newStatus: BookingStatus) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
    );

    const target = bookings.find((b) => b.id === bookingId);
    if (target) {
      setNotifications((prev) => [
        {
          id: `NOTIF-${Date.now()}`,
          title: `Booking ${bookingId} Marked ${newStatus}`,
          message: `${target.guestName} (${target.assetName}) status updated to ${newStatus}.`,
          timestamp: 'Just now',
          read: false,
          category: newStatus === 'Checked-In' ? 'checkin' : 'booking',
          relatedBookingId: bookingId,
        },
        ...prev,
      ]);
    }
  };

  const cancelBooking = (bookingId: string) => {
    updateBookingStatus(bookingId, 'Cancelled');
  };

  const toggleRoomMaintenance = (roomId: string) => {
    setRooms((prev) =>
      prev.map((r) => (r.id === roomId ? { ...r, maintenanceMode: !r.maintenanceMode } : r))
    );
  };

  const updateRateConfig = (newConfig: Partial<RateConfig>) => {
    const merged = { ...rateConfig, ...newConfig };
    setRateConfig(merged);

    // Also update dormitory base rates if AC or Non-AC default tiers changed
    if (
      newConfig.dormitoryAcDailyRate !== undefined ||
      newConfig.dormitoryNonAcDailyRate !== undefined
    ) {
      setRooms((prev) =>
        prev.map((r) => {
          if (r.type !== 'dormitory') return r;
          return {
            ...r,
            baseDailyRate:
              r.acStatus === 'AC'
                ? merged.dormitoryAcDailyRate
                : merged.dormitoryNonAcDailyRate,
          };
        })
      );
    }
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const resetDemoData = () => {
    setRooms(INITIAL_ROOMS);
    setBookings(INITIAL_BOOKINGS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setRateConfig(INITIAL_RATE_CONFIG);
    setReferenceDate(REFERENCE_TODAY);
    try {
      localStorage.removeItem(STORAGE_KEYS.ROOMS);
      localStorage.removeItem(STORAGE_KEYS.BOOKINGS);
      localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
      localStorage.removeItem(STORAGE_KEYS.RATES);
    } catch {
      // ignore
    }
  };

  const openQuickAllocationForRoom = (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;
    setQuickAllocateRoomId(roomId);
    if (room.type === 'dormitory') {
      setActiveModule('dormitory');
    } else if (room.type === 'meeting') {
      setActiveModule('meeting');
    } else {
      setActiveModule('classrooms');
    }
  };

  const clearQuickAllocateRoom = () => {
    setQuickAllocateRoomId(null);
  };

  const kpis = useMemo(
    () => computeDashboardMetrics(rooms, bookings, referenceDate),
    [rooms, bookings, referenceDate]
  );

  return (
    <FacilityContext.Provider
      value={{
        theme,
        toggleTheme,
        setTheme,
        activeModule,
        setActiveModule,
        sidebarCollapsed,
        setSidebarCollapsed,
        referenceDate,
        setReferenceDate,
        rooms,
        bookings,
        notifications,
        rateConfig,
        globalSearch,
        setGlobalSearch,
        activeFacilityFilter,
        setActiveFacilityFilter,
        kpis,
        createBooking,
        validateOverlap,
        updateBookingStatus,
        cancelBooking,
        toggleRoomMaintenance,
        updateRateConfig,
        markAllNotificationsRead,
        markNotificationRead,
        resetDemoData,
        selectedSlipBooking,
        setSelectedSlipBooking,
        quickAllocateRoomId,
        openQuickAllocationForRoom,
        clearQuickAllocateRoom,
      }}
    >
      {children}
    </FacilityContext.Provider>
  );
};

export function useFacility() {
  const context = useContext(FacilityContext);
  if (!context) {
    throw new Error('useFacility must be used within a FacilityProvider');
  }
  return context;
}
