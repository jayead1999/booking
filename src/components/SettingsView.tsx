import React, { useState } from 'react';
import {
  Save,
  RotateCcw,
  CheckCircle2,
  Sun,
  Moon,
  DollarSign,
  Sliders,
} from 'lucide-react';
import { useFacility } from '../context/FacilityContext';

export const SettingsView: React.FC = () => {
  const {
    rateConfig,
    updateRateConfig,
    resetDemoData,
    theme,
    setTheme,
  } = useFacility();

  const [acRate, setAcRate] = useState<number>(rateConfig.dormitoryAcDailyRate);
  const [nonAcRate, setNonAcRate] = useState<number>(
    rateConfig.dormitoryNonAcDailyRate
  );
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const handleSaveRates = (e: React.FormEvent) => {
    e.preventDefault();
    updateRateConfig({
      dormitoryAcDailyRate: Math.max(1, acRate),
      dormitoryNonAcDailyRate: Math.max(1, nonAcRate),
    });
    setSavedNotice(
      `Updated Dormitory tariff tiers: AC rooms set to $${acRate}/day and Non-AC rooms set to $${nonAcRate}/day.`
    );
  };

  const handleReset = () => {
    resetDemoData();
    setAcRate(40);
    setNonAcRate(20);
    setSavedNotice(
      'Restored all initial rooms, historical & upcoming reservations, and standard rate tiers.'
    );
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="font-display font-bold text-2xl text-slate-900 dark:text-slate-100 tracking-tight">
          Facility Rate Tiers & System Configuration
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">
          Configure base dormitory daily tariffs, appearance theme, and in-memory dataset controls
        </p>
      </div>

      {savedNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-3 text-sm text-emerald-900 dark:text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{savedNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setSavedNotice(null)}
            className="text-xs font-medium underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Dormitory Base Rate Configuration */}
      <form
        onSubmit={handleSaveRates}
        className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-5"
      >
        <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-4">
          <DollarSign className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <div>
            <h2 className="font-display font-semibold text-base text-slate-900 dark:text-slate-100">
              Dormitory Tier Base Rate Definitions
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Applied automatically to Employee / Guest Paid Rentals (Official Admin stays remain $0.00)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label
              htmlFor="setting-ac-rate"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              AC Dormitory Room Daily Rate ($ / Day)
            </label>
            <input
              id="setting-ac-rate"
              type="number"
              min={1}
              value={acRate}
              onChange={(e) => setAcRate(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            />
            <span className="block text-[11px] text-slate-400 mt-1">
              Default: $40/day (Applies to Rooms 201, 202, 203, 301, 302)
            </span>
          </div>

          <div>
            <label
              htmlFor="setting-nonac-rate"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Non-AC Dormitory Room Daily Rate ($ / Day)
            </label>
            <input
              id="setting-nonac-rate"
              type="number"
              min={1}
              value={nonAcRate}
              onChange={(e) => setNonAcRate(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            />
            <span className="block text-[11px] text-slate-400 mt-1">
              Default: $20/day (Applies to Rooms 101, 102, 103)
            </span>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors"
          >
            <Save className="w-4 h-4" />
            Save Rate Definitions
          </button>
        </div>
      </form>

      {/* Dual Theme Engine & Demo Data Reset */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="font-display font-semibold text-base text-slate-900 dark:text-slate-100">
              Dual Theme Engine
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Switch between soft eye-friendly Slate Light Mode and high-contrast Deep Slate Dark Mode. Preferences persist in browser storage.
          </p>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-xs font-medium transition-colors ${
                theme === 'light'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <Sun className="w-4 h-4" />
              Light Mode
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border text-xs font-medium transition-colors ${
                theme === 'dark'
                  ? 'border-indigo-500 bg-indigo-950/70 text-indigo-300'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              <Moon className="w-4 h-4" />
              Dark Mode
            </button>
          </div>
        </div>

        <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between gap-4">
          <div className="space-y-2">
            <h2 className="font-display font-semibold text-base text-slate-900 dark:text-slate-100">
              In-Memory Dataset & Storage Reset
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Restore the initial 16 facility rooms and 16 pre-populated historical, active, and upcoming bookings if you want a clean slate.
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset Default Facility Dataset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
