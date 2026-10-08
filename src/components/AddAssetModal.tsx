import React, { useState } from 'react';
import type { AssetItem, AssetCategory, BarangayLocation } from '../types/inventory';
import { X, Plus } from './HugeIcons';

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  locations: BarangayLocation[];
  onAddAsset: (newAsset: Omit<AssetItem, 'id' | 'history'>) => void;
  initialLocationId?: string;
}

export const AddAssetModal: React.FC<AddAssetModalProps> = ({
  isOpen,
  onClose,
  locations,
  onAddAsset,
  initialLocationId,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<AssetCategory>('Printer');
  const [brandModel, setBrandModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [assetTag, setAssetTag] = useState(
    () => `HIMU-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`
  );
  const [currentLocationId, setCurrentLocationId] = useState(
    initialLocationId || locations[0]?.id || ''
  );

  React.useEffect(() => {
    if (initialLocationId) {
      setCurrentLocationId(initialLocationId);
    }
  }, [initialLocationId]);
  const [custodianName, setCustodianName] = useState('');
  const [custodianRole, setCustodianRole] = useState('Barangay Health Center Staff / IT Coordinator');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !serialNumber.trim()) return;

    onAddAsset({
      name,
      category,
      brandModel: brandModel || name,
      serialNumber,
      assetTag,
      currentLocationId,
      status: 'in_service',
      custodianName: custodianName || 'Unassigned',
      custodianRole: custodianRole || 'Health Center Staff',
      acquisitionDate: new Date().toISOString().split('T')[0],
      notes,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-t-[32px] sm:rounded-3xl bg-white border-t sm:border border-neutral-200/90 p-5 sm:p-6 shadow-2xl transition-all max-h-[92vh] flex flex-col">
        
        {/* Mobile Native Drag Pill Handle */}
        <div className="w-12 h-1.5 bg-neutral-300 rounded-full mx-auto mb-2 shrink-0 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-black/[0.06] shrink-0">
          <div>
            <h3 className="text-sm sm:text-base font-bold tracking-tight text-neutral-900">
              Register New Hardware Item
            </h3>
            <p className="text-[11px] sm:text-xs text-neutral-500">
              Health Information Management Unit • Inventory Intake
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition active:scale-95"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-3 space-y-3.5 text-xs flex-1 overflow-y-auto pr-0.5">
          <div>
            <label className="block font-semibold text-neutral-700 mb-1">
              Asset Name / Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Epson EcoTank L3210 or MikroTik Gigabit Router"
              required
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-800 shadow-xs focus:border-neutral-400 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as AssetCategory)}
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-800 shadow-xs focus:border-neutral-400 focus:outline-none"
              >
                <option value="Printer">Printer</option>
                <option value="Network Router">Network Router</option>
                <option value="Extension Cord / Power">Extension Cord / Power Strip</option>
                <option value="Network Switch">Network Switch</option>
                <option value="Workstation / PC">Workstation / PC</option>
                <option value="Biometric / Scanner">Biometric / Scanner</option>
                <option value="UPS / Power">UPS / Power</option>
                <option value="Other IT Equipment">Other IT Equipment</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Brand & Model
              </label>
              <input
                type="text"
                value={brandModel}
                onChange={(e) => setBrandModel(e.target.value)}
                placeholder="e.g., Epson L3210"
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-800 shadow-xs focus:border-neutral-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Serial Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="Hardware S/N"
                required
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 font-mono text-xs text-neutral-800 shadow-xs focus:border-neutral-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                HIMU Property Tag
              </label>
              <input
                type="text"
                value={assetTag}
                onChange={(e) => setAssetTag(e.target.value)}
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 font-mono text-xs text-neutral-600 shadow-xs focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-neutral-700 mb-1">
              Initial Assigned Location <span className="text-rose-500">*</span>
            </label>
            <select
              value={currentLocationId}
              onChange={(e) => setCurrentLocationId(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-800 shadow-xs focus:border-neutral-400 focus:outline-none"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.district > 0 ? `District ${loc.district} • ` : ''}{loc.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Custodian Name
              </label>
              <input
                type="text"
                value={custodianName}
                onChange={(e) => setCustodianName(e.target.value)}
                placeholder="Staff holding custody"
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-800 shadow-xs focus:border-neutral-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-neutral-700 mb-1">
                Designation / Title
              </label>
              <input
                type="text"
                value={custodianRole}
                onChange={(e) => setCustodianRole(e.target.value)}
                placeholder="e.g., Nurse / Admin Officer"
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-800 shadow-xs focus:border-neutral-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-neutral-700 mb-1">
              Notes & Peripherals Included
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Power supply, USB cords, condition..."
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-800 shadow-xs focus:border-neutral-400 focus:outline-none resize-none"
            />
          </div>

          {/* Actions */}
          <div className="mt-4 flex items-center justify-between gap-2.5 pt-3 border-t border-black/[0.06] pb-[max(0.5rem,env(safe-area-inset-bottom))] shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 sm:py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl bg-neutral-900 px-5 py-2.5 sm:py-2 text-xs font-semibold text-white shadow-xs hover:bg-neutral-800 transition active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Register Hardware</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
