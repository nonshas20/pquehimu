import React, { useState } from 'react';
import type { 
  AssetItem, 
  AssetCategory, 
  AssetStatus, 
  BarangayLocation 
} from '../types/inventory';
import { 
  Printer, 
  Wifi, 
  Network, 
  Monitor, 
  Fingerprint, 
  Zap, 
  Plug,
  ArrowRightLeft, 
  History, 
  Copy, 
  Check, 
  MapPin, 
  Plus, 
  Archive, 
  LayoutGrid, 
  Table as TableIcon 
} from 'lucide-react';

interface AssetListProps {
  assets: AssetItem[];
  locations: BarangayLocation[];
  onOpenTransfer: (asset: AssetItem) => void;
  onOpenDetail: (asset: AssetItem) => void;
  onOpenAddModal: () => void;
  selectedCategory: AssetCategory | 'ALL';
  onSelectCategory: (cat: AssetCategory | 'ALL') => void;
  selectedStatus: AssetStatus | 'ALL';
  onSelectStatus: (st: AssetStatus | 'ALL') => void;
}

export const AssetList: React.FC<AssetListProps> = ({
  assets,
  locations,
  onOpenTransfer,
  onOpenDetail,
  onOpenAddModal,
  selectedCategory,
  onSelectCategory,
  selectedStatus,
  onSelectStatus,
}) => {
  const [copiedSerial, setCopiedSerial] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const handleCopySerial = (serial: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(serial);
    setCopiedSerial(serial);
    setTimeout(() => setCopiedSerial(null), 1800);
  };

  const getLocation = (locId: string) => {
    return locations.find((l) => l.id === locId);
  };

  const getCategoryIcon = (category: AssetCategory) => {
    switch (category) {
      case 'Printer':
        return Printer;
      case 'Network Router':
        return Wifi;
      case 'Extension Cord / Power':
        return Plug;
      case 'Network Switch':
        return Network;
      case 'Workstation / PC':
        return Monitor;
      case 'Biometric / Scanner':
        return Fingerprint;
      case 'UPS / Power':
        return Zap;
      default:
        return Monitor;
    }
  };

  const getStatusBadge = (status: AssetStatus) => {
    switch (status) {
      case 'in_service':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            In Service
          </span>
        );
      case 'in_transit':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping" />
            In Transit
          </span>
        );
      case 'under_repair':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Under Repair
          </span>
        );
      case 'standby':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-600 border border-neutral-200">
            <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
            Depot Standby
          </span>
        );
      case 'decommissioned':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            Decommissioned
          </span>
        );
    }
  };

  const categories: (AssetCategory | 'ALL')[] = [
    'ALL',
    'Printer',
    'Network Router',
    'Extension Cord / Power',
    'Network Switch',
    'Workstation / PC',
    'Biometric / Scanner',
  ];

  const statuses: { label: string; value: AssetStatus | 'ALL' }[] = [
    { label: 'All Statuses', value: 'ALL' },
    { label: 'In Service', value: 'in_service' },
    { label: 'In Transit', value: 'in_transit' },
    { label: 'Under Repair', value: 'under_repair' },
    { label: 'Depot Standby', value: 'standby' },
  ];

  return (
    <div className="space-y-4">
      {/* Filters & View Switcher Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Category Filter Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              className={`rounded-2xl px-3.5 py-1.5 font-semibold transition-all ${
                selectedCategory === cat
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-white/80 text-neutral-600 border border-black/5 hover:bg-white hover:text-neutral-900'
              }`}
            >
              {cat === 'ALL' ? 'All Hardware' : cat}
            </button>
          ))}
        </div>

        {/* Status Dropdown & Table/Card View Toggle */}
        <div className="flex items-center justify-between sm:justify-end gap-2.5">
          <select
            value={selectedStatus}
            onChange={(e) => onSelectStatus(e.target.value as any)}
            className="rounded-2xl border border-neutral-200/90 bg-white/80 px-3 py-1.5 text-xs font-semibold text-neutral-700 shadow-2xs focus:border-neutral-400 focus:outline-none"
          >
            {statuses.map((st) => (
              <option key={st.value} value={st.value}>
                {st.label}
              </option>
            ))}
          </select>

          {/* Desktop Table/Grid Mode */}
          <div className="hidden sm:inline-flex rounded-2xl border border-black/5 bg-white/70 p-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={`rounded-xl p-1.5 transition-all ${
                viewMode === 'table'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
              title="Table View"
            >
              <TableIcon className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`rounded-xl p-1.5 transition-all ${
                viewMode === 'cards'
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
              title="Card View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {assets.length === 0 ? (
        <div className="rounded-3xl bg-white border border-neutral-200/90 p-12 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 shadow-2xs">
            <Archive className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-base font-bold text-neutral-900">
            No IT Equipment Registered
          </h3>
          <p className="mt-1 text-xs text-neutral-500 max-w-md mx-auto leading-relaxed">
            The system is clean and ready for real data. Begin cataloging printers, routers, switches, and computers across Parañaque's 16 barangays.
          </p>
          <div className="mt-5">
            <button
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-neutral-900 px-4 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-neutral-800 transition active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>Register First Hardware Item</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Table View (Default Desktop) */}
          <div className={`${viewMode === 'table' ? 'hidden md:block' : 'hidden'} overflow-hidden rounded-3xl bg-white border border-neutral-200/90 shadow-xs`}>
            <table className="min-w-full divide-y divide-black/[0.04] text-left text-xs">
              <thead className="bg-white/60 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                <tr>
                  <th scope="col" className="px-5 py-4">HIMU Asset & Model</th>
                  <th scope="col" className="px-4 py-4">Hardware Serial</th>
                  <th scope="col" className="px-4 py-4">Current Location</th>
                  <th scope="col" className="px-4 py-4">Status</th>
                  <th scope="col" className="px-4 py-4">Custodian</th>
                  <th scope="col" className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] bg-white/40">
                {assets.map((asset) => {
                  const Icon = getCategoryIcon(asset.category);
                  const loc = getLocation(asset.currentLocationId);
                  const isCopied = copiedSerial === asset.serialNumber;

                  return (
                    <tr
                      key={asset.id}
                      onClick={() => onOpenDetail(asset)}
                      className="group cursor-pointer transition hover:bg-white/80"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-2xs border border-black/5 text-neutral-800 transition group-hover:scale-105 group-hover:bg-neutral-900 group-hover:text-white">
                            <Icon className="h-4.5 w-4.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-neutral-900 group-hover:text-neutral-950">
                              {asset.name}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                              <span>{asset.brandModel}</span>
                              <span>•</span>
                              <span className="font-mono text-neutral-500">{asset.assetTag}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 font-mono text-neutral-600">
                          <span className="bg-white px-2 py-0.5 rounded text-[11px] text-neutral-800 font-semibold border border-black/5 shadow-3xs">
                            {asset.serialNumber}
                          </span>
                          <button
                            onClick={(e) => handleCopySerial(asset.serialNumber, e)}
                            className="p-1 text-neutral-400 hover:text-neutral-700 rounded transition"
                            title="Copy Serial Number"
                          >
                            {isCopied ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 text-neutral-700">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                          <span className="font-semibold truncate max-w-[180px]">
                            {loc ? loc.name : 'Unknown Location'}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        {getStatusBadge(asset.status)}
                      </td>

                      <td className="px-4 py-3.5 text-neutral-600">
                        <div className="truncate max-w-[140px] font-semibold text-neutral-800">
                          {asset.custodianName}
                        </div>
                        <div className="text-[11px] text-neutral-400 truncate max-w-[140px]">
                          {asset.custodianRole}
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => onOpenTransfer(asset)}
                            title="Move / Transfer to another Barangay"
                            className="inline-flex items-center gap-1 rounded-xl border border-black/5 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-700 shadow-2xs hover:bg-neutral-100 hover:text-neutral-900 active:scale-95"
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5 text-neutral-500" />
                            <span>Transfer</span>
                          </button>
                          <button
                            onClick={() => onOpenDetail(asset)}
                            title="View Audit Trail"
                            className="inline-flex items-center gap-1 rounded-xl border border-black/5 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-700 shadow-2xs hover:bg-neutral-100 hover:text-neutral-900 active:scale-95"
                          >
                            <History className="h-3.5 w-3.5 text-neutral-500" />
                            <span>History</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Cards View (Mobile & Tablet) */}
          <div className={`${viewMode === 'cards' ? 'grid' : 'grid md:hidden'} grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5`}>
            {assets.map((asset) => {
              const Icon = getCategoryIcon(asset.category);
              const loc = getLocation(asset.currentLocationId);
              const isCopied = copiedSerial === asset.serialNumber;

              return (
                <div
                  key={asset.id}
                  onClick={() => onOpenDetail(asset)}
                  className="cursor-pointer rounded-3xl bg-white border border-neutral-200/90 p-4 sm:p-5 shadow-xs transition-all hover:shadow-md active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-neutral-800 shadow-2xs border border-black/5">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-neutral-900 line-clamp-1">
                          {asset.name}
                        </h4>
                        <p className="text-xs text-neutral-400 font-medium">
                          {asset.brandModel}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-black/[0.04] pt-3 text-xs">
                    <span className="text-neutral-400">Status:</span>
                    {getStatusBadge(asset.status)}
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-neutral-400">Location:</span>
                    <span className="font-semibold text-neutral-800 truncate max-w-[180px]">
                      {loc ? loc.name : 'Unknown'}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-neutral-400">Serial No:</span>
                    <div className="flex items-center gap-1 font-mono text-[11px] text-neutral-800 bg-white px-2 py-0.5 rounded border border-black/5">
                      <span>{asset.serialNumber}</span>
                      <button
                        onClick={(e) => handleCopySerial(asset.serialNumber, e)}
                        className="text-neutral-400 hover:text-neutral-700"
                      >
                        {isCopied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-neutral-400">Custodian:</span>
                    <span className="font-semibold text-neutral-700 truncate max-w-[180px]">
                      {asset.custodianName}
                    </span>
                  </div>

                  {/* Card Action Buttons */}
                  <div className="mt-4 grid grid-cols-2 gap-2 border-t border-black/[0.04] pt-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onOpenTransfer(asset)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-black/5 bg-white/80 py-2.5 text-xs font-semibold text-neutral-700 transition hover:bg-white active:scale-95"
                    >
                      <ArrowRightLeft className="h-3.5 w-3.5 text-neutral-500" />
                      <span>Transfer</span>
                    </button>
                    <button
                      onClick={() => onOpenDetail(asset)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-neutral-900 py-2.5 text-xs font-semibold text-white transition hover:bg-neutral-800 active:scale-95"
                    >
                      <History className="h-3.5 w-3.5" />
                      <span>Details</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
