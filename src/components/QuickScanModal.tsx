import React, { useState, useEffect, useRef } from 'react';
import { Scanner, useDevices } from '@yudiel/react-qr-scanner';
import type { IDetectedBarcode } from '@yudiel/react-qr-scanner';
import { Html5Qrcode } from 'html5-qrcode';
import type { AssetItem } from '../types/inventory';
import { 
  X, 
  Camera, 
  RotateCcw, 
  AlertCircle, 
  Check, 
  Plus, 
  UploadCloud, 
  ArrowRight, 
  Trash, 
  Package 
} from './HugeIcons';

// Crisp 2400Hz hardware laser scanner beep (audio/wav base64)
const SCANNER_BEEP_WAV =
  'data:audio/wav;base64,UklGRuQHAABXQVZFZm10IBAAAAABAAEAIlYAACJWAAABAAgAZGF0YcAHAAB/gIGCgX56eHl+hIqKhn10b3F6h5GUjX5vZmh1h5idlYJtXl5thZynn4lsV1NkgZ+vqpFvUklZep+3tptzT0BNcZ29wad6TjdAZpjAzLSEUDAzWZHC1sKQVSsnS4fB3tGeXCgbO3u84turZy4ZMm6x3uC3dDYZKmGl2OPBgUAcJFWZ0eXLjksfH0mMyeXTm1clGz9/v+PZp2MrGTVytd/fs3AzGS1lqdrivn09GyZZndTlyIpHHiBNkMzl0JdTIxxCg8Pk16NfKRo4drjh3a9sMRkvaa3c4bp4OhooXaHW5MSGRB0iUZXP5c2STyEdRojG5NWfWycaO3u84turZy4ZMm6x3uC3dDYZKmGl2OPBgUAcJFWZ0eXLjksfH0mMyeXTm1clGz9/v+PZp2MrGTVytd/fs3AzGS1lqdrivn09GyZZndTlyIpHHiBNkMzl0JdTIxxCg8Pk16NfKRo4drjh3a9sMRkvaa3c4bp4OhooXaHW5MSGRB0iUZXP5c2STyEdRojG5NWfWycaO3u84turZy4ZMm6x3uC3dDYZKmGl2OPBgUAcJFWZ0eXLjksfH0mMyeXTm1clGz9/v+PZp2MrGTVytd/fs3AzGS1lqdrivn09GyZZndTlyIpHHiBNkMzl0JdTIxxCg8Pk16NfKRo4drjh3a9sMRkvaa3c4bp4OhooXaHW5MSGRB0iUZXP5c2STyEdRojG5NWfWycaO3u84turZy4ZMm6x3uC3dDYZKmGl2OPBgUAcJFWZ0eXLjksfH0mMyeXTm1clGz9/v+PZp2MrGTVytd/fs3AzGS1lqdrivn09GyZZndTlyIpHHiBNkMzl0JdTIxxCg8Pk16NfKRo4drjh3a9sMRkvaa3c4bp4OhooXaHW5MSGRB0iUZXP5c2STyEdRojG5NWfWycaO3u84turZy4ZMm6x3uC3dDYZKmGl2OPBgUAcJFWZ0eXLjksfH0mMyeXTm1clGz9/v+PZp2MrGTVytd/fs3AzGS1lqdrivn09GyZZndTlyIpHHiBNkMzl0JdTIxxCg8Pk16NfKRo4drjh3a9sMRkvaa3c4bp4OhooXaHW5MSGRB0iUZXP5c2STyEdRojG5NWfWycaO3u84turZy4ZMm6x3uC3dDYZKmGl2OPBgUAcJFWZ0eXLjksfH0mMyeXTm1clGz9/v+PZp2MrGTVytd/fs3AzGS1lqdrivn09GyZZndTlyIpHHiBNkMzl0JdTIxxCg8Pk16NfKRo4drjh3a9sMRkvaa3c4bp4OhooXaHW5MSGRB0iUZXP5c2STyEdRojG5NWfWycaO3u84turZy4ZMm6x3uC3dDYZKmGl2OPBgUAcJFWZ0eXLjksfH0mMyeXTm1clGz9/v+PZp2MrGTVytd/fs3AzGS1lqdrivn09GyZZndTlyIpHHiBNkMzl0JdTIxxCg8Pk16NfKRo4drjh3a9sMRkvaa3c4bp4OhooXaHW5MSGRB0iUZXP5c2STyEdRojG5NWfWycaO3u84turZy4ZMm6x3uC3dDYZKmGl2OG/gUMiKliXydrBjFIuLlKKu9DBlWA6NE9/rca+m2xHPE93obu5nnZTRVFxlq+zn35fT1VtjaSrnYNpWVtshZqimodxY2JugJGYlId4bWtyfYmPjYZ8dnR3fYOGhYJ/fX1+';

