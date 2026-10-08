import React, { useState } from 'react';
import type { BarangayLocation, AssetItem } from '../types/inventory';
import { MapPin, Building2 } from './HugeIcons';

interface BarangaySelectorProps {
  locations: BarangayLocation[];
  assets: AssetItem[];
  selectedLocationId: string | null;
  onSelectLocation: (locationId: string | null) => void;
}

export const BarangaySelector: React.FC<BarangaySelectorProps> = ({
  locations,
  assets,
  selectedLocationId,
  onSelectLocation,
}) => {
  const [districtFilter, setDistrictFilter] = useState<'ALL' | 1 | 2>('ALL');

  const getAssetCount = (locId: string) => {
    return assets.filter((a) => a.currentLocationId === locId).length;
  };

  const selectedLoc = locations.find((l) => l.id === selectedLocationId);

  const filteredLocations = locations.filter((loc) => {
    if (districtFilter === 'ALL') return true;
    return loc.district === districtFilter;
  });

  return (
    <div className="rounded-3xl bg-white border border-neutral-200/90 p-4 sm:p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/[0.06]">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-emerald-600" />
          <h2 className="text-sm font-bold tracking-tight text-neutral-900">
            Parañaque Jurisdictions (16 Barangays & HIMU Depot)
          </h2>
        </div>

        {/* District Selector Tabs */}
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <button
            onClick={() => setDistrictFilter('ALL')}
            className={`rounded-xl px-2.5 py-1 transition ${
              districtFilter === 'ALL'
                ? 'bg-neutral-900 text-white shadow-2xs'
                : 'bg-white/80 text-neutral-600 hover:bg-white'
            }`}
          >
            All (16)
          </button>
          <button
            onClick={() => setDistrictFilter(1)}
            className={`rounded-xl px-2.5 py-1 transition ${
              districtFilter === 1
                ? 'bg-neutral-900 text-white shadow-2xs'
                : 'bg-white/80 text-neutral-600 hover:bg-white'
            }`}
          >
            District 1 (8)
          </button>
          <button
            onClick={() => setDistrictFilter(2)}
            className={`rounded-xl px-2.5 py-1 transition ${
              districtFilter === 2
                ? 'bg-neutral-900 text-white shadow-2xs'
                : 'bg-white/80 text-neutral-600 hover:bg-white'
            }`}
          >
            District 2 (8)
          </button>
        </div>
      </div>

      {/* Pill strip for 16 Barangays with clean overflow scroll */}
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
        <button
          onClick={() => onSelectLocation(null)}
          className={`shrink-0 rounded-2xl px-3.5 py-2 font-semibold transition-all ${
            selectedLocationId === null
              ? 'bg-neutral-900 text-white shadow-xs'
              : 'bg-white/70 text-neutral-600 hover:bg-white hover:text-neutral-900 border border-black/5'
          }`}
        >
          All Locations ({assets.length})
        </button>

        {filteredLocations.map((loc) => {
          const count = getAssetCount(loc.id);
          const isSelected = selectedLocationId === loc.id;
          const isDepot = loc.type === 'central_office';

          return (
            <button
              key={loc.id}
              onClick={() => onSelectLocation(loc.id)}
              className={`shrink-0 flex items-center gap-1.5 rounded-2xl px-3 py-2 font-semibold transition-all ${
                isSelected
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-white/70 text-neutral-700 hover:bg-white hover:text-neutral-950 border border-black/5'
              }`}
            >
              {isDepot && <Building2 className="h-3.5 w-3.5 text-neutral-400" />}
              <span>{loc.name}</span>
              <span
                className={`ml-0.5 rounded-lg px-1.5 py-0.5 text-[10px] font-bold ${
                  isSelected
                    ? 'bg-white/20 text-white'
                    : count > 0
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-neutral-100 text-neutral-400'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected location quick info banner */}
      {selectedLoc && (
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white/70 px-4 py-2.5 text-xs border border-white/60 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-neutral-900">{selectedLoc.name}</span>
            {selectedLoc.district > 0 && (
              <span className="text-[10px] font-semibold bg-neutral-100 px-2 py-0.5 rounded text-neutral-600">
                District {selectedLoc.district}
              </span>
            )}
            <span className="text-neutral-400">•</span>
            <span className="text-neutral-600">{selectedLoc.address}</span>
          </div>
          <div className="flex items-center gap-3 text-neutral-500 font-medium">
            <span>{selectedLoc.contactPerson}</span>
            <span>{selectedLoc.contactPhone}</span>
          </div>
        </div>
      )}
    </div>
  );
};
