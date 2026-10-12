import React, { useState, useEffect } from 'react';
import type { AssetItem, BarangayLocation, BorrowChecklistItem } from '../types/inventory';
import { DISPATCH_OFFICERS } from '../types/inventory';
import { X, ArrowRight, Printer, Plus } from './HugeIcons';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: AssetItem | null;
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
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  asset,
  locations,
  defaultDispatcherName,
  officers,
  onConfirmTransfer,
}) => {
  const officerList = officers && officers.length > 0 ? officers : (DISPATCH_OFFICERS as readonly string[]);
  const currentLocation = locations.find((l) => l.id === asset?.currentLocationId);
  const eligibleDestinations = locations.filter((l) => l.id !== asset?.currentLocationId);

  const [toLocationId, setToLocationId] = useState<string>(() => {
    const eligible = locations.filter((l) => l.id !== asset?.currentLocationId);
    return eligible[0]?.id || '';
  });

  const selectedDestination = locations.find((l) => l.id === toLocationId);
  const destinationCleanName = selectedDestination?.name?.replace(/^Barangay\s+/i, '') || 'BARANGAY';

  // Event & Profiling Activity
  const [selectedEventPreset, setSelectedEventPreset] = useState<string>('PhilHealth YAKAP Profiling');
  const [eventName, setEventName] = useState<string>('');
  const [requestingOffice, setRequestingOffice] = useState<string>('');
  const [borrowerName, setBorrowerName] = useState<string>('');

  // Auto-update event title and requesting office when destination or event preset changes
  useEffect(() => {
    if (selectedDestination) {
      setEventName(`${selectedEventPreset} ${destinationCleanName}`.toUpperCase());
      setRequestingOffice(`${selectedDestination.name} HEALTH CENTER`.toUpperCase());
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

  // Standard Accessories Quick Add Toggles
  const [includeExtensions, setIncludeExtensions] = useState<boolean>(() => asset?.category === 'Printer');
  const [includeRouter, setIncludeRouter] = useState<boolean>(false);

  // Helper to build initial item rows
  const createDefaultItems = (targetAsset: AssetItem | null): BorrowChecklistItem[] => {
    if (!targetAsset) return [];
    const list: BorrowChecklistItem[] = [
      {
        itemEquipment: (targetAsset.name || targetAsset.brandModel || 'IT EQUIPMENT').toUpperCase(),
        serialNo: targetAsset.serialNumber || 'N/A',
        quantity: 1,
        remarks: targetAsset.category === 'Printer' ? 'WITH POWER AND CABLE' : 'WITH POWER',
      },
    ];
    if (targetAsset.category === 'Printer') {
      list.push({
        itemEquipment: '2 EXTENSIONS',
        serialNo: 'N/A',
        quantity: 2,
        remarks: '',
      });
    }
    return list;
  };

  // Items Borrowed Checklist Rows (Matching 1-to-1 with A5 table)
  const [itemsList, setItemsList] = useState<BorrowChecklistItem[]>(() => createDefaultItems(asset));

  // Reset form state cleanly when a different asset is selected
  useEffect(() => {
    if (asset) {
      const eligible = locations.filter((l) => l.id !== asset.currentLocationId);
      setToLocationId(eligible[0]?.id || '');
      setIncludeExtensions(asset.category === 'Printer');
      setIncludeRouter(false);
      setItemsList(createDefaultItems(asset));
    }
  }, [asset?.id, locations]);

  // Non-destructive accessory toggles that preserve user edits and custom rows
  const handleToggleExtensions = (checked: boolean) => {
    setIncludeExtensions(checked);
    if (checked) {
      setItemsList((prev) => {
        if (prev.some((item) => item.itemEquipment.includes('EXTENSION'))) return prev;
        return [
          ...prev,
          {
            itemEquipment: '2 EXTENSIONS',
            serialNo: 'N/A',
            quantity: 2,
            remarks: '',
          },
        ];
      });
    } else {
      setItemsList((prev) => prev.filter((item) => !item.itemEquipment.includes('EXTENSION')));
    }
  };

  const handleToggleRouter = (checked: boolean) => {
    setIncludeRouter(checked);
    if (checked) {
      setItemsList((prev) => {
        if (prev.some((item) => item.itemEquipment.includes('ROUTER'))) return prev;
        return [
          ...prev,
          {
            itemEquipment: 'D-LINK WIFI ROUTER',
            serialNo: '',
            quantity: 1,
            remarks: 'WITH POWER',
          },
        ];
      });
    } else {
      setItemsList((prev) => prev.filter((item) => !item.itemEquipment.includes('ROUTER')));
    }
  };

  if (!isOpen || !asset) return null;

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

    const finalEventName = eventName.trim() || `${selectedEventPreset} ${destinationCleanName}`.toUpperCase();
    const finalOffice = requestingOffice.trim() || `${selectedDestination?.name || 'BARANGAY'} HEALTH CENTER`.toUpperCase();
    const finalBorrower = borrowerName.trim() || `${selectedDestination?.name || 'BARANGAY'} HEALTH CENTER STAFF`.toUpperCase();

    onConfirmTransfer(
      asset.id,
      toLocationId,
      finalEventName,
      dispatchedBy,
      finalBorrower,
      `A5 Borrowing Checklist generated for ${finalEventName}`,
      {
        eventName: finalEventName,
        requestingOffice: finalOffice,
        borrowerName: finalBorrower,
        borrowedAt: new Date(borrowedAt).toISOString(),
        borrowedItemsList: itemsList.filter((item) => item.itemEquipment.trim() !== ''),
      }
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-t-[32px] sm:rounded-3xl bg-white border-t sm:border border-neutral-200/90 p-5 sm:p-6 shadow-2xl transition-all max-h-[92vh] flex flex-col">
        
        {/* Mobile Native Drag Pill Handle */}
        <div className="w-12 h-1.5 bg-neutral-300 rounded-full mx-auto mb-2 shrink-0 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-black/[0.06] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm shrink-0">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold tracking-tight text-neutral-900">
                Event Equipment Borrowing & Dispatch
              </h3>
              <p className="text-[11px] sm:text-xs text-neutral-500 font-medium">
                Generates 1:1 Official A5 Borrowing Checklist Slip
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

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1 py-3 space-y-4 text-xs">
          
          {/* Visual Route Card */}
          <div className="rounded-2xl bg-neutral-50 p-3 border border-neutral-200/70 text-xs">
            <div className="flex items-center justify-between">
              <div className="truncate max-w-[190px]">
                <span className="text-[10px] text-neutral-400 block font-semibold uppercase">Origin</span>
                <span className="font-bold text-neutral-800 truncate block">
                  {currentLocation?.name}
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-emerald-600 shrink-0 mx-2" />
              <div className="truncate max-w-[190px] text-right">
                <span className="text-[10px] text-neutral-400 block font-semibold uppercase">Destination Barangay</span>
                <span className="font-extrabold text-emerald-700 truncate block">
                  {selectedDestination?.name || 'Select destination'}
                </span>
              </div>
            </div>
          </div>

          {/* Destination Barangay Selection */}
          <div>
            <label className="block font-bold text-neutral-800 mb-1">
              Destination Barangay / Health Station <span className="text-rose-500">*</span>
            </label>
            <select
              value={toLocationId}
              onChange={(e) => setToLocationId(e.target.value)}
              required
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 shadow-xs focus:border-emerald-500 focus:outline-none"
            >
              {eligibleDestinations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.district > 0 ? `District ${loc.district} • ` : ''}{loc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Event / Profiling Activity Preset Pills */}
          <div>
            <label className="block font-bold text-neutral-800 mb-1">
              Event / Profiling Activity <span className="text-rose-500">*</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
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
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
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
              placeholder="e.g. PHILHEALTH YAKAP PROFILING MARCELO GREEN"
              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-bold text-neutral-900 shadow-xs focus:border-emerald-500 focus:outline-none uppercase"
            />
          </div>

          {/* Requesting Office & Borrower Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-neutral-800 mb-1">
                Requesting Office / Unit
              </label>
              <input
                type="text"
                value={requestingOffice}
                onChange={(e) => setRequestingOffice(e.target.value)}
                placeholder="e.g. MARCELO GREEN HEALTH CENTER"
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 shadow-xs focus:border-emerald-500 focus:outline-none uppercase"
              />
            </div>

            <div>
              <label className="block font-bold text-neutral-800 mb-1">
                Borrower / Person Responsible
              </label>
              <input
                type="text"
                value={borrowerName}
                onChange={(e) => setBorrowerName(e.target.value)}
                placeholder="Name of health worker or nurse"
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 shadow-xs focus:border-emerald-500 focus:outline-none uppercase"
              />
            </div>
          </div>

          {/* Authorized Officer & Date Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-neutral-800 mb-1">
                Released by HIMU (IT Officer) <span className="text-rose-500">*</span>
              </label>
              <select
                value={dispatchedBy}
                onChange={(e) => setDispatchedBy(e.target.value)}
                required
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-bold text-neutral-900 shadow-xs focus:border-emerald-500 focus:outline-none"
              >
                {officerList.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-neutral-800 mb-1">
                Date & Time Borrowed <span className="text-rose-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={borrowedAt}
                onChange={(e) => setBorrowedAt(e.target.value)}
                required
                className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 shadow-xs focus:border-emerald-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Quick Accessories Bundles Checkboxes */}
          <div className="rounded-2xl bg-emerald-50/60 border border-emerald-200/80 p-3 space-y-2">
            <span className="text-[11px] font-extrabold uppercase text-emerald-950 block">
              Quick Accessories Check:
            </span>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-neutral-800">
                <input
                  type="checkbox"
                  checked={includeExtensions}
                  onChange={(e) => handleToggleExtensions(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Include 2x Extension Cords (Heavy Duty)</span>
              </label>

              <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-neutral-800">
                <input
                  type="checkbox"
                  checked={includeRouter}
                  onChange={(e) => handleToggleRouter(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Include Wi-Fi 6 Router</span>
              </label>
            </div>
          </div>

          {/* Items Table Builder */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-extrabold text-neutral-900 uppercase tracking-wider text-[11px]">
                Items Borrowed (A5 Checklist Table):
              </span>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800"
              >
                <Plus size={13} />
                <span>Add Item Row</span>
              </button>
            </div>

            <div className="border border-neutral-300 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full border-collapse text-[11px]">
                <thead className="bg-neutral-100 border-b border-neutral-300 font-bold uppercase text-neutral-700">
                  <tr>
                    <th className="p-1.5 text-left w-[36%]">Item / Equipment</th>
                    <th className="p-1.5 text-left w-[24%]">Serial #</th>
                    <th className="p-1.5 text-center w-[10%]">Qty</th>
                    <th className="p-1.5 text-left w-[24%]">Remarks</th>
                    <th className="p-1.5 text-center w-[6%]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 bg-white">
                  {itemsList.map((row, idx) => (
                    <tr key={idx}>
                      <td className="p-1">
                        <input
                          type="text"
                          value={row.itemEquipment}
                          onChange={(e) => handleUpdateItemRow(idx, 'itemEquipment', e.target.value)}
                          placeholder="e.g. EPSON L5190"
                          className="w-full px-1.5 py-1 rounded border border-neutral-200 text-[11px] font-bold uppercase"
                        />
                      </td>
                      <td className="p-1">
                        <input
                          type="text"
                          value={row.serialNo || ''}
                          onChange={(e) => handleUpdateItemRow(idx, 'serialNo', e.target.value)}
                          placeholder="SERIAL #"
                          className="w-full px-1.5 py-1 rounded border border-neutral-200 text-[11px] font-mono uppercase"
                        />
                      </td>
                      <td className="p-1 text-center">
                        <input
                          type="number"
                          min={1}
                          value={row.quantity}
                          onChange={(e) => handleUpdateItemRow(idx, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-12 mx-auto text-center px-1 py-1 rounded border border-neutral-200 text-[11px] font-bold"
                        />
                      </td>
                      <td className="p-1">
                        <input
                          type="text"
                          value={row.remarks || ''}
                          onChange={(e) => handleUpdateItemRow(idx, 'remarks', e.target.value)}
                          placeholder="WITH POWER..."
                          className="w-full px-1.5 py-1 rounded border border-neutral-200 text-[11px] uppercase font-medium"
                        />
                      </td>
                      <td className="p-1 text-center">
                        {itemsList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            className="text-neutral-400 hover:text-rose-600 font-bold px-1 transition"
                            title="Remove item"
                          >
                            ×
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bottom Form Actions */}
          <div className="pt-3 border-t border-black/[0.06] flex items-center justify-between gap-2.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 sm:py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition active:scale-95"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 sm:py-2 text-xs font-bold shadow-md transition active:scale-95 flex-1 sm:flex-initial"
            >
              <Printer className="h-4 w-4" />
              <span>Confirm & Generate A5</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
