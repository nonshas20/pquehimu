import React, { useState } from 'react';
import type { AssetItem, BarangayLocation, AssetTransferRecord } from '../types/inventory';
import { 
  X, 
  ArrowRightLeft, 
  Clock, 
  FileText, 
  Copy, 
  Check, 
  MapPin,
  Printer,
  Trash
} from './HugeIcons';

interface AssetDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: AssetItem | null;
  locations: BarangayLocation[];
  onOpenTransfer: (asset: AssetItem) => void;
  onAcknowledgeReceipt: (assetId: string) => void;
  onViewChecklist?: (record: AssetTransferRecord) => void;
  onDeleteAsset?: (assetId: string) => void;
}

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({
  isOpen,
  onClose,
  asset,
  locations,
  onOpenTransfer,
  onAcknowledgeReceipt,
  onViewChecklist,
  onDeleteAsset,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !asset) return null;

  const currentLoc = locations.find((l) => l.id === asset.currentLocationId);

  const handleCopySerial = () => {
    navigator.clipboard.writeText(asset.serialNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col rounded-t-[32px] sm:rounded-3xl bg-white border-t sm:border border-neutral-200/90 shadow-2xl transition-all overflow-hidden">
        
        {/* Mobile Native Drag Pill Handle */}
        <div className="w-12 h-1.5 bg-neutral-300 rounded-full mx-auto my-2.5 shrink-0 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 pb-3 sm:pb-4 border-b border-black/[0.06] shrink-0">
          <div className="min-w-0 pr-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-600 bg-white/80 px-2 py-0.5 rounded border border-black/5">
                {asset.assetTag}
              </span>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                asset.status === 'in_service' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                asset.status === 'in_transit' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                asset.status === 'under_repair' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                'bg-neutral-100 text-neutral-700'
              }`}>
                {asset.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>
            <h3 className="mt-1 text-base sm:text-lg font-bold tracking-tight text-neutral-900 truncate">
              {asset.name}
            </h3>
            <p className="text-xs text-neutral-500 font-medium truncate">
              {asset.brandModel}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition active:scale-95 shrink-0"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          
          {/* Quick Action banner if In-Transit */}
          {asset.status === 'in_transit' && (
            <div className="flex items-center justify-between rounded-2xl bg-blue-50/90 border border-blue-200 p-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shrink-0">
                  <ArrowRightLeft className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="font-bold text-blue-950">
                    Hardware In Transit
                  </div>
                  <div className="text-[11px] text-blue-700">
                    Awaiting arrival verification.
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  onAcknowledgeReceipt(asset.id);
                  onClose();
                }}
                className="rounded-xl bg-blue-600 px-3.5 py-1.5 font-bold text-white shadow-xs hover:bg-blue-700 transition active:scale-95 shrink-0"
              >
                Acknowledge Receipt
              </button>
            </div>
          )}

          {/* Hardware Specifications Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-2xl bg-white/70 p-4 border border-white/60 shadow-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-neutral-400">Hardware Serial</span>
              <div className="mt-0.5 flex items-center gap-1 font-mono font-semibold text-neutral-800">
                <span>{asset.serialNumber}</span>
                <button
                  onClick={handleCopySerial}
                  className="text-neutral-400 hover:text-neutral-700"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                </button>
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-neutral-400">Category</span>
              <div className="mt-0.5 font-semibold text-neutral-800">
                {asset.category}
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-neutral-400">Current Location</span>
              <div className="mt-0.5 font-semibold text-neutral-800 truncate flex items-center gap-1">
                <MapPin className="h-3 w-3 text-neutral-400 shrink-0" />
                <span className="truncate">{currentLoc ? currentLoc.name : 'Unknown'}</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-neutral-400">Custodian</span>
              <div className="mt-0.5 font-semibold text-neutral-800 truncate">
                {asset.custodianName}
              </div>
              <div className="text-[10px] text-neutral-400 truncate">{asset.custodianRole}</div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-neutral-400">Acquisition Date</span>
              <div className="mt-0.5 font-semibold text-neutral-800">
                {asset.acquisitionDate}
              </div>
            </div>

            {asset.ipAddress && (
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400">IP Address</span>
                <div className="mt-0.5 font-mono font-semibold text-neutral-800">
                  {asset.ipAddress}
                </div>
              </div>
            )}
          </div>

          {asset.notes && (
            <div className="rounded-2xl bg-white/70 p-3.5 border border-white/60 text-neutral-600">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block mb-1">
                Field Notes & Condition
              </span>
              {asset.notes}
            </div>
          )}

          {/* Chain of Custody & Movement History Timeline */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-neutral-600" />
                <h4 className="text-sm font-bold tracking-tight text-neutral-900">
                  HIMU Chain-of-Custody Audit Trail ({asset.history.length})
                </h4>
              </div>
              <span className="text-[11px] text-neutral-400">
                Official Movement History
              </span>
            </div>

            {asset.history.length === 0 ? (
              <div className="p-4 rounded-2xl bg-white/60 text-center text-neutral-400 text-xs">
                No transfer records logged yet.
              </div>
            ) : (
              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-200">
                {asset.history.map((record) => (
                  <div key={record.id} className="relative group">
                    {/* Timeline dot */}
                    <div className={`absolute -left-6 top-1.5 h-4 w-4 rounded-full border-2 bg-white flex items-center justify-center ${
                      record.status === 'received' ? 'border-emerald-500' :
                      record.status === 'in_transit' ? 'border-blue-500 animate-pulse' :
                      'border-neutral-400'
                    }`}>
                      <div className={`h-1.5 w-1.5 rounded-full ${
                        record.status === 'received' ? 'bg-emerald-500' :
                        record.status === 'in_transit' ? 'bg-blue-500' :
                        'bg-neutral-400'
                      }`} />
                    </div>

                    {/* Transfer Details Card */}
                    <div className="rounded-2xl border border-black/[0.06] bg-white/80 p-3.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">
                          {record.referenceNo}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-medium">
                          {new Date(record.dispatchedAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>

                      <div className="mt-1.5 flex items-center gap-2 text-xs font-semibold text-neutral-900">
                        <span className="truncate max-w-[150px]">{record.fromLocationName}</span>
                        <span className="text-neutral-400">→</span>
                        <span className="text-blue-700 truncate max-w-[150px]">{record.toLocationName}</span>
                      </div>

                      <div className="mt-1 text-xs text-neutral-600">
                        <strong>Purpose:</strong> {record.purpose}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-500 border-t border-black/[0.04] pt-2">
                        <div className="flex flex-wrap items-center gap-3">
                          <span>Dispatched by: <strong className="text-neutral-800">{record.dispatchedBy}</strong></span>
                          {record.receivedBy && (
                            <span>Received by: <strong className="text-neutral-800">{record.receivedBy}</strong></span>
                          )}
                        </div>

                        {onViewChecklist && (
                          <button
                            type="button"
                            onClick={() => onViewChecklist(record)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 transition active:scale-95"
                          >
                            <Printer className="h-3 w-3" />
                            <span>View A5 Slip</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-4 sm:px-6 border-t border-black/[0.06] bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] shrink-0">
          <div className="flex items-center gap-2 flex-1 sm:flex-initial">
            <button
              onClick={() => {
                if (asset.history.length > 0 && onViewChecklist) {
                  onViewChecklist(asset.history[0]);
                } else {
                  window.print();
                }
              }}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 px-3.5 py-2.5 sm:py-2 text-xs font-bold hover:bg-emerald-100 transition active:scale-95 shadow-2xs"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>A5 Borrow Slip</span>
            </button>

            <button
              onClick={() => {
                window.print();
              }}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 sm:py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition active:scale-95"
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Print PAR</span>
            </button>
          </div>

          <div className="flex items-center gap-2 justify-end">
            {onDeleteAsset && (
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      `Are you sure you want to permanently delete "${asset.name}" (SN: ${asset.serialNumber || 'N/A'})? This cannot be undone.`
                    )
                  ) {
                    onDeleteAsset(asset.id);
                    onClose();
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-2 text-xs font-bold transition active:scale-95 cursor-pointer"
                title="Permanently delete asset from database"
              >
                <Trash className="h-3.5 w-3.5" />
                <span>Delete</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 sm:py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition active:scale-95"
            >
              Close
            </button>
            <button
              onClick={() => {
                onClose();
                onOpenTransfer(asset);
              }}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 rounded-xl bg-neutral-900 px-4 py-2.5 sm:py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition active:scale-95"
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              <span>Transfer Item</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
