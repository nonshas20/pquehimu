import React, { useState, useMemo } from 'react';
import type { BarangayLocation, AssetItem } from '../types/inventory';
import { 
  Building2, 
  Printer, 
  ArrowRightLeft, 
  Search, 
  X, 
  Layers
} from './HugeIcons';

interface BarangayStationsMobileListProps {
  locations: BarangayLocation[];
  assets: AssetItem[];
  onOpenTransferForLocation?: (locationId: string) => void;
  onPrintA5ForBarangay?: (locationId: string) => void;
  onViewAssetsForLocation: (locationId: string) => void;
}

export const BarangayStationsMobileList: React.FC<BarangayStationsMobileListProps> = ({
  locations,
  assets,
  onOpenTransferForLocation,
  onPrintA5ForBarangay,
  onViewAssetsForLocation,
}) => {
  const [districtFilter, setDistrictFilter] = useState<'ALL' | 1 | 2>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // 16 Barangays + HIMU Depot statistics
  const locationData = useMemo(() => {
    return locations.map((loc) => {
      const locAssets = assets.filter((a) => a.currentLocationId === loc.id);
      const printers = locAssets.filter((a) => a.category === 'Printer').length;
      const routers = locAssets.filter((a) => a.category === 'Network Router' || a.category === 'Network Switch').length;
      const cords = locAssets.filter((a) => a.category === 'Extension Cord / Power' || a.category === 'UPS / Power').length;
      const workstations = locAssets.filter((a) => a.category === 'Workstation / PC').length;
      const inTransit = locAssets.filter((a) => a.status === 'in_transit').length;

      return {
        loc,
        total: locAssets.length,
        printers,
        routers,
        cords,
        workstations,
        inTransit,
      };
    });
  }, [locations, assets]);

  // Filtered stations
  const filteredStations = useMemo(() => {
    return locationData.filter((item) => {
      if (districtFilter !== 'ALL' && item.loc.district !== districtFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return item.loc.name.toLowerCase().includes(q);
      }
      return true;
    });
  }, [locationData, districtFilter, searchQuery]);

  return (
    <div className="space-y-3.5 pb-6">
      
      {/* Top Mobile Controls: District Chips & Quick Search */}
      <div className="rounded-3xl bg-white border border-neutral-200/90 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-neutral-900 tracking-tight">
                16 Barangay Health Stations
              </h3>
              <p className="text-[11px] text-neutral-500 font-medium">
                Live IT custody by Parañaque district
              </p>
            </div>
          </div>

          <span className="text-[11px] font-bold text-neutral-700 bg-neutral-100 px-2.5 py-1 rounded-full">
            {filteredStations.length} Sites
          </span>
        </div>

        {/* District Filter Segmented Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
          <button
            onClick={() => setDistrictFilter('ALL')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition active:scale-95 ${
              districtFilter === 'ALL'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            All (16)
          </button>
          <button
            onClick={() => setDistrictFilter(1)}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition active:scale-95 ${
              districtFilter === 1
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            District 1 (8)
          </button>
          <button
            onClick={() => setDistrictFilter(2)}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition active:scale-95 ${
              districtFilter === 2
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            District 2 (8)
          </button>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search barangay station..."
            className="w-full rounded-2xl border border-neutral-200 bg-neutral-50/80 pl-9 pr-8 py-2 text-xs text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 min-h-[40px]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-600 p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Barangay Station Cards */}
      <div className="space-y-3">
        {filteredStations.map(({ loc, total, printers, routers, cords, workstations, inTransit }) => {
          const isDepot = loc.type === 'central_office';

          return (
            <div
              key={loc.id}
              className="rounded-3xl bg-white border border-neutral-200/90 p-4 shadow-xs transition-all active:scale-[0.99]"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-black/[0.05]">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {isDepot ? (
                      <span className="rounded-lg bg-purple-100 text-purple-700 text-[10px] font-extrabold px-1.5 py-0.5 uppercase">
                        HIMU HQ
                      </span>
                    ) : (
                      <span className="rounded-lg bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-1.5 py-0.5 uppercase">
                        District {loc.district}
                      </span>
                    )}

                    {inTransit > 0 && (
                      <span className="rounded-lg bg-blue-100 text-blue-700 text-[10px] font-extrabold px-1.5 py-0.5">
                        🚚 {inTransit} In Transit
                      </span>
                    )}
                  </div>

                  <h4 className="text-sm font-extrabold text-neutral-900 mt-1 truncate">
                    {loc.name}
                  </h4>
                  <p className="text-[11px] text-neutral-400 font-medium">
                    {isDepot ? 'Parañaque City Hall Warehouse' : 'Barangay Health Center & Clinic'}
                  </p>
                </div>

                {/* Total Hardware Badge */}
                <div className="text-right shrink-0">
                  <span className={`inline-block rounded-2xl px-3 py-1 text-xs font-black ${
                    total > 0
                      ? 'bg-neutral-900 text-white shadow-2xs'
                      : 'bg-neutral-100 text-neutral-400'
                  }`}>
                    {total} {total === 1 ? 'Item' : 'Items'}
                  </span>
                </div>
              </div>

              {/* Hardware Inventory Breakdown Pills */}
              <div className="py-2.5 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-neutral-600">
                <span className={`rounded-xl px-2 py-1 flex items-center gap-1 ${
                  printers > 0 ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-neutral-100/70 text-neutral-400'
                }`}>
                  <span>🖨️</span>
                  <span>{printers} Printers</span>
                </span>

                <span className={`rounded-xl px-2 py-1 flex items-center gap-1 ${
                  routers > 0 ? 'bg-sky-50 text-sky-900 border border-sky-200' : 'bg-neutral-100/70 text-neutral-400'
                }`}>
                  <span>📶</span>
                  <span>{routers} Routers</span>
                </span>

                <span className={`rounded-xl px-2 py-1 flex items-center gap-1 ${
                  cords > 0 ? 'bg-amber-50 text-amber-900 border border-amber-200' : 'bg-neutral-100/70 text-neutral-400'
                }`}>
                  <span>🔌</span>
                  <span>{cords} Cords</span>
                </span>

                <span className={`rounded-xl px-2 py-1 flex items-center gap-1 ${
                  workstations > 0 ? 'bg-purple-50 text-purple-900 border border-purple-200' : 'bg-neutral-100/70 text-neutral-400'
                }`}>
                  <span>💻</span>
                  <span>{workstations} PCs</span>
                </span>
              </div>

              {/* Action Buttons */}
              <div className="mt-1 pt-2.5 border-t border-black/[0.05] grid grid-cols-3 gap-2">
                {/* 1. View Assigned Items */}
                <button
                  type="button"
                  onClick={() => onViewAssetsForLocation(loc.id)}
                  className="inline-flex items-center justify-center gap-1 rounded-2xl border border-neutral-200 bg-white py-2 text-[11px] font-semibold text-neutral-800 hover:bg-neutral-50 active:scale-95 shadow-2xs min-h-[38px]"
                >
                  <Layers className="h-3.5 w-3.5 text-neutral-500" />
                  <span>View Items</span>
                </button>

                {/* 2. Dispatch / Relocate */}
                <button
                  type="button"
                  onClick={() => onOpenTransferForLocation && onOpenTransferForLocation(loc.id)}
                  className="inline-flex items-center justify-center gap-1 rounded-2xl border border-neutral-900 bg-neutral-900 py-2 text-[11px] font-bold text-white hover:bg-neutral-800 active:scale-95 shadow-2xs min-h-[38px]"
                >
                  <ArrowRightLeft className="h-3.5 w-3.5" />
                  <span>Dispatch</span>
                </button>

                {/* 3. Official A5 Slip */}
                <button
                  type="button"
                  onClick={() => onPrintA5ForBarangay && onPrintA5ForBarangay(loc.id)}
                  className="inline-flex items-center justify-center gap-1 rounded-2xl border border-emerald-200 bg-emerald-50 py-2 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 active:scale-95 shadow-2xs min-h-[38px]"
                >
                  <Printer className="h-3.5 w-3.5 text-emerald-600" />
                  <span>A5 Slip</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
