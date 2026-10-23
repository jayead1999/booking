import React from 'react';
import {
  X,
  Printer,
  Download,
  CheckCircle2,
  LogOut,
  Ban,
  Building2,
  User,
  Calendar,
  FileText,
} from 'lucide-react';
import { BookingRecord } from '../types/facility';
import { useFacility } from '../context/FacilityContext';
import {
  AVAILABLE_SERVICE_ADDONS,
  formatShortDateTime,
} from '../utils/bookingLogic';

export const BookingSlipModal: React.FC<{
  booking: BookingRecord | null;
  onClose: () => void;
}> = ({ booking, onClose }) => {
  const { updateBookingStatus, cancelBooking, rooms } = useFacility();

  if (!booking) return null;

  const room = rooms.find((r) => r.id === booking.facilityId);

  const handleDownloadSlip = () => {
    const lines = [
      '============================================================',
      '        Syntor It FACILITY & BOOKING SUMMARY SLIP          ',
      '============================================================',
      `Booking Reference : #${booking.id}`,
      `Current Status    : ${booking.status}`,
      `Facility Category : ${booking.facilityType.toUpperCase()}`,
      `Allocated Asset   : ${booking.assetName} (${room?.code || booking.facilityId})`,
      `Floor / Location  : ${room?.floor || 'Main Building'}`,
      '------------------------------------------------------------',
      `Booked By         : ${booking.guestName}`,
      `ID / Reference    : ${booking.nationalOrEmployeeId}`,
      `Phone Contact     : ${booking.phone}`,
      `Department / Org  : ${booking.departmentOrOrg}`,
      `Purpose / Event   : ${booking.eventTitle ? `${booking.eventTitle} - ` : ''}${booking.purpose}`,
      '------------------------------------------------------------',
      `Check-In / Start  : ${formatShortDateTime(booking.startDateTime)}`,
      `Check-Out / End   : ${formatShortDateTime(booking.endDateTime)}`,
      `Allocation Nature : ${
        booking.allocationNature === 'official_admin'
          ? 'Official / Administrative (Complimentary $0)'
          : 'Employee / Commercial Paid Rental'
      }`,
      `Total Payable Fee : $${booking.totalCost.toFixed(2)}`,
      '============================================================',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${booking.id}-Booking-Slip.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-label={`Booking Summary Slip ${booking.id}`}
    >
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-base text-slate-900 dark:text-slate-100">
                  Booking Allocation Slip
                </h2>
                <span className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  #{booking.id}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Issued on {formatShortDateTime(booking.createdAt)} · Status: {booking.status}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close booking slip modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 dark:hover:text-slate-200 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Slip Content Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Asset & Status Summary */}
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">
                Allocated Facility Space
              </div>
              <div className="font-display font-semibold text-base text-slate-900 dark:text-slate-100">
                {booking.assetName}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {room ? `${room.code} · ${room.floor} · ${room.acStatus} · Capacity ${room.capacity}` : booking.facilityType}
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">
                Total Fee Assessment
              </div>
              <div className="font-mono font-bold text-xl text-slate-900 dark:text-slate-100 tabular-nums">
                {booking.allocationNature === 'official_admin' ? (
                  <span className="text-emerald-600 dark:text-emerald-400">$0.00 (Free)</span>
                ) : (
                  `$${booking.totalCost.toLocaleString()}.00`
                )}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {booking.allocationNature === 'official_admin'
                  ? 'Official / Admin Complimentary'
                  : 'Paid Rental Assessment'}
              </div>
            </div>
          </div>

          {/* Two-column Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="p-3.5 rounded-lg border border-slate-200/80 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <User className="w-3.5 h-3.5" />
                Guest / Host Information
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Full Name:</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100 text-right">
                    {booking.guestName}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">ID / Passport:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 text-right">
                    {booking.nationalOrEmployeeId}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Contact Phone:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 text-right">
                    {booking.phone}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Organization:</span>
                  <span className="text-slate-800 dark:text-slate-200 text-right">
                    {booking.departmentOrOrg}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-lg border border-slate-200/80 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <Calendar className="w-3.5 h-3.5" />
                Schedule & Allocation Window
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Check-In / Start:</span>
                  <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                    {formatShortDateTime(booking.startDateTime)}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Check-Out / End:</span>
                  <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                    {formatShortDateTime(booking.endDateTime)}
                  </span>
                </div>
                {booking.batchCode && (
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Batch / Cohort:</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400">
                      {booking.batchCode}
                    </span>
                  </div>
                )}
                {booking.recurrencePattern && booking.recurrencePattern !== 'None' && (
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Recurrence:</span>
                    <span className="text-slate-800 dark:text-slate-200">
                      {booking.recurrencePattern}
                    </span>
                  </div>
                )}
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Booking Status:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {booking.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Purpose & Add-ons */}
          <div className="p-3.5 rounded-lg border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-slate-500 dark:text-slate-400">
              <FileText className="w-3.5 h-3.5" />
              Official Purpose & Equipment Notes
            </div>
            {booking.eventTitle && (
              <div className="font-medium text-slate-900 dark:text-slate-100">
                Event / Session: {booking.eventTitle}
              </div>
            )}
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              {booking.purpose}
            </p>
            {booking.selectedAddons && booking.selectedAddons.length > 0 && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-2">
                <span className="text-slate-500">Service Add-ons:</span>
                {booking.selectedAddons.map((id) => {
                  const addon = AVAILABLE_SERVICE_ADDONS.find((a) => a.id === id);
                  return addon ? (
                    <span
                      key={id}
                      className="font-mono text-slate-700 dark:text-slate-300"
                    >
                      {addon.name} (+${addon.price})
                    </span>
                  ) : null;
                })}
              </div>
            )}
          </div>

          {/* Quick Desk Status Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              {(booking.status === 'Confirmed' || booking.status === 'Pending') && (
                <button
                  type="button"
                  onClick={() => updateBookingStatus(booking.id, 'Checked-In')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Check-In Guest
                </button>
              )}
              {booking.status === 'Checked-In' && (
                <button
                  type="button"
                  onClick={() => updateBookingStatus(booking.id, 'Completed')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Complete & Check-Out
                </button>
              )}
              {booking.status !== 'Cancelled' && booking.status !== 'Completed' && (
                <button
                  type="button"
                  onClick={() => cancelBooking(booking.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                >
                  <Ban className="w-3.5 h-3.5" />
                  Cancel Booking
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadSlip}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export Slip
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                Print Slip
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
