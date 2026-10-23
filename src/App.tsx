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
import { X, Building2, Globe, ExternalLink } from 'lucide-react';
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
      <div className="h-screen flex bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 overflow-hidden">
      {/* Desktop Fixed Collapsible Sidebar */}
      <div className="hidden lg:flex shrink-0 h-screen sticky top-0 z-30">
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
                  <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-slate-800 border border-slate-700/50 flex items-center justify-center p-1 text-white shadow-sm overflow-hidden">
                    <img
                      src="/syntor-it-logo/PNG/logo.png"
                      alt="Syntor IT"
                      className="w-full h-full object-contain"
                    />
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
      <div className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">
        <TopBar onMobileMenuToggle={() => setMobileDrawerOpen(true)} />

        {/* Full-width scrollable viewport: scrollbar aligns to the far right edge of the screen */}
        <main className="flex-1 overflow-y-auto min-h-0 w-full">
          <div className="p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
            {activeModule === 'dashboard' && <DashboardView />}
            {activeModule === 'dormitory' && <DormitoryView />}
            {activeModule === 'meeting' && <MeetingRoomsView />}
            {activeModule === 'classrooms' && <ClassroomsView />}
            {activeModule === 'directory' && <MasterDirectoryView />}
            {activeModule === 'settings' && <SettingsView />}
          </div>
        </main>

        {/* Fixed Footer */}
        <footer className="shrink-0 z-20 px-4 sm:px-6 lg:px-8 py-3 border-t border-slate-200/80 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-3 shadow-[0_-2px_10px_rgba(0,0,0,0.03)] dark:shadow-[0_-2px_10px_rgba(0,0,0,0.2)]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              Syntor IT Facility Management
            </span>
            <span className="hidden sm:inline">·</span>
            <span>All rights reserved.</span>
            <span className="hidden sm:inline">·</span>
            <span>
              Developed by{' '}
              <a
                href="https://syntorit.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Syntor IT
              </a>
            </span>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <a
              href="https://syntorit.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 underline underline-offset-2 transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>www.syntorit.com</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>
            <div className="flex items-center gap-3">
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
