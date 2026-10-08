import React, { useState } from 'react';
import type { AssetItem, BarangayLocation } from '../types/inventory';
import { DISPATCH_OFFICERS } from '../types/inventory';
import { X, ArrowRight, Truck } from 'lucide-react';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: AssetItem | null;
  locations: BarangayLocation[];
  defaultDispatcherName?: string;
  onConfirmTransfer: (
    assetId: string,
    toLocationId: string,
    purpose: string,
    dispatchedBy: string,
    receivedBy: string,
    notes: string
  ) => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  asset,
  locations,
  defaultDispatcherName,
  onConfirmTransfer,
}) => {
  if (!isOpen || !asset) return null;

  const currentLocation = locations.find((l) => l.id === asset.currentLocationId);
  const eligibleDestinations = locations.filter((l) => l.id !== asset.currentLocationId);

  const [toLocationId, setToLocationId] = useState<string>(
    eligibleDestinations[0]?.id || ''
  );
  const [purpose, setPurpose] = useState<string>('Official deployment to Barangay Health Center / Office');
  
  // Use defaultDispatcherName or first in DISPATCH_OFFICERS
  const [dispatchedBy, setDispatchedBy] = useState<string>(() => {
    if (defaultDispatcherName && (DISPATCH_OFFICERS as readonly string[]).includes(defaultDispatcherName)) {
      return defaultDispatcherName;
    }
    return DISPATCH_OFFICERS[0];
  });
  
  const [receivedBy, setReceivedBy] = useState<string>('');
  const [notes, setNotes] = useState<string>('Complete power cord, cables, and hardware components verified in working condition.');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!toLocationId || !purpose.trim() || !dispatchedBy.trim()) return;
    onConfirmTransfer(
      asset.id,
      toLocationId,
      purpose,
      dispatchedBy,
      receivedBy,
      notes
    );
    onClose();
  };

  const selectedDestination = locations.find((l) => l.id === toLocationId);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-white border border-neutral-200/90 p-6 shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-black/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold tracking-tight text-neutral-900">
                Initiate Custody Transfer
              </h3>
              <p className="text-xs text-neutral-500">
                Official Property Movement • City of Parañaque
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Item Summary Card */}
        <div className="my-4 rounded-2xl bg-white/70 p-3.5 border border-white/60 shadow-xs">
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
            Hardware Selected for Transfer
          </div>
          <div className="mt-1 font-semibold text-sm text-neutral-900">
            {asset.name}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-neutral-500 font-mono">
            <span>Serial: {asset.serialNumber}</span>
            <span className="bg-neutral-200/70 text-neutral-700 px-1.5 py-0.5 rounded text-[10px]">
              {asset.assetTag}
            </span>
          </div>

          {/* Visual Route */}
          <div className="mt-3 flex items-center justify-between rounded-xl bg-neutral-50/80 p-2.5 border border-neutral-200/60 text-xs">
            <div className="truncate max-w-[170px]">
              <span className="text-[10px] text-neutral-400 block font-medium">Origin Location</span>
              <span className="font-semibold text-neutral-800 truncate block">
                {currentLocation?.name}
              </span>
            </div>
            <ArrowRight className="h-4 w-4 text-blue-500 shrink-0 mx-2" />
            <div className="truncate max-w-[170px] text-right">
              <span className="text-[10px] text-neutral-400 block font-medium">Destination Barangay</span>
              <span className="font-bold text-blue-600 truncate block">
                {selectedDestination?.name || 'Select destination'}
              </span>
            </div>
          </div>
        </div>

        {/* Transfer Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-neutral-700 mb-1">
              Destination Barangay / Health Station <span className="text-rose-500">*</span>
            </label>
            <select
              value={toLocationId}
              onChange={(e) => setToLocationId(e.target.value)}
              required
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-800 shadow-xs focus:border-neutral-400 focus:outline-none"
            >
              {eligibleDestinations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.district > 0 ? `District ${loc.district} • ` : ''}{loc.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-neutral-700 mb-1">
              Purpose / Reason for Relocation <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g., EMR terminal setup, vaccination campaign, replacement unit..."
              required
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-800 shadow-xs focus:border-neutral-400 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Dispatched By (Authorized IT Officer) <span className="text-rose-500">*</span>
              </label>
              <select
                value={dispatchedBy}
                onChange={(e) => setDispatchedBy(e.target.value)}
                required
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 shadow-xs focus:border-neutral-400 focus:outline-none"
              >
                {DISPATCH_OFFICERS.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Barangay Recipient / Custodian
              </label>
              <input
                type="text"
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                placeholder="Name of health staff or liaison"
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-800 shadow-xs focus:border-neutral-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-neutral-700 mb-1">
              Waybill Notes & Accessories Included
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="List cables, power adapter, current physical condition..."
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-800 shadow-xs focus:border-neutral-400 focus:outline-none resize-none"
            />
          </div>

          {/* Form Actions */}
          <div className="mt-6 flex items-center justify-end gap-2.5 pt-2 border-t border-black/[0.06]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-neutral-800 transition active:scale-95"
            >
              <Truck className="h-3.5 w-3.5" />
              <span>Confirm & Dispatch</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
