/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FacilityProvider, useFacility } from './context/FacilityContext';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { DashboardView } from './components/DashboardView';
import { DormitoryView } from './components/DormitoryView';
import { MeetingRoomsView } from './components/MeetingRoomsView';
import { ClassroomsView } from './components/ClassroomsView';
import { MasterDirectoryView } from './components/MasterDirectoryView';
import { SettingsView } from './components/SettingsView';
import { BookingSlipModal } from './components/BookingSlipModal';
import { X, Building2 } from 'lucide-react';
import { ActiveModule } from './types/facility';

const MOBILE_NAV_LINKS: { id: ActiveModule; label: string }[] = [
  { id: 'dashboard', label: 'Dashboard Overview' },
  { id: 'dormitory', label: 'Dormitory & Guest Rooms' },
  { id: 'meeting', label: 'Meeting & Auditorium' },
  { id: 'classrooms', label: 'Classrooms & Training' },
  { id: 'directory', label: 'Master Booking Directory' },
  { id: 'settings', label: 'Rates & System Settings' },
];

const FacilityAdminShell: React.FC = () => {
  const {
    theme,
    activeModule,
    setActiveModule,
    selectedSlipBooking,
    setSelectedSlipBooking,
  } = useFacility();

  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className="min-h-screen flex bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      {/* Desktop Collapsible Sidebar */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex bg-slate-950/50 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation Menu"
        >
          <div className="w-64 bg-white dark:bg-slate-900 h-full border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <span className="font-display font-bold text-base text-slate-900 dark:text-slate-100">
                    Syntor It
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  aria-label="Close mobile menu"
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <nav className="space-y-1">
                {MOBILE_NAV_LINKS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveModule(item.id);
                      setMobileDrawerOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      activeModule === item.id
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="text-xs text-slate-400 dark:text-slate-500 pt-4 border-t border-slate-200 dark:border-slate-800">
              Syntor It Facility Admin
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onMobileMenuToggle={() => setMobileDrawerOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {activeModule === 'dashboard' && <DashboardView />}
          {activeModule === 'dormitory' && <DormitoryView />}
          {activeModule === 'meeting' && <MeetingRoomsView />}
          {activeModule === 'classrooms' && <ClassroomsView />}
          {activeModule === 'directory' && <MasterDirectoryView />}
          {activeModule === 'settings' && <SettingsView />}
        </main>

        <footer className="px-4 sm:px-6 lg:px-8 py-4 border-t border-slate-200/70 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2">
          <span>
            Syntor It Office Facility & Booking Management System · In-Memory Ledger & Overlap Protection
          </span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveModule('directory')}
              className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              Master Ledger
            </button>
            <button
              type="button"
              onClick={() => setActiveModule('settings')}
              className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              Tariff Settings
            </button>
          </div>
        </footer>
      </div>

      {/* Global Printable / Exportable Booking Slip Modal */}
      <BookingSlipModal
        booking={selectedSlipBooking}
        onClose={() => setSelectedSlipBooking(null)}
      />
      </div>
    </div>
  );
};

export default function App() {
  return (
    <FacilityProvider>
      <FacilityAdminShell />
    </FacilityProvider>
  );
}
