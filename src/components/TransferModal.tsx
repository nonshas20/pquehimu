import React, { useState, useEffect, useMemo } from 'react';
import type { AssetItem, BarangayLocation, BorrowChecklistItem } from '../types/inventory';
import { DISPATCH_OFFICERS } from '../types/inventory';
import {
  X,
  ArrowRight,
  Printer,
  Plus,
  Trash,
  Search,
  Package,
  Wifi,
  Plug,
  Monitor,
} from './HugeIcons';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: AssetItem | null;
  batchAssets?: AssetItem[];
  allAssets?: AssetItem[];
  initialDestinationLocationId?: string;
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
  allAssets = [],
  initialDestinationLocationId,
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
    if (initialDestinationLocationId && locations.some((l) => l.id === initialDestinationLocationId)) {
      return initialDestinationLocationId;
    }
    return eligibleDestinations[0]?.id || '';
  });

  const selectedDestination = locations.find((l) => l.id === toLocationId);
  const destinationCleanName = selectedDestination?.name?.replace(/^Barangay\s+/i, '') || 'Barangay';

  // Event & Profiling Activity
  const [selectedEventPreset, setSelectedEventPreset] = useState<string>('PhilHealth YAKAP Profiling');
  const [eventName, setEventName] = useState<string>('');
  const [requestingOffice, setRequestingOffice] = useState<string>('');
  const [borrowerName, setBorrowerName] = useState<string>('');
  const [notes, setNotes] = useState<string>('Checked and operational upon dispatch');

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

  // Helper to build initial item rows from scanned / passed assets
  const createDefaultItems = (targets: AssetItem[]): BorrowChecklistItem[] => {
    if (!targets.length) return [];
    return targets.map((t) => ({
      itemEquipment: (t.name || t.brandModel || 'IT Equipment').toUpperCase(),
      serialNo: t.serialNumber || 'N/A',
      quantity: 1,
      remarks: t.category === 'Printer' ? 'WITH POWER AND CABLE' : 'WITH POWER',
      assetId: t.id,
    }));
  };

  // Items Borrowed Checklist Rows (Matching 1-to-1 with A5 table)
  const [itemsList, setItemsList] = useState<BorrowChecklistItem[]>(() => createDefaultItems(activeAssets));

  // Reset form state cleanly when a different asset or batch is selected
  useEffect(() => {
    if (initialDestinationLocationId && locations.some((l) => l.id === initialDestinationLocationId)) {
      setToLocationId(initialDestinationLocationId);
    } else if (activeAssets.length > 0) {
      const eligible = locations.filter((l) => !activeAssets.every((a) => a.currentLocationId === l.id));
      setToLocationId(eligible[0]?.id || '');
    }
    if (activeAssets.length > 0) {
      setItemsList(createDefaultItems(activeAssets));
    }
  }, [asset?.id, batchAssets?.length, locations, initialDestinationLocationId]);

  // ---------------------------------------------------------------------------
  // Central Depot Hardware Search & Dropdown Picker State
  // ---------------------------------------------------------------------------
  const [isDepotPickerOpen, setIsDepotPickerOpen] = useState(false);
  const [depotSearch, setDepotSearch] = useState('');
  const [depotCategory, setDepotCategory] = useState<string>('ALL');

  // Available hardware in Central Depot (HIMU Depot HQ or unassigned) not yet added to checklist
  const availableDepotAssets = useMemo(() => {
    return allAssets.filter((a) => {
      // Must be at Central Depot or in ready service status
      const isAtDepot = a.currentLocationId === 'loc-himu-hq' || !a.currentLocationId;
      // Exclude items already in active checklist
      const isAlreadyInChecklist = itemsList.some((item) => item.assetId === a.id);
      return isAtDepot && !isAlreadyInChecklist;
    });
  }, [allAssets, itemsList]);

  // Filter available depot items by search query and category
  const filteredDepotAssets = useMemo(() => {
    return availableDepotAssets.filter((a) => {
      if (depotCategory !== 'ALL') {
        if (depotCategory === 'SIM') {
          const matchSim = /sim|cellular|smart|globe|dito|data/i.test(
            `${a.name} ${a.brandModel} ${a.notes || ''}`
          );
          if (!matchSim) return false;
        } else if (a.category !== depotCategory) {
          return false;
        }
      }

      if (depotSearch.trim()) {
        const q = depotSearch.toLowerCase().trim();
        return (
          a.name.toLowerCase().includes(q) ||
          a.serialNumber.toLowerCase().includes(q) ||
          a.assetTag.toLowerCase().includes(q) ||
          a.brandModel.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q) ||
          (a.notes && a.notes.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [availableDepotAssets, depotCategory, depotSearch]);

  // Depot Category live counts
  const depotCounts = useMemo(() => {
    return {
      total: availableDepotAssets.length,
      printers: availableDepotAssets.filter((a) => a.category === 'Printer').length,
      cords: availableDepotAssets.filter((a) => a.category === 'Extension Cord / Power' || a.category === 'UPS / Power').length,
      routers: availableDepotAssets.filter((a) => a.category === 'Network Router' || a.category === 'Network Switch').length,
      pcs: availableDepotAssets.filter((a) => a.category === 'Workstation / PC').length,
      sim: availableDepotAssets.filter((a) => /sim|cellular|smart|globe|dito|data/i.test(`${a.name} ${a.brandModel}`)).length,
    };
  }, [availableDepotAssets]);

  if (!isOpen || activeAssets.length === 0) return null;

  // ---------------------------------------------------------------------------
  // Item List Handlers
  // ---------------------------------------------------------------------------
  const handleAddDepotAsset = (depotAsset: AssetItem) => {
    const defaultRemarks =
      depotAsset.category === 'Printer'
        ? 'WITH POWER AND USB CABLE'
        : depotAsset.category === 'Network Router'
        ? 'WITH POWER ADAPTER AND LAN CABLE'
        : depotAsset.category === 'Extension Cord / Power'
        ? 'HEAVY-DUTY 220V OPERATIONAL'
        : depotAsset.category === 'Workstation / PC'
        ? 'WITH POWER CORD & PERIPHERALS'
        : 'TESTED OPERATIONAL';

    setItemsList((prev) => [
      ...prev,
      {
        itemEquipment: (depotAsset.name || depotAsset.brandModel).toUpperCase(),
        serialNo: depotAsset.serialNumber || depotAsset.assetTag,
        quantity: 1,
        remarks: defaultRemarks,
        assetId: depotAsset.id,
      },
    ]);
  };

  const handleAddCustomRow = (customName = '') => {
    setItemsList((prev) => [
      ...prev,
      {
        itemEquipment: customName.toUpperCase(),
        serialNo: '',
        quantity: 1,
        remarks: 'WITH ACCESSORIES',
      },
    ]);
    if (isDepotPickerOpen) {
      setIsDepotPickerOpen(false);
      setDepotSearch('');
    }
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

  // ---------------------------------------------------------------------------
  // Submit Form Handler
  // ---------------------------------------------------------------------------
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!toLocationId || !dispatchedBy.trim()) return;

    const finalEventName = (eventName.trim() || `${selectedEventPreset} - ${destinationCleanName}`).toUpperCase();
    const finalOffice = (requestingOffice.trim() || `${selectedDestination?.name || 'BARANGAY'} HEALTH CENTER`).toUpperCase();
    const finalBorrower = (borrowerName.trim() || `${selectedDestination?.name || 'BARANGAY'} HEALTH CENTER STAFF`).toUpperCase();

    const validChecklistItems = itemsList.filter((item) => item.itemEquipment.trim() !== '');

    const checklistData = {
      eventName: finalEventName,
      requestingOffice: finalOffice,
      borrowerName: finalBorrower,
      borrowedAt: new Date(borrowedAt).toISOString(),
      borrowedItemsList: validChecklistItems,
    };

    // Gather ALL real asset IDs from the checklist:
    // 1. Initial scanned/passed activeAssets
    // 2. Any assets added to itemsList via Depot dropdown selector
    // 3. Any manual serial numbers that match an asset in allAssets
    const itemsListAssetIds = itemsList
      .map((item) => {
        if (item.assetId) return item.assetId;
        if (item.serialNo && allAssets.length > 0) {
          const match = allAssets.find(
            (a) =>
              a.serialNumber.trim().toLowerCase() === item.serialNo?.trim().toLowerCase() ||
              a.assetTag.trim().toLowerCase() === item.serialNo?.trim().toLowerCase()
          );
          return match ? match.id : null;
        }
        return null;
      })
      .filter((id): id is string => Boolean(id));

    const allTransferAssetIds = Array.from(
      new Set([...activeAssets.map((a) => a.id), ...itemsListAssetIds])
    );

    if (allTransferAssetIds.length > 1 && onConfirmBatchTransfer) {
      onConfirmBatchTransfer(
        allTransferAssetIds,
        toLocationId,
        finalEventName,
        dispatchedBy,
        finalBorrower,
        notes,
        checklistData
      );
    } else if (allTransferAssetIds.length === 1) {
      onConfirmTransfer(
        allTransferAssetIds[0],
        toLocationId,
        finalEventName,
        dispatchedBy,
        finalBorrower,
        notes,
        checklistData
      );
    }
    onClose();
  };

  const totalTransferCount = Math.max(
    activeAssets.length,
    itemsList.filter((i) => i.itemEquipment.trim() !== '').length
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-t-3xl sm:rounded-2xl bg-white border-t sm:border border-neutral-200 shadow-2xl transition-all max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Mobile Drag Indicator Bar */}
        <div className="w-10 h-1 bg-neutral-300 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-neutral-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-2xs">
              <Printer className="h-4.5 w-4.5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 leading-tight">
                Equipment Dispatch & Borrow Checklist
              </h3>
              <p className="text-[11px] text-neutral-500 font-medium">
                Official Parañaque City Health Operations • A5 Slip Protocol
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition"
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
                    Scanned for Transfer ({activeAssets.length}):
                  </span>
                  {activeAssets.map((a) => (
                    <span
                      key={a.id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-neutral-200 px-2 py-0.5 text-[10px] font-semibold text-neutral-800 shadow-2xs"
                    >
                      <span className="font-mono font-bold text-emerald-700">{a.assetTag}</span>
                      <span className="text-neutral-500 truncate max-w-[120px]">{a.name}</span>
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

                {/* Preset Chips */}
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
                  placeholder="e.g. PhilHealth YAKAP Profiling Merville"
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
                    placeholder="e.g. Merville Health Center"
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

              {/* Optional Dispatch Notes */}
              <div>
                <label className="block text-[11px] font-bold text-neutral-700 mb-1">
                  Dispatch & Verification Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Checked and operational upon dispatch"
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-800 shadow-2xs focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 focus:outline-none"
                />
              </div>
            </div>

            {/* 3. Equipment & Checklist Table with Searchable Depot Hardware Picker */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    3. Equipment & Accessories Checklist ({itemsList.length})
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    Add extension cords, SIM cards, or additional printers from Depot
                  </div>
                </div>

                {/* Quick Add Buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDepotPickerOpen(!isDepotPickerOpen);
                      setDepotSearch('');
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition shadow-2xs active:scale-95 cursor-pointer ${
                      isDepotPickerOpen
                        ? 'bg-neutral-900 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                    }`}
                  >
                    <Package className="h-3.5 w-3.5" />
                    <span>{isDepotPickerOpen ? 'Close Depot' : '+ Add from Depot'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddCustomRow('')}
                    className="inline-flex items-center gap-1 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 px-2.5 py-1.5 text-xs font-bold text-neutral-700 transition shadow-2xs active:scale-95 cursor-pointer"
                    title="Add custom or untagged item (e.g. SIM card, cables)"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Custom</span>
                  </button>
                </div>
              </div>

              {/* SEARCHABLE DEPOT HARDWARE PICKER DROPDOWN / PANEL */}
              {isDepotPickerOpen && (
                <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/20 p-3 sm:p-4 space-y-3 shadow-md animate-in fade-in duration-150">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-bold text-neutral-900">
                        Select from Central IT Depot Available Stock ({availableDepotAssets.length})
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsDepotPickerOpen(false)}
                      className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Search Input Field */}
                  <div className="relative flex items-center">
                    <Search className="absolute left-3 h-4 w-4 text-neutral-400" />
                    <input
                      type="text"
                      autoFocus
                      value={depotSearch}
                      onChange={(e) => setDepotSearch(e.target.value)}
                      placeholder="Search Depot (e.g. extension, sim, epson, router, switch)..."
                      className="w-full rounded-xl border border-neutral-300 bg-white pl-9 pr-8 py-2 text-xs font-semibold text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 shadow-xs"
                    />
                    {depotSearch && (
                      <button
                        type="button"
                        onClick={() => setDepotSearch('')}
                        className="absolute right-2.5 text-neutral-400 hover:text-neutral-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Category Quick Filter Chips */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                    <button
                      type="button"
                      onClick={() => setDepotCategory('ALL')}
                      className={`shrink-0 rounded-lg px-2.5 py-1 font-bold transition active:scale-95 ${
                        depotCategory === 'ALL'
                          ? 'bg-neutral-900 text-white'
                          : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100'
                      }`}
                    >
                      All ({depotCounts.total})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDepotCategory('Extension Cord / Power')}
                      className={`shrink-0 rounded-lg px-2.5 py-1 font-bold transition active:scale-95 ${
                        depotCategory === 'Extension Cord / Power'
                          ? 'bg-amber-600 text-white'
                          : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-amber-50'
                      }`}
                    >
                      🔌 Cords ({depotCounts.cords})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDepotCategory('Printer')}
                      className={`shrink-0 rounded-lg px-2.5 py-1 font-bold transition active:scale-95 ${
                        depotCategory === 'Printer'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-emerald-50'
                      }`}
                    >
                      🖨️ Printers ({depotCounts.printers})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDepotCategory('Network Router')}
                      className={`shrink-0 rounded-lg px-2.5 py-1 font-bold transition active:scale-95 ${
                        depotCategory === 'Network Router'
                          ? 'bg-sky-600 text-white'
                          : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-sky-50'
                      }`}
                    >
                      📶 Routers ({depotCounts.routers})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDepotCategory('Workstation / PC')}
                      className={`shrink-0 rounded-lg px-2.5 py-1 font-bold transition active:scale-95 ${
                        depotCategory === 'Workstation / PC'
                          ? 'bg-purple-600 text-white'
                          : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-purple-50'
                      }`}
                    >
                      💻 PCs ({depotCounts.pcs})
                    </button>
                    <button
                      type="button"
                      onClick={() => setDepotCategory('SIM')}
                      className={`shrink-0 rounded-lg px-2.5 py-1 font-bold transition active:scale-95 ${
                        depotCategory === 'SIM'
                          ? 'bg-teal-600 text-white'
                          : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-teal-50'
                      }`}
                    >
                      📱 SIMs ({depotCounts.sim})
                    </button>
                  </div>

                  {/* Available Depot Items Scrollable List */}
                  <div className="max-h-52 sm:max-h-60 overflow-y-auto space-y-1.5 pr-0.5">
                    {filteredDepotAssets.length === 0 ? (
                      <div className="p-4 text-center rounded-xl bg-white border border-neutral-200/80">
                        <p className="text-xs font-semibold text-neutral-600">
                          No matching hardware available in Central Depot.
                        </p>
                        {depotSearch.trim() && (
                          <button
                            type="button"
                            onClick={() => handleAddCustomRow(depotSearch)}
                            className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white px-3 py-1.5 text-xs font-bold transition shadow-xs active:scale-95"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Add "{depotSearch}" as Custom Item</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      filteredDepotAssets.map((depotItem) => {
                        const isPrinter = depotItem.category === 'Printer';
                        const isCord = depotItem.category === 'Extension Cord / Power' || depotItem.category === 'UPS / Power';
                        const isRouter = depotItem.category === 'Network Router' || depotItem.category === 'Network Switch';
                        const isPC = depotItem.category === 'Workstation / PC';

                        return (
                          <div
                            key={depotItem.id}
                            className="flex items-center justify-between p-2 sm:p-2.5 rounded-xl bg-white border border-neutral-200/90 hover:border-emerald-500 hover:shadow-xs transition"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              <div
                                className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${
                                  isPrinter
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : isCord
                                    ? 'bg-amber-50 text-amber-700'
                                    : isRouter
                                    ? 'bg-sky-50 text-sky-700'
                                    : isPC
                                    ? 'bg-purple-50 text-purple-700'
                                    : 'bg-neutral-100 text-neutral-700'
                                }`}
                              >
                                {isPrinter && <Printer className="h-4 w-4" />}
                                {isCord && <Plug className="h-4 w-4" />}
                                {isRouter && <Wifi className="h-4 w-4" />}
                                {isPC && <Monitor className="h-4 w-4" />}
                                {!isPrinter && !isCord && !isRouter && !isPC && <Package className="h-4 w-4" />}
                              </div>

                              <div className="min-w-0">
                                <div className="text-xs font-bold text-neutral-900 truncate">
                                  {depotItem.name}
                                </div>
                                <div className="text-[10px] text-neutral-500 font-mono flex items-center gap-1.5 truncate">
                                  <span className="font-semibold text-emerald-700">{depotItem.assetTag}</span>
                                  <span>•</span>
                                  <span>SN: {depotItem.serialNumber || 'N/A'}</span>
                                  {depotItem.brandModel && (
                                    <>
                                      <span>•</span>
                                      <span className="text-neutral-400">{depotItem.brandModel}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleAddDepotAsset(depotItem)}
                              className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 text-xs font-bold transition active:scale-95 cursor-pointer shadow-2xs"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>Add</span>
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Items Card List (Adaptive Mobile & Desktop Card Layout) */}
              <div className="space-y-2">
                {itemsList.map((row, idx) => {
                  const isDepotLinked = Boolean(row.assetId);

                  return (
                    <div
                      key={idx}
                      className={`rounded-xl border p-2.5 sm:p-3 shadow-2xs transition ${
                        isDepotLinked
                          ? 'border-emerald-300/80 bg-emerald-50/20'
                          : 'border-neutral-200/90 bg-white hover:border-neutral-300'
                      }`}
                    >
                      {/* Top Row: Item Title + Quantity + Remove */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="relative flex items-center">
                            <input
                              type="text"
                              value={row.itemEquipment}
                              onChange={(e) => handleUpdateItemRow(idx, 'itemEquipment', e.target.value)}
                              placeholder="Item / Equipment Name (e.g. EPSON L5190)"
                              className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-bold text-neutral-900 placeholder:text-neutral-400 focus:border-emerald-500 focus:outline-none uppercase"
                            />
                            {isDepotLinked && (
                              <span className="absolute right-2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-1.5 py-0.5 uppercase tracking-wide">
                                Depot Asset
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Quantity input */}
                        <div className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-1.5 py-0.5 shrink-0">
                          <span className="text-[10px] font-bold text-neutral-400 uppercase">Qty</span>
                          <input
                            type="number"
                            min={1}
                            value={row.quantity}
                            onChange={(e) => handleUpdateItemRow(idx, 'quantity', parseInt(e.target.value) || 1)}
                            className="w-9 text-center rounded bg-neutral-50 py-0.5 text-xs font-bold text-neutral-900 border border-neutral-200/80 outline-none"
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
                        <div className="flex items-center rounded-lg border border-neutral-200/80 bg-white px-2.5 py-1 focus-within:border-emerald-500">
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

                        <div className="flex items-center rounded-lg border border-neutral-200/80 bg-white px-2.5 py-1 focus-within:border-emerald-500">
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
                  );
                })}
              </div>
            </div>

          </div>

          {/* Fixed Sticky Footer (Always Visible on Mobile & Desktop!) */}
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
                Confirm Dispatch ({totalTransferCount} {totalTransferCount === 1 ? 'Item' : 'Items'}) & Print A5
              </span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
