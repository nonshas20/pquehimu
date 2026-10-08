import React, { useState } from 'react';
import type { AssetItem } from '../types/inventory';
import { X, QrCode, Camera, AlertCircle } from 'lucide-react';

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
      setErrorMsg(`No hardware found with serial or tag "${value}".`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-neutral-900 text-white">
              <Camera className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-tight text-neutral-900">
                Field Barcode & Tag Scanner
              </h3>
              <p className="text-[11px] text-neutral-400">
                Zero-cost native browser camera scanner
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
        <div className="my-5 relative overflow-hidden rounded-2xl bg-neutral-950 aspect-video flex flex-col items-center justify-center text-white border border-neutral-800">
          <div className="relative flex flex-col items-center justify-center p-6 text-center">
            <div className="relative h-24 w-48 rounded-xl border-2 border-dashed border-white/50 flex items-center justify-center">
              <div className="absolute inset-x-0 top-0 h-0.5 bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,0.8)] animate-pulse" />
              <QrCode className="h-10 w-10 text-white/40" />
            </div>
            <p className="mt-3 text-[11px] text-neutral-400">
              Align camera over the printer or router asset barcode
            </p>
          </div>
        </div>

        {/* Quick Test Demo Chips */}
        <div>
          <span className="text-[10px] uppercase font-semibold text-neutral-400 block mb-1.5">
            Quick-Simulate Physical Scan:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {assets.slice(0, 3).map((a) => (
              <button
                key={a.id}
                onClick={() => handleLookup(a.serialNumber)}
                className="rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1 font-mono text-[11px] text-neutral-700 hover:bg-neutral-900 hover:text-white transition"
              >
                {a.serialNumber}
              </button>
            ))}
          </div>
        </div>

        {/* Manual Serial Input */}
        <div className="mt-4">
          <label className="block text-[11px] font-medium text-neutral-600 mb-1">
            Or Type Serial / Tag Manually:
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
              placeholder="e.g. X8TY2918402"
              className="flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 font-mono text-xs text-neutral-800 shadow-xs focus:border-neutral-400 focus:outline-none"
            />
            <button
              onClick={() => handleLookup(scanInput)}
              className="rounded-xl bg-neutral-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 transition"
            >
              Verify
            </button>
          </div>

          {errorMsg && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-600">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
