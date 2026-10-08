import React from 'react';
import { 
  Search, 
  Plus, 
  QrCode, 
  Layers 
} from 'lucide-react';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenAddModal: () => void;
  onOpenScanModal: () => void;
  totalAssetsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenAddModal,
  onOpenScanModal,
  totalAssetsCount,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200/80 bg-white/80 backdrop-blur-xl transition-all">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          
          {/* Brand & Context */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white shadow-sm ring-1 ring-black/5">
              <Layers className="h-5 w-5 text-neutral-100" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-base font-semibold tracking-tight text-neutral-900">
                  Municipal IT Tracker
                </span>
                <span className="hidden sm:inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600 ring-1 ring-inset ring-neutral-500/10">
                  16 Barangays • {totalAssetsCount} Assets
                </span>
              </div>
              <p className="truncate text-xs text-neutral-500">
                Asset & Hardware Chain of Custody System
              </p>
            </div>
          </div>

          {/* Search bar - Apple input styling */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <div className="relative w-full">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-neutral-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search item, serial number, tag, or custodian..."
                className="w-full rounded-xl border border-neutral-200 bg-neutral-100/70 py-2 pl-9 pr-12 text-sm text-neutral-900 placeholder-neutral-400 transition-all focus:border-neutral-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-neutral-900/5"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-2.5">
                <kbd className="hidden sm:inline-flex items-center rounded border border-neutral-200 bg-white px-1.5 text-[10px] font-medium text-neutral-400 shadow-xs">
                  ⌘K
                </kbd>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <button
              onClick={onOpenScanModal}
              title="Quick Scan QR / Barcode"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-neutral-700 shadow-xs transition hover:bg-neutral-50 hover:text-neutral-900 active:scale-98"
            >
              <QrCode className="h-4 w-4 text-neutral-600" />
              <span className="hidden sm:inline">Scan Tag</span>
            </button>

            <button
              onClick={onOpenAddModal}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-neutral-900 px-3.5 py-2 text-xs sm:text-sm font-medium text-white shadow-xs transition hover:bg-neutral-800 active:scale-98"
            >
              <Plus className="h-4 w-4" />
              <span>New Asset</span>
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="pb-3 md:hidden">
          <div className="relative w-full">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-neutral-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search serial, tag, or item..."
              className="w-full rounded-xl border border-neutral-200 bg-neutral-100/80 py-2 pl-9 pr-3 text-sm text-neutral-900 placeholder-neutral-400 focus:border-neutral-400 focus:bg-white focus:outline-none"
            />
          </div>
        </div>
      </div>
    </header>
  );
};
