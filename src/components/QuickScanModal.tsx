import React, { useState, useEffect, useRef } from 'react';
import { Scanner, useDevices } from '@yudiel/react-qr-scanner';
import type { IDetectedBarcode } from '@yudiel/react-qr-scanner';
import { Html5Qrcode } from 'html5-qrcode';
import type { AssetItem } from '../types/inventory';
import { X, Camera, RotateCcw, AlertCircle, Check, Plus, UploadCloud } from './HugeIcons';

// Crisp 2400Hz hardware laser scanner beep (audio/wav base64)
const SCANNER_BEEP_WAV =
  'data:audio/wav;base64,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';

interface QuickScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: AssetItem[];
  onFoundAsset: (asset: AssetItem) => void;
  onOpenAddWithSerial?: (serial: string) => void;
}

export const QuickScanModal: React.FC<QuickScanModalProps> = ({
  isOpen,
  onClose,
  assets,
  onFoundAsset,
  onOpenAddWithSerial,
}) => {
  const [scanInput, setScanInput] = useState('');
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null);
  const [foundAsset, setFoundAsset] = useState<AssetItem | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanningActive, setIsScanningActive] = useState(true);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get available hardware cameras (back, front, webcams)
  const devices = useDevices();

  // Prefer rear / environment camera by default on mobile devices
  useEffect(() => {
    if (devices && devices.length > 0 && !selectedDeviceId) {
      const backCam = devices.find((d) => /back|rear|environment/i.test(d.label));
      if (backCam) {
        setSelectedDeviceId(backCam.deviceId);
      } else {
        setSelectedDeviceId(devices[0].deviceId);
      }
    }
  }, [devices, selectedDeviceId]);

  // Crisp, loud hardware scanner beep (dual: HTML5 Audio + Web Audio fallback)
  const playBeep = () => {
    try {
      const audio = new Audio(SCANNER_BEEP_WAV);
      audio.volume = 0.95;
      audio.play().catch(() => {});
    } catch {}

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(2400, ctx.currentTime);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.09);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.09);
      }
    } catch {}
  };

  const lookupCode = (rawVal: string) => {
    const clean = rawVal.trim().toLowerCase();
    if (!clean) return;

    playBeep();

    const match = assets.find((a) => {
      const sn = (a.serialNumber || '').toLowerCase().trim();
      const tag = (a.assetTag || '').toLowerCase().trim();
      return (
        sn === clean ||
        tag === clean ||
        (clean.length >= 4 &&
          (sn.includes(clean) || tag.includes(clean) || clean.includes(sn) || clean.includes(tag)))
      );
    });

    if (match) {
      setNotFoundCode(null);
      setFoundAsset(match);
      setIsScanningActive(false);
      setTimeout(() => {
        onFoundAsset(match);
        onClose();
      }, 600);
    } else {
      setNotFoundCode(rawVal.trim());
      setFoundAsset(null);
    }
  };

  // Keyboard wedge / USB laser barcode scanner rapid listener
  useEffect(() => {
    if (!isOpen) return;

    // Auto-focus input for USB scanner guns and keyboards
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 150);

    return () => clearTimeout(timer);
  }, [isOpen]);

  // Handle Snapshot / Photo Upload scanning
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setCameraError(null);

    try {
      // 1. Try Native BarcodeDetector if available
      if ('BarcodeDetector' in window) {
        try {
          const detector = new (window as any).BarcodeDetector();
          const bitmap = await createImageBitmap(file);
          const results = await detector.detect(bitmap);
          if (results && results.length > 0 && results[0]?.rawValue) {
            lookupCode(results[0].rawValue);
            setIsProcessingFile(false);
            return;
          }
        } catch {
          // Fallback to Html5Qrcode file scan
        }
      }

      // 2. High-precision Html5Qrcode scanFile fallback
      const html5Scanner = new Html5Qrcode('himu-file-decode-sink');
      const decoded = await html5Scanner.scanFile(file, true);
      if (decoded) {
        lookupCode(decoded);
      } else {
        alert('Could not detect a clear barcode in this photo. Please try a closer, well-lit picture.');
      }
    } catch {
      alert('Could not detect a barcode in this image. Try focusing closer or typing the serial.');
    } finally {
      setIsProcessingFile(false);
      if (e.target) e.target.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      {/* Hidden container for file scan fallback */}
      <div id="himu-file-decode-sink" className="hidden" />

      <div className="relative w-full max-w-sm rounded-t-3xl sm:rounded-2xl bg-white border border-neutral-200 p-4 sm:p-5 shadow-2xl transition-all pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col space-y-3">
        {/* Mobile drag handle */}
        <div className="w-10 h-1 bg-neutral-300 rounded-full mx-auto sm:hidden" />

        {/* Minimal Header */}
        <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-900 text-white shadow-xs">
              <Camera className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Live Hardware Scanner</h3>
              <p className="text-[10px] text-neutral-400">QR Code • 1D Barcode • USB Laser Gun</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Camera Device Switcher (if multiple cameras available) */}
        {devices.length > 1 && (
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
              Lens:
            </span>
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="text-xs font-semibold text-neutral-800 bg-neutral-100 rounded-lg px-2 py-1 border border-neutral-200/80 focus:outline-none cursor-pointer max-w-[220px] truncate"
            >
              {devices.map((device, idx) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Camera Viewport Feed (Powered by WebAssembly & Hardware BarcodeDetector) */}
        <div className="relative overflow-hidden rounded-2xl bg-neutral-950 aspect-[4/3] flex items-center justify-center text-white border border-neutral-800 shadow-inner">
          {isScanningActive ? (
            <Scanner
              formats={[
                'qr_code',
                'code_128',
                'code_39',
                'code_93',
                'ean_13',
                'ean_8',
                'upc_a',
                'upc_e',
                'data_matrix',
              ]}
              constraints={{
                deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
                facingMode: selectedDeviceId ? undefined : 'environment',
                aspectRatio: { ideal: 1 },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              }}
              components={{
                finder: true,
                torch: true,
                zoom: true,
              }}
              styles={{
                container: {
                  width: '100%',
                  height: '100%',
                  borderRadius: '1rem',
                  overflow: 'hidden',
                },
                video: {
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: '1rem',
                },
              }}
              onScan={(results: IDetectedBarcode[]) => {
                if (results && results.length > 0 && results[0]?.rawValue) {
                  lookupCode(results[0].rawValue);
                }
              }}
              onError={(err) => {
                console.warn('[Scanner Error]:', err);
                setCameraError(err?.message || 'Camera stream unavailable');
              }}
              scanDelay={300}
            />
          ) : (
            <div className="p-4 text-center space-y-1">
              <Check className="h-8 w-8 text-emerald-400 mx-auto" />
              <div className="text-xs font-bold text-white">Code Verified</div>
            </div>
          )}

          {/* Camera Error / Permission Fallback Notice */}
          {cameraError && (
            <div className="p-4 text-center space-y-2 absolute inset-0 bg-neutral-950/90 flex flex-col items-center justify-center z-20">
              <AlertCircle className="h-6 w-6 text-amber-400" />
              <p className="text-xs text-neutral-300 font-semibold">Camera Access Restricted</p>
              <p className="text-[10px] text-neutral-400 max-w-[210px] leading-relaxed">
                Allow camera permissions in browser settings, or snap a photo of the barcode below.
              </p>
              <button
                onClick={() => {
                  setCameraError(null);
                  setIsScanningActive(true);
                }}
                className="inline-flex items-center gap-1 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs text-white transition active:scale-95 cursor-pointer mt-1"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Retry Camera</span>
              </button>
            </div>
          )}
        </div>

        {/* Photo Upload & Snapshot Fallback Action */}
        <div className="flex items-center justify-between text-[11px] px-1 text-neutral-500">
          <span>Camera slow or blurry?</span>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessingFile}
            className="inline-flex items-center gap-1 font-bold text-emerald-600 hover:text-emerald-700 transition cursor-pointer"
          >
            <UploadCloud className="h-3.5 w-3.5" />
            <span>{isProcessingFile ? 'Analyzing Photo...' : 'Upload Barcode Photo'}</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
        </div>

        {/* Match Result Banner */}
        {foundAsset && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-xs font-semibold text-emerald-900 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2 truncate">
              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
              <div className="truncate">
                <span className="font-bold text-emerald-950 block truncate">{foundAsset.name}</span>
                <span className="text-[10px] text-emerald-700 font-mono">{foundAsset.assetTag}</span>
              </div>
            </div>
            <span className="font-mono text-xs font-bold text-emerald-800 shrink-0 ml-2">
              {foundAsset.serialNumber}
            </span>
          </div>
        )}

        {/* Unmatched Code Notice with Quick Register Button */}
        {notFoundCode && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-2.5 flex items-center justify-between gap-2 text-xs animate-in fade-in">
            <div className="min-w-0">
              <div className="font-mono text-xs font-bold text-rose-900 truncate">{notFoundCode}</div>
              <div className="text-[10px] text-rose-600 font-medium">Not found in active inventory</div>
            </div>
            {onOpenAddWithSerial && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAddWithSerial(notFoundCode);
                }}
                className="rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white px-3 py-1.5 text-xs font-bold shrink-0 transition active:scale-95 cursor-pointer flex items-center gap-1 shadow-xs"
              >
                <Plus className="h-3 w-3" />
                <span>Register</span>
              </button>
            )}
          </div>
        )}

        {/* Manual Input Search & USB Scanner Gun Receiver */}
        <div className="flex gap-1.5 pt-1">
          <input
            ref={inputRef}
            type="text"
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') lookupCode(scanInput);
            }}
            placeholder="Type S/N, tag, or scan USB gun..."
            className="flex-1 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 font-mono text-xs text-neutral-900 focus:bg-white focus:outline-none focus:border-neutral-400 shadow-2xs"
          />
          <button
            onClick={() => lookupCode(scanInput)}
            className="rounded-xl bg-neutral-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-neutral-800 transition shrink-0 active:scale-95 cursor-pointer shadow-xs"
          >
            Find
          </button>
        </div>
      </div>
    </div>
  );
};
