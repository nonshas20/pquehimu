import React from 'react';
import type { AppUser } from '../types/inventory';
import { 
  Search, 
  Plus, 
  QrCode, 
  ShieldCheck, 
  UserCheck, 
  ChevronDown,
  Printer,
  LogOut 
} from './HugeIcons';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenAddModal: () => void;
  onOpenScanModal: () => void;
  onOpenAuthModal: () => void;
  onOpenChecklistModal?: () => void;
  onLogout?: () => void;
  currentUser: AppUser;
  isScrolled?: boolean;
  syncStatus?: 'connected' | 'syncing' | 'offline';
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onOpenAddModal,
  onOpenScanModal,
  onOpenAuthModal,
  onOpenChecklistModal,
  onLogout,
  currentUser,
  isScrolled: externalIsScrolled,
  syncStatus = 'syncing',
}) => {
  const [internalScrolled, setInternalScrolled] = React.useState(false);

  React.useEffect(() => {
    if (externalIsScrolled !== undefined) return;
    const handleScroll = () => {
      const nextScrolled = window.scrollY > 30;
      setInternalScrolled((prev) => (prev !== nextScrolled ? nextScrolled : prev));
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [externalIsScrolled]);

  const isScrolled = externalIsScrolled !== undefined ? externalIsScrolled : internalScrolled;

  return (
    <header
      className={`fixed top-0 inset-x-0 z-[1000] transition-all duration-300 ease-out ${
        isScrolled
          ? 'px-3 sm:px-6 lg:px-8 pt-2.5 sm:pt-3 pb-1'
          : 'px-3.5 sm:px-6 lg:px-8 pt-3 sm:pt-4 pb-2'
      }`}
    >
      <div
        className={`mx-auto max-w-7xl transition-all duration-300 ease-out ${
          isScrolled
            ? 'rounded-2xl sm:rounded-3xl bg-white border border-neutral-200/90 shadow-lg px-3.5 sm:px-6'
            : 'rounded-none bg-transparent border-transparent shadow-none px-0'
        }`}
      >
        <div className="flex h-18 sm:h-20 items-center justify-between gap-3 sm:gap-4">
          
          {/* Official Dual Logos & Title */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            {/* Logos */}
            <div className="flex items-center gap-1.5 shrink-0">
              <img
                src="/himu-logo-transparent.webp"
                alt="Health Information Management Unit"
                width={48}
                height={48}
                className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl object-contain shadow-xs border p-0.5 transition-all ${
                  isScrolled
                    ? 'border-black/5 bg-white'
                    : 'border-white/20 bg-white/95 backdrop-blur-sm'
                }`}
              />
              <img
                src="/logo-uhc.webp"
                alt="UHC Alagang Parañaque"
                width={120}
                height={44}
                className="h-9 sm:h-11 object-contain max-w-[90px] sm:max-w-[120px] drop-shadow-xs"
              />
            </div>

            {/* Title & Hierarchy (removed Parañaque • 16 Barangays count badge) */}
            <div className={`min-w-0 pl-1 border-l transition-colors duration-300 ${
              isScrolled ? 'border-neutral-200/80' : 'border-white/20'
            }`}>
              <div className="flex items-center gap-2">
                <span className={`text-sm sm:text-base font-bold tracking-tight truncate transition-colors duration-300 ${
                  isScrolled ? 'text-neutral-900' : 'text-white drop-shadow-md'
                }`}>
                  HIMU IT Tracker
                </span>
                <span
                  title={
                    syncStatus === 'connected'
                      ? 'Live Supabase Cloud Database Connected'
                      : syncStatus === 'syncing'
                      ? 'Syncing with Supabase...'
                      : 'Local Cache Mode (Run supabase/schema.sql to connect)'
                  }
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight transition-all shrink-0 ${
                    syncStatus === 'connected'
                      ? isScrolled 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 backdrop-blur-sm'
                      : syncStatus === 'syncing'
                      ? isScrolled
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-400/30 backdrop-blur-sm'
                      : isScrolled
                        ? 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                        : 'bg-white/10 text-white/80 border border-white/20 backdrop-blur-sm'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      syncStatus === 'connected'
                        ? 'bg-emerald-500 animate-pulse'
                        : syncStatus === 'syncing'
                        ? 'bg-amber-500 animate-ping'
                        : 'bg-neutral-400'
                    }`}
                  />
                  <span className="hidden xs:inline">
                    {syncStatus === 'connected'
                      ? 'Cloud Synced'
                      : syncStatus === 'syncing'
                      ? 'Syncing'
                      : 'Local Cache'}
                  </span>
                </span>
              </div>
              <p className={`truncate text-[11px] sm:text-xs font-medium transition-colors duration-300 ${
                isScrolled ? 'text-neutral-500' : 'text-white/80 drop-shadow-xs'
              }`}>
                Health Information Management Unit • Asset Custody
              </p>
            </div>
          </div>

          {/* Search bar */}
          <div className="hidden lg:flex flex-1 max-w-sm mx-2">
            <div className="relative w-full">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className={`h-4 w-4 transition-colors duration-300 ${
                  isScrolled ? 'text-neutral-400' : 'text-white/70'
                }`} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search serial, tag, item, or barangay..."
                className={`w-full rounded-2xl py-2 pl-9 pr-10 text-xs sm:text-sm transition-all focus:outline-none focus:ring-4 shadow-2xs ${
                  isScrolled
                    ? 'border border-neutral-200 bg-neutral-50/80 text-neutral-900 placeholder-neutral-400 focus:border-neutral-400 focus:bg-white focus:ring-neutral-900/5'
                    : 'border border-white/25 bg-black/40 backdrop-blur-md text-white placeholder-white/60 focus:border-white/50 focus:bg-black/60 focus:ring-white/10'
                }`}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-2.5">
                <kbd className={`inline-flex items-center rounded-md border px-1.5 text-[10px] font-medium transition-colors duration-300 ${
                  isScrolled
                    ? 'border-neutral-200 bg-white text-neutral-400'
                    : 'border-white/25 bg-white/15 text-white/80'
                }`}>
                  ⌘K
                </kbd>
              </div>
            </div>
          </div>

          {/* Action Buttons & Auth Pill */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* Quick Scan Tag (shown on sm+ screens, mobile has it in bottom nav) */}
            <button
              onClick={onOpenScanModal}
              title="Quick Scan QR / Barcode"
              className={`hidden sm:inline-flex items-center justify-center gap-1.5 rounded-xl px-2.5 sm:px-3 py-2 text-xs font-semibold shadow-2xs active:scale-95 transition-all ${
                isScrolled
                  ? 'border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900'
                  : 'border border-white/25 bg-black/40 backdrop-blur-md text-white hover:bg-black/60'
              }`}
            >
              <QrCode className={`h-4 w-4 transition-colors duration-300 ${
                isScrolled ? 'text-neutral-600' : 'text-white/90'
              }`} />
              <span>Scan Tag</span>
            </button>

            {/* Official A5 Equipment Borrowing Slip (shown on sm+ screens, mobile has it in bottom nav) */}
            {onOpenChecklistModal && (
              <button
                onClick={onOpenChecklistModal}
                title="View / Print Official A5 Event Borrowing Checklist Slip"
                className={`hidden sm:inline-flex items-center justify-center gap-1.5 rounded-xl px-2.5 sm:px-3 py-2 text-xs font-semibold shadow-2xs active:scale-95 transition-all ${
                  isScrolled
                    ? 'border border-emerald-200 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100'
                    : 'border border-white/25 bg-black/40 backdrop-blur-md text-emerald-300 hover:bg-black/60'
                }`}
              >
                <Printer className="h-4 w-4" />
                <span className="hidden md:inline">A5 Borrow Slip</span>
              </button>
            )}

            {/* New Asset Button */}
            <button
              onClick={onOpenAddModal}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 sm:px-3.5 py-2 text-xs font-semibold shadow-xs active:scale-95 transition-all ${
                isScrolled
                  ? 'bg-neutral-900 text-white hover:bg-neutral-800'
                  : 'bg-white text-neutral-900 hover:bg-white/90 shadow-md'
              }`}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden xs:inline">New Asset</span>
            </button>

            {/* Current User & Role Switcher Pill */}
            <button
              onClick={onOpenAuthModal}
              title="Switch User Role (ADMIN / IT OFFICER)"
              className={`flex items-center gap-1.5 rounded-xl p-1.5 sm:px-2.5 sm:py-1.5 text-left shadow-2xs active:scale-95 transition-all ${
                isScrolled
                  ? 'border border-neutral-200 bg-neutral-50/70 text-neutral-800 hover:bg-neutral-100'
                  : 'border border-white/25 bg-black/40 backdrop-blur-md text-white hover:bg-black/60'
              }`}
            >
              <div className={`flex h-6 w-6 items-center justify-center rounded-lg transition-colors ${
                currentUser.role === 'ADMIN'
                  ? isScrolled ? 'bg-purple-100 text-purple-700' : 'bg-purple-500/40 text-purple-200 border border-purple-400/30'
                  : isScrolled ? 'bg-blue-100 text-blue-700' : 'bg-blue-500/40 text-blue-200 border border-blue-400/30'
              }`}>
                {currentUser.role === 'ADMIN' ? (
                  <ShieldCheck className="h-3.5 w-3.5" />
                ) : (
                  <UserCheck className="h-3.5 w-3.5" />
                )}
              </div>
              <div className="hidden xl:block min-w-0">
                <div className={`truncate text-[11px] font-bold max-w-[120px] transition-colors duration-300 ${
                  isScrolled ? 'text-neutral-800' : 'text-white'
                }`}>
                  {currentUser.name}
                </div>
                <div className={`text-[10px] font-semibold uppercase transition-colors duration-300 ${
                  isScrolled ? 'text-neutral-400' : 'text-white/70'
                }`}>
                  {currentUser.role === 'ADMIN' ? 'ADMIN' : 'IT OFFICER'}
                </div>
              </div>
              <ChevronDown className={`h-3.5 w-3.5 transition-colors duration-300 ${
                isScrolled ? 'text-neutral-400' : 'text-white/70'
              }`} />
            </button>

            {/* Quick Log Out Action */}
            {onLogout && (
              <button
                onClick={onLogout}
                title="Sign Out"
                className={`hidden sm:inline-flex items-center justify-center rounded-xl p-2 shadow-2xs active:scale-95 transition-all ${
                  isScrolled
                    ? 'border border-neutral-200 bg-white text-neutral-400 hover:text-rose-600 hover:bg-rose-50'
                    : 'border border-white/25 bg-black/40 backdrop-blur-md text-white/80 hover:text-rose-300 hover:bg-black/60'
                }`}
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="pb-3 lg:hidden">
          <div className="relative w-full">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className={`h-4 w-4 transition-colors duration-300 ${
                isScrolled ? 'text-neutral-400' : 'text-white/70'
              }`} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search serial, tag, or barangay..."
              className={`w-full rounded-xl py-2 pl-9 pr-3 text-xs transition-all focus:outline-none ${
                isScrolled
                  ? 'border border-neutral-200 bg-neutral-50/80 text-neutral-900 placeholder-neutral-400 focus:border-neutral-400 focus:bg-white'
                  : 'border border-white/25 bg-black/40 backdrop-blur-md text-white placeholder-white/60 focus:border-white/50 focus:bg-black/60'
              }`}
            />
          </div>
        </div>
      </div>
    </header>
  );
};
