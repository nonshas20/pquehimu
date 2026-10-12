import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import type { AssetItem } from '../types/inventory';
import { X, Camera, AlertCircle, Check, Search, RotateCcw } from './HugeIcons';

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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'himu-barcode-scanner-viewport';

  // Play audio chime on successful scan
  const playScanBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.15);
    } catch {
      // AudioContext not allowed or not supported; ignore safely
    }
  };

  // Match scanned value against assets
  const matchAsset = (rawVal: string): AssetItem | null => {
    const clean = rawVal.trim().toLowerCase();
    if (!clean) return null;

    return (
      assets.find(
        (a) =>
          a.serialNumber.toLowerCase() === clean ||
          a.assetTag.toLowerCase() === clean ||
          clean.includes(a.serialNumber.toLowerCase()) ||
          clean.includes(a.assetTag.toLowerCase())
      ) || null
    );
  };

  const handleSuccessfulScan = (decodedText: string) => {
    setLastScannedCode(decodedText);
    playScanBeep();

    const matched = matchAsset(decodedText);
    if (matched) {
      setSuccessMsg(`Identified: ${matched.name} (${matched.serialNumber})`);
      setErrorMsg(null);
      setTimeout(() => {
        onFoundAsset(matched);
        onClose();
      }, 700);
    } else {
      setErrorMsg(`No hardware found with tag/serial "${decodedText}".`);
      setSuccessMsg(null);
    }
  };

  // Initialize and start live camera when modal opens
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isMounted = true;
    let html5QrCode: Html5Qrcode | null = null;

    const startCamera = async () => {
      setCameraError(null);
      setErrorMsg(null);
      setSuccessMsg(null);

      try {
        // Wait for DOM element to mount
        await new Promise((r) => setTimeout(r, 150));
        const el = document.getElementById(scannerContainerId);
        if (!el || !isMounted) return;

        html5QrCode = new Html5Qrcode(scannerContainerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.DATA_MATRIX,
          ],
          verbose: false,
        });

        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 15,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
              return {
                width: Math.floor(minEdge * 0.85),
                height: Math.floor(minEdge * 0.55),
              };
            },
            aspectRatio: 1.333,
          },
          (decodedText) => {
            if (isMounted) {
              handleSuccessfulScan(decodedText);
            }
          },
          () => {
            // Frame evaluation callback (no code found in frame, normal)
          }
        );

        if (isMounted) {
          setIsScanning(true);
        }
      } catch (err: any) {
        console.warn('[BarcodeScanner] Camera start error:', err);
        if (isMounted) {
          setCameraError(
            err?.message ||
              'Unable to access camera. Please allow camera permissions or enter the serial manually below.'
          );
          setIsScanning(false);
        }
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode
          .stop()
          .then(() => html5QrCode?.clear())
          .catch((e) => console.warn('[BarcodeScanner] Cleanup warning:', e));
      }
      setIsScanning(false);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleManualLookup = (value: string) => {
    const matched = matchAsset(value);
    if (matched) {
      setErrorMsg(null);
      setSuccessMsg(`Found: ${matched.name}`);
      playScanBeep();
      setTimeout(() => {
        onFoundAsset(matched);
        onClose();
      }, 500);
    } else {
      setLastScannedCode(value);
      setErrorMsg(`No equipment found matching "${value}". Verify serial number.`);
      setSuccessMsg(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-t-[32px] sm:rounded-3xl bg-white border-t sm:border border-neutral-200/90 p-5 sm:p-6 shadow-2xl transition-all pb-[max(1.25rem,env(safe-area-inset-bottom))] max-h-[92vh] flex flex-col">
        {/* Mobile Native Drag Pill Handle */}
        <div className="w-12 h-1.5 bg-neutral-300 rounded-full mx-auto mb-2.5 shrink-0 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-black/[0.06] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-neutral-900 text-white shadow-xs shrink-0">
              <Camera className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold tracking-tight text-neutral-900">
                Live Hardware Barcode & QR Scanner
              </h3>
              <p className="text-[11px] sm:text-xs text-neutral-500">
                1D Serial Barcodes • 2D QR Codes • Real-Time Lens
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

        {/* Scrollable Scanner Body */}
        <div className="flex-1 overflow-y-auto min-h-0 py-3 space-y-3">
          {/* Camera Viewport Container */}
          <div className="relative overflow-hidden rounded-2xl bg-neutral-950 min-h-[220px] sm:min-h-[240px] flex flex-col items-center justify-center text-white border border-neutral-800 shadow-inner">
            {/* HTML5 QR Code Mount Element */}
            <div
              id={scannerContainerId}
              className="w-full h-full min-h-[220px] sm:min-h-[240px] overflow-hidden rounded-2xl"
            />

            {/* Viewfinder Overlay Targeting Reticle */}
            {isScanning && !cameraError && (
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <div className="relative h-28 w-56 rounded-xl border-2 border-dashed border-emerald-400/80 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                  {/* Laser scan line animation */}
                  <div className="absolute inset-x-0 top-0 h-0.5 bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,1)] animate-pulse" />
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-300/80 bg-black/60 px-2 py-0.5 rounded-full backdrop-blur-xs">
                    Align Barcode or QR
                  </span>
                </div>
              </div>
            )}

            {/* Camera Error / Permission Fallback State */}
            {cameraError && (
              <div className="p-6 text-center max-w-xs space-y-2">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/20 text-rose-400">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <h4 className="text-xs font-bold text-white">Camera Access Notice</h4>
                <p className="text-[11px] text-neutral-400 leading-relaxed">
                  {cameraError}
                </p>
                <button
                  onClick={() => {
                    setCameraError(null);
                    window.location.reload();
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 text-xs font-semibold transition"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Retry Camera</span>
                </button>
              </div>
            )}
          </div>

          {/* Feedback alerts */}
          {successMsg && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold animate-in fade-in">
              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="space-y-2 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs">
              <div className="flex items-center gap-2 font-bold">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
              {onOpenAddWithSerial && lastScannedCode && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenAddWithSerial(lastScannedCode);
                  }}
                  className="w-full mt-1.5 rounded-xl bg-rose-900 hover:bg-rose-800 text-white py-1.5 px-3 font-semibold text-[11px] transition text-center block"
                >
                  + Register New Asset with Serial "{lastScannedCode}"
                </button>
              )}
            </div>
          )}

          {/* Manual Input Search Fallback */}
          <div className="pt-1">
            <label className="block text-[11px] font-semibold text-neutral-600 mb-1">
              Or Type Serial / Tag Directly (or Scan with USB Laser Gun):
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <input
                  type="text"
                  value={scanInput}
                  onChange={(e) => {
                    setScanInput(e.target.value);
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleManualLookup(scanInput);
                  }}
                  placeholder="e.g. SN-EPS-2026-8812"
                  className="w-full rounded-xl border border-neutral-200 bg-white pl-9 pr-3 py-2.5 sm:py-2 font-mono text-xs text-neutral-900 shadow-xs focus:border-neutral-400 focus:outline-none min-h-[44px] sm:min-h-0"
                />
              </div>
              <button
                onClick={() => handleManualLookup(scanInput)}
                className="rounded-xl bg-neutral-900 px-4 py-2.5 sm:py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition active:scale-95 shadow-xs min-h-[44px] sm:min-h-0 shrink-0"
              >
                Lookup
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
