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
  Sparkles, 
  Package, 
  GripVertical, 
  ChevronRight, 
  ChevronLeft, 
  UploadCloud, 
  Search, 
  CheckCircle2, 
  Send,
  Printer,
  Trash
} from './HugeIcons';
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
  onQuickRelocate?: (assetId: string, toLocationId: string, customEventTitle?: string) => void;
  onPrintA5ForAsset?: (asset: AssetItem, customEventTitle?: string) => void;
  onPrintA5ForBarangay?: (locationId: string, customEventTitle?: string) => void;
  onDeleteBorrow?: (assetId: string) => void;
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
  onQuickRelocate,
  onPrintA5ForAsset,
  onPrintA5ForBarangay,
  onDeleteBorrow,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const markerGroupRef = useRef<L.LayerGroup | null>(null);
  const polygonLayersRef = useRef<Map<string, L.Polygon>>(new Map());

  // Component UI State
  const [isExpanded, setIsExpanded] = useState(false);
  const [filterCategory, setFilterCategory] = useState<'ALL' | AssetCategory>('ALL');
  const [copiedSerial, setCopiedSerial] = useState<string | null>(null);

  // Right Side Panel & Drag State
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'DEPOT' | 'BARANGAY'>('DEPOT');
  const [depotSearch, setDepotSearch] = useState('');
  const [depotCategoryFilter, setDepotCategoryFilter] = useState<'ALL' | AssetCategory>('ALL');
  
  // Configurable Profiling Event Title for Map Borrows (Defaults to PhilHealth YAKAP)
  const [activeProfilingTitle, setActiveProfilingTitle] = useState('PHILHEALTH YAKAP PROFILING');

  // Drag-and-Drop Tracking State
  const [draggingAsset, setDraggingAsset] = useState<AssetItem | null>(null);
  const [hoveredDropLocationId, setHoveredDropLocationId] = useState<string | null>(null);
  const hoveredDropLocationIdRef = useRef<string | null>(null);
  hoveredDropLocationIdRef.current = hoveredDropLocationId;
  const [justDroppedLocationId, setJustDroppedLocationId] = useState<string | null>(null);
  const [lastDeployedNotice, setLastDeployedNotice] = useState<{
    assetId?: string;
    assetName: string;
    locationId?: string;
    locationName: string;
    time: number;
  } | null>(null);

  // Auto-dismiss notification after 10 seconds
  useEffect(() => {
    if (!lastDeployedNotice) return;
    const t = setTimeout(() => setLastDeployedNotice(null), 10000);
    return () => clearTimeout(t);
  }, [lastDeployedNotice]);

  // Navigate to destination location and zoom into its polygon
  const handleGoToDestination = (locationId?: string) => {
    if (!locationId) return;
    onSelectLocation(locationId);
    setActiveTab('BARANGAY');
    setIsPanelOpen(true);
    const poly = polygonLayersRef.current.get(locationId);
    if (poly && mapRef.current) {
      mapRef.current.flyTo(poly.getBounds().getCenter(), Math.max(mapRef.current.getZoom(), 13.5), { duration: 0.8 });
    }
  };

  // Selected Location and its assets
  const selectedLocation = useMemo(() => {
    return locations.find((l) => l.id === selectedLocationId) || null;
  }, [locations, selectedLocationId]);

  const selectedLocAssets = useMemo(() => {
    if (!selectedLocationId) return [];
    return assets.filter((a) => a.currentLocationId === selectedLocationId);
  }, [assets, selectedLocationId]);

  // Unassigned / Staged Assets at HIMU HQ Depot
  const stagedAssets = useMemo(() => {
    return assets.filter((a) => a.currentLocationId === 'loc-himu-hq');
  }, [assets]);

  // Filtered Depot Assets
  const filteredStagedAssets = useMemo(() => {
    return stagedAssets.filter((item) => {
      if (depotCategoryFilter !== 'ALL' && item.category !== depotCategoryFilter) {
        return false;
      }
      if (depotSearch.trim()) {
        const q = depotSearch.toLowerCase().trim();
        return (
          item.name.toLowerCase().includes(q) ||
          item.serialNumber.toLowerCase().includes(q) ||
          item.assetTag.toLowerCase().includes(q) ||
          item.brandModel.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [stagedAssets, depotCategoryFilter, depotSearch]);

  // Overall equipment counts across deployed barangays
  const totalPrinters = useMemo(() => assets.filter((a) => a.category === 'Printer').length, [assets]);
  const totalRouters = useMemo(() => assets.filter((a) => a.category === 'Network Router' || a.category === 'Network Switch').length, [assets]);
  const totalCords = useMemo(() => assets.filter((a) => a.category === 'Extension Cord / Power' || a.category === 'UPS / Power').length, [assets]);
  const totalComputers = useMemo(() => assets.filter((a) => a.category === 'Workstation / PC').length, [assets]);

  // Location stats mapping (strictly for 16 barangays)
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

  // Match GeoJSON feature strictly to BarangayLocation (excluding Central Office)
  // This eradicates the repeating "HIMU Central" text bug permanently!
  const findLocationByFeature = (featureName: string) => {
    const norm = normalizeName(featureName);
    const barangays = locations.filter((l) => l.type === 'barangay');
    return barangays.find((l) => {
      const normLoc = normalizeName(l.name);
      return normLoc === norm || norm.includes(normLoc) || normLoc.includes(norm);
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
  }, [isExpanded, isPanelOpen]);

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

    // Zoom Controls repositioned to bottom-left to prevent collision with right drawer
    L.control.zoom({ position: 'bottomleft' }).addTo(map);

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

    polygonLayersRef.current.clear();

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
          fillColor = 'rgba(16, 185, 129, 0.45)'; // Vibrant Emerald for active barangays
          strokeColor = '#059669';
          fillOpacity = 0.85;
        } else if (count > 0 && !matchesFilter) {
          fillColor = 'rgba(226, 232, 240, 0.5)';
          strokeColor = '#94A3B8';
          fillOpacity = 0.4;
        }

        if (isSelected) {
          fillColor = 'rgba(15, 23, 42, 0.92)'; // Dark slate highlight
          strokeColor = '#0F172A';
          fillOpacity = 0.95;
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

        polygonLayersRef.current.set(loc.id, layer as L.Polygon);

        // Attach custom HTML data attributes to the SVG path DOM node
        const attachPathAttrs = () => {
          const path = (layer as any)._path as SVGPathElement | undefined;
          if (path) {
            path.setAttribute('data-location-id', loc.id);
            path.setAttribute('data-location-name', loc.name);
            path.classList.add('leaflet-barangay-polygon');
          }
        };
        layer.on('add', attachPathAttrs);
        setTimeout(attachPathAttrs, 20);

        const stats = locationStats.get(loc.id);
        const centroid = (layer as any).getBounds().getCenter();

        // 1. Polygon interaction
        layer.on({
          click: () => {
            onSelectLocation(loc.id);
            setActiveTab('BARANGAY');
            setIsPanelOpen(true);
            map.flyTo(centroid, Math.max(map.getZoom(), 13.5), { duration: 0.8 });
          },
          mouseover: (e) => {
            const l = e.target as L.Path;
            if (loc.id !== selectedLocationId && loc.id !== hoveredDropLocationIdRef.current) {
              l.setStyle({
                weight: 2.5,
                fillOpacity: 0.85,
                color: '#1E293B',
              });
            }
          },
          mouseout: (e) => {
            const l = e.target as L.Path;
            if (loc.id !== selectedLocationId && loc.id !== hoveredDropLocationIdRef.current) {
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
          const isDropHovered = hoveredDropLocationIdRef.current === loc.id;
          const cleanDisplayName = loc.name.replace(/^Barangay\s+/i, '');

          let markerHtml = '';

          if (total > 0) {
            // Active Hardware Cluster Pod with SVGs
            markerHtml = `
              <div 
                class="custom-hardware-pod group cursor-pointer transition-all ${
                  isDropHovered 
                    ? 'scale-125 ring-4 ring-emerald-500 shadow-2xl z-50' 
                    : isSelected 
                      ? 'scale-115 ring-2 ring-emerald-500 rounded-2xl shadow-lg' 
                      : 'hover:scale-110 active:scale-95'
                }"
                data-location-id="${loc.id}"
                data-location-name="${loc.name}"
              >
                <div class="flex items-center gap-1.5 rounded-2xl bg-white/95 backdrop-blur-md border ${
                  isSelected ? 'border-neutral-900 bg-white' : 'border-neutral-200/90'
                } shadow-md px-2 py-1 transition-all">
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
                    <div class="flex items-center gap-0.5 rounded-lg bg-purple-50 p-1 text-purple-700 shadow-2xs" title="${pcs} Workstation(s) deployed">
                      ${getComputerMarkerSvg()}
                      ${pcs > 1 ? `<span class="text-[9px] font-extrabold text-purple-800 leading-none">${pcs}</span>` : ''}
                    </div>
                  ` : ''}

                  <div class="flex items-center gap-1 pl-0.5 pr-1">
                    <span class="text-[11px] font-bold text-neutral-900 truncate max-w-[90px]">${cleanDisplayName}</span>
                    <span class="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  </div>
                </div>
              </div>
            `;
          } else {
            // Clean empty badge marker
            markerHtml = `
              <div 
                class="empty-hardware-pod cursor-pointer transition-all ${
                  isDropHovered 
                    ? 'scale-120 ring-4 ring-emerald-500 bg-emerald-50 shadow-xl' 
                    : 'hover:scale-105 active:scale-95'
                }"
                data-location-id="${loc.id}"
                data-location-name="${loc.name}"
              >
                <div class="flex items-center gap-1 rounded-xl bg-white/95 backdrop-blur-xs border border-neutral-200/90 shadow-2xs px-2 py-0.5 text-neutral-600 hover:border-neutral-400">
                  <span class="text-[10px] font-bold text-neutral-800">${cleanDisplayName}</span>
                  <span class="text-[9px] font-bold text-neutral-400">0</span>
                </div>
              </div>
            `;
          }

          const hardwareIcon = L.divIcon({
            className: 'hardware-leaflet-div-icon',
            html: markerHtml,
            iconSize: [total > 0 ? 145 : 85, 36],
            iconAnchor: [total > 0 ? 72 : 42, 18],
          });

          const marker = L.marker(centroid, { icon: hardwareIcon });
          marker.on('click', () => {
            onSelectLocation(loc.id);
            setActiveTab('BARANGAY');
            setIsPanelOpen(true);
            map.flyTo(centroid, Math.max(map.getZoom(), 13.5), { duration: 0.8 });
          });

          markerGroupRef.current.addLayer(marker);
        }
      },
    }).addTo(map);

    geoJsonLayerRef.current = geoJsonLayer;
  }, [selectedLocationId, locationStats, locations, filterCategory, onSelectLocation]);

  // Dynamic Polygon Glow on Drag Hover & Drop Confirmation
  useEffect(() => {
    if (!geoJsonLayerRef.current) return;

    polygonLayersRef.current.forEach((poly, locId) => {
      if (locId === hoveredDropLocationId || locId === justDroppedLocationId) {
        poly.setStyle({
          fillColor: '#10B981',
          fillOpacity: 0.92,
          color: '#047857',
          weight: 4,
          dashArray: undefined,
        });
        poly.bringToFront();
      } else if (locId === selectedLocationId) {
        poly.setStyle({
          fillColor: 'rgba(15, 23, 42, 0.92)',
          fillOpacity: 0.95,
          color: '#0F172A',
          weight: 3,
          dashArray: undefined,
        });
      } else {
        geoJsonLayerRef.current?.resetStyle(poly);
      }
    });

    // Directly update marker pod DOM glow without tearing down Leaflet layers
    const container = mapContainerRef.current || document;
    const pods = container.querySelectorAll('.custom-hardware-pod, .empty-hardware-pod');
    pods.forEach((pod) => {
      const locId = pod.getAttribute('data-location-id');
      if (locId === hoveredDropLocationId) {
        pod.classList.add('scale-125', 'ring-4', 'ring-emerald-500', 'shadow-2xl', 'z-50');
      } else {
        pod.classList.remove('scale-125', 'ring-4', 'ring-emerald-500', 'shadow-2xl', 'z-50');
      }
    });
  }, [hoveredDropLocationId, selectedLocationId, justDroppedLocationId]);

  // Recenter map button
  const handleRecenter = () => {
    if (mapRef.current) {
      mapRef.current.setView([14.484, 121.012], 12.4, { animate: true });
    }
  };

  // Map Container Drag Over Handler
  const handleMapDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // 1. Hit test DOM elements under pointer
    const elem = document.elementFromPoint(e.clientX, e.clientY);
    const targetElem = elem?.closest('[data-location-id]');
    const locId = targetElem?.getAttribute('data-location-id');

    if (locId && locations.some((l) => l.id === locId && l.type === 'barangay')) {
      if (hoveredDropLocationId !== locId) {
        setHoveredDropLocationId(locId);
      }
      return;
    }

    // 2. Fallback: Leaflet latlng bounds check
    if (mapRef.current) {
      const map = mapRef.current;
      const pt = map.mouseEventToLayerPoint(e.nativeEvent);
      const latlng = map.layerPointToLatLng(pt);

      let matched: string | null = null;
      polygonLayersRef.current.forEach((poly, id) => {
        if (poly.getBounds().contains(latlng)) {
          matched = id;
        }
      });

      if (matched && hoveredDropLocationId !== matched) {
        setHoveredDropLocationId(matched);
      } else if (!matched && hoveredDropLocationId) {
        setHoveredDropLocationId(null);
      }
    }
  };

  // Map Container Drop Handler
  const handleMapDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const assetId = e.dataTransfer.getData('text/plain') || draggingAsset?.id;

    // Check hit target
    const elem = document.elementFromPoint(e.clientX, e.clientY);
    const targetElem = elem?.closest('[data-location-id]');
    let targetLocId = targetElem?.getAttribute('data-location-id');

    if (!targetLocId && mapRef.current) {
      const map = mapRef.current;
      const pt = map.mouseEventToLayerPoint(e.nativeEvent);
      const latlng = map.layerPointToLatLng(pt);

      polygonLayersRef.current.forEach((poly, id) => {
        if (poly.getBounds().contains(latlng)) {
          targetLocId = id;
        }
      });
    }

    if (!targetLocId && hoveredDropLocationId) {
      targetLocId = hoveredDropLocationId;
    }

    if (assetId && targetLocId && onQuickRelocate) {
      onQuickRelocate(assetId, targetLocId, activeProfilingTitle);
      const targetLoc = locations.find((l) => l.id === targetLocId);
      const droppedItem = assets.find((a) => a.id === assetId);

      setLastDeployedNotice({
        assetId,
        assetName: droppedItem?.name || 'IT Hardware',
        locationId: targetLocId,
        locationName: targetLoc?.name || 'Barangay',
        time: Date.now(),
      });

      // Brief emerald flash on the destination polygon to visually acknowledge the drop
      setJustDroppedLocationId(targetLocId);
      setTimeout(() => {
        setJustDroppedLocationId((curr) => (curr === targetLocId ? null : curr));
      }, 1200);

      // NOTE: We intentionally remain on the DEPOT tab and do NOT auto-select
      // the destination location so the user can drag and drag continuously!
      // The user can click "Go to Location →" on the banner or click the map/tab when done.
    }

    setDraggingAsset(null);
    setHoveredDropLocationId(null);
  };

  // Quick 1-Click Relocate from select dropdown
  const handleQuickDeployDropdown = (assetId: string, toLocationId: string) => {
    if (!toLocationId || !onQuickRelocate) return;
    onQuickRelocate(assetId, toLocationId, activeProfilingTitle);
    const targetLoc = locations.find((l) => l.id === toLocationId);
    const item = assets.find((a) => a.id === assetId);
    setLastDeployedNotice({
      assetId,
      assetName: item?.name || 'IT Hardware',
      locationId: toLocationId,
      locationName: targetLoc?.name || 'Barangay',
      time: Date.now(),
    });

    if (toLocationId !== 'loc-himu-hq') {
      setJustDroppedLocationId(toLocationId);
      setTimeout(() => {
        setJustDroppedLocationId((curr) => (curr === toLocationId ? null : curr));
      }, 1200);
    }
  };

  const hoveredLocation = useMemo(() => {
    if (!hoveredDropLocationId) return null;
    return locations.find((l) => l.id === hoveredDropLocationId) || null;
  }, [locations, hoveredDropLocationId]);

  return (
    <div
      className={`isolate overflow-hidden transition-all duration-300 bg-white ${
        isExpanded
          ? 'fixed inset-0 z-[1500] h-screen w-screen rounded-none border-none shadow-none m-0 p-0'
          : 'relative z-0 rounded-3xl border border-neutral-200/90 shadow-xs h-[520px] sm:h-[620px] w-full'
      }`}
    >
      {/* Top Floating Bar: Category Filter Chips & Map Controls */}
      <div 
        className={`absolute top-3 left-3 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pointer-events-none transition-all duration-300 ${
          isPanelOpen ? 'right-3 sm:right-[400px] lg:right-[440px]' : 'right-3'
        }`}
      >
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

        {/* Control Buttons & Drawer Opener */}
        <div className="pointer-events-auto flex items-center gap-1.5 self-end sm:self-auto">
          {/* Quick Depot Drawer Toggle button if closed */}
          {!isPanelOpen && (
            <button
              onClick={() => setIsPanelOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold shadow-md transition active:scale-95"
            >
              <Package className="h-3.5 w-3.5" />
              <span>Hardware Depot ({stagedAssets.length})</span>
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          )}

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

      {/* Floating Drag Drop Guidance HUD */}
      {draggingAsset && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none transition-all animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center gap-2 rounded-2xl bg-neutral-900/95 backdrop-blur-md px-4 py-2 text-white shadow-2xl border border-white/20">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            {hoveredLocation ? (
              <span className="text-xs font-bold text-emerald-300">
                Release to Station at <span className="underline font-black">{hoveredLocation.name}</span>!
              </span>
            ) : (
              <span className="text-xs font-medium text-neutral-200">
                Hover over any Barangay on the map to deploy <strong className="text-white font-bold">{draggingAsset.name}</strong>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Interactive Drag & Drop Borrow Success HUD Banner with Direct A5 Print & Delete */}
      {lastDeployedNotice && (
        <div className="absolute top-16 left-3 right-3 sm:left-auto sm:right-[410px] lg:right-[450px] z-30 transition-all animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 rounded-2xl bg-neutral-900/95 backdrop-blur-md text-white p-3 sm:px-4 sm:py-2.5 shadow-2xl border border-white/20">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <div className="text-xs">
                <span className="font-extrabold text-emerald-400">Borrow Recorded: </span>
                <span className="font-bold text-white">{lastDeployedNotice.assetName}</span>
                <span className="text-neutral-400"> → </span>
                <button
                  type="button"
                  onClick={() => handleGoToDestination(lastDeployedNotice.locationId)}
                  className="font-extrabold underline text-emerald-300 hover:text-white transition cursor-pointer text-left"
                  title="Click to view destination location"
                >
                  {lastDeployedNotice.locationName}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 pl-1">
              {/* Go to Destination Button */}
              {lastDeployedNotice.locationId && lastDeployedNotice.locationId !== 'loc-himu-hq' && (
                <button
                  type="button"
                  onClick={() => handleGoToDestination(lastDeployedNotice.locationId)}
                  className="inline-flex items-center gap-1 rounded-xl bg-white/10 hover:bg-white/20 text-white px-2.5 py-1 text-[11px] font-bold border border-white/20 transition active:scale-95 cursor-pointer"
                  title={`Go to ${lastDeployedNotice.locationName}`}
                >
                  <span>Go to Location →</span>
                </button>
              )}

              {onPrintA5ForAsset && lastDeployedNotice.assetId && (
                <button
                  type="button"
                  onClick={() => {
                    const item = assets.find((a) => a.id === lastDeployedNotice.assetId);
                    if (item) onPrintA5ForAsset(item, activeProfilingTitle);
                  }}
                  className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 text-[11px] font-bold shadow transition active:scale-95 cursor-pointer"
                  title="Print official A5 Checklist Slip"
                >
                  <Printer size={13} />
                  <span>Print A5 Slip</span>
                </button>
              )}

              {onDeleteBorrow && lastDeployedNotice.assetId && (
                <button
                  type="button"
                  onClick={() => {
                    if (lastDeployedNotice.assetId) {
                      onDeleteBorrow(lastDeployedNotice.assetId);
                      setLastDeployedNotice(null);
                    }
                  }}
                  className="inline-flex items-center gap-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 px-2 py-1 text-[11px] font-semibold transition active:scale-95 cursor-pointer"
                  title="Delete this borrow and return to Depot"
                >
                  <Trash size={13} />
                  <span>Delete / Undo</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setLastDeployedNotice(null)}
                className="rounded-lg p-1 text-neutral-400 hover:text-white hover:bg-white/10 transition"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leaflet Map DOM Container with Drag and Drop Listeners */}
      <div 
        ref={mapContainerRef} 
        onDragOver={handleMapDragOver}
        onDragLeave={(e) => {
          if (e.currentTarget === e.target) {
            setHoveredDropLocationId(null);
          }
        }}
        onDrop={handleMapDrop}
        className="h-full w-full" 
      />

      {/* Interactive Right-Side Staging Depot & Barangay Bay Panel */}
      {isPanelOpen && (
        <div className="absolute inset-y-0 right-0 z-30 w-full sm:w-[390px] lg:w-[430px] bg-white/95 backdrop-blur-md border-l border-neutral-200/90 shadow-2xl flex flex-col transition-all duration-300 animate-in slide-in-from-right">
          
          {/* Panel Header & Navigation Switcher */}
          <div className="p-3 sm:p-4 border-b border-black/[0.06] bg-neutral-50/70">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <button
                  onClick={() => setIsPanelOpen(false)}
                  className="sm:hidden inline-flex items-center gap-1 rounded-xl bg-neutral-900 text-white px-2.5 py-1 text-xs font-bold shadow-xs active:scale-95 transition shrink-0 mr-1"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Map</span>
                </button>
                <Package className="h-4 w-4 text-emerald-600 shrink-0" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-neutral-900 truncate">
                  IT Deployment Control
                </h3>
              </div>
              <button
                onClick={() => setIsPanelOpen(false)}
                title="Collapse Panel"
                className="rounded-xl p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60 transition active:scale-95 shrink-0"
              >
                <X className="h-4 w-4 sm:hidden" />
                <ChevronRight className="hidden sm:inline-block h-4 w-4" />
              </button>
            </div>

            {/* Segmented Tab Switcher: Staging Depot vs. Barangay Bay */}
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-neutral-200/60 p-1 text-xs font-bold">
              <button
                onClick={() => setActiveTab('DEPOT')}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 transition-all ${
                  activeTab === 'DEPOT'
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <span>🏢 Depot Staging</span>
                <span className="rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-1.5 py-0.2">
                  {stagedAssets.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('BARANGAY')}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 transition-all ${
                  activeTab === 'BARANGAY'
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <span>📍 {selectedLocation ? selectedLocation.name.replace(/^Barangay\s+/i, '') : 'Barangay Bay'}</span>
                <span className="rounded-full bg-neutral-200 text-neutral-700 text-[10px] font-extrabold px-1.5 py-0.2">
                  {selectedLocAssets.length}
                </span>
              </button>
            </div>

            {/* Active Event / Profiling Title Input Configuration */}
            <div className="mt-2.5 pt-2 border-t border-black/[0.06]">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wide text-neutral-600 flex items-center gap-1">
                  <span>Profiling Event / Activity Title:</span>
                </label>
                <span className="text-[9px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  Prints on A5 Checklist
                </span>
              </div>
              <input
                type="text"
                value={activeProfilingTitle}
                onChange={(e) => setActiveProfilingTitle(e.target.value)}
                placeholder="e.g. PHILHEALTH YAKAP PROFILING"
                className="w-full rounded-xl border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-bold text-neutral-900 shadow-2xs focus:border-emerald-500 focus:outline-none uppercase"
                title="Type custom profiling or event title here"
              />
              <div className="flex items-center gap-1 mt-1.5 overflow-x-auto no-scrollbar">
                {[
                  'PHILHEALTH YAKAP PROFILING',
                  'HEALTH CENTER EMR OPS',
                  'NATIONAL IMMUNIZATION',
                  'MEDICAL MISSION',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setActiveProfilingTitle(preset)}
                    className={`shrink-0 rounded-lg px-2 py-0.5 text-[9px] font-bold transition ${
                      activeProfilingTitle === preset
                        ? 'bg-neutral-900 text-white'
                        : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600'
                    }`}
                  >
                    {preset === 'PHILHEALTH YAKAP PROFILING'
                      ? 'YAKAP'
                      : preset === 'HEALTH CENTER EMR OPS'
                      ? 'EMR Ops'
                      : preset === 'NATIONAL IMMUNIZATION'
                      ? 'Vaccination'
                      : 'Medical Mission'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* TAB 1: HIMU CENTRAL STAGING DEPOT */}
          {activeTab === 'DEPOT' && (
            <div className="flex-1 flex flex-col min-h-0 p-3 sm:p-4 space-y-3">
              
              {/* Drag & Drop Instruction Pill */}
              <div className="rounded-xl bg-emerald-50 border border-emerald-200/80 p-2.5 text-emerald-950 flex items-start gap-2">
                <span className="text-base leading-none">💡</span>
                <div className="text-[11px] leading-relaxed">
                  <strong className="font-bold">Drag & Drop Ready:</strong> Grab any hardware card below and release it directly onto any Barangay on the map to station it immediately.
                </div>
              </div>

              {/* Search & Filter Controls */}
              <div className="space-y-1.5">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-neutral-400" />
                  <input
                    type="text"
                    value={depotSearch}
                    onChange={(e) => setDepotSearch(e.target.value)}
                    placeholder="Search model, serial or tag..."
                    className="w-full rounded-xl border border-neutral-200 bg-white pl-8 pr-3 py-1.5 text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  {depotSearch && (
                    <button
                      onClick={() => setDepotSearch('')}
                      className="absolute right-2 top-2 text-neutral-400 hover:text-neutral-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Depot Quick Category Filter Pills */}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                  {(['ALL', 'Printer', 'Network Router', 'Extension Cord / Power', 'Workstation / PC'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setDepotCategoryFilter(cat)}
                      className={`shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold transition ${
                        depotCategoryFilter === cat
                          ? 'bg-neutral-900 text-white'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                      }`}
                    >
                      {cat === 'ALL' ? 'All' : cat.split('/')[0].trim()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Draggable Staged Hardware Cards List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {filteredStagedAssets.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-neutral-300 p-6 text-center my-4">
                    <Package className="h-8 w-8 text-neutral-400 mx-auto mb-2 opacity-50" />
                    <h4 className="text-xs font-bold text-neutral-800">No Staged Hardware Found</h4>
                    <p className="text-[11px] text-neutral-500 mt-1 max-w-xs mx-auto">
                      All inventory has been dispatched, or matches no current filter.
                    </p>
                    {onOpenAddModal && (
                      <button
                        onClick={() => onOpenAddModal('loc-himu-hq')}
                        className="mt-3 inline-flex items-center gap-1 rounded-xl bg-neutral-900 text-white px-3 py-1.5 text-xs font-bold shadow-xs hover:bg-neutral-800 transition"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Intake Item</span>
                      </button>
                    )}
                  </div>
                ) : (
                  filteredStagedAssets.map((asset) => {
                    const isPrinter = asset.category === 'Printer';
                    const isRouter = asset.category === 'Network Router' || asset.category === 'Network Switch';
                    const isCord = asset.category === 'Extension Cord / Power' || asset.category === 'UPS / Power';

                    return (
                      <div
                        key={asset.id}
                        draggable={true}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', asset.id);
                          e.dataTransfer.effectAllowed = 'move';
                          setDraggingAsset(asset);
                        }}
                        onDragEnd={() => {
                          setDraggingAsset(null);
                          setHoveredDropLocationId(null);
                        }}
                        className={`group relative rounded-2xl bg-white border border-neutral-200/90 p-2.5 shadow-xs hover:shadow-md hover:border-emerald-400 transition-all cursor-grab active:cursor-grabbing ${
                          draggingAsset?.id === asset.id ? 'opacity-40 ring-2 ring-emerald-500' : ''
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {/* Grip Handle */}
                          <div className="shrink-0 flex items-center justify-center pt-2 text-neutral-300 group-hover:text-emerald-600 transition">
                            <GripVertical className="h-4 w-4" />
                          </div>

                          {/* Hardware SVG Icon */}
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-50 border border-neutral-100 p-1 group-hover:scale-105 transition-transform">
                            {isPrinter && <PrinterSvg size={24} />}
                            {isRouter && <RouterSvg size={24} />}
                            {isCord && <ExtensionCordSvg size={24} />}
                            {!isPrinter && !isRouter && !isCord && <ComputerSvg size={24} />}
                          </div>

                          {/* Hardware Information */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[9px] font-extrabold uppercase tracking-wider text-neutral-400">
                                {asset.category}
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.2 text-[9px] font-bold text-emerald-700 border border-emerald-200">
                                <span className="h-1 w-1 rounded-full bg-emerald-500" />
                                Ready
                              </span>
                            </div>

                            <h5 className="text-xs font-bold text-neutral-900 truncate">
                              {asset.name}
                            </h5>

                            <div className="mt-0.5 flex items-center justify-between gap-1 text-[10px]">
                              <button
                                onClick={(e) => handleCopySerial(asset.serialNumber, e)}
                                className="inline-flex items-center gap-1 font-mono text-neutral-500 hover:text-neutral-900 transition"
                                title="Click to copy serial"
                              >
                                <span>{asset.serialNumber}</span>
                                {copiedSerial === asset.serialNumber ? (
                                  <Check className="h-2.5 w-2.5 text-emerald-600" />
                                ) : (
                                  <Copy className="h-2.5 w-2.5 text-neutral-400" />
                                )}
                              </button>

                              <span className="font-mono text-neutral-400 text-[9px]">
                                {asset.assetTag}
                              </span>
                            </div>

                            {/* 1-Tap Quick Deploy Dropdown (Touch & Non-Drag Fallback) */}
                            <div className="mt-2 pt-1.5 border-t border-neutral-100 flex items-center gap-1.5">
                              <Send className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                              <select
                                defaultValue=""
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleQuickDeployDropdown(asset.id, e.target.value);
                                    e.target.value = '';
                                  }
                                }}
                                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-2.5 py-2 sm:py-1 text-xs sm:text-[10px] font-bold text-neutral-800 hover:bg-neutral-100 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 min-h-[38px] sm:min-h-0"
                              >
                                <option value="" disabled>
                                  ⚡ 1-Tap Deploy To Barangay...
                                </option>
                                {locations
                                  .filter((l) => l.type === 'barangay')
                                  .map((b) => (
                                    <option key={b.id} value={b.id}>
                                      {b.name} (Dist. {b.district})
                                    </option>
                                  ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Depot Return Bay / Recall Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const assetId = e.dataTransfer.getData('text/plain') || draggingAsset?.id;
                  if (assetId && onQuickRelocate) {
                    onQuickRelocate(assetId, 'loc-himu-hq');
                    const item = assets.find((a) => a.id === assetId);
                    setLastDeployedNotice({
                      assetName: item?.name || 'IT Hardware',
                      locationName: 'HIMU Central Depot',
                      time: Date.now(),
                    });
                  }
                  setDraggingAsset(null);
                  setHoveredDropLocationId(null);
                }}
                className="rounded-2xl border-2 border-dashed border-neutral-300 hover:border-emerald-500 hover:bg-emerald-50/40 p-2.5 text-center transition cursor-pointer"
              >
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-neutral-700">
                  <UploadCloud className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Depot Return Zone</span>
                </div>
                <p className="text-[10px] text-neutral-400 mt-0.5">
                  Drag any barangay item here to return it to HIMU warehouse
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: BARANGAY BAY & STATIONED HARDWARE */}
          {activeTab === 'BARANGAY' && (
            <div className="flex-1 flex flex-col min-h-0 p-3 sm:p-4 space-y-3">
              {selectedLocation ? (
                <>
                  {/* Barangay Facility Header */}
                  <div className="flex items-start justify-between pb-2 border-b border-black/[0.06]">
                    <div>
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200 mb-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>District {selectedLocation.district} Barangay</span>
                      </div>
                      <h3 className="text-base font-extrabold text-neutral-900 tracking-tight">
                        {selectedLocation.name}
                      </h3>
                      <p className="text-[11px] text-neutral-500 font-medium truncate max-w-[280px]">
                        {selectedLocation.address}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {onPrintA5ForBarangay && selectedLocAssets.length > 0 && (
                        <button
                          type="button"
                          onClick={() => onPrintA5ForBarangay(selectedLocation.id, activeProfilingTitle)}
                          className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 text-[11px] font-bold shadow-xs transition active:scale-95 cursor-pointer"
                          title="Print official consolidated A5 Borrow Slip for this Barangay"
                        >
                          <Printer size={13} />
                          <span>A5 Slip</span>
                        </button>
                      )}

                      <button
                        onClick={() => onSelectLocation(null)}
                        className="rounded-xl p-1 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* 4 Quick Station Counters */}
                  <div className="grid grid-cols-4 gap-1.5 text-center">
                    <div className="rounded-xl bg-emerald-50/70 p-2 border border-emerald-100">
                      <div className="flex justify-center mb-0.5">
                        <PrinterSvg size={16} />
                      </div>
                      <div className="text-xs font-extrabold text-neutral-900">
                        {selectedLocAssets.filter((a) => a.category === 'Printer').length}
                      </div>
                      <div className="text-[8px] font-bold text-emerald-700 uppercase">Printers</div>
                    </div>

                    <div className="rounded-xl bg-sky-50/70 p-2 border border-sky-100">
                      <div className="flex justify-center mb-0.5">
                        <RouterSvg size={16} />
                      </div>
                      <div className="text-xs font-extrabold text-neutral-900">
                        {selectedLocAssets.filter((a) => a.category === 'Network Router' || a.category === 'Network Switch').length}
                      </div>
                      <div className="text-[8px] font-bold text-sky-700 uppercase">Routers</div>
                    </div>

                    <div className="rounded-xl bg-amber-50/70 p-2 border border-amber-100">
                      <div className="flex justify-center mb-0.5">
                        <ExtensionCordSvg size={16} />
                      </div>
                      <div className="text-xs font-extrabold text-neutral-900">
                        {selectedLocAssets.filter((a) => a.category === 'Extension Cord / Power' || a.category === 'UPS / Power').length}
                      </div>
                      <div className="text-[8px] font-bold text-amber-700 uppercase">Cords</div>
                    </div>

                    <div className="rounded-xl bg-purple-50/70 p-2 border border-purple-100">
                      <div className="flex justify-center mb-0.5">
                        <ComputerSvg size={16} />
                      </div>
                      <div className="text-xs font-extrabold text-neutral-900">
                        {selectedLocAssets.filter((a) => a.category === 'Workstation / PC').length}
                      </div>
                      <div className="text-[8px] font-bold text-purple-700 uppercase">PCs</div>
                    </div>
                  </div>

                  {/* Hardware List Stationed Here */}
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {selectedLocAssets.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-neutral-300 p-5 text-center my-3">
                        <div className="flex justify-center gap-2 mb-2">
                          <PrinterSvg size={24} className="opacity-40" />
                          <RouterSvg size={24} className="opacity-40" />
                          <ExtensionCordSvg size={24} className="opacity-40" />
                        </div>
                        <h4 className="text-xs font-bold text-neutral-800">
                          No Hardware Stationed Here
                        </h4>
                        <p className="mt-1 text-[11px] text-neutral-500 leading-relaxed max-w-xs mx-auto">
                          Drag hardware from the <strong>Depot Staging</strong> tab directly onto this Barangay, or deploy a standard health kit.
                        </p>

                        {onDeployKit && (
                          <div className="mt-3">
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
                            draggable={true}
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', asset.id);
                              e.dataTransfer.effectAllowed = 'move';
                              setDraggingAsset(asset);
                            }}
                            onDragEnd={() => {
                              setDraggingAsset(null);
                              setHoveredDropLocationId(null);
                            }}
                            className="group relative rounded-2xl bg-white border border-neutral-200/90 p-2.5 shadow-xs hover:shadow-md hover:border-emerald-400 transition-all cursor-grab active:cursor-grabbing"
                          >
                            <div className="flex items-start gap-2">
                              {/* Grip Handle */}
                              <div className="shrink-0 flex items-center justify-center pt-2 text-neutral-300 group-hover:text-emerald-600 transition">
                                <GripVertical className="h-4 w-4" />
                              </div>

                              {/* SVG Avatar */}
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-50 border border-neutral-100 p-1 group-hover:scale-105 transition-transform">
                                {isPrinter && <PrinterSvg size={24} />}
                                {isRouter && <RouterSvg size={24} />}
                                {isCord && <ExtensionCordSvg size={24} />}
                                {!isPrinter && !isRouter && !isCord && <ComputerSvg size={24} />}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-neutral-400">
                                    {asset.category}
                                  </span>
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.2 text-[9px] font-bold text-emerald-700 border border-emerald-200">
                                    <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                                    Stationed
                                  </span>
                                </div>

                                <h5 className="text-xs font-bold text-neutral-900 truncate">
                                  {asset.name}
                                </h5>

                                <div className="mt-0.5 flex items-center justify-between gap-1 text-[10px]">
                                  <button
                                    onClick={(e) => handleCopySerial(asset.serialNumber, e)}
                                    className="inline-flex items-center gap-1 font-mono text-neutral-500 hover:text-neutral-900 transition"
                                  >
                                    <span>{asset.serialNumber}</span>
                                    {copiedSerial === asset.serialNumber ? (
                                      <Check className="h-2.5 w-2.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="h-2.5 w-2.5 text-neutral-400" />
                                    )}
                                  </button>
                                  <span className="text-neutral-400 text-[10px] truncate max-w-[110px]">
                                    {asset.custodianName}
                                  </span>
                                </div>

                                {/* Borrow Actions: A5 Slip, Delete Borrow & Relocate */}
                                <div className="mt-2 pt-1.5 border-t border-neutral-100 flex items-center justify-between gap-1.5">
                                  <div className="flex items-center gap-1">
                                    {onPrintA5ForAsset && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onPrintA5ForAsset(asset, activeProfilingTitle);
                                        }}
                                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 px-2 py-0.5 text-[10px] font-bold transition active:scale-95 cursor-pointer"
                                        title="Print official A5 borrow checklist slip for this item"
                                      >
                                        <Printer size={12} />
                                        <span>A5 Slip</span>
                                      </button>
                                    )}

                                    {onDeleteBorrow && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onDeleteBorrow(asset.id);
                                        }}
                                        className="inline-flex items-center gap-1 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 px-2 py-0.5 text-[10px] font-bold transition active:scale-95 cursor-pointer"
                                        title="Delete/cancel this borrow and return item to Depot staging"
                                      >
                                        <Trash size={12} />
                                        <span>Delete</span>
                                      </button>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1">
                                    {onOpenTransfer && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onOpenTransfer(asset);
                                        }}
                                        className="inline-flex items-center gap-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white px-2 py-0.5 text-[10px] font-bold transition active:scale-95 cursor-pointer"
                                        title="Relocate to another barangay"
                                      >
                                        <ArrowRightLeft className="h-3 w-3" />
                                        <span>Relocate</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Bay Footer */}
                  <div className="pt-2 border-t border-black/[0.06] flex items-center gap-2">
                    {onPrintA5ForBarangay && selectedLocAssets.length > 0 && (
                      <button
                        type="button"
                        onClick={() => onPrintA5ForBarangay(selectedLocation.id, activeProfilingTitle)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 py-2 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer"
                        title="Print official consolidated A5 Borrow Slip for this entire Barangay event"
                      >
                        <Printer size={14} />
                        <span>Print A5 Slip</span>
                      </button>
                    )}

                    {onOpenAddModal && (
                      <button
                        onClick={() => onOpenAddModal(selectedLocation.id)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-neutral-900 px-3 py-2 text-xs font-bold text-white shadow-xs hover:bg-neutral-800 transition active:scale-95"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Item</span>
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
                </>
              ) : (
                /* No Barangay Selected Notice */
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 mb-3">
                    <Layers className="h-6 w-6" />
                  </div>
                  <h4 className="text-xs font-bold text-neutral-800">No Barangay Selected</h4>
                  <p className="text-[11px] text-neutral-500 mt-1 max-w-xs">
                    Click any Barangay polygon or cluster marker on the map to inspect its deployed hardware, or switch to the <strong>Depot Staging</strong> tab to drag items onto the map.
                  </p>
                  <button
                    onClick={() => setActiveTab('DEPOT')}
                    className="mt-3 inline-flex items-center gap-1 rounded-xl bg-neutral-900 text-white px-3 py-1.5 text-xs font-bold shadow-xs hover:bg-neutral-800 transition"
                  >
                    <Package className="h-3.5 w-3.5" />
                    <span>View Staged Hardware ({stagedAssets.length})</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Floating Bottom Legend */}
      <div className="absolute bottom-3 left-16 z-10 pointer-events-none hidden sm:flex items-center gap-2.5 rounded-xl bg-white/95 backdrop-blur-md border border-neutral-200/90 px-3 py-1.5 text-[11px] text-neutral-700 shadow-xs">
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
        <span className="text-neutral-300">•</span>
        <div className="flex items-center gap-1">
          <ComputerSvg size={14} />
          <span className="font-semibold text-neutral-600">PC</span>
        </div>
      </div>
    </div>
  );
};
