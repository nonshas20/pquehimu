import React from 'react';
import type { AppUser } from '../types/inventory';
import { 
  Search, 
  Plus, 
  QrCode, 
  ShieldCheck, 
  UserCheck, 
  ChevronDown 
} from 'lucide-react';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenAddModal: () => void;
  onOpenScanModal: () => void;
  onOpenAuthModal: () => void;
  currentUser: AppUser;
  totalAssetsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenAddModal,
  onOpenScanModal,
  onOpenAuthModal,
  currentUser,
  totalAssetsCount,
}) => {
  return (
    <div className="sticky top-0 z-[1000] px-3 sm:px-6 lg:px-8 pt-2.5 sm:pt-3 pb-1">
      <header className="mx-auto max-w-7xl rounded-2xl sm:rounded-3xl bg-white border border-neutral-200/90 shadow-sm px-3.5 sm:px-6 transition-all">
        <div className="flex h-18 sm:h-20 items-center justify-between gap-3 sm:gap-4">
          
          {/* Official Dual Logos & Title */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            {/* Logos */}
            <div className="flex items-center gap-1.5 shrink-0">
              <img
                src="/logo-himu.jpg"
                alt="Health Information Management Unit"
                className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl object-contain shadow-xs border border-black/5 bg-white p-0.5"
              />
              <img
                src="/logo-uhc.png"
                alt="UHC Alagang Parañaque"
                className="h-9 sm:h-11 object-contain max-w-[90px] sm:max-w-[120px]"
              />
            </div>

            {/* Title & Hierarchy */}
            <div className="min-w-0 pl-1 border-l border-neutral-200/80">
              <div className="flex items-center gap-2">
                <span className="text-sm sm:text-base font-bold tracking-tight text-neutral-900 truncate">
                  HIMU IT Tracker
                </span>
                <span className="hidden md:inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                  Parañaque • 16 Barangays ({totalAssetsCount})
                </span>
              </div>
              <p className="truncate text-[11px] sm:text-xs text-neutral-500 font-medium">
                Health Information Management Unit • Asset Custody
              </p>
            </div>
          </div>

          {/* Search bar - Plain white input styling */}
          <div className="hidden lg:flex flex-1 max-w-sm mx-2">
            <div className="relative w-full">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-neutral-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search serial, tag, item, or barangay..."
                className="w-full rounded-2xl border border-neutral-200 bg-neutral-50/80 py-2 pl-9 pr-10 text-xs sm:text-sm text-neutral-900 placeholder-neutral-400 transition-all focus:border-neutral-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-neutral-900/5 shadow-2xs"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-2.5">
                <kbd className="inline-flex items-center rounded-md border border-neutral-200 bg-white px-1.5 text-[10px] font-medium text-neutral-400">
                  ⌘K
                </kbd>
              </div>
            </div>
          </div>

          {/* Action Buttons & Auth Pill */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Quick Scan Tag */}
            <button
              onClick={onOpenScanModal}
              title="Quick Scan QR / Barcode"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-2.5 sm:px-3 py-2 text-xs font-semibold text-neutral-700 shadow-2xs hover:bg-neutral-50 hover:text-neutral-900 active:scale-95 transition"
            >
              <QrCode className="h-4 w-4 text-neutral-600" />
              <span className="hidden sm:inline">Scan Tag</span>
            </button>

            {/* New Asset Button */}
            <button
              onClick={onOpenAddModal}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-neutral-900 px-3 sm:px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-neutral-800 active:scale-95 transition"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden xs:inline">New Asset</span>
            </button>

            {/* Current User & Role Switcher Pill */}
            <button
              onClick={onOpenAuthModal}
              title="Switch User Role (ADMIN / IT OFFICER)"
              className="flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-neutral-50/70 p-1.5 sm:px-2.5 sm:py-1.5 text-left shadow-2xs hover:bg-neutral-100 transition active:scale-95"
            >
              <div className={`flex h-6 w-6 items-center justify-center rounded-lg ${
                currentUser.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {currentUser.role === 'ADMIN' ? (
                  <ShieldCheck className="h-3.5 w-3.5" />
                ) : (
                  <UserCheck className="h-3.5 w-3.5" />
                )}
              </div>
              <div className="hidden xl:block min-w-0">
                <div className="truncate text-[11px] font-bold text-neutral-800 max-w-[120px]">
                  {currentUser.name}
                </div>
                <div className="text-[10px] text-neutral-400 font-semibold uppercase">
                  {currentUser.role === 'ADMIN' ? 'ADMIN' : 'IT OFFICER'}
                </div>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-neutral-400" />
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="pb-3 lg:hidden">
          <div className="relative w-full">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-neutral-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search serial, tag, or barangay..."
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50/80 py-2 pl-9 pr-3 text-xs text-neutral-900 placeholder-neutral-400 focus:border-neutral-400 focus:bg-white focus:outline-none"
            />
          </div>
        </div>
      </header>
    </div>
  );
};
