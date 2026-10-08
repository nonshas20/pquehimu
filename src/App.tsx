import { useState, useEffect, useMemo } from 'react';
import type { 
  AssetItem, 
  BarangayLocation, 
  AssetCategory, 
  AssetStatus, 
  AssetTransferRecord,
  AppUser 
} from './types/inventory';
import { PARANAQUE_LOCATIONS, INITIAL_ASSETS, DEFAULT_USERS } from './data/mockData';
import { Header } from './components/Header';
import { StatsOverview } from './components/StatsOverview';
import { BarangaySelector } from './components/BarangaySelector';
import { ParanaqueMap } from './components/ParanaqueMap';
import { AssetList } from './components/AssetList';
import { TransferModal } from './components/TransferModal';
import { AssetDetailModal } from './components/AssetDetailModal';
import { AddAssetModal } from './components/AddAssetModal';
import { QuickScanModal } from './components/QuickScanModal';
import { AuthModal } from './components/AuthModal';
import { 
  Layers, 
  QrCode, 
  Plus, 
  Map as MapIcon, 
  ShieldCheck, 
  Database 
} from 'lucide-react';

export function App() {
  // Current user / role (ADMIN or IT_OFFICER)
  const [currentUser, setCurrentUser] = useState<AppUser>(() => {
    try {
      const saved = localStorage.getItem('himu_current_user');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_USERS[0]; // John Shannon O. Rodriguez (ADMIN)
  });

  useEffect(() => {
    try {
      localStorage.setItem('himu_current_user', JSON.stringify(currentUser));
    } catch (e) {
      console.error(e);
    }
  }, [currentUser]);

  // Locations: 16 Real Parañaque Barangays + HIMU Depot
  const [locations] = useState<BarangayLocation[]>(PARANAQUE_LOCATIONS);

  // Assets: Clean initial slate with localStorage persistence
  const [assets, setAssets] = useState<AssetItem[]>(() => {
    try {
      const saved = localStorage.getItem('himu_assets_pque_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load localStorage', e);
    }
    return INITIAL_ASSETS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('himu_assets_pque_v1', JSON.stringify(assets));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }, [assets]);

  // View toggles
  const [showMap, setShowMap] = useState(true);

  // Filtering & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | 'ALL'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<AssetStatus | 'ALL'>('ALL');

  // Modals state
  const [activeAsset, setActiveAsset] = useState<AssetItem | null>(null);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      // 1. Location filter
      if (selectedLocationId && asset.currentLocationId !== selectedLocationId) {
        return false;
      }
      // 2. Category filter
      if (selectedCategory !== 'ALL' && asset.category !== selectedCategory) {
        return false;
      }
      // 3. Status filter
      if (selectedStatus !== 'ALL' && asset.status !== selectedStatus) {
        return false;
      }
      // 4. Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = asset.name.toLowerCase().includes(query);
        const matchesSerial = asset.serialNumber.toLowerCase().includes(query);
        const matchesTag = asset.assetTag.toLowerCase().includes(query);
        const matchesModel = asset.brandModel.toLowerCase().includes(query);
        const matchesCustodian = asset.custodianName.toLowerCase().includes(query);
        return matchesName || matchesSerial || matchesTag || matchesModel || matchesCustodian;
      }
      return true;
    });
  }, [assets, selectedLocationId, selectedCategory, selectedStatus, searchQuery]);

  // Handlers
  const handleOpenTransfer = (asset: AssetItem) => {
    setActiveAsset(asset);
    setIsTransferOpen(true);
  };

  const handleOpenDetail = (asset: AssetItem) => {
    setActiveAsset(asset);
    setIsDetailOpen(true);
  };

  const handleConfirmTransfer = (
    assetId: string,
    toLocationId: string,
    purpose: string,
    dispatchedBy: string,
    receivedBy: string,
    notes: string
  ) => {
    const originLoc = locations.find((l) => l.id === activeAsset?.currentLocationId);
    const destLoc = locations.find((l) => l.id === toLocationId);

    const newTransfer: AssetTransferRecord = {
      id: `tr-${Date.now()}`,
      referenceNo: `TR-PQUE-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      assetId,
      fromLocationId: originLoc?.id || '',
      toLocationId,
      fromLocationName: originLoc?.name || 'Origin',
      toLocationName: destLoc?.name || 'Destination',
      dispatchedBy,
      dispatchedAt: new Date().toISOString(),
      receivedBy: receivedBy || undefined,
      status: 'in_transit',
      purpose,
      notes,
    };

    setAssets((prev) =>
      prev.map((item) => {
        if (item.id === assetId) {
          return {
            ...item,
            status: 'in_transit',
            custodianName: receivedBy ? receivedBy : `In Transit via ${dispatchedBy}`,
            history: [newTransfer, ...item.history],
          };
        }
        return item;
      })
    );
  };

  const handleAcknowledgeReceipt = (assetId: string) => {
    setAssets((prev) =>
      prev.map((item) => {
        if (item.id === assetId && item.history.length > 0) {
          const latestTransfer = item.history[0];
          const updatedTransfer: AssetTransferRecord = {
            ...latestTransfer,
            status: 'received',
            receivedAt: new Date().toISOString(),
            receivedBy: item.custodianName || 'Barangay Health Staff',
          };

          return {
            ...item,
            status: 'in_service',
            currentLocationId: latestTransfer.toLocationId,
            history: [updatedTransfer, ...item.history.slice(1)],
          };
        }
        return item;
      })
    );
  };

  const handleAddAsset = (newAssetData: Omit<AssetItem, 'id' | 'history'>) => {
    const newAsset: AssetItem = {
      ...newAssetData,
      id: `ast-${Date.now()}`,
      history: [
        {
          id: `tr-init-${Date.now()}`,
          referenceNo: `TR-PQUE-${new Date().getFullYear()}-0001`,
          assetId: `ast-${Date.now()}`,
          fromLocationId: 'loc-himu-hq',
          toLocationId: newAssetData.currentLocationId,
          fromLocationName: 'HIMU Central IT Office (Parañaque City Hall)',
          toLocationName:
            locations.find((l) => l.id === newAssetData.currentLocationId)?.name ||
            'Assigned Barangay',
          dispatchedBy: currentUser.name,
          dispatchedAt: new Date().toISOString(),
          status: 'received',
          purpose: 'Initial inventory intake and deployment',
        },
      ],
    };

    setAssets((prev) => [newAsset, ...prev]);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-28 text-neutral-900 selection:bg-neutral-900 selection:text-white">
      {/* Top Flat White Header with Logos */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenAddModal={() => setIsAddOpen(true)}
        onOpenScanModal={() => setIsScanOpen(true)}
        onOpenAuthModal={() => setIsAuthOpen(true)}
        currentUser={currentUser}
        totalAssetsCount={assets.length}
      />

      {/* Full-Width 21:9 HIMU Team Background Header - Pure Image, Flush Below Header */}
      <div className="relative w-full overflow-hidden bg-neutral-900 aspect-[21/9] min-h-[190px] sm:min-h-[260px] max-h-[420px] shadow-xs">
        <img
          src="/himu-team-banner.jpg"
          alt="HIMU IT Operations Team"
          className="h-full w-full object-cover object-[center_35%]"
        />
      </div>

      {/* Main Content Container with Stat Cards Overlapping Banner */}
      <main className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 space-y-6">
        
        {/* 4 Stat Cards sitting slightly on top of the banner image with no gradient */}
        <div className="relative z-20 -mt-10 sm:-mt-14 lg:-mt-18">
          <StatsOverview
            assets={assets}
            totalLocationsCount={locations.length}
          />
        </div>

        {/* Section Header & Map Toggle Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 tracking-tight">
              Parañaque City IT Asset Registry
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 font-medium">
              Live custody and relocation tracking across 16 health stations, birthing clinics, and barangay facilities.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMap(!showMap)}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-white border border-neutral-200/90 px-3.5 py-2 text-xs font-semibold text-neutral-700 hover:text-neutral-950 transition active:scale-95 shadow-2xs"
            >
              <MapIcon className="h-4 w-4 text-emerald-600" />
              <span>{showMap ? 'Hide Map' : 'Show Map'}</span>
            </button>
          </div>
        </div>

        {/* Interactive Parañaque Leaflet Map */}
        {showMap && (
          <ParanaqueMap
            locations={locations}
            assets={assets}
            selectedLocationId={selectedLocationId}
            onSelectLocation={setSelectedLocationId}
          />
        )}

        {/* 16 Barangays District Selector Strip */}
        <BarangaySelector
          locations={locations}
          assets={assets}
          selectedLocationId={selectedLocationId}
          onSelectLocation={setSelectedLocationId}
        />

        {/* Core Asset List & Management Table */}
        <AssetList
          assets={filteredAssets}
          locations={locations}
          onOpenTransfer={handleOpenTransfer}
          onOpenDetail={handleOpenDetail}
          onOpenAddModal={() => setIsAddOpen(true)}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          selectedStatus={selectedStatus}
          onSelectStatus={setSelectedStatus}
        />

        {/* Infrastructure & Security Info */}
        <div className="rounded-3xl bg-white border border-neutral-200/90 p-5 shadow-xs text-xs text-neutral-600">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/[0.05] pb-3">
            <div className="flex items-center gap-2 font-bold text-neutral-900">
              <Database className="h-4 w-4 text-emerald-600" />
              <span>Parañaque HIMU • Official IT Custody Platform</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-400 font-medium">
              <span>Active Role: <strong className="text-neutral-800">{currentUser.role}</strong></span>
              <span>•</span>
              <span>Operator: <strong className="text-neutral-800">{currentUser.name}</strong></span>
            </div>
          </div>
          <p className="mt-3 leading-relaxed text-neutral-500 font-medium">
            Configured for the 16 Barangays of the City of Parañaque. All property movements generate timestamped reference IDs under the Universal Health Care (UHC) property accountability protocol.
          </p>
        </div>
      </main>

      {/* Mobile Floating Plain White Bottom Navigation Bar */}
      <div className="fixed bottom-3 inset-x-3 z-40 sm:hidden">
        <div className="rounded-3xl bg-white p-2 shadow-lg border border-neutral-200">
          <div className="flex items-center justify-around text-xs">
            <button
              onClick={() => {
                setSelectedLocationId(null);
                setSelectedCategory('ALL');
                setSelectedStatus('ALL');
                setSearchQuery('');
              }}
              className="flex flex-col items-center gap-1 text-neutral-600 hover:text-neutral-900 px-3 py-1.5"
            >
              <Layers className="h-4.5 w-4.5" />
              <span className="text-[10px] font-semibold">Assets</span>
            </button>

            <button
              onClick={() => setShowMap(!showMap)}
              className="flex flex-col items-center gap-1 text-neutral-600 hover:text-neutral-900 px-3 py-1.5"
            >
              <MapIcon className="h-4.5 w-4.5" />
              <span className="text-[10px] font-semibold">Map</span>
            </button>

            {/* Central Floating Add Pill */}
            <button
              onClick={() => setIsAddOpen(true)}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-900 text-white shadow-lg active:scale-90 -mt-5 ring-4 ring-white"
            >
              <Plus className="h-6 w-6" />
            </button>

            <button
              onClick={() => setIsScanOpen(true)}
              className="flex flex-col items-center gap-1 text-neutral-600 hover:text-neutral-900 px-3 py-1.5"
            >
              <QrCode className="h-4.5 w-4.5" />
              <span className="text-[10px] font-semibold">Scan</span>
            </button>

            <button
              onClick={() => setIsAuthOpen(true)}
              className="flex flex-col items-center gap-1 text-neutral-600 hover:text-neutral-900 px-3 py-1.5"
            >
              <ShieldCheck className="h-4.5 w-4.5" />
              <span className="text-[10px] font-semibold">Role</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <TransferModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        asset={activeAsset}
        locations={locations}
        defaultDispatcherName={currentUser.name}
        onConfirmTransfer={handleConfirmTransfer}
      />

      <AssetDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        asset={activeAsset}
        locations={locations}
        onOpenTransfer={handleOpenTransfer}
        onAcknowledgeReceipt={handleAcknowledgeReceipt}
      />

      <AddAssetModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        locations={locations}
        onAddAsset={handleAddAsset}
      />

      <QuickScanModal
        isOpen={isScanOpen}
        onClose={() => setIsScanOpen(false)}
        assets={assets}
        onFoundAsset={(found) => {
          setActiveAsset(found);
          setIsDetailOpen(true);
        }}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={currentUser}
        onSwitchUser={setCurrentUser}
      />
    </div>
  );
}

export default App;
