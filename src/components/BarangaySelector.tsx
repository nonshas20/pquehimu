import React from 'react';
import type { BarangayLocation, AssetItem } from '../types/inventory';
import { MapPin, Building2 } from 'lucide-react';

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
  // Compute count of assets per location
  const getAssetCount = (locId: string) => {
    return assets.filter((a) => a.currentLocationId === locId).length;
  };

  const selectedLoc = locations.find((l) => l.id === selectedLocationId);

  return (
    <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-100">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-neutral-500" />
          <h2 className="text-sm font-semibold tracking-tight text-neutral-900">
            Jurisdictional Locations (16 Barangays & Hubs)
          </h2>
        </div>
        <span className="text-xs text-neutral-500">
          Showing: <span className="font-medium text-neutral-800">{selectedLoc ? selectedLoc.name : 'All 16 Barangays + Depot'}</span>
        </span>
      </div>

      {/* Pill strip for Desktop/Tablet with clean overflow scroll */}
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
        <button
          onClick={() => onSelectLocation(null)}
          className={`shrink-0 rounded-xl px-3 py-1.5 font-medium transition-all ${
            selectedLocationId === null
              ? 'bg-neutral-900 text-white shadow-xs'
              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/70 hover:text-neutral-900'
          }`}
        >
          All Locations ({assets.length})
        </button>

        {locations.map((loc) => {
          const count = getAssetCount(loc.id);
          const isSelected = selectedLocationId === loc.id;
          const isDepot = loc.type === 'central_office';

          return (
            <button
              key={loc.id}
              onClick={() => onSelectLocation(loc.id)}
              className={`shrink-0 flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-medium transition-all ${
                isSelected
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/70 hover:text-neutral-900'
              }`}
            >
              {isDepot && <Building2 className="h-3.5 w-3.5 text-neutral-400" />}
              <span>{loc.code}</span>
              <span
                className={`ml-0.5 rounded-md px-1.5 py-0.2 text-[10px] font-semibold ${
                  isSelected
                    ? 'bg-white/20 text-white'
                    : count > 0
                    ? 'bg-neutral-200/80 text-neutral-700'
                    : 'text-neutral-400'
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
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-neutral-50/80 px-3.5 py-2.5 text-xs border border-neutral-100">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-800">{selectedLoc.name}</span>
            <span className="text-neutral-400">•</span>
            <span className="text-neutral-600">{selectedLoc.address}</span>
          </div>
          <div className="flex items-center gap-3 text-neutral-500">
            <span>Contact: <strong className="text-neutral-700 font-medium">{selectedLoc.contactPerson}</strong></span>
            <span>{selectedLoc.contactPhone}</span>
          </div>
        </div>
      )}
    </div>
  );
};
