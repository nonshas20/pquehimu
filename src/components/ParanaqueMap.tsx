import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import type { BarangayLocation, AssetItem, AssetCategory } from '../types/inventory';
import PARANAQUE_GEOJSON from '../data/paranaque-barangays.json';
import { 
  Maximize2, 
  Minimize2, 
  RotateCcw,
  X,
  ArrowRightLeft,
  Plus,
  Copy,
  Check,
  Layers,
  Sparkles
} from 'lucide-react';
import {
  PrinterSvg,
  RouterSvg,
  ExtensionCordSvg,
  ComputerSvg,
  getPrinterMarkerSvg,
  getRouterMarkerSvg,
  getExtensionCordMarkerSvg,
  getComputerMarkerSvg
} from './HardwareSvgIcons';

interface ParanaqueMapProps {
  locations: BarangayLocation[];
  assets: AssetItem[];
  selectedLocationId: string | null;
  onSelectLocation: (locationId: string | null) => void;
  onOpenTransfer?: (asset: AssetItem) => void;
  onOpenAddModal?: (locationId?: string) => void;
  onDeployKit?: (locationId: string) => void;
  onDeployAllKits?: () => void;
}

const ESRI_LIGHT_TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';

const normalizeName = (str: string) => {
  return str
    .toLowerCase()
    .replace(/ñ/g, 'n')
    .replace(/\bsto\b\.?/g, 'santo')
    .replace(/\bsta\b\.?/g, 'santa')
    .replace(/\bsn\b\.?/g, 'san')
    .replace(/\bbf main\b/g, 'bf homes')
    .replace(/village/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
};

export const ParanaqueMap: React.FC<ParanaqueMapProps> = ({
  locations,
  assets,
  selectedLocationId,
  onSelectLocation,
  onOpenTransfer,
  onOpenAddModal,
  onDeployKit,
  onDeployAllKits,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const markerGroupRef = useRef<L.LayerGroup | null>(null);

  const [isExpanded, setIsExpanded] = useState(false);
  const [filterCategory, setFilterCategory] = useState<'ALL' | AssetCategory>('ALL');
  const [copiedSerial, setCopiedSerial] = useState<string | null>(null);

  // Selected Location and its assets
  const selectedLocation = useMemo(() => {
    return locations.find((l) => l.id === selectedLocationId) || null;
  }, [locations, selectedLocationId]);

  const selectedLocAssets = useMemo(() => {
    if (!selectedLocationId) return [];
    return assets.filter((a) => a.currentLocationId === selectedLocationId);
  }, [assets, selectedLocationId]);

  // Overall equipment counts
  const totalPrinters = useMemo(() => assets.filter((a) => a.category === 'Printer').length, [assets]);
  const totalRouters = useMemo(() => assets.filter((a) => a.category === 'Network Router' || a.category === 'Network Switch').length, [assets]);
  const totalCords = useMemo(() => assets.filter((a) => a.category === 'Extension Cord / Power' || a.category === 'UPS / Power').length, [assets]);
  const totalComputers = useMemo(() => assets.filter((a) => a.category === 'Workstation / PC').length, [assets]);

  // Location stats mapping
  const locationStats = useMemo(() => {
    const map = new Map<string, { 
      count: number; 
      inTransit: number;
      printers: number;
      routers: number;
      cords: number;
      computers: number;
      loc: BarangayLocation;
    }>();

    locations.forEach((loc) => {
      const locAssets = assets.filter((a) => a.currentLocationId === loc.id);
      const inTransit = locAssets.filter((a) => a.status === 'in_transit').length;
      const printers = locAssets.filter((a) => a.category === 'Printer').length;
      const routers = locAssets.filter((a) => a.category === 'Network Router' || a.category === 'Network Switch').length;
      const cords = locAssets.filter((a) => a.category === 'Extension Cord / Power' || a.category === 'UPS / Power').length;
      const computers = locAssets.filter((a) => a.category === 'Workstation / PC').length;

      map.set(loc.id, {
        count: locAssets.length,
        inTransit,
        printers,
        routers,
        cords,
        computers,
        loc,
      });
    });
    return map;
  }, [locations, assets]);

  // Match GeoJSON feature to BarangayLocation
  const findLocationByFeature = (featureName: string) => {
    const norm = normalizeName(featureName);
    return locations.find((l) => {
      const normLoc = normalizeName(l.name);
      return normLoc === norm || normLoc.includes(norm) || normLoc.includes(normLoc);
    });
  };

  const handleCopySerial = (serial: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(serial);
    setCopiedSerial(serial);
    setTimeout(() => setCopiedSerial(null), 1800);
  };

  // Lock body scroll and handle Escape key for true Fullscreen mode
  useEffect(() => {
    if (isExpanded) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsExpanded(false);
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [isExpanded]);

  // Recalculate Leaflet tile dimensions whenever expanded state toggles
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize({ animate: true });
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [isExpanded]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      minZoom: 11.5,
      maxZoom: 16.5,
      scrollWheelZoom: true,
      dragging: true,
    }).setView([14.484, 121.012], 12.4);

    mapRef.current = map;

    // Add Esri Light Gray Canvas tiles
    L.tileLayer(ESRI_LIGHT_TILE_URL, {
      maxZoom: 18,
      attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    }).addTo(map);

    // Zoom Controls repositioned to bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Layer group for hardware pod markers
    const markerGroup = L.layerGroup().addTo(map);
    markerGroupRef.current = markerGroup;

    // Handle container resize
    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize({ animate: false });
      }
    });

    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update GeoJSON Polygons and Hardware SVG Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (geoJsonLayerRef.current) {
      map.removeLayer(geoJsonLayerRef.current);
    }

    if (markerGroupRef.current) {
      markerGroupRef.current.clearLayers();
    }

    const geoJsonLayer = L.geoJSON(PARANAQUE_GEOJSON as any, {
      style: (feature) => {
        if (!feature) return {};
        const loc = findLocationByFeature(feature.properties?.name || '');
        const isSelected = loc && selectedLocationId === loc.id;
        const stats = loc ? locationStats.get(loc.id) : null;
        
        // Check filter match
        let matchesFilter = true;
        if (filterCategory === 'Printer') matchesFilter = (stats?.printers || 0) > 0;
        else if (filterCategory === 'Network Router') matchesFilter = (stats?.routers || 0) > 0;
        else if (filterCategory === 'Extension Cord / Power') matchesFilter = (stats?.cords || 0) > 0;
        else if (filterCategory === 'Workstation / PC') matchesFilter = (stats?.computers || 0) > 0;

        const count = stats?.count || 0;

        let fillColor = 'rgba(241, 245, 249, 0.7)';
        let strokeColor = 'rgba(148, 163, 184, 0.7)';
        let fillOpacity = 0.65;

        if (count > 0 && matchesFilter) {
          fillColor = 'rgba(16, 185, 129, 0.4)'; // Emerald for active deployed barangays
          strokeColor = '#059669';
          fillOpacity = 0.8;
        } else if (count > 0 && !matchesFilter) {
          fillColor = 'rgba(226, 232, 240, 0.5)';
          strokeColor = '#94A3B8';
          fillOpacity = 0.4;
        }

        if (isSelected) {
          fillColor = 'rgba(15, 23, 42, 0.9)'; // Dark slate highlight
          strokeColor = '#0F172A';
          fillOpacity = 0.92;
        }

        return {
          fillColor,
          fillOpacity,
          color: isSelected ? '#0F172A' : strokeColor,
          weight: isSelected ? 3 : 1.5,
          dashArray: isSelected ? undefined : '3, 3',
        };
      },
      onEachFeature: (feature, layer) => {
        const featureName = feature.properties?.name || 'Barangay';
        const loc = findLocationByFeature(featureName);
        if (!loc) return;

        const stats = locationStats.get(loc.id);
        const centroid = (layer as any).getBounds().getCenter();

        // 1. Polygon interaction
        layer.on({
          click: () => {
            onSelectLocation(loc.id);
            map.flyTo(centroid, Math.max(map.getZoom(), 13.5), { duration: 0.8 });
          },
          mouseover: (e) => {
            const l = e.target as L.Path;
            if (loc.id !== selectedLocationId) {
              l.setStyle({
                weight: 2.5,
                fillOpacity: 0.85,
                color: '#1E293B',
              });
            }
          },
          mouseout: (e) => {
            const l = e.target as L.Path;
            if (loc.id !== selectedLocationId) {
              geoJsonLayer.resetStyle(l);
            }
          },
        });

        // 2. Place Custom Hardware SVG Pod Marker on Centroid
        if (markerGroupRef.current) {
          const printers = stats?.printers || 0;
          const routers = stats?.routers || 0;
          const cords = stats?.cords || 0;
          const pcs = stats?.computers || 0;
          const total = stats?.count || 0;

          const isSelected = selectedLocationId === loc.id;

          let markerHtml = '';

          if (total > 0) {
            // Active Hardware Cluster Pod with SVGs
            markerHtml = `
              <div class="custom-hardware-pod group cursor-pointer transition-all ${isSelected ? 'scale-115 ring-2 ring-emerald-500 rounded-2xl' : 'hover:scale-110 active:scale-95'}">
                <div class="flex items-center gap-1.5 rounded-2xl bg-white/95 backdrop-blur-md border ${isSelected ? 'border-neutral-900 bg-white' : 'border-neutral-200/90'} shadow-md px-2 py-1 transition-all">
                  ${printers > 0 ? `
                    <div class="flex items-center gap-0.5 rounded-lg bg-emerald-50 p-1 text-emerald-700 shadow-2xs" title="${printers} Printer(s) deployed">
                      ${getPrinterMarkerSvg()}
                      ${printers > 1 ? `<span class="text-[9px] font-extrabold text-emerald-800 leading-none">${printers}</span>` : ''}
                    </div>
                  ` : ''}
                  ${routers > 0 ? `
                    <div class="flex items-center gap-0.5 rounded-lg bg-sky-50 p-1 text-sky-700 shadow-2xs" title="${routers} Router(s) deployed">
                      ${getRouterMarkerSvg()}
                      ${routers > 1 ? `<span class="text-[9px] font-extrabold text-sky-800 leading-none">${routers}</span>` : ''}
                    </div>
                  ` : ''}
                  ${cords > 0 ? `
                    <div class="flex items-center gap-0.5 rounded-lg bg-amber-50 p-1 text-amber-700 shadow-2xs" title="${cords} Extension Cord(s) deployed">
                      ${getExtensionCordMarkerSvg()}
                      ${cords > 1 ? `<span class="text-[9px] font-extrabold text-amber-800 leading-none">${cords}</span>` : ''}
                    </div>
                  ` : ''}
                  ${pcs > 0 ? `
                    <div class="flex items-center gap-0.5 rounded-lg bg-purple-50 p-1 text-purple-700 shadow-2xs" title="${pcs} Computer(s) deployed">
                      ${getComputerMarkerSvg()}
                      ${pcs > 1 ? `<span class="text-[9px] font-extrabold text-purple-800 leading-none">${pcs}</span>` : ''}
                    </div>
                  ` : ''}

                  <div class="flex items-center gap-1 pl-0.5 pr-1">
                    <span class="text-[11px] font-bold text-neutral-900 truncate max-w-[85px]">${loc.name}</span>
                    <span class="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  </div>
                </div>
              </div>
            `;
          } else {
            // Clean empty badge marker
            markerHtml = `
              <div class="empty-hardware-pod cursor-pointer transition-transform hover:scale-105 active:scale-95">
                <div class="flex items-center gap-1 rounded-xl bg-white/90 backdrop-blur-xs border border-neutral-200/90 shadow-2xs px-2 py-0.5 text-neutral-600 hover:border-neutral-400">
                  <span class="text-[10px] font-bold text-neutral-700">${loc.name}</span>
                  <span class="text-[9px] font-semibold text-neutral-400">0</span>
                </div>
              </div>
            `;
          }

          const hardwareIcon = L.divIcon({
            className: 'hardware-leaflet-div-icon',
            html: markerHtml,
            iconSize: [total > 0 ? 140 : 80, 36],
            iconAnchor: [total > 0 ? 70 : 40, 18],
          });

          const marker = L.marker(centroid, { icon: hardwareIcon });
          marker.on('click', () => {
            onSelectLocation(loc.id);
            map.flyTo(centroid, Math.max(map.getZoom(), 13.5), { duration: 0.8 });
          });

          markerGroupRef.current.addLayer(marker);
        }
      },
    }).addTo(map);

    geoJsonLayerRef.current = geoJsonLayer;
  }, [selectedLocationId, locationStats, locations, filterCategory, onSelectLocation]);

  // Recenter map button
  const handleRecenter = () => {
    if (mapRef.current) {
      mapRef.current.setView([14.484, 121.012], 12.4, { animate: true });
    }
  };

  return (
    <div
      className={`isolate overflow-hidden transition-all duration-300 bg-white ${
        isExpanded
          ? 'fixed inset-0 z-[1500] h-screen w-screen rounded-none border-none shadow-none m-0 p-0'
          : 'relative z-0 rounded-3xl border border-neutral-200/90 shadow-xs h-[420px] sm:h-[520px] w-full'
      }`}
    >
      {/* Top Floating Bar: Category Filter Chips & Controls */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pointer-events-none">
        
        {/* Hardware Category Filter Pills */}
        <div className="pointer-events-auto flex items-center gap-1.5 overflow-x-auto rounded-2xl bg-white/95 backdrop-blur-md border border-neutral-200/90 p-1 shadow-sm no-scrollbar">
          <button
            onClick={() => setFilterCategory('ALL')}
            className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold transition-all ${
              filterCategory === 'ALL'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>All ({assets.length})</span>
          </button>

          <button
            onClick={() => setFilterCategory('Printer')}
            className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold transition-all ${
              filterCategory === 'Printer'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100'
            }`}
          >
            <PrinterSvg size={14} className="shrink-0" />
            <span>Printers ({totalPrinters})</span>
          </button>

          <button
            onClick={() => setFilterCategory('Network Router')}
            className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold transition-all ${
              filterCategory === 'Network Router'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100'
            }`}
          >
            <RouterSvg size={14} className="shrink-0" />
            <span>Routers ({totalRouters})</span>
          </button>

          <button
            onClick={() => setFilterCategory('Extension Cord / Power')}
            className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold transition-all ${
              filterCategory === 'Extension Cord / Power'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100'
            }`}
          >
            <ExtensionCordSvg size={14} className="shrink-0" />
            <span>Cords ({totalCords})</span>
          </button>

          <button
            onClick={() => setFilterCategory('Workstation / PC')}
            className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold transition-all ${
              filterCategory === 'Workstation / PC'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100'
            }`}
          >
            <ComputerSvg size={14} className="shrink-0" />
            <span>PCs ({totalComputers})</span>
          </button>
        </div>

        {/* Control Buttons */}
        <div className="pointer-events-auto flex items-center gap-1.5 self-end sm:self-auto">
          {onDeployAllKits && assets.length === 0 && (
            <button
              onClick={onDeployAllKits}
              title="1-Click Deploy standard health kits to all 16 Barangays"
              className="inline-flex items-center gap-1 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold shadow-sm transition active:scale-95"
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-200" />
              <span>Deploy All 16 Barangays</span>
            </button>
          )}

          <button
            onClick={handleRecenter}
            title="Recenter Parañaque Map"
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white border border-neutral-200/90 text-neutral-700 hover:text-neutral-950 transition active:scale-95 shadow-xs"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Exit Full Screen Map (Esc)' : 'Enter Full Screen Map'}
            className={`flex items-center gap-1.5 h-8 px-2.5 rounded-xl transition active:scale-95 shadow-xs ${
              isExpanded
                ? 'bg-neutral-900 text-white hover:bg-neutral-800'
                : 'bg-white border border-neutral-200/90 text-neutral-700 hover:text-neutral-950'
            }`}
          >
            {isExpanded ? (
              <>
                <Minimize2 className="h-4 w-4 text-white" />
                <span className="text-xs font-bold">Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-4 w-4" />
                <span className="hidden sm:inline text-xs font-bold">Fullscreen</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Leaflet Map DOM Container */}
      <div ref={mapContainerRef} className="h-full w-full" />

      {/* Interactive "Barangay Hardware Bay" HUD Drawer */}
      {selectedLocation && (
        <div className="absolute inset-y-0 right-0 z-30 w-full sm:w-[380px] lg:w-[420px] bg-white/95 backdrop-blur-md border-l border-neutral-200/90 shadow-2xl p-4 sm:p-5 flex flex-col transition-all animate-in slide-in-from-right duration-200">
          
          {/* Bay Header */}
          <div className="flex items-start justify-between pb-3 border-b border-black/[0.06]">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200 mb-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>
                  {selectedLocation.district === 0 ? 'Central IT Headquarters' : `District ${selectedLocation.district} Facility`}
                </span>
              </div>
              <h3 className="text-base font-extrabold text-neutral-900 tracking-tight">
                {selectedLocation.name}
              </h3>
              <p className="text-[11px] text-neutral-500 font-medium truncate max-w-[280px]">
                {selectedLocation.address}
              </p>
            </div>

            <button
              onClick={() => onSelectLocation(null)}
              className="rounded-xl p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Hardware Inventory Counters */}
          <div className="grid grid-cols-4 gap-1.5 py-3 border-b border-black/[0.06] text-center">
            <div className="rounded-xl bg-emerald-50/70 p-2 border border-emerald-100">
              <div className="flex justify-center mb-0.5">
                <PrinterSvg size={18} />
              </div>
              <div className="text-xs font-extrabold text-neutral-900">
                {selectedLocAssets.filter(a => a.category === 'Printer').length}
              </div>
              <div className="text-[9px] font-bold text-emerald-700 uppercase">Printers</div>
            </div>

            <div className="rounded-xl bg-sky-50/70 p-2 border border-sky-100">
              <div className="flex justify-center mb-0.5">
                <RouterSvg size={18} />
              </div>
              <div className="text-xs font-extrabold text-neutral-900">
                {selectedLocAssets.filter(a => a.category === 'Network Router' || a.category === 'Network Switch').length}
              </div>
              <div className="text-[9px] font-bold text-sky-700 uppercase">Routers</div>
            </div>

            <div className="rounded-xl bg-amber-50/70 p-2 border border-amber-100">
              <div className="flex justify-center mb-0.5">
                <ExtensionCordSvg size={18} />
              </div>
              <div className="text-xs font-extrabold text-neutral-900">
                {selectedLocAssets.filter(a => a.category === 'Extension Cord / Power' || a.category === 'UPS / Power').length}
              </div>
              <div className="text-[9px] font-bold text-amber-700 uppercase">Cords</div>
            </div>

            <div className="rounded-xl bg-purple-50/70 p-2 border border-purple-100">
              <div className="flex justify-center mb-0.5">
                <ComputerSvg size={18} />
              </div>
              <div className="text-xs font-extrabold text-neutral-900">
                {selectedLocAssets.filter(a => a.category === 'Workstation / PC').length}
              </div>
              <div className="text-[9px] font-bold text-purple-700 uppercase">PCs</div>
            </div>
          </div>

          {/* Hardware List / Station Content */}
          <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
            {selectedLocAssets.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-300 p-6 text-center my-4">
                <div className="flex justify-center gap-2 mb-3">
                  <PrinterSvg size={28} className="opacity-40" />
                  <RouterSvg size={28} className="opacity-40" />
                  <ExtensionCordSvg size={28} className="opacity-40" />
                </div>
                <h4 className="text-xs font-bold text-neutral-800">
                  No Hardware Stationed Here
                </h4>
                <p className="mt-1 text-[11px] text-neutral-500 leading-relaxed max-w-xs mx-auto">
                  Deploy recommended health center hardware to enable PhilHealth printing, clinic EMR sync, and workstation power.
                </p>

                {onDeployKit && (
                  <div className="mt-4">
                    <button
                      onClick={() => onDeployKit(selectedLocation.id)}
                      className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition active:scale-95"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>Deploy Health Station IT Kit</span>
                    </button>
                    <p className="mt-1 text-[10px] text-neutral-400">
                      1 Printer + 1 Wi-Fi 6 Router + 2 Extension Cords
                    </p>
                  </div>
                )}
              </div>
            ) : (
              selectedLocAssets.map((asset) => {
                const isPrinter = asset.category === 'Printer';
                const isRouter = asset.category === 'Network Router' || asset.category === 'Network Switch';
                const isCord = asset.category === 'Extension Cord / Power' || asset.category === 'UPS / Power';

                return (
                  <div
                    key={asset.id}
                    className="group rounded-2xl bg-white border border-neutral-200/90 p-3 shadow-xs hover:shadow-md transition-all"
                  >
                    <div className="flex items-start gap-2.5">
                      {/* SVG Illustration Avatar */}
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-neutral-50 border border-neutral-100 p-1 group-hover:scale-105 transition-transform">
                        {isPrinter && <PrinterSvg size={28} />}
                        {isRouter && <RouterSvg size={28} />}
                        {isCord && <ExtensionCordSvg size={28} />}
                        {!isPrinter && !isRouter && !isCord && <ComputerSvg size={28} />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 truncate">
                            {asset.category}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700 border border-emerald-200">
                            <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                            {asset.status === 'in_service' ? 'Online' : asset.status}
                          </span>
                        </div>

                        <h5 className="text-xs font-bold text-neutral-900 truncate">
                          {asset.name}
                        </h5>

                        {/* Hardware Serial with Copy Button */}
                        <div className="mt-1 flex items-center justify-between gap-1 text-[11px]">
                          <button
                            onClick={(e) => handleCopySerial(asset.serialNumber, e)}
                            className="inline-flex items-center gap-1 font-mono text-[10px] text-neutral-500 hover:text-neutral-900 transition"
                            title="Click to copy serial"
                          >
                            <span>{asset.serialNumber}</span>
                            {copiedSerial === asset.serialNumber ? (
                              <Check className="h-3 w-3 text-emerald-600" />
                            ) : (
                              <Copy className="h-3 w-3 text-neutral-400 group-hover:text-neutral-600" />
                            )}
                          </button>

                          <span className="text-[10px] text-neutral-400 font-medium truncate max-w-[100px]">
                            {asset.custodianName}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Transfer Button */}
                    {onOpenTransfer && (
                      <div className="mt-2.5 pt-2 border-t border-neutral-100 flex items-center justify-between">
                        <span className="text-[10px] font-mono text-neutral-400">
                          {asset.assetTag}
                        </span>
                        <button
                          onClick={() => onOpenTransfer(asset)}
                          className="inline-flex items-center gap-1 rounded-lg bg-neutral-100 hover:bg-neutral-900 hover:text-white px-2 py-1 text-[11px] font-bold text-neutral-700 transition active:scale-95"
                        >
                          <ArrowRightLeft className="h-3 w-3" />
                          <span>Relocate Hardware</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Bay Footer: Add More Hardware */}
          <div className="pt-3 border-t border-black/[0.06] flex items-center gap-2">
            {onOpenAddModal && (
              <button
                onClick={() => onOpenAddModal(selectedLocation.id)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-neutral-900 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-neutral-800 transition active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Item to {selectedLocation.name}</span>
              </button>
            )}

            {onDeployKit && selectedLocAssets.length > 0 && (
              <button
                onClick={() => onDeployKit(selectedLocation.id)}
                title="Deploy standard health kit to this barangay"
                className="inline-flex items-center justify-center gap-1 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 px-2.5 py-2 text-xs font-bold text-neutral-700 transition active:scale-95 shadow-2xs"
              >
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                <span>+ Kit</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Floating Bottom Legend */}
      <div className="absolute bottom-3 left-3 z-10 pointer-events-none hidden sm:flex items-center gap-2.5 rounded-xl bg-white/95 backdrop-blur-md border border-neutral-200/90 px-3 py-1.5 text-[11px] text-neutral-700 shadow-xs">
        <div className="flex items-center gap-1">
          <PrinterSvg size={14} />
          <span className="font-semibold text-neutral-600">Printer</span>
        </div>
        <span className="text-neutral-300">•</span>
        <div className="flex items-center gap-1">
          <RouterSvg size={14} />
          <span className="font-semibold text-neutral-600">Router</span>
        </div>
        <span className="text-neutral-300">•</span>
        <div className="flex items-center gap-1">
          <ExtensionCordSvg size={14} />
          <span className="font-semibold text-neutral-600">Cord</span>
        </div>
      </div>
    </div>
  );
};
