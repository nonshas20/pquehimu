import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import type { BarangayLocation, AssetItem } from '../types/inventory';
import PARANAQUE_GEOJSON from '../data/paranaque-barangays.json';
import { 
  Maximize2, 
  Minimize2, 
  RotateCcw 
} from 'lucide-react';

interface ParanaqueMapProps {
  locations: BarangayLocation[];
  assets: AssetItem[];
  selectedLocationId: string | null;
  onSelectLocation: (locationId: string | null) => void;
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
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Map each location to its equipment count
  const locationStats = useMemo(() => {
    const map = new Map<string, { count: number; inTransit: number; loc: BarangayLocation }>();
    locations.forEach((loc) => {
      const locAssets = assets.filter((a) => a.currentLocationId === loc.id);
      const inTransit = locAssets.filter((a) => a.status === 'in_transit').length;
      map.set(loc.id, {
        count: locAssets.length,
        inTransit,
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

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Center on Parañaque City center coordinates
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      minZoom: 11.5,
      maxZoom: 16,
      scrollWheelZoom: true,
      dragging: true,
    }).setView([14.484, 121.012], 12.4);

    mapRef.current = map;

    // Add Esri Light Gray Canvas tiles (clean, watermark-free)
    L.tileLayer(ESRI_LIGHT_TILE_URL, {
      maxZoom: 18,
      attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    }).addTo(map);

    // Zoom Controls repositioned to bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

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

  // Update GeoJSON Polygons whenever selection or asset data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (geoJsonLayerRef.current) {
      map.removeLayer(geoJsonLayerRef.current);
    }

    const geoJsonLayer = L.geoJSON(PARANAQUE_GEOJSON as any, {
      style: (feature) => {
        if (!feature) return {};
        const loc = findLocationByFeature(feature.properties?.name || '');
        const isSelected = loc && selectedLocationId === loc.id;
        const stats = loc ? locationStats.get(loc.id) : null;
        const count = stats?.count || 0;

        let fillColor = 'rgba(241, 245, 249, 0.7)'; // plain neutral slate
        let strokeColor = 'rgba(148, 163, 184, 0.8)';
        let fillOpacity = 0.7;

        if (count > 0) {
          fillColor = 'rgba(16, 185, 129, 0.45)'; // System Emerald for deployed equipment
          strokeColor = 'rgba(5, 150, 105, 0.9)';
          fillOpacity = 0.8;
        }

        if (isSelected) {
          fillColor = 'rgba(30, 41, 59, 0.9)';
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
        const stats = loc ? locationStats.get(loc.id) : null;
        const count = stats?.count || 0;
        const district = loc?.district || (feature.properties?.district ?? 1);

        // Plain solid white tooltip popup
        const popupContent = `
          <div class="p-3 text-xs min-w-[170px] bg-white text-neutral-900 rounded-xl">
            <div class="flex items-center justify-between gap-2 border-b border-neutral-100 pb-1.5 mb-2">
              <span class="font-bold text-neutral-900 text-sm">${featureName}</span>
              <span class="text-[10px] font-semibold bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded">
                D${district}
              </span>
            </div>
            <div class="space-y-1 text-neutral-600">
              <div class="flex items-center justify-between">
                <span>IT Equipment:</span>
                <strong class="text-neutral-900">${count} item${count === 1 ? '' : 's'}</strong>
              </div>
              <div class="text-[11px] text-neutral-400 mt-1">
                Tap to filter inventory
              </div>
            </div>
          </div>
        `;

        layer.bindTooltip(popupContent, {
          sticky: true,
          direction: 'auto',
          className: 'plain-white-popup',
        });

        layer.on({
          click: () => {
            if (loc) {
              onSelectLocation(loc.id);
            }
          },
          mouseover: (e) => {
            const l = e.target as L.Path;
            if (loc?.id !== selectedLocationId) {
              l.setStyle({
                weight: 2.5,
                fillOpacity: 0.9,
                color: '#1E293B',
              });
            }
          },
          mouseout: (e) => {
            const l = e.target as L.Path;
            if (loc?.id !== selectedLocationId) {
              geoJsonLayer.resetStyle(l);
            }
          },
        });
      },
    }).addTo(map);

    geoJsonLayerRef.current = geoJsonLayer;
  }, [selectedLocationId, locationStats, locations, onSelectLocation]);

  // Recenter map button
  const handleRecenter = () => {
    if (mapRef.current) {
      mapRef.current.setView([14.484, 121.012], 12.4, { animate: true });
    }
  };

  return (
    <div
      className={`isolate relative z-0 overflow-hidden transition-all duration-300 rounded-3xl border border-neutral-200/90 bg-white shadow-xs ${
        isExpanded
          ? 'fixed inset-4 z-[2000] rounded-2xl shadow-2xl h-[calc(100vh-2rem)]'
          : 'h-[290px] sm:h-[400px] w-full'
      }`}
    >
      {/* Top Floating Solid White Bar for Map Context */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-white border border-neutral-200/90 px-3.5 py-2 text-xs shadow-xs">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold text-neutral-900">
            Parañaque City • 16 Barangays Map
          </span>
          <span className="hidden sm:inline text-neutral-300">|</span>
          <span className="hidden sm:inline text-[11px] text-neutral-600 font-medium">
            {assets.length} items logged
          </span>
        </div>

        {/* Map Control Buttons */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          <button
            onClick={handleRecenter}
            title="Recenter Parañaque Map"
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white border border-neutral-200/90 text-neutral-700 hover:text-neutral-950 transition active:scale-95 shadow-xs"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Minimize Map' : 'Full Screen Map'}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white border border-neutral-200/90 text-neutral-700 hover:text-neutral-950 transition active:scale-95 shadow-xs"
          >
            {isExpanded ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Leaflet DOM Node */}
      <div ref={mapContainerRef} className="h-full w-full" />

      {/* Floating Bottom Legend */}
      <div className="absolute bottom-3 left-3 z-10 pointer-events-none hidden sm:flex items-center gap-3 rounded-xl bg-white border border-neutral-200/90 px-3 py-1.5 text-[11px] text-neutral-600 shadow-xs">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80 border border-emerald-600" />
          <span className="font-medium">Deployed Assets</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-200 border border-slate-400" />
          <span className="font-medium">Empty / No IT Hardware</span>
        </div>
      </div>
    </div>
  );
};
