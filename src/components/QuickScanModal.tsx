import React, { useState } from 'react';
import type { AssetItem } from '../types/inventory';
import { X, QrCode, Camera, AlertCircle } from './HugeIcons';

interface QuickScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: AssetItem[];
  onFoundAsset: (asset: AssetItem) => void;
}

export const QuickScanModal: React.FC<QuickScanModalProps> = ({
  isOpen,
  onClose,
  assets,
  onFoundAsset,
}) => {
  const [scanInput, setScanInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLookup = (value: string) => {
    const clean = value.trim().toLowerCase();
    if (!clean) return;

    const matched = assets.find(
      (a) =>
        a.serialNumber.toLowerCase() === clean ||
        a.assetTag.toLowerCase() === clean
    );

    if (matched) {
      setErrorMsg(null);
      onFoundAsset(matched);
      onClose();
    } else {
      setErrorMsg(`No equipment found matching "${value}". Verify serial number.`);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl bg-white border border-neutral-200/90 p-6 shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-black/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-900 text-white shadow-xs">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold tracking-tight text-neutral-900">
                Field Barcode Scanner
              </h3>
              <p className="text-xs text-neutral-500">
                Camera Viewfinder • Zero-Cost Native Scan
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

        {/* Viewfinder simulation */}
        <div className="my-5 relative overflow-hidden rounded-2xl bg-neutral-950 aspect-video flex flex-col items-center justify-center text-white border border-neutral-800 shadow-inner">
          <div className="relative flex flex-col items-center justify-center p-6 text-center">
            <div className="relative h-24 w-48 rounded-2xl border-2 border-dashed border-white/50 flex items-center justify-center">
              <div className="absolute inset-x-0 top-0 h-0.5 bg-blue-400 shadow-[0_0_14px_rgba(96,165,250,1)] animate-pulse" />
              <QrCode className="h-10 w-10 text-white/40" />
            </div>
            <p className="mt-3 text-[11px] text-neutral-400">
              Align camera lens over the printer, router, or PC barcode tag
            </p>
          </div>
        </div>

        {/* Manual Serial Input */}
        <div>
          <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
            Search or Type Hardware Serial Number:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={scanInput}
              onChange={(e) => {
                setScanInput(e.target.value);
                setErrorMsg(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleLookup(scanInput);
              }}
              placeholder="e.g. SN-882194"
              className="flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-2 font-mono text-xs text-neutral-800 shadow-xs focus:border-neutral-400 focus:outline-none"
            />
            <button
              onClick={() => handleLookup(scanInput)}
              className="rounded-xl bg-neutral-900 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition active:scale-95 shadow-xs"
            >
              Verify
            </button>
          </div>

          {errorMsg && (
            <div className="mt-2.5 flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
