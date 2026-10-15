import React, { useState } from 'react';
import type { AssetItem, AssetCategory, BarangayLocation } from '../types/inventory';
import { X, Plus, AlertCircle, Check, RotateCcw } from './HugeIcons';

interface AddAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  locations: BarangayLocation[];
  existingAssets?: AssetItem[];
  onAddAsset: (newAsset: Omit<AssetItem, 'id' | 'history'>) => void;
  initialLocationId?: string;
}

export const AddAssetModal: React.FC<AddAssetModalProps> = ({
  isOpen,
  onClose,
  locations,
  existingAssets,
  onAddAsset,
  initialLocationId,
}) => {
  const generateTag = () =>
    `HIMU-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

  const [name, setName] = useState('');
  const [category, setCategory] = useState<AssetCategory>('Printer');
  const [brandModel, setBrandModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [assetTag, setAssetTag] = useState(generateTag);
  const [currentLocationId, setCurrentLocationId] = useState(
    initialLocationId || locations[0]?.id || ''
  );

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialLocationId) {
      setCurrentLocationId(initialLocationId);
    }
  }, [initialLocationId]);
  const [custodianName, setCustodianName] = useState('');
  const [custodianRole, setCustodianRole] = useState('Barangay Health Center Staff / IT Coordinator');
  const [notes, setNotes] = useState('');

  // Clean serial input for comparison
  const cleanSerial = serialNumber.trim().toLowerCase();
  const isPlaceholderSerial =
    !cleanSerial || cleanSerial === 'n/a' || cleanSerial === 'none' || cleanSerial === 'na';

  // Check for duplicate serial number across existing assets
  const duplicateAsset = React.useMemo(() => {
    if (isPlaceholderSerial || !existingAssets || existingAssets.length === 0) return null;
    return (
      existingAssets.find(
        (a) => a.serialNumber && a.serialNumber.trim().toLowerCase() === cleanSerial
      ) || null
    );
  }, [cleanSerial, isPlaceholderSerial, existingAssets]);

  // Find location of duplicate asset
  const duplicateLocation = React.useMemo(() => {
    if (!duplicateAsset) return null;
    return locations.find((l) => l.id === duplicateAsset.currentLocationId) || null;
  }, [duplicateAsset, locations]);

  // Check if generated or custom assetTag collides
  const duplicateTag = React.useMemo(() => {
    const cleanTag = assetTag.trim().toLowerCase();
    if (!cleanTag || !existingAssets || existingAssets.length === 0) return null;
    return (
      existingAssets.find(
        (a) => a.assetTag && a.assetTag.trim().toLowerCase() === cleanTag
      ) || null
    );
  }, [assetTag, existingAssets]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Please provide an Asset Name / Title.');
      return;
    }
    if (!serialNumber.trim()) {
      setErrorMessage('Please provide a Hardware Serial Number.');
      return;
    }

    if (duplicateAsset) {
      setErrorMessage(
        `Duplicate Serial Number: "${serialNumber.trim()}" is already registered to ${duplicateAsset.name} (${duplicateAsset.assetTag}) at ${duplicateLocation?.name || 'Assigned Station'}. Double entry is prevented.`
      );
      return;
    }

    if (duplicateTag) {
      setErrorMessage(
        `Property Tag "${assetTag.trim()}" is already in use by ${duplicateTag.name}. Please regenerate a unique tag.`
      );
      return;
    }

    setErrorMessage(null);
    onAddAsset({
      name: name.trim(),
      category,
      brandModel: brandModel.trim() || name.trim(),
      serialNumber: serialNumber.trim(),
      assetTag: assetTag.trim(),
      currentLocationId,
      status: 'in_service',
      custodianName: custodianName.trim() || 'Unassigned',
      custodianRole: custodianRole.trim() || 'Health Center Staff',
      acquisitionDate: new Date().toISOString().split('T')[0],
      notes: notes.trim(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-t-[32px] sm:rounded-3xl bg-white border-t sm:border border-neutral-200/90 p-5 sm:p-6 shadow-2xl transition-all max-h-[92vh] flex flex-col">
        
        {/* Mobile Native Drag Pill Handle */}
        <div className="w-12 h-1.5 bg-neutral-300 rounded-full mx-auto mb-2 shrink-0 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-neutral-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-900 text-white">
              <Plus className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-neutral-900">
              New Asset
            </h3>
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
          {errorMessage && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-800 animate-in fade-in">
              ⚠️ {errorMessage}
            </div>
          )}

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
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-neutral-700">
                  Serial Number <span className="text-rose-500">*</span>
                </label>
                {duplicateAsset ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 animate-in fade-in">
                    <AlertCircle className="h-3 w-3 text-rose-600" />
                    Duplicate
                  </span>
                ) : cleanSerial && !isPlaceholderSerial ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 animate-in fade-in">
                    <Check className="h-3 w-3 text-emerald-600" />
                    Available
                  </span>
                ) : null}
              </div>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => {
                  setSerialNumber(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Hardware S/N"
                required
                className={`w-full rounded-xl border bg-white px-3 py-2 font-mono text-xs text-neutral-800 shadow-xs focus:outline-none transition ${
                  duplicateAsset
                    ? 'border-rose-400 bg-rose-50/20 text-rose-950 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/15'
                    : cleanSerial && !isPlaceholderSerial
                    ? 'border-emerald-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15'
                    : 'border-neutral-200 focus:border-neutral-400'
                }`}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-neutral-700">
                  HIMU Property Tag
                </label>
                {duplicateTag ? (
                  <button
                    type="button"
                    onClick={() => setAssetTag(generateTag())}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 hover:text-amber-900 cursor-pointer"
                    title="Generate new tag"
                  >
                    <RotateCcw className="h-2.5 w-2.5" />
                    Regenerate
                  </button>
                ) : null}
              </div>
              <input
                type="text"
                value={assetTag}
                onChange={(e) => setAssetTag(e.target.value)}
                className={`w-full rounded-xl border px-3 py-2 font-mono text-xs shadow-xs focus:outline-none ${
                  duplicateTag
                    ? 'border-amber-300 bg-amber-50/30 text-amber-900'
                    : 'border-neutral-200 bg-neutral-50 text-neutral-600'
                }`}
              />
            </div>
          </div>

          {/* Duplicate Serial Number Warning Banner */}
          {duplicateAsset && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/90 p-3 text-xs text-rose-900 animate-in fade-in space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-1.5 font-bold text-rose-800">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>Duplicate Serial Number Detected</span>
              </div>
              <p className="text-[11px] text-rose-700 leading-relaxed">
                Serial number <strong className="font-mono text-rose-950 font-bold">"{serialNumber.trim()}"</strong> is already registered to:
              </p>
              <div className="rounded-lg bg-white border border-rose-200/80 p-2.5 text-[11px] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-neutral-900 truncate">{duplicateAsset.name}</span>
                  <span className="font-mono text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded shrink-0">
                    {duplicateAsset.assetTag}
                  </span>
                </div>
                <div className="text-[10px] text-neutral-500 font-medium">
                  Category: <span className="text-neutral-800 font-semibold">{duplicateAsset.category}</span>
                  {duplicateAsset.brandModel ? ` • Model: ${duplicateAsset.brandModel}` : ''}
                </div>
                <div className="text-[10px] text-neutral-600">
                  Current Station: <strong className="text-neutral-900">{duplicateLocation?.name || 'Assigned Station'}</strong>
                </div>
              </div>
              <p className="text-[10px] text-rose-600 font-medium">
                To prevent double entry, this hardware cannot be registered again. Please verify the serial number plate or edit the existing record.
              </p>
            </div>
          )}

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
            {currentLocationId === 'loc-himu-hq' ? (
              <p className="mt-1 text-[11px] text-emerald-700 font-medium">
                ⚡ <strong>Staging Depot Item:</strong> Will appear in the map's Staging Depot drawer ready to be dispatched or dragged across Parañaque.
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-blue-700 font-medium">
                🏢 <strong>Direct Facility Assignment:</strong> Hardware will be stationed at {locations.find((l) => l.id === currentLocationId)?.name}.
              </p>
            )}
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
              className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 sm:py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition active:scale-95 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={Boolean(duplicateAsset || duplicateTag)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl bg-neutral-900 px-5 py-2.5 sm:py-2 text-xs font-semibold text-white shadow-xs hover:bg-neutral-800 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-neutral-900 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>
                {duplicateAsset
                  ? 'Duplicate S/N Detected'
                  : duplicateTag
                  ? 'Duplicate Tag Detected'
                  : 'Register Hardware'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
