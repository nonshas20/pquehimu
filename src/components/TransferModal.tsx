import React, { useState, useEffect } from 'react';
import type { AssetItem, BarangayLocation, BorrowChecklistItem } from '../types/inventory';
import { DISPATCH_OFFICERS } from '../types/inventory';
import { X, ArrowRight, Printer, Plus, Trash } from './HugeIcons';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: AssetItem | null;
  batchAssets?: AssetItem[];
  locations: BarangayLocation[];
  defaultDispatcherName?: string;
  officers?: string[];
  onConfirmTransfer: (
    assetId: string,
    toLocationId: string,
    purpose: string,
    dispatchedBy: string,
    receivedBy: string,
    notes: string,
    checklistData?: {
      eventName: string;
      requestingOffice: string;
      borrowerName: string;
      borrowedAt: string;
      borrowedItemsList: BorrowChecklistItem[];
    }
  ) => void;
  onConfirmBatchTransfer?: (
    assetIds: string[],
    toLocationId: string,
    purpose: string,
    dispatchedBy: string,
    receivedBy: string,
    notes: string,
    checklistData?: {
      eventName: string;
      requestingOffice: string;
      borrowerName: string;
      borrowedAt: string;
      borrowedItemsList: BorrowChecklistItem[];
    }
  ) => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  asset,
  batchAssets,
  locations,
  defaultDispatcherName,
  officers,
  onConfirmTransfer,
  onConfirmBatchTransfer,
}) => {
  const isBatch = Boolean(batchAssets && batchAssets.length > 0);
  const activeAssets = isBatch ? (batchAssets || []) : (asset ? [asset] : []);
  const primaryAsset = activeAssets[0] || null;

  const officerList = officers && officers.length > 0 ? officers : (DISPATCH_OFFICERS as readonly string[]);
  const currentLocation = locations.find((l) => l.id === primaryAsset?.currentLocationId);
  const eligibleDestinations = locations.filter((l) => !activeAssets.every((a) => a.currentLocationId === l.id));

  const [toLocationId, setToLocationId] = useState<string>(() => {
    return eligibleDestinations[0]?.id || '';
  });

  const selectedDestination = locations.find((l) => l.id === toLocationId);
  const destinationCleanName = selectedDestination?.name?.replace(/^Barangay\s+/i, '') || 'Barangay';

  // Event & Profiling Activity
  const [selectedEventPreset, setSelectedEventPreset] = useState<string>('PhilHealth YAKAP Profiling');
  const [eventName, setEventName] = useState<string>('');
  const [requestingOffice, setRequestingOffice] = useState<string>('');
  const [borrowerName, setBorrowerName] = useState<string>('');

  // Auto-update event title and requesting office when destination or event preset changes
  useEffect(() => {
    if (selectedDestination) {
      setEventName(`${selectedEventPreset} - ${destinationCleanName}`);
      setRequestingOffice(`${selectedDestination.name} Health Center`);
    }
  }, [selectedDestination, selectedEventPreset, destinationCleanName]);

  // Officer & Datetime
  const [dispatchedBy, setDispatchedBy] = useState<string>(() => {
    if (defaultDispatcherName && officerList.includes(defaultDispatcherName)) {
      return defaultDispatcherName;
    }
    return officerList[0] || 'JOHN SHANNON O. RODRIGUEZ';
  });

  const [borrowedAt, setBorrowedAt] = useState<string>(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
  });

  // Helper to build initial item rows
  const createDefaultItems = (targets: AssetItem[]): BorrowChecklistItem[] => {
    if (!targets.length) return [];
    return targets.map((t) => ({
      itemEquipment: (t.name || t.brandModel || 'IT Equipment').toUpperCase(),
      serialNo: t.serialNumber || 'N/A',
      quantity: 1,
      remarks: t.category === 'Printer' ? 'WITH POWER AND CABLE' : 'WITH POWER',
    }));
  };

  // Items Borrowed Checklist Rows (Matching 1-to-1 with A5 table)
  const [itemsList, setItemsList] = useState<BorrowChecklistItem[]>(() => createDefaultItems(activeAssets));

  // Reset form state cleanly when a different asset or batch is selected
  useEffect(() => {
    if (activeAssets.length > 0) {
      const eligible = locations.filter((l) => !activeAssets.every((a) => a.currentLocationId === l.id));
      setToLocationId(eligible[0]?.id || '');
      setItemsList(createDefaultItems(activeAssets));
    }
  }, [asset?.id, batchAssets?.length, locations]);

  if (!isOpen || activeAssets.length === 0) return null;

  const handleAddItemRow = () => {
    setItemsList((prev) => [
      ...prev,
      { itemEquipment: '', serialNo: '', quantity: 1, remarks: '' },
    ]);
  };

  const handleUpdateItemRow = (index: number, field: keyof BorrowChecklistItem, value: any) => {
    setItemsList((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveItemRow = (index: number) => {
    if (itemsList.length <= 1) return;
    setItemsList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!toLocationId || !dispatchedBy.trim()) return;

    const finalEventName = (eventName.trim() || `${selectedEventPreset} - ${destinationCleanName}`).toUpperCase();
    const finalOffice = (requestingOffice.trim() || `${selectedDestination?.name || 'BARANGAY'} HEALTH CENTER`).toUpperCase();
    const finalBorrower = (borrowerName.trim() || `${selectedDestination?.name || 'BARANGAY'} HEALTH CENTER STAFF`).toUpperCase();

    const checklistData = {
      eventName: finalEventName,
      requestingOffice: finalOffice,
      borrowerName: finalBorrower,
      borrowedAt: new Date(borrowedAt).toISOString(),
      borrowedItemsList: itemsList.filter((item) => item.itemEquipment.trim() !== ''),
    };

    if (isBatch && onConfirmBatchTransfer) {
      onConfirmBatchTransfer(
        activeAssets.map((a) => a.id),
        toLocationId,
        finalEventName,
        dispatchedBy,
        finalBorrower,
        `A5 Batch Borrowing Checklist generated for ${finalEventName} (${activeAssets.length} items)`,
        checklistData
      );
    } else if (onConfirmTransfer) {
      onConfirmTransfer(
        primaryAsset!.id,
        toLocationId,
        finalEventName,
        dispatchedBy,
        finalBorrower,
        `A5 Borrowing Checklist generated for ${finalEventName}`,
        checklistData
      );
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full sm:max-w-2xl lg:max-w-3xl rounded-t-[28px] sm:rounded-2xl bg-white border-t sm:border border-neutral-200 shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden">
        
        {/* Mobile Native Drag Pill Handle */}
        <div className="w-10 h-1 bg-neutral-300 rounded-full mx-auto my-2.5 shrink-0 sm:hidden" />

        {/* Modal Header (Fixed at top) */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-neutral-100 shrink-0 bg-white">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs shrink-0">
              <Printer className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-neutral-900 truncate">
                  {isBatch ? `Batch Equipment Dispatch` : 'Dispatch Equipment'}
                </h3>
                {isBatch && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 shrink-0">
                    {activeAssets.length} items
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400 font-medium truncate">
                Property Custody Slip & A5 Borrowing Checklist
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition shrink-0 cursor-pointer"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Enclosure (Scrollable Body + Sticky Footer) */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          
          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 sm:space-y-5 text-xs">
            
            {/* 1. Unified Dispatch Route Card */}
            <div className="rounded-2xl bg-neutral-50/90 border border-neutral-200/90 p-3 sm:p-4 space-y-2.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                1. Dispatch Route
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[1fr,auto,1fr] items-center gap-2 sm:gap-3">
                {/* Origin */}
                <div className="rounded-xl bg-white border border-neutral-200/80 p-2.5 sm:p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                    Origin (Current Depot)
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-neutral-800 block truncate mt-0.5">
                    {currentLocation?.name || 'HIMU Central IT Depot'}
                  </span>
                </div>

                {/* Arrow indicator */}
                <div className="flex items-center justify-center my-0.5 sm:my-0">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shadow-2xs rotate-90 sm:rotate-0">
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />
                  </div>
                </div>

                {/* Destination Dropdown */}
                <div className="rounded-xl bg-white border-2 border-emerald-500/80 p-2 sm:p-2.5 shadow-2xs focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/15 transition">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                    Destination Station <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={toLocationId}
                    onChange={(e) => setToLocationId(e.target.value)}
                    required
                    className="w-full bg-transparent text-xs sm:text-sm font-bold text-emerald-950 outline-none cursor-pointer mt-0.5"
                  >
                    {eligibleDestinations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.district > 0 ? `District ${loc.district} • ` : ''}{loc.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Batch Staged Assets Chips */}
              {isBatch && (
                <div className="pt-2 border-t border-neutral-200/70 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Staged Batch ({activeAssets.length}):
                  </span>
                  {activeAssets.map((a) => (
                    <span
                      key={a.id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-neutral-200 px-2 py-0.5 text-[10px] font-semibold text-neutral-800 shadow-2xs"
                    >
                      <span className="font-mono font-bold text-emerald-700">{a.assetTag}</span>
                      <span className="text-neutral-500 truncate max-w-[110px]">{a.name}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Mission & Custody Information */}
            <div className="space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                2. Mission & Custody Details
              </div>

              {/* Event Activity & Preset Pills */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                  Event / Profiling Activity <span className="text-rose-500">*</span>
                </label>

                {/* Preset Chips (Scrollable on mobile, wrap on desktop) */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none sm:flex-wrap mb-2">
                  {[
                    'PhilHealth YAKAP Profiling',
                    'Health Center EMR Operations',
                    'Community Medical Mission',
                    'National Immunization Day',
                    'Maternal Health Intake',
                  ].map((preset) => (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => setSelectedEventPreset(preset)}
                      className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition active:scale-95 cursor-pointer ${
                        selectedEventPreset === preset
                          ? 'bg-neutral-900 text-white shadow-xs'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  required
                  placeholder="e.g. PhilHealth YAKAP Profiling Marcelo Green"
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-bold text-neutral-900 shadow-2xs focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 focus:outline-none"
                />
              </div>

              {/* Requesting Office & Borrower in 2 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                    Requesting Office / Health Station
                  </label>
                  <input
                    type="text"
                    value={requestingOffice}
                    onChange={(e) => setRequestingOffice(e.target.value)}
                    placeholder="e.g. Marcelo Green Health Center"
                    className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 shadow-2xs focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                    Borrower / Responsible Person
                  </label>
                  <input
                    type="text"
                    value={borrowerName}
                    onChange={(e) => setBorrowerName(e.target.value)}
                    placeholder="Name of health worker or nurse"
                    className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 shadow-2xs focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 focus:outline-none"
                  />
                </div>
              </div>

              {/* Officer & Date Time in 2 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                    Released by HIMU (IT Officer) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={dispatchedBy}
                    onChange={(e) => setDispatchedBy(e.target.value)}
                    required
                    className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-bold text-neutral-900 shadow-2xs focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 focus:outline-none cursor-pointer"
                  >
                    {officerList.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                    Date & Time Borrowed <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={borrowedAt}
                    onChange={(e) => setBorrowedAt(e.target.value)}
                    required
                    className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 shadow-2xs focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 focus:outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            {/* 3. Equipment & Checklist Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  3. Equipment & Accessories Checklist
                </div>
                <button
                  type="button"
                  onClick={handleAddItemRow}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Item Row</span>
                </button>
              </div>

              {/* Items Card List (Adaptive Mobile & Desktop Card Layout) */}
              <div className="space-y-2">
                {itemsList.map((row, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-neutral-200/90 bg-white p-2.5 sm:p-3 shadow-2xs transition hover:border-neutral-300"
                  >
                    {/* Top Row: Item Title + Quantity + Remove */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={row.itemEquipment}
                          onChange={(e) => handleUpdateItemRow(idx, 'itemEquipment', e.target.value)}
                          placeholder="Item / Equipment Name (e.g. EPSON L5190)"
                          className="w-full rounded-lg border border-neutral-200 bg-neutral-50/50 px-2.5 py-1.5 text-xs font-bold text-neutral-900 placeholder:text-neutral-400 focus:bg-white focus:border-emerald-500 focus:outline-none uppercase"
                        />
                      </div>

                      {/* Quantity input */}
                      <div className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 shrink-0">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase">Qty</span>
                        <input
                          type="number"
                          min={1}
                          value={row.quantity}
                          onChange={(e) => handleUpdateItemRow(idx, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-9 text-center rounded bg-white py-0.5 text-xs font-bold text-neutral-900 border border-neutral-200/80 outline-none"
                        />
                      </div>

                      {/* Remove item button */}
                      {itemsList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="rounded-lg p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition shrink-0 cursor-pointer"
                          title="Remove item"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Bottom Row: Serial Number & Remarks in 2 Columns */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="flex items-center rounded-lg border border-neutral-200/80 bg-neutral-50/50 px-2.5 py-1 focus-within:bg-white focus-within:border-emerald-500">
                        <span className="text-[10px] font-mono font-bold text-neutral-400 shrink-0 mr-1.5 uppercase">
                          S/N:
                        </span>
                        <input
                          type="text"
                          value={row.serialNo || ''}
                          onChange={(e) => handleUpdateItemRow(idx, 'serialNo', e.target.value)}
                          placeholder="Serial Number or N/A"
                          className="w-full bg-transparent text-xs font-mono font-medium text-neutral-800 placeholder:text-neutral-400 outline-none uppercase"
                        />
                      </div>

                      <div className="flex items-center rounded-lg border border-neutral-200/80 bg-neutral-50/50 px-2.5 py-1 focus-within:bg-white focus-within:border-emerald-500">
                        <span className="text-[10px] font-bold text-neutral-400 shrink-0 mr-1.5 uppercase">
                          Remarks:
                        </span>
                        <input
                          type="text"
                          value={row.remarks || ''}
                          onChange={(e) => handleUpdateItemRow(idx, 'remarks', e.target.value)}
                          placeholder="e.g. Complete with power cable"
                          className="w-full bg-transparent text-xs font-medium text-neutral-700 placeholder:text-neutral-400 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Fixed Sticky Footer (Always Visible!) */}
          <div className="shrink-0 border-t border-neutral-200/90 bg-white px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between gap-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.03)]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition active:scale-95 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 sm:px-6 py-2.5 text-xs font-bold shadow-md shadow-emerald-600/20 hover:shadow-emerald-600/30 transition active:scale-95 cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>
                {isBatch
                  ? `Confirm Batch (${activeAssets.length}) & Print A5`
                  : 'Confirm Dispatch & Print A5'}
              </span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
