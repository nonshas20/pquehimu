import { useState, useEffect, useMemo } from 'react';
import type { 
  AssetItem, 
  BarangayLocation, 
  AssetCategory, 
  AssetStatus, 
  AssetTransferRecord 
} from './types/inventory';
import { INITIAL_LOCATIONS, INITIAL_ASSETS } from './data/mockData';
import { Header } from './components/Header';
import { StatsOverview } from './components/StatsOverview';
import { BarangaySelector } from './components/BarangaySelector';
import { AssetList } from './components/AssetList';
import { TransferModal } from './components/TransferModal';
import { AssetDetailModal } from './components/AssetDetailModal';
import { AddAssetModal } from './components/AddAssetModal';
import { QuickScanModal } from './components/QuickScanModal';
import { 
  Layers, 
  QrCode, 
  Plus, 
  MapPin, 
  Database 
} from 'lucide-react';

export function App() {
  // Load state from localStorage or initial mock data
  const [locations] = useState<BarangayLocation[]>(INITIAL_LOCATIONS);
  const [assets, setAssets] = useState<AssetItem[]>(() => {
    try {
      const saved = localStorage.getItem('baits_assets_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load localStorage', e);
    }
    return INITIAL_ASSETS;
  });

  // Save to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem('baits_assets_v1', JSON.stringify(assets));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }, [assets]);

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
      referenceNo: `TR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
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
            receivedBy: item.custodianName || 'Barangay Staff',
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
          referenceNo: `TR-${new Date().getFullYear()}-0001`,
          assetId: `ast-${Date.now()}`,
          fromLocationId: 'loc-central',
          toLocationId: newAssetData.currentLocationId,
          fromLocationName: 'Central IT Depot (Municipal Hall)',
          toLocationName:
            locations.find((l) => l.id === newAssetData.currentLocationId)?.name ||
            'Assigned Barangay',
          dispatchedBy: 'System Administrator',
          dispatchedAt: new Date().toISOString(),
          status: 'received',
          purpose: 'Initial inventory registration and commissioning',
        },
      ],
    };

    setAssets((prev) => [newAsset, ...prev]);
  };

  const handleResetData = () => {
    if (window.confirm('Reset inventory data back to default demo state?')) {
      setAssets(INITIAL_ASSETS);
      localStorage.removeItem('baits_assets_v1');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24 text-neutral-900 selection:bg-neutral-900 selection:text-white">
      {/* Top Header */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenAddModal={() => setIsAddOpen(true)}
        onOpenScanModal={() => setIsScanOpen(true)}
        totalAssetsCount={assets.length}
      />

      {/* Main Content Container */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        {/* Banner with contextual breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
              Barangay IT Equipment Inventory
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500">
              Live custody and relocation tracking for printers, routers, switches, and workstations across 16 barangays.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetData}
              className="text-xs text-neutral-400 hover:text-neutral-700 underline transition"
            >
              Reset Demo Data
            </button>
          </div>
        </div>

        {/* High-Level Apple-Style Metrics */}
        <StatsOverview
          assets={assets}
          totalLocationsCount={locations.length}
        />

        {/* 16 Barangays Selector & Filter Strip */}
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
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          selectedStatus={selectedStatus}
          onSelectStatus={setSelectedStatus}
        />

        {/* Architecture & Free-Tier Info Callout */}
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] text-xs text-neutral-600">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2 font-semibold text-neutral-900">
              <Database className="h-4 w-4 text-emerald-600" />
              <span>Zero-Cost Infrastructure Ready</span>
            </div>
            <div className="flex items-center gap-2 text-neutral-400">
              <span>Hostable on Vercel / Netlify Free Tier</span>
              <span>•</span>
              <span>Backed by Supabase PostgreSQL</span>
            </div>
          </div>
          <p className="mt-3 leading-relaxed text-neutral-500">
            This system runs without recurring software fees. The database schema in <code className="bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-800 font-mono">supabase/schema.sql</code> can be directly deployed to a free Supabase instance with 500MB storage (supporting over 200,000+ asset movement records).
          </p>
        </div>
      </main>

      {/* Mobile Floating Bottom Bar for Thumb Accessibility */}
      <div className="fixed bottom-0 inset-x-0 z-30 border-t border-neutral-200/80 bg-white/90 backdrop-blur-xl sm:hidden px-4 py-2.5">
        <div className="flex items-center justify-around text-xs">
          <button
            onClick={() => {
              setSelectedLocationId(null);
              setSelectedCategory('ALL');
              setSelectedStatus('ALL');
              setSearchQuery('');
            }}
            className="flex flex-col items-center gap-1 text-neutral-600 hover:text-neutral-900"
          >
            <Layers className="h-4.5 w-4.5" />
            <span className="text-[10px]">Overview</span>
          </button>

          <button
            onClick={() => setIsScanOpen(true)}
            className="flex flex-col items-center gap-1 text-neutral-600 hover:text-neutral-900"
          >
            <QrCode className="h-4.5 w-4.5" />
            <span className="text-[10px]">Scan Tag</span>
          </button>

          <button
            onClick={() => setIsAddOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-900 text-white shadow-lg active:scale-95 -mt-4 ring-4 ring-white"
          >
            <Plus className="h-5 w-5" />
          </button>

          <button
            onClick={() => {
              const nextLoc = locations[1];
              setSelectedLocationId(nextLoc.id);
            }}
            className="flex flex-col items-center gap-1 text-neutral-600 hover:text-neutral-900"
          >
            <MapPin className="h-4.5 w-4.5" />
            <span className="text-[10px]">Barangays</span>
          </button>
        </div>
      </div>

      {/* Modals */}
      <TransferModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        asset={activeAsset}
        locations={locations}
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
    </div>
  );
}

export default App;
