import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import type { AssetItem } from '../types/inventory';
import { X, Camera, RotateCcw, AlertCircle, Check } from './HugeIcons';

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
  const [isCameraActive, setIsCameraActive] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerId = useRef(`himu-scanner-${Math.random().toString(36).substring(2, 8)}`).current;

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
        (clean.length >= 4 && (sn.includes(clean) || tag.includes(clean) || clean.includes(sn) || clean.includes(tag)))
      );
    });

    if (match) {
      setNotFoundCode(null);
      setFoundAsset(match);
      setTimeout(() => {
        onFoundAsset(match);
        onClose();
      }, 500);
    } else {
      setNotFoundCode(rawVal.trim());
      setFoundAsset(null);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    let html5QrCode: Html5Qrcode | null = null;

    // Focus input so USB barcode scanners and keyboards work immediately
    const focusTimer = setTimeout(() => {
      inputRef.current?.focus();
    }, 150);

    const initCamera = async () => {
      setCameraError(null);
      setNotFoundCode(null);
      setFoundAsset(null);
      setIsCameraActive(false);

      try {
        await new Promise((r) => setTimeout(r, 100));
        const el = document.getElementById(containerId);
        if (!el || !isMounted) return;

        html5QrCode = new Html5Qrcode(containerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.CODE_93,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.DATA_MATRIX,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.CODABAR,
            Html5QrcodeSupportedFormats.PDF_417,
          ],
          verbose: false,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
        });

        scannerRef.current = html5QrCode;

        const scanConfig = {
          fps: 20,
          qrbox: (w: number, h: number) => {
            const edge = Math.min(w, h);
            return {
              width: Math.max(Math.floor(edge * 0.85), 200),
              height: Math.max(Math.floor(edge * 0.55), 140),
            };
          },
        };

        const onScanSuccess = (decoded: string) => {
          if (isMounted) lookupCode(decoded);
        };

        // 3-tier camera startup cascade (works on mobile back camera, laptops, and webcams)
        let started = false;

        // Tier 1: Query actual available hardware camera devices
        try {
          const cameras = await Html5Qrcode.getCameras();
          if (cameras && cameras.length > 0) {
            const backCam = cameras.find((c) => /back|rear|environment/i.test(c.label));
            const targetCamId = backCam ? backCam.id : cameras[0].id;
            await html5QrCode.start(targetCamId, scanConfig, onScanSuccess, () => {});
            started = true;
          }
        } catch {
          // Camera query failed or unsupported, continue to facingMode fallback
        }

        // Tier 2: Try facingMode environment
        if (!started && isMounted) {
          try {
            await html5QrCode.start({ facingMode: 'environment' }, scanConfig, onScanSuccess, () => {});
            started = true;
          } catch {
            // Environment camera not available, continue to user front camera
          }
        }

        // Tier 3: Try facingMode user (standard laptop / PC webcam)
        if (!started && isMounted) {
          try {
            await html5QrCode.start({ facingMode: 'user' }, scanConfig, onScanSuccess, () => {});
            started = true;
          } catch (err: any) {
            if (isMounted) {
              setCameraError(err?.message || 'Camera stream not permitted or unavailable.');
            }
          }
        }

        if (started && isMounted) {
          setIsCameraActive(true);
        }
      } catch (err: any) {
        if (isMounted) {
          setCameraError(err?.message || 'Camera unavailable');
        }
      }
    };

    initCamera();

    return () => {
      isMounted = false;
      clearTimeout(focusTimer);
      if (html5QrCode) {
        try {
          if (html5QrCode.isScanning) {
            html5QrCode
              .stop()
              .then(() => html5QrCode?.clear())
              .catch(() => {});
          } else {
            html5QrCode.clear();
          }
        } catch {}
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm rounded-t-3xl sm:rounded-2xl bg-white border border-neutral-200 p-4 sm:p-5 shadow-2xl transition-all pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col space-y-3">
        
        {/* Mobile handle */}
        <div className="w-10 h-1 bg-neutral-300 rounded-full mx-auto sm:hidden" />

        {/* Minimal Header */}
        <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-900 text-white">
              <Camera className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Scanner</h3>
              <p className="text-[10px] text-neutral-400">1D Barcode • 2D QR • USB Gun</p>
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

        {/* Camera Viewport Feed */}
        <div className="relative overflow-hidden rounded-xl bg-neutral-950 aspect-[4/3] flex items-center justify-center text-white border border-neutral-800">
          <div id={containerId} className="w-full h-full overflow-hidden rounded-xl" />

          {/* Active scanning targeting laser */}
          {isCameraActive && !foundAsset && (
            <div className="pointer-events-none absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,1)] animate-pulse" />
          )}

          {/* Camera Error / Permission Fallback Notice */}
          {cameraError && (
            <div className="p-4 text-center space-y-2 absolute inset-0 bg-neutral-950/90 flex flex-col items-center justify-center">
              <AlertCircle className="h-6 w-6 text-amber-400" />
              <p className="text-xs text-neutral-300 font-medium">Camera Not Available</p>
              <p className="text-[10px] text-neutral-400 max-w-[200px]">
                You can still scan barcodes using a USB scanner gun or type the serial below.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-xs text-white hover:bg-white/20 transition mt-1"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Retry</span>
              </button>
            </div>
          )}
        </div>

        {/* Match Result Banner */}
        {foundAsset && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-900 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-1.5 truncate">
              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
              <span className="truncate">{foundAsset.name}</span>
            </div>
            <span className="font-mono text-[11px] text-emerald-700 shrink-0 ml-2">{foundAsset.serialNumber}</span>
          </div>
        )}

        {/* Unmatched Code Notice */}
        {notFoundCode && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 flex items-center justify-between gap-2 text-xs">
            <div className="min-w-0">
              <div className="font-mono text-xs font-bold text-rose-900 truncate">{notFoundCode}</div>
              <div className="text-[10px] text-rose-600">Not found in inventory</div>
            </div>
            {onOpenAddWithSerial && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAddWithSerial(notFoundCode);
                }}
                className="rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white px-2.5 py-1 text-xs font-bold shrink-0 transition"
              >
                + Register
              </button>
            )}
          </div>
        )}

        {/* Manual Input Search & USB Scanner Receiver */}
        <div className="flex gap-1.5 pt-1">
          <input
            ref={inputRef}
            type="text"
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') lookupCode(scanInput);
            }}
            placeholder="Type serial or scan with USB gun..."
            className="flex-1 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 font-mono text-xs text-neutral-900 focus:bg-white focus:outline-none focus:border-neutral-400"
          />
          <button
            onClick={() => lookupCode(scanInput)}
            className="rounded-xl bg-neutral-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-neutral-800 transition shrink-0 active:scale-95"
          >
            Find
          </button>
        </div>
      </div>
    </div>
  );
};