interface QuickScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: AssetItem[];
  onFoundAsset: (asset: AssetItem) => void;
  onOpenAddWithSerial?: (serial: string) => void;
  // Multi-item continuous batch scanning
  scannedBatch?: AssetItem[];
  onUpdateScannedBatch?: (batch: AssetItem[]) => void;
  onProceedToBatchTransfer?: (batch: AssetItem[]) => void;
}

export const QuickScanModal: React.FC<QuickScanModalProps> = ({
  isOpen,
  onClose,
  assets,
  onFoundAsset,
  onOpenAddWithSerial,
  scannedBatch,
  onUpdateScannedBatch,
  onProceedToBatchTransfer,
}) => {
  // Mode: 'batch' for continuous scan & dispatch; 'single' for instant detail lookup
  const [scanMode, setScanMode] = useState<'batch' | 'single'>('batch');
  const [internalBatch, setInternalBatch] = useState<AssetItem[]>([]);
  const batchQueue = scannedBatch !== undefined ? scannedBatch : internalBatch;
  const updateBatch = onUpdateScannedBatch || setInternalBatch;

  const [scanInput, setScanInput] = useState('');
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null);
  const [singleFoundAsset, setSingleFoundAsset] = useState<AssetItem | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanningActive, setIsScanningActive] = useState(true);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  // Live floating scan notification banner over viewfinder
  const [scanToast, setScanToast] = useState<{
    type: 'success' | 'duplicate' | 'not_found';
    title: string;
    subtitle?: string;
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastScannedRef = useRef<{ code: string; time: number } | null>(null);
  const toastTimerRef = useRef<any>(null);

  // Get available hardware cameras
  const devices = useDevices();

  // Prefer rear / environment camera on mobile
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

  // Crisp hardware laser scanner beep (HTML5 Audio + Web Audio fallback)
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

  // Haptic feedback for tactile mobile response
  const triggerHaptic = (pattern: number | number[] = 60) => {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch {}
  };

  const showToast = (toast: { type: 'success' | 'duplicate' | 'not_found'; title: string; subtitle?: string }) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setScanToast(toast);
    toastTimerRef.current = setTimeout(() => {
      setScanToast(null);
    }, 2400);
  };

  const lookupCode = (rawVal: string) => {
    const clean = rawVal.trim().toLowerCase();
    if (!clean) return;

    // Prevent immediate bounce within 1.5s for identical code
    const now = Date.now();
    if (lastScannedRef.current && lastScannedRef.current.code === clean && now - lastScannedRef.current.time < 1500) {
      return;
    }
    lastScannedRef.current = { code: clean, time: now };

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
      playBeep();
      triggerHaptic(70);
      setNotFoundCode(null);

      // 1. Single Mode: open item history / detail modal
      if (scanMode === 'single') {
        setSingleFoundAsset(match);
        setIsScanningActive(false);
        setTimeout(() => {
          onFoundAsset(match);
          onClose();
        }, 500);
        return;
      }

      // 2. Batch Mode: add to dispatch queue without stopping camera
      if (batchQueue.some((item) => item.id === match.id)) {
        triggerHaptic([100, 50, 100]);
        showToast({
          type: 'duplicate',
          title: 'Already in Batch Queue',
          subtitle: `${match.name} (${match.assetTag})`,
        });
        return;
      }

      const nextBatch = [match, ...batchQueue];
      updateBatch(nextBatch);
      showToast({
        type: 'success',
        title: `✓ Queued for Transfer (${nextBatch.length})`,
        subtitle: `${match.name} • ${match.assetTag}`,
      });
    } else {
      triggerHaptic([150, 50, 150]);
      setNotFoundCode(rawVal.trim());
      showToast({
        type: 'not_found',
        title: 'Unregistered Barcode / Tag',
        subtitle: rawVal.trim(),
      });
    }
  };

  const handleRemoveFromBatch = (assetId: string) => {
    const next = batchQueue.filter((item) => item.id !== assetId);
    updateBatch(next);
  };

  const handleClearBatch = () => {
    updateBatch([]);
    setScanToast(null);
  };

  const handleProceedToTransfer = () => {
    if (batchQueue.length === 0) return;
    if (onProceedToBatchTransfer) {
      onProceedToBatchTransfer(batchQueue);
    } else {
      // Fallback: transfer first item if batch transfer callback not provided
      onFoundAsset(batchQueue[0]);
    }
    onClose();
  };

  // Keyboard wedge / USB laser barcode scanner listener
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // Handle Photo Upload / Snapshot
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setCameraError(null);

    try {
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
        } catch {}
      }

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

      <div className="relative w-full max-w-md max-h-[94vh] rounded-t-[32px] sm:rounded-3xl bg-white border border-neutral-200 p-4 sm:p-5 shadow-2xl transition-all pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col space-y-3 overflow-hidden">
        
        {/* Mobile drag handle */}
        <div className="w-12 h-1 bg-neutral-300 rounded-full mx-auto shrink-0 sm:hidden" />

        {/* Header with Mode Toggle */}
        <div className="flex items-center justify-between pb-2 border-b border-neutral-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-900 text-white shadow-xs">
              <Camera className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Live Hardware Scanner</h3>
              <p className="text-[10px] text-neutral-400">Continuous Camera • 1D/2D Barcodes • USB Guns</p>
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

        {/* Mode Switcher Segmented Control: Batch vs Single */}
        <div className="flex rounded-xl bg-neutral-100 p-1 text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setScanMode('batch')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
              scanMode === 'batch'
                ? 'bg-white text-emerald-800 font-bold shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <Package className="h-3.5 w-3.5" />
            <span>Multi-Scan Dispatch</span>
            {batchQueue.length > 0 && (
              <span className="rounded-full bg-emerald-600 px-1.5 py-0.2 text-[10px] font-mono font-bold text-white">
                {batchQueue.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setScanMode('single')}
            className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
              scanMode === 'single'
                ? 'bg-white text-neutral-900 font-bold shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <span>Single Item Detail</span>
          </button>
        </div>

        {/* Camera Switcher (if multiple cameras available) */}
        {devices.length > 1 && (
          <div className="flex items-center justify-between gap-2 px-1 shrink-0">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
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

        {/* Scrollable Scanner Body */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-0.5">
          {/* Camera Viewport Feed */}
          <div className="relative overflow-hidden rounded-2xl bg-neutral-950 aspect-[4/3] flex items-center justify-center text-white border border-neutral-800 shadow-inner shrink-0">
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
                scanDelay={280}
              />
            ) : (
              <div className="p-4 text-center space-y-1">
                <Check className="h-8 w-8 text-emerald-400 mx-auto" />
                <div className="text-xs font-bold text-white">Code Verified</div>
              </div>
            )}

            {/* Floating Live Scan Overlay Toast */}
            {scanToast && (
              <div
                className={`absolute top-3 left-3 right-3 z-30 rounded-2xl p-2.5 text-xs font-semibold shadow-xl backdrop-blur-md border animate-in slide-in-from-top duration-150 ${
                  scanToast.type === 'success'
                    ? 'bg-emerald-950/90 text-emerald-100 border-emerald-500/50'
                    : scanToast.type === 'duplicate'
                    ? 'bg-amber-950/90 text-amber-100 border-amber-500/50'
                    : 'bg-rose-950/90 text-rose-100 border-rose-500/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {scanToast.type === 'success' && <Check className="h-4 w-4 text-emerald-400 shrink-0" />}
                  {scanToast.type === 'duplicate' && <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />}
                  {scanToast.type === 'not_found' && <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <span className="font-bold block truncate">{scanToast.title}</span>
                    {scanToast.subtitle && (
                      <span className="text-[10px] opacity-80 block truncate font-mono">
                        {scanToast.subtitle}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Camera Error / Permission Fallback Notice */}
            {cameraError && (
              <div className="p-4 text-center space-y-2 absolute inset-0 bg-neutral-950/90 flex flex-col items-center justify-center z-20">
                <AlertCircle className="h-6 w-6 text-amber-400" />
                <p className="text-xs text-neutral-300 font-semibold">Camera Access Restricted</p>
                <p className="text-[10px] text-neutral-400 max-w-[210px] leading-relaxed">
                  Allow camera permissions in browser settings, or upload a photo below.
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

          {/* Single Mode Result Banner */}
          {scanMode === 'single' && singleFoundAsset && (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-xs font-semibold text-emerald-900 flex items-center justify-between animate-in fade-in">
              <div className="flex items-center gap-2 truncate">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <div className="truncate">
                  <span className="font-bold text-emerald-950 block truncate">{singleFoundAsset.name}</span>
                  <span className="text-[10px] text-emerald-700 font-mono">{singleFoundAsset.assetTag}</span>
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-emerald-800 shrink-0 ml-2">
                {singleFoundAsset.serialNumber}
              </span>
            </div>
          )}

          {/* Batch Mode: Continuous Scanned Staging Tray */}
          {scanMode === 'batch' && (
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50/90 p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-mono font-black text-white">
                    {batchQueue.length}
                  </span>
                  <span className="text-xs font-bold text-neutral-900">
                    Scanned Items in Cart
                  </span>
                </div>
                {batchQueue.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearBatch}
                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-0.5 transition cursor-pointer"
                  >
                    <Trash className="h-3 w-3" />
                    <span>Clear All</span>
                  </button>
                )}
              </div>

              {batchQueue.length === 0 ? (
                <div className="py-3 px-2 text-center rounded-xl bg-white border border-dashed border-neutral-300 text-neutral-400 text-xs">
                  Aim camera at hardware barcodes to keep queuing equipment
                </div>
              ) : (
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-0.5">
                  {batchQueue.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl bg-white border border-neutral-200/90 p-2 shadow-2xs gap-2"
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <span className="text-[10px] font-bold font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                          {item.assetTag}
                        </span>
                        <div className="truncate">
                          <span className="font-bold text-neutral-900 text-xs truncate block">{item.name}</span>
                          <span className="text-[10px] font-mono text-neutral-400 truncate block">
                            S/N: {item.serialNumber}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromBatch(item.id)}
                        className="h-6 w-6 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition shrink-0 cursor-pointer"
                        title="Remove from batch"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Primary Batch Action: Proceed to Destination Transfer */}
              <button
                type="button"
                disabled={batchQueue.length === 0}
                onClick={handleProceedToTransfer}
                className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-md active:scale-98 cursor-pointer ${
                  batchQueue.length > 0
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                    : 'bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none'
                }`}
              >
                <ArrowRight className="h-4 w-4" />
                <span>
                  {batchQueue.length > 0
                    ? `Proceed to Destination (${batchQueue.length} ${
                        batchQueue.length === 1 ? 'Item' : 'Items'
                      })`
                    : 'Scan Items to Transfer'}
                </span>
              </button>
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
        </div>

        {/* Manual Input Search & USB Scanner Gun Receiver */}
        <div className="flex gap-1.5 pt-1 border-t border-neutral-100 shrink-0">
          <input
            ref={inputRef}
            type="text"
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                lookupCode(scanInput);
                setScanInput('');
              }
            }}
            placeholder={scanMode === 'batch' ? 'Type S/N or gun to queue item...' : 'Type S/N, tag, or gun...'}
            className="flex-1 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 font-mono text-xs text-neutral-900 focus:bg-white focus:outline-none focus:border-neutral-400 shadow-2xs"
          />
          <button
            onClick={() => {
              lookupCode(scanInput);
              setScanInput('');
            }}
            className="rounded-xl bg-neutral-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-neutral-800 transition shrink-0 active:scale-95 cursor-pointer shadow-xs"
          >
            {scanMode === 'batch' ? 'Add' : 'Find'}
          </button>
        </div>
      </div>
    </div>
  );
};
