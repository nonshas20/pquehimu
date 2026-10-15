import React, { useState, useEffect, useMemo } from 'react';
import type { AssetItem, AssetCategory, AssetStatus, BarangayLocation } from '../types/inventory';
import { X, Edit, AlertCircle, Check, RotateCcw } from './HugeIcons';

interface EditAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: AssetItem | null;
  locations: BarangayLocation[];
  existingAssets?: AssetItem[];
  onSaveAsset: (updatedAsset: AssetItem) => Promise<void> | void;
}

const CATEGORIES: AssetCategory[] = [
  'Printer',
  'Network Router',
  'Network Switch',
  'Extension Cord / Power',
  'UPS / Power',
  'Workstation / PC',
  'Biometric / Scanner',
  'Other IT Equipment',
];

const STATUSES: { value: AssetStatus; label: string; dotColor: string }[] = [
  { value: 'in_service', label: 'In Active Service', dotColor: 'bg-emerald-500' },
  { value: 'in_transit', label: 'Live In-Transit', dotColor: 'bg-blue-500' },
  { value: 'under_repair', label: 'Under Repair / Maintenance', dotColor: 'bg-amber-500' },
  { value: 'standby', label: 'Decommissioned / Standby', dotColor: 'bg-neutral-500' },
];

export const EditAssetModal: React.FC<EditAssetModalProps> = ({
  isOpen,
  onClose,
  asset,
  locations,
  existingAssets,
  onSaveAsset,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<AssetCategory>('Printer');
  const [brandModel, setBrandModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [assetTag, setAssetTag] = useState('');
  const [currentLocationId, setCurrentLocationId] = useState('');
  const [status, setStatus] = useState<AssetStatus>('in_service');
  const [custodianName, setCustodianName] = useState('');
  const [custodianRole, setCustodianRole] = useState('');
  const [acquisitionDate, setAcquisitionDate] = useState('');
  const [notes, setNotes] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync form state whenever asset changes
  useEffect(() => {
    if (asset) {
      setName(asset.name || '');
      setCategory(asset.category || 'Printer');
      setBrandModel(asset.brandModel || '');
      setSerialNumber(asset.serialNumber || '');
      setAssetTag(asset.assetTag || '');
      setCurrentLocationId(asset.currentLocationId || locations[0]?.id || '');
      setStatus(asset.status || 'in_service');
      setCustodianName(asset.custodianName || '');
      setCustodianRole(asset.custodianRole || 'Health Center Staff');
      setAcquisitionDate(asset.acquisitionDate || new Date().toISOString().split('T')[0]);
      setNotes(asset.notes || '');
      setErrorMessage(null);
    }
  }, [asset, locations]);

  // Clean serial input for comparison
  const cleanSerial = serialNumber.trim().toLowerCase();
  const isPlaceholderSerial =
    !cleanSerial || cleanSerial === 'n/a' || cleanSerial === 'none' || cleanSerial === 'na';

  // Check for duplicate serial number across other assets
  const duplicateAsset = useMemo(() => {
    if (!asset || isPlaceholderSerial || !existingAssets || existingAssets.length === 0) return null;
    return (
      existingAssets.find(
        (a) => a.id !== asset.id && a.serialNumber && a.serialNumber.trim().toLowerCase() === cleanSerial
      ) || null
    );
  }, [asset, cleanSerial, isPlaceholderSerial, existingAssets]);

  // Find location of duplicate asset
  const duplicateLocation = useMemo(() => {
    if (!duplicateAsset) return null;
    return locations.find((l) => l.id === duplicateAsset.currentLocationId) || null;
  }, [duplicateAsset, locations]);

  // Check if assetTag collides with another asset
  const duplicateTag = useMemo(() => {
    if (!asset) return null;
    const cleanTag = assetTag.trim().toLowerCase();
    if (!cleanTag || !existingAssets || existingAssets.length === 0) return null;
    return (
      existingAssets.find(
        (a) => a.id !== asset.id && a.assetTag && a.assetTag.trim().toLowerCase() === cleanTag
      ) || null
    );
  }, [asset, assetTag, existingAssets]);

  if (!isOpen || !asset) return null;

  const handleSubmit = async (e: React.FormEvent) => {
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
        `Duplicate Serial Number: "${serialNumber.trim()}" is already assigned to ${duplicateAsset.name} (${duplicateAsset.assetTag}) at ${duplicateLocation?.name || 'Assigned Station'}.`
      );
      return;
    }

    if (duplicateTag) {
      setErrorMessage(
        `Property Tag "${assetTag.trim()}" is already in use by ${duplicateTag.name}. Please provide a unique tag.`
      );
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const updated: AssetItem = {
        ...asset,
        name: name.trim(),
        category,
        brandModel: brandModel.trim() || name.trim(),
        serialNumber: serialNumber.trim(),
        assetTag: assetTag.trim(),
        currentLocationId,
        status,
        custodianName: custodianName.trim() || 'Unassigned',
        custodianRole: custodianRole.trim() || 'Health Center Staff',
        acquisitionDate: acquisitionDate.trim() || new Date().toISOString().split('T')[0],
        notes: notes.trim(),
      };

      await onSaveAsset(updated);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update asset.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-t-[32px] sm:rounded-3xl bg-white border-t sm:border border-neutral-200/90 p-5 sm:p-6 shadow-2xl transition-all max-h-[92vh] flex flex-col">
        {/* Mobile Native Drag Pill Handle */}
        <div className="w-12 h-1.5 bg-neutral-300 rounded-full mx-auto mb-2 shrink-0 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
              <Edit className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">
                Edit Equipment Record
              </h3>
              <p className="text-[11px] font-mono text-neutral-500">
                {asset.assetTag} &bull; {asset.serialNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition active:scale-95"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-3.5 space-y-3.5 text-xs flex-1 overflow-y-auto pr-0.5">
          {errorMessage && (
            <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 p-2.5 text-rose-700 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed font-semibold">{errorMessage}</div>
            </div>
          )}

          {/* Asset Title / Name */}
          <div>
            <label className="block font-bold text-neutral-700 mb-1">
              Asset Title / Item Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. EPSON L3250"
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 font-medium text-neutral-800 shadow-2xs focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 focus:outline-none"
            />
          </div>

          {/* Category & Status Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-neutral-700 mb-1">
                Hardware Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as AssetCategory)}
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 font-medium text-neutral-800 shadow-2xs focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 focus:outline-none"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-neutral-700 mb-1">
                Operational Status <span className="text-rose-500">*</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AssetStatus)}
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 font-medium text-neutral-800 shadow-2xs focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 focus:outline-none"
              >
                {STATUSES.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Brand / Model */}
          <div>
            <label className="block font-bold text-neutral-700 mb-1">
              Brand & Specific Model
            </label>
            <input
              type="text"
              value={brandModel}
              onChange={(e) => setBrandModel(e.target.value)}
              placeholder="e.g. Epson EcoTank L3250 All-in-One"
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 font-medium text-neutral-800 shadow-2xs focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 focus:outline-none"
            />
          </div>

          {/* Serial Number & Asset Tag Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-neutral-700">
                  Hardware Serial (S/N) <span className="text-rose-500">*</span>
                </label>
                {cleanSerial && !duplicateAsset && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                    <Check className="h-3 w-3" /> Unique
                  </span>
                )}
              </div>
              <input
                type="text"
                required
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="e.g. XAHS039907"
                className={`w-full rounded-xl border px-3 py-2 font-mono text-xs font-semibold shadow-2xs focus:outline-none transition-colors ${
                  duplicateAsset
                    ? 'border-rose-400 bg-rose-50/50 text-rose-900 focus:ring-2 focus:ring-rose-500/20'
                    : 'border-neutral-200 bg-white text-neutral-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15'
                }`}
              />
              {duplicateAsset && (
                <div className="mt-1 flex items-start gap-1 text-[10px] font-medium text-rose-600">
                  <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
                  <span>
                    In use by <strong>{duplicateAsset.name}</strong> at{' '}
                    <strong>{duplicateLocation?.name || 'Assigned Station'}</strong>
                  </span>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-neutral-700">
                  HIMU Asset Tag <span className="text-rose-500">*</span>
                </label>
                {assetTag && !duplicateTag && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                    <Check className="h-3 w-3" /> Valid
                  </span>
                )}
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  required
                  value={assetTag}
                  onChange={(e) => setAssetTag(e.target.value)}
                  placeholder="HIMU-2026-000"
                  className={`w-full rounded-xl border px-3 py-2 font-mono text-xs font-bold shadow-2xs focus:outline-none transition-colors ${
                    duplicateTag
                      ? 'border-rose-400 bg-rose-50/50 text-rose-900 focus:ring-2 focus:ring-rose-500/20'
                      : 'border-neutral-200 bg-white text-neutral-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15'
                  }`}
                />
                <button
                  type="button"
                  onClick={() =>
                    setAssetTag(`HIMU-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`)
                  }
                  title="Generate new tag"
                  className="rounded-xl border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition active:scale-95 shrink-0"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Current Location Assignment */}
          <div>
            <label className="block font-bold text-neutral-700 mb-1">
              Stationed Jurisdiction / Facility <span className="text-rose-500">*</span>
            </label>
            <select
              value={currentLocationId}
              onChange={(e) => setCurrentLocationId(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 font-medium text-neutral-800 shadow-2xs focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 focus:outline-none"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} {loc.district === 0 ? '(Central Depot)' : `(District ${loc.district})`}
                </option>
              ))}
            </select>
          </div>

          {/* Custodian Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-neutral-700 mb-1">
                Current Custodian
              </label>
              <input
                type="text"
                value={custodianName}
                onChange={(e) => setCustodianName(e.target.value)}
                placeholder="e.g. MARICEL SANTOS (MIDWIFE II)"
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 font-medium text-neutral-800 shadow-2xs focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-neutral-700 mb-1">
                Custodian Role / Designation
              </label>
              <input
                type="text"
                value={custodianRole}
                onChange={(e) => setCustodianRole(e.target.value)}
                placeholder="e.g. Health Center Staff / IT Coordinator"
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 font-medium text-neutral-800 shadow-2xs focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 focus:outline-none"
              />
            </div>
          </div>

          {/* Acquisition Date */}
          <div>
            <label className="block font-bold text-neutral-700 mb-1">
              Acquisition / Deployment Date
            </label>
            <input
              type="date"
              value={acquisitionDate}
              onChange={(e) => setAcquisitionDate(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 font-medium text-neutral-800 shadow-2xs focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 focus:outline-none font-mono"
            />
          </div>

          {/* Technical Notes */}
          <div>
            <label className="block font-bold text-neutral-700 mb-1">
              Technical Remarks / Hardware Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Complete with original power cable & USB cord. Tested operational."
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 font-medium text-neutral-800 shadow-2xs focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 focus:outline-none resize-none"
            />
          </div>

          {/* Form Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-neutral-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-neutral-200 bg-white px-4 py-2 font-bold text-neutral-700 hover:bg-neutral-50 transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={Boolean(duplicateAsset) || Boolean(duplicateTag) || isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white shadow-sm hover:bg-emerald-500 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Check className="h-4 w-4" />
              <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
