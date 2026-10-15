import { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import type { 
  AssetItem, 
  BarangayLocation, 
  AssetCategory, 
  AssetStatus, 
  AssetTransferRecord,
  AppUser,
  AuditLogEntry,
  AuditActionType
} from './types/inventory';
import { DISPATCH_OFFICERS } from './types/inventory';
import { PARANAQUE_LOCATIONS, INITIAL_ASSETS, DEFAULT_USERS } from './data/mockData';
import { Header } from './components/Header';
import { StatsOverview } from './components/StatsOverview';
import { BarangaySelector } from './components/BarangaySelector';
import { BarangayStationsMobileList } from './components/BarangayStationsMobileList';
import { AssetList } from './components/AssetList';
import type { BorrowChecklistItem } from './types/inventory';
import { supabaseService } from './services/supabaseService';
import { supabase } from './lib/supabase';
import { hashPassword, isPasswordHashed, sanitizeUser } from './utils/security';
import { LoginScreen } from './components/LoginScreen';
import { lazyWithRetry } from './utils/lazyWithRetry';
import { ErrorBoundary } from './components/ErrorBoundary';

// Code-split heavy interactive map and modal dialogs with automatic stale-chunk retry
const ParanaqueMap = lazyWithRetry(() => import('./components/ParanaqueMap').then(m => ({ default: m.ParanaqueMap })));
const TransferModal = lazyWithRetry(() => import('./components/TransferModal').then(m => ({ default: m.TransferModal })));
const AssetDetailModal = lazyWithRetry(() => import('./components/AssetDetailModal').then(m => ({ default: m.AssetDetailModal })));
const AddAssetModal = lazyWithRetry(() => import('./components/AddAssetModal').then(m => ({ default: m.AddAssetModal })));
const QuickScanModal = lazyWithRetry(() => import('./components/QuickScanModal').then(m => ({ default: m.QuickScanModal })));
const AuthModal = lazyWithRetry(() => import('./components/AuthModal').then(m => ({ default: m.AuthModal })));
const BorrowChecklistReceiptModal = lazyWithRetry(() => import('./components/BorrowChecklistReceiptModal').then(m => ({ default: m.BorrowChecklistReceiptModal })));
const AuditLogModal = lazyWithRetry(() => import('./components/AuditLogModal').then(m => ({ default: m.AuditLogModal })));
import { 
  Layers, 
  QrCode, 
  Plus, 
  MapIcon, 
  Database,
  Building2,
  ArrowRight 
} from './components/HugeIcons';

export function App() {
  // Current user / role (ADMIN or IT_OFFICER) - null when unauthenticated
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem('himu_current_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.id) {
          const safe = sanitizeUser(parsed) as AppUser;
          return {
            ...safe,
            username: safe.username || (safe.id === 'user-admin' ? 'admin' : safe.id === 'user-it-officer' ? 'itofficer' : safe.name.toLowerCase().replace(/[^a-z0-9]/g, '')),
          };
        }
      }
    } catch (e) {
      console.error(e);
    }
    return null; // Requires officer login
  });

  useEffect(() => {
    try {
      if (currentUser) {
        // Strip sensitive password before serializing active session in localStorage
        const safeUser = sanitizeUser(currentUser);
        localStorage.setItem('himu_current_user', JSON.stringify(safeUser));
      } else {
        localStorage.removeItem('himu_current_user');
      }
    } catch (e) {
      console.error(e);
    }
  }, [currentUser]);

  const handleLogout = () => {
    if (currentUser) {
      supabaseService.recordAuditLog({
        timestamp: new Date().toISOString(),
        action: 'AUTH_LOGOUT',
        category: 'SECURITY',
        officerId: currentUser.id,
        officerName: currentUser.name,
        officerRole: currentUser.role,
        details: `${currentUser.name} signed out of the system`,
      }).catch(() => {});
    }
    // Revoke Supabase Auth session token
    supabase.auth.signOut().catch(() => {});
    localStorage.removeItem('himu_current_user');
    setCurrentUser(null);
  };

  const currentOfficerName = currentUser?.name || 'HIMU IT OFFICER';

  // Registered HIMU staff users & administrators
  const [users, setUsers] = useState<AppUser[]>(() => {
    try {
      const saved = localStorage.getItem('himu_app_users');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((u: any) => ({
            ...u,
            username: u.username || (u.id === 'user-admin' ? 'admin' : u.id === 'user-it-officer' ? 'itofficer' : u.name.toLowerCase().replace(/[^a-z0-9]/g, '')),
            password: u.password || 'password123',
          }));
        }
      }
    } catch (e) {
      console.error('Failed to load local users', e);
    }
    return DEFAULT_USERS;
  });

  useEffect(() => {
    try {
      localStorage.setItem('himu_app_users', JSON.stringify(users));
    } catch (e) {
      console.error(e);
    }
  }, [users]);

  // Global Team Cover Photo (managed by Admin, default for all officers)
  const [globalCoverPhoto, setGlobalCoverPhoto] = useState<string | null>(() => {
    try {
      return localStorage.getItem('himu_global_cover_photo');
    } catch {
      return null;
    }
  });

  const handleUpdateGlobalCoverPhoto = async (photoUrl: string | null): Promise<boolean> => {
    try {
      if (photoUrl) {
        localStorage.setItem('himu_global_cover_photo', photoUrl);
      } else {
        localStorage.removeItem('himu_global_cover_photo');
      }
      setGlobalCoverPhoto(photoUrl);
      return true;
    } catch (e) {
      console.error('Failed to save global cover photo', e);
      return false;
    }
  };

  // Locations: 16 Real Parañaque Barangays + HIMU Depot
  const [locations, setLocations] = useState<BarangayLocation[]>(PARANAQUE_LOCATIONS);

  // Cloud sync status with Supabase
  const [syncStatus, setSyncStatus] = useState<'connected' | 'syncing' | 'offline'>('syncing');

  // Helper to reconcile any asset where latest active transfer was to a station but currentLocationId was out of sync
  const reconcileAssetLocations = (items: AssetItem[]): AssetItem[] => {
    return items.map((item) => {
      if (item.history && item.history.length > 0) {
        const latest = item.history[0];
        if (
          latest.toLocationId &&
          latest.status !== 'returned' &&
          latest.toLocationId !== item.currentLocationId
        ) {
          return {
            ...item,
            currentLocationId: latest.toLocationId,
          };
        }
      }
      return item;
    });
  };

  // Assets: Clean initial slate with Supabase sync + localStorage persistence
  const [assets, setAssets] = useState<AssetItem[]>(() => {
    try {
      const savedV2 = localStorage.getItem('himu_assets_pque_v2');
      if (savedV2) {
        const parsed = JSON.parse(savedV2);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return reconcileAssetLocations(parsed);
        }
      }
      const savedV1 = localStorage.getItem('himu_assets_pque_v1');
      if (savedV1) {
        const parsedV1 = JSON.parse(savedV1);
        if (Array.isArray(parsedV1) && parsedV1.length > 0) {
          return reconcileAssetLocations(parsedV1);
        }
      }
    } catch (e) {
      console.error('Failed to load localStorage', e);
    }
    return INITIAL_ASSETS;
  });

  // Fetch live Supabase data on mount and subscribe to real-time changes
  useEffect(() => {
    let isMounted = true;

    async function initCloudSync() {
      try {
        setSyncStatus('syncing');

        // 1. Fetch locations
        const cloudLocations = await supabaseService.getLocations();
        if (isMounted && cloudLocations && cloudLocations.length > 0) {
          setLocations(cloudLocations);
        }

        // 2. Fetch assets
        const cloudAssets = await supabaseService.getAssets();
        if (isMounted) {
          if (cloudAssets !== null) {
            setAssets(reconcileAssetLocations(cloudAssets));
            setSyncStatus('connected');
          } else {
            setSyncStatus('offline');
          }
        }

        // 3. Fetch registered staff users
        const cloudUsers = await supabaseService.getAppUsers();
        if (isMounted && cloudUsers && cloudUsers.length > 0) {
          setUsers(cloudUsers);
        }
      } catch (err) {
        console.warn('[App] Supabase sync initialization warning:', err);
        if (isMounted) setSyncStatus('offline');
      }
    }

    initCloudSync();

    // 4. Supabase Realtime multi-user subscription
    const unsubscribe = supabaseService.subscribeToChanges(async () => {
      const freshAssets = await supabaseService.getAssets();
      if (isMounted && freshAssets !== null) {
        setAssets(reconcileAssetLocations(freshAssets));
        setSyncStatus('connected');
      }

      const freshUsers = await supabaseService.getAppUsers();
      if (isMounted && freshUsers && freshUsers.length > 0) {
        setUsers(freshUsers);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Staff User Management Handlers (Enforce Role-Based Access Control)
  const handleAddUser = async (newUserData: Omit<AppUser, 'id'>) => {
    if (currentUser?.role !== 'ADMIN') {
      alert('Access Denied: Only Administrator accounts can register new staff.');
      return false;
    }

    let securePassword = newUserData.password;
    if (securePassword && !isPasswordHashed(securePassword)) {
      securePassword = await hashPassword(securePassword);
    } else if (!securePassword) {
      securePassword = await hashPassword('password123');
    }

    const newUser: AppUser = {
      ...newUserData,
      password: securePassword,
      id: `user-${Date.now()}`,
    };

    setUsers((prev) => [...prev, newUser]);

    // Sync to Supabase cloud
    await supabaseService.createAppUser(newUser);
    logAudit('AUTH_PROFILE_UPDATE', 'SECURITY', `Registered new staff account for ${newUser.name} (@${newUser.username}) [${newUser.role}]`);
    return true;
  };

  const handleDeleteUser = async (userId: string) => {
    if (currentUser?.role !== 'ADMIN') {
      alert('Access Denied: Only Administrator accounts can remove staff accounts.');
      return false;
    }

    const targetUser = users.find((u) => u.id === userId);
    setUsers((prev) => prev.filter((u) => u.id !== userId));

    // Sync to Supabase cloud
    await supabaseService.deleteAppUser(userId);
    logAudit('AUTH_PROFILE_UPDATE', 'SECURITY', `Deactivated / deleted account for ${targetUser?.name || userId}`);
    return true;
  };

  const handleUpdateUser = async (updatedUser: AppUser) => {
    // If not admin, you may only edit your own user account, and cannot escalate role to ADMIN
    if (currentUser?.role !== 'ADMIN') {
      if (currentUser?.id !== updatedUser.id) {
        alert('Access Denied: You may only modify your own staff profile.');
        return false;
      }
      if (updatedUser.role !== currentUser?.role) {
        alert('Access Denied: Only administrators can modify security roles.');
        return false;
      }
    }

    let userToSave = updatedUser;
    if (updatedUser.password && !isPasswordHashed(updatedUser.password)) {
      const securePassword = await hashPassword(updatedUser.password);
      userToSave = { ...updatedUser, password: securePassword };
    } else if (!updatedUser.password) {
      // Retain existing password if blank
      const existingUser = users.find((u) => u.id === updatedUser.id);
      if (existingUser?.password) {
        userToSave = { ...updatedUser, password: existingUser.password };
      }
    }

    setUsers((prev) => prev.map((u) => (u.id === userToSave.id ? userToSave : u)));
    if (currentUser && currentUser.id === userToSave.id) {
      setCurrentUser(userToSave);
    }

    // Sync to Supabase cloud
    await supabaseService.updateAppUser(userToSave);
    logAudit('AUTH_PROFILE_UPDATE', 'SECURITY', `Updated credentials / profile for ${userToSave.name} (@${userToSave.username})`);
    return true;
  };

  // Dynamic list of dispatch officers (merges custom registered users with default officers)
  const officerNames = useMemo(() => {
    const names = users.map((u) => u.name);
    return Array.from(new Set([...names, ...DISPATCH_OFFICERS]));
  }, [users]);

  useEffect(() => {
    try {
      localStorage.setItem('himu_assets_pque_v2', JSON.stringify(assets));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }, [assets]);

  // View toggles
  const [showMap, setShowMap] = useState(true);
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return false;
  });

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)');
    const onChange = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsDesktop(e.matches);
    };
    setIsDesktop(mql.matches);
    if (mql.addEventListener) {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    } else {
      mql.addListener(onChange);
      return () => mql.removeListener(onChange);
    }
  }, []);

  const [mobileTab, setMobileTab] = useState<'assets' | 'map' | 'stations'>('assets');

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
  const [addPresetLocationId, setAddPresetLocationId] = useState<string | undefined>(undefined);
  const [isScanOpen, setIsScanOpen] = useState(false);
  // Continuous Multi-Item Mobile Scan & Batch Dispatch Cart
  const [scannedBatch, setScannedBatch] = useState<AssetItem[]>([]);
  const [batchTransferAssets, setBatchTransferAssets] = useState<AssetItem[]>([]);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => supabaseService.getLocalAuditLogs());

  // Load audit logs from Supabase cloud (falls back to local)
  useEffect(() => {
    supabaseService.getAuditLogs().then((logs) => {
      if (logs && logs.length > 0) {
        setAuditLogs(logs);
      }
    });
  }, []);

  const logAudit = (
    action: AuditActionType,
    category: 'SECURITY' | 'DISPATCH' | 'INVENTORY' | 'COMPLIANCE',
    details: string,
    extra?: {
      assetId?: string;
      assetName?: string;
      serialNumber?: string;
      locationName?: string;
      referenceNo?: string;
      metadata?: Record<string, any>;
      officerId?: string;
      officerName?: string;
      officerRole?: string;
    }
  ) => {
    const officerName = extra?.officerName || currentUser?.name || 'HIMU OFFICER';
    const officerRole = extra?.officerRole || currentUser?.role || 'IT_OFFICER';
    const officerId = extra?.officerId || currentUser?.id;

    supabaseService
      .recordAuditLog({
        timestamp: new Date().toISOString(),
        action,
        category,
        officerId,
        officerName,
        officerRole,
        details,
        ...extra,
      })
      .then((newEntry) => {
        setAuditLogs((prev) => [newEntry, ...prev.filter((p) => p.id !== newEntry.id)]);
      })
      .catch((err) => console.error('Failed to record audit log', err));
  };

  // Official A5 Borrow Checklist Receipt Modal state
  const [activeChecklistRecord, setActiveChecklistRecord] = useState<AssetTransferRecord | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

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

  const handleOpenTransferForLocation = (_locationId: string) => {
    // Find an item stationed at HIMU Central depot, or any asset ready for deployment
    const staged = assets.find((a) => a.currentLocationId === 'loc-himu-hq' && a.status === 'in_service');
    const targetAsset = staged || assets[0];
    if (targetAsset) {
      setActiveAsset(targetAsset);
      setIsTransferOpen(true);
    }
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
    notes: string,
    checklistData?: {
      eventName: string;
      requestingOffice: string;
      borrowerName: string;
      borrowedAt: string;
      borrowedItemsList: BorrowChecklistItem[];
    }
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
      dispatchedAt: checklistData?.borrowedAt || new Date().toISOString(),
      receivedBy: receivedBy || undefined,
      status: 'in_transit',
      purpose,
      notes,
      eventName: checklistData?.eventName,
      requestingOffice: checklistData?.requestingOffice,
      borrowerName: checklistData?.borrowerName || receivedBy,
      borrowedItemsList: checklistData?.borrowedItemsList,
    };

    setAssets((prev) =>
      prev.map((item) => {
        if (item.id === assetId) {
          return {
            ...item,
            currentLocationId: toLocationId,
            status: 'in_transit',
            custodianName: receivedBy ? receivedBy : `In Transit via ${dispatchedBy}`,
            history: [newTransfer, ...item.history],
          };
        }
        return item;
      })
    );

    setActiveAsset((prev) =>
      prev && prev.id === assetId
        ? {
            ...prev,
            currentLocationId: toLocationId,
            status: 'in_transit',
            custodianName: receivedBy ? receivedBy : `In Transit via ${dispatchedBy}`,
            history: [newTransfer, ...prev.history],
          }
        : prev
    );

    // Auto-focus map and station drawer on destination barangay
    setSelectedLocationId(toLocationId);

    // Sync dispatch and asset updates to Supabase
    supabaseService.recordDispatch(newTransfer, {
      locationId: toLocationId,
      status: 'in_transit',
      custodianName: receivedBy ? receivedBy : `In Transit via ${dispatchedBy}`,
    });

    // Record in Audit Log
    logAudit(
      'ASSET_DISPATCHED',
      'DISPATCH',
      `Dispatched ${activeAsset?.name || 'Equipment'} to ${destLoc?.name || 'Destination'} for ${purpose}`,
      {
        assetId,
        assetName: activeAsset?.name,
        serialNumber: activeAsset?.serialNumber,
        locationName: destLoc?.name,
        referenceNo: newTransfer.referenceNo,
      }
    );

    // Auto-open official A5 checklist receipt upon borrow confirmation
    setActiveChecklistRecord(newTransfer);
    setIsReceiptOpen(true);
  };

  // Confirm Batch Dispatch for multiple assets scanned via mobile or desktop
  const handleConfirmBatchTransfer = (
    assetIds: string[],
    toLocationId: string,
    purpose: string,
    dispatchedBy: string,
    receivedBy: string,
    notes: string,
    checklistData?: {
      eventName: string;
      requestingOffice: string;
      borrowerName: string;
      borrowedAt: string;
      borrowedItemsList: BorrowChecklistItem[];
    }
  ) => {
    const destLoc = locations.find((l) => l.id === toLocationId);
    const sharedRefNo = `TR-PQUE-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const timestamp = checklistData?.borrowedAt || new Date().toISOString();

    const transferringAssets = assets.filter((a) => assetIds.includes(a.id));

    const transferRecords: AssetTransferRecord[] = transferringAssets.map((item, idx) => {
      const originLoc = locations.find((l) => l.id === item.currentLocationId);
      return {
        id: `tr-${Date.now()}-${idx}`,
        referenceNo: sharedRefNo,
        assetId: item.id,
        fromLocationId: originLoc?.id || '',
        toLocationId,
        fromLocationName: originLoc?.name || 'Central HIMU IT Depot',
        toLocationName: destLoc?.name || 'Destination',
        dispatchedBy,
        dispatchedAt: timestamp,
        receivedBy: receivedBy || undefined,
        status: 'in_transit',
        purpose,
        notes,
        eventName: checklistData?.eventName,
        requestingOffice: checklistData?.requestingOffice,
        borrowerName: checklistData?.borrowerName || receivedBy,
        borrowedItemsList: checklistData?.borrowedItemsList,
      };
    });

    // Bulk update assets in active state with new destination location
    setAssets((prev) =>
      prev.map((item) => {
        const record = transferRecords.find((r) => r.assetId === item.id);
        if (record) {
          return {
            ...item,
            currentLocationId: toLocationId,
            status: 'in_transit',
            custodianName: receivedBy ? receivedBy : `In Transit via ${dispatchedBy}`,
            history: [record, ...item.history],
          };
        }
        return item;
      })
    );

    // Auto-focus map and station drawer on destination barangay
    setSelectedLocationId(toLocationId);

    // Sync all transfer records to Supabase atomically
    supabaseService.recordBatchDispatch(transferRecords, {
      locationId: toLocationId,
      status: 'in_transit',
      custodianName: receivedBy ? receivedBy : `In Transit via ${dispatchedBy}`,
    });

    // Record in System Audit Trail
    logAudit(
      'ASSET_DISPATCHED',
      'DISPATCH',
      `Batch Dispatched ${transferringAssets.length} items to ${destLoc?.name || 'Destination'} for ${purpose} (Ref: ${sharedRefNo})`,
      {
        locationName: destLoc?.name,
        referenceNo: sharedRefNo,
        metadata: {
          batchCount: transferringAssets.length,
          assetTags: transferringAssets.map((a) => a.assetTag).join(', '),
        },
      }
    );

    // Clear batch queues
    setScannedBatch([]);
    setBatchTransferAssets([]);

    // Auto-open 1:1 physical A5 slip for this batch
    if (transferRecords.length > 0) {
      setActiveChecklistRecord(transferRecords[0]);
      setIsReceiptOpen(true);
    }
  };

  // Open A5 Receipt modal for a specific history record
  const handleOpenReceiptForRecord = (record: AssetTransferRecord) => {
    setActiveChecklistRecord(record);
    setIsReceiptOpen(true);
  };

  // Open A5 Receipt modal from Header (shows most recent borrow checklist, or prefilled official sample)
  const handleOpenQuickChecklist = () => {
    let foundRecord: AssetTransferRecord | null = null;

    // 1. Prioritize any record that already has checklist items
    for (const item of assets) {
      const match = item.history.find((h) => h.borrowedItemsList && h.borrowedItemsList.length > 0);
      if (match) {
        foundRecord = match;
        break;
      }
    }

    // 2. Or the latest transfer across all items
    if (!foundRecord) {
      for (const item of assets) {
        if (item.history.length > 0) {
          foundRecord = item.history[0];
          break;
        }
      }
    }

    // 3. Fallback: Generate authentic official record matching the user's paper photo 1-to-1
    if (!foundRecord) {
      const targetLoc = locations.find((l) => l.id === 'loc-marcelo-green') || locations[1];
      const targetAsset = assets.find((a) => a.category === 'Printer') || assets[0];
      const now = new Date();
      foundRecord = {
        id: `tr-sample-${Date.now()}`,
        referenceNo: `TR-PQUE-${now.getFullYear()}-1042`,
        assetId: targetAsset?.id || 'ast-sample',
        fromLocationId: 'loc-himu-hq',
        toLocationId: targetLoc.id,
        fromLocationName: 'HIMU Central IT Office (Parañaque City Hall)',
        toLocationName: targetLoc.name,
        dispatchedBy: currentOfficerName,
        dispatchedAt: now.toISOString(),
        receivedBy: 'MARICEL SANTOS (MIDWIFE II)',
        status: 'in_transit',
        purpose: 'PhilHealth YAKAP Profiling Event Deployment',
        notes: 'Handled with care; returned within 24 hours after profiling completion.',
        eventName: `PHILHEALTH YAKAP PROFILING ${targetLoc.name.replace(/^Barangay\s+/i, '').toUpperCase()}`,
        requestingOffice: `${targetLoc.name.toUpperCase()} HEALTH CENTER`,
        borrowerName: 'MARICEL SANTOS',
        borrowedItemsList: [
          {
            itemEquipment: targetAsset?.name || 'EPSON L5190 ALL-IN-ONE PRINTER',
            serialNo: targetAsset?.serialNumber || 'SN-EPS-2026-8812',
            quantity: 1,
            remarks: 'WITH POWER AND USB CABLE',
          },
          {
            itemEquipment: 'EXTENSIONS (HEAVY DUTY 3M)',
            serialNo: 'N/A',
            quantity: 2,
            remarks: 'COMPLETE 3-PRONG',
          },
          {
            itemEquipment: 'D-LINK / TP-LINK WIFI ROUTER',
            serialNo: 'SN-RTR-PQUE-5512',
            quantity: 1,
            remarks: 'WITH POWER ADAPTER',
          },
        ],
      };
    }

    setActiveChecklistRecord(foundRecord);
    setIsReceiptOpen(true);
  };

  // Mark items as returned to HIMU depot
  const handleMarkChecklistReturned = (recordId: string, officerName: string) => {
    const returnTime = new Date().toISOString();
    setAssets((prev) =>
      prev.map((asset) => {
        const hasRecord = asset.history.some((h) => h.id === recordId);
        if (!hasRecord) return asset;

        const updatedHistory = asset.history.map((h) => {
          if (h.id === recordId) {
            return {
              ...h,
              status: 'returned' as const,
              returnedAt: returnTime,
              returnedCheckedBy: officerName,
            };
          }
          return h;
        });

        return {
          ...asset,
          status: 'in_service' as const,
          currentLocationId: 'loc-himu-hq',
          custodianName: `HIMU Central Depot (${officerName})`,
          history: updatedHistory,
        };
      })
    );

    // Sync return to Supabase
    const targetAsset = assets.find((a) => a.history.some((h) => h.id === recordId));
    if (targetAsset) {
      supabaseService.markReturned(recordId, officerName, targetAsset.id, 'loc-himu-hq');
      logAudit(
        'ASSET_RETURNED',
        'DISPATCH',
        `Returned ${targetAsset.name} (SN: ${targetAsset.serialNumber}) to Central Depot. Inspected by ${officerName}`,
        {
          assetId: targetAsset.id,
          assetName: targetAsset.name,
          serialNumber: targetAsset.serialNumber,
          locationName: 'HIMU Central Depot',
          referenceNo: targetAsset.history.find((h) => h.id === recordId)?.referenceNo,
        }
      );
    }

    if (activeChecklistRecord && activeChecklistRecord.id === recordId) {
      setActiveChecklistRecord((prev) =>
        prev
          ? {
              ...prev,
              status: 'returned',
              returnedAt: returnTime,
              returnedCheckedBy: officerName,
            }
          : null
      );
    }
  };

  // Derive asset & location for the active checklist receipt
  const activeChecklistAsset = useMemo(() => {
    if (!activeChecklistRecord) return null;
    return assets.find((a) => a.id === activeChecklistRecord.assetId) || activeAsset || null;
  }, [activeChecklistRecord, assets, activeAsset]);

  const activeChecklistLocation = useMemo(() => {
    if (!activeChecklistRecord) return null;
    return locations.find((l) => l.id === activeChecklistRecord.toLocationId) || null;
  }, [activeChecklistRecord, locations]);

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

    setActiveAsset((prev) => {
      if (prev && prev.id === assetId && prev.history.length > 0) {
        const latest = prev.history[0];
        return {
          ...prev,
          status: 'in_service',
          currentLocationId: latest.toLocationId,
          history: [
            {
              ...latest,
              status: 'received',
              receivedAt: new Date().toISOString(),
              receivedBy: prev.custodianName || 'Barangay Health Staff',
            },
            ...prev.history.slice(1),
          ],
        };
      }
      return prev;
    });
  };

  // Quick Drag-and-Drop Relocation Handler (every drag to a barangay is a borrow!)
  const handleQuickRelocateAsset = (assetId: string, toLocationId: string, customEventTitle?: string) => {
    const asset = assets.find((a) => a.id === assetId);
    if (!asset || asset.currentLocationId === toLocationId) return;

    const fromLoc = locations.find((l) => l.id === asset.currentLocationId);
    const toLoc = locations.find((l) => l.id === toLocationId);
    const isReturningToHq = toLocationId === 'loc-himu-hq';
    const locCleanName = toLoc?.name.replace(/^Barangay\s+/i, '').toUpperCase() || 'HEALTH STATION';
    const baseEventTitle = customEventTitle?.trim() || 'PHILHEALTH YAKAP PROFILING';
    const profilingEventName = `${baseEventTitle} ${locCleanName}`.toUpperCase();
    const requestingOffice = `${toLoc?.name.toUpperCase() || 'BARANGAY'} HEALTH CENTER`;
    const borrowerName = `${toLoc?.name.toUpperCase() || 'BARANGAY'} HEALTH CUSTODIAN`;

    const newTransfer: AssetTransferRecord = {
      id: `tr-${Date.now()}`,
      referenceNo: `TR-PQUE-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      assetId,
      fromLocationId: asset.currentLocationId,
      toLocationId,
      fromLocationName: fromLoc?.name || 'HIMU Central Depot',
      toLocationName: toLoc?.name || (isReturningToHq ? 'HIMU Central IT Office' : 'Assigned Barangay'),
      dispatchedBy: currentOfficerName,
      dispatchedAt: new Date().toISOString(),
      receivedBy: isReturningToHq
        ? 'HIMU Depot Inventory Custodian'
        : borrowerName,
      status: isReturningToHq ? 'returned' : 'in_transit',
      purpose: isReturningToHq
        ? 'Returned to Central Depot for warehouse staging & maintenance'
        : profilingEventName,
      eventName: isReturningToHq ? undefined : profilingEventName,
      requestingOffice: isReturningToHq ? undefined : requestingOffice,
      borrowerName: isReturningToHq ? undefined : borrowerName,
      borrowedItemsList: isReturningToHq
        ? undefined
        : [
            {
              itemEquipment: asset.name.toUpperCase(),
              serialNo: asset.serialNumber,
              quantity: 1,
              remarks:
                asset.category === 'Printer'
                  ? 'WITH POWER AND CABLE'
                  : asset.category === 'Network Router'
                  ? 'WITH POWER ADAPTER'
                  : 'COMPLETE POWER',
            },
          ],
    };

    setAssets((prev) =>
      prev.map((item) => {
        if (item.id === assetId) {
          return {
            ...item,
            currentLocationId: toLocationId,
            status: 'in_service',
            custodianName: isReturningToHq
              ? 'HIMU Central Depot Staging'
              : `${toLoc?.name || 'Barangay'} Health Custodian`,
            history: [newTransfer, ...item.history],
          };
        }
        return item;
      })
    );

    // Sync quick relocate dispatch to Supabase
    supabaseService.recordDispatch(newTransfer, {
      locationId: toLocationId,
      status: 'in_service',
      custodianName: isReturningToHq
        ? 'HIMU Central Depot Staging'
        : `${toLoc?.name || 'Barangay'} Health Custodian`,
    });

    // Record in Audit Log
    logAudit(
      isReturningToHq ? 'ASSET_RETURNED' : 'ASSET_DISPATCHED',
      'DISPATCH',
      isReturningToHq
        ? `Returned ${asset.name} (SN: ${asset.serialNumber}) to Central Depot from ${fromLoc?.name || 'Barangay'}`
        : `Dispatched ${asset.name} (SN: ${asset.serialNumber}) to ${toLoc?.name || 'Barangay'} for ${profilingEventName}`,
      {
        assetId: asset.id,
        assetName: asset.name,
        serialNumber: asset.serialNumber,
        locationName: toLoc?.name,
        referenceNo: newTransfer.referenceNo,
      }
    );
  };

  // 1-Click Delete / Cancel Borrow (Restores asset back to HIMU Depot staging)
  const handleDeleteOrUndoBorrow = (assetId: string) => {
    const target = assets.find((a) => a.id === assetId);
    if (target) {
      logAudit(
        'ASSET_UPDATED',
        'DISPATCH',
        `Cancelled dispatch and returned ${target.name} (SN: ${target.serialNumber}) to Central Depot staging`,
        {
          assetId,
          assetName: target.name,
          serialNumber: target.serialNumber,
          locationName: 'HIMU Central Depot Staging',
        }
      );
    }

    setAssets((prev) =>
      prev.map((item) => {
        if (item.id === assetId) {
          const previousHistory = item.history.length > 1 ? item.history.slice(1) : item.history;
          return {
            ...item,
            currentLocationId: 'loc-himu-hq',
            status: 'in_service',
            custodianName: 'HIMU Central Depot Staging',
            history: previousHistory,
          };
        }
        return item;
      })
    );
  };

  // Print official A5 Borrow Slip for a single asset directly from the map
  const handlePrintA5ForAsset = (asset: AssetItem, customEventTitle?: string) => {
    const targetLoc = locations.find((l) => l.id === asset.currentLocationId);
    const locCleanName = targetLoc?.name.replace(/^Barangay\s+/i, '').toUpperCase() || 'HEALTH STATION';
    const baseEventTitle = customEventTitle?.trim() || 'PHILHEALTH YAKAP PROFILING';
    const profilingEventName = `${baseEventTitle} ${locCleanName}`.toUpperCase();
    const latestRecord = asset.history.find((h) => h.toLocationId === asset.currentLocationId) || asset.history[0];

    const record: AssetTransferRecord = latestRecord
      ? {
          ...latestRecord,
          eventName: customEventTitle ? profilingEventName : (latestRecord.eventName || profilingEventName),
        }
      : {
          id: `tr-${Date.now()}`,
          referenceNo: `TR-PQUE-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          assetId: asset.id,
          fromLocationId: 'loc-himu-hq',
          toLocationId: asset.currentLocationId,
          fromLocationName: 'HIMU Central IT Office (Parañaque City Hall)',
          toLocationName: targetLoc?.name || 'Assigned Barangay',
          dispatchedBy: currentOfficerName,
          dispatchedAt: new Date().toISOString(),
          receivedBy: `${targetLoc?.name || 'BARANGAY'} HEALTH CUSTODIAN`,
          status: 'in_transit',
          purpose: profilingEventName,
          eventName: profilingEventName,
          requestingOffice: `${targetLoc?.name.toUpperCase() || 'BARANGAY'} HEALTH CENTER`,
          borrowerName: `${targetLoc?.name.toUpperCase() || 'BARANGAY'} HEALTH CUSTODIAN`,
          borrowedItemsList: [
            {
              itemEquipment: asset.name.toUpperCase(),
              serialNo: asset.serialNumber,
              quantity: 1,
              remarks: asset.category === 'Printer' ? 'WITH POWER AND CABLE' : 'WITH POWER',
            },
          ],
        };

    setActiveChecklistRecord(record);
    setIsReceiptOpen(true);
  };

  // Print consolidated official A5 Borrow Slip for all equipment borrowed by a Barangay
  const handlePrintA5ForBarangay = (locationId: string, customEventTitle?: string) => {
    const targetLoc = locations.find((l) => l.id === locationId);
    if (!targetLoc) return;

    const locCleanName = targetLoc.name.replace(/^Barangay\s+/i, '').toUpperCase();
    const baseEventTitle = customEventTitle?.trim() || 'PHILHEALTH YAKAP PROFILING';
    const profilingEventName = `${baseEventTitle} ${locCleanName}`.toUpperCase();
    const locAssets = assets.filter((a) => a.currentLocationId === locationId);

    const itemsList: BorrowChecklistItem[] = locAssets.length > 0
      ? locAssets.map((item) => ({
          itemEquipment: item.name.toUpperCase(),
          serialNo: item.serialNumber,
          quantity: 1,
          remarks: item.category === 'Printer' ? 'WITH POWER AND CABLE' : item.category === 'Network Router' ? 'WITH POWER ADAPTER' : '3-PRONG COMPLETE',
        }))
      : [
          {
            itemEquipment: 'EPSON L5190 ALL-IN-ONE PRINTER',
            serialNo: 'SN-EPS-2026-8812',
            quantity: 1,
            remarks: 'WITH POWER AND CABLE',
          },
          {
            itemEquipment: '2 EXTENSIONS (HEAVY DUTY 3M)',
            serialNo: 'N/A',
            quantity: 2,
            remarks: 'COMPLETE 3-PRONG',
          },
          {
            itemEquipment: 'D-LINK WIFI ROUTER',
            serialNo: 'SN-RTR-5512',
            quantity: 1,
            remarks: 'WITH POWER ADAPTER',
          },
        ];

    const consolidatedRecord: AssetTransferRecord = {
      id: `tr-brgy-${Date.now()}`,
      referenceNo: `TR-PQUE-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      assetId: locAssets[0]?.id || 'ast-consolidated',
      fromLocationId: 'loc-himu-hq',
      toLocationId: locationId,
      fromLocationName: 'HIMU Central IT Office (Parañaque City Hall)',
      toLocationName: targetLoc.name,
      dispatchedBy: currentOfficerName,
      dispatchedAt: new Date().toISOString(),
      receivedBy: `${targetLoc.name.toUpperCase()} HEALTH CUSTODIAN`,
      status: 'in_transit',
      purpose: profilingEventName,
      eventName: profilingEventName,
      requestingOffice: `${targetLoc.name.toUpperCase()} HEALTH CENTER`,
      borrowerName: `${targetLoc.name.toUpperCase()} HEALTH CUSTODIAN`,
      borrowedItemsList: itemsList,
    };

    setActiveChecklistRecord(consolidatedRecord);
    setIsReceiptOpen(true);
  };

  const handleAddAsset = (newAssetData: Omit<AssetItem, 'id' | 'history'>) => {
    // Duplicate serial check to prevent double entry
    const cleanSerial = newAssetData.serialNumber?.trim().toLowerCase();
    const isPlaceholder = !cleanSerial || cleanSerial === 'n/a' || cleanSerial === 'none' || cleanSerial === 'na';

    if (!isPlaceholder) {
      const existing = assets.find(
        (a) => a.serialNumber && a.serialNumber.trim().toLowerCase() === cleanSerial
      );
      if (existing) {
        alert(
          `Registration Blocked: Serial number "${newAssetData.serialNumber}" is already registered to ${existing.name} (${existing.assetTag}). Double entry is prevented.`
        );
        return;
      }
    }

    const assetId = `ast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const transferId = `tr-init-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const refNo = `TR-PQUE-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newAsset: AssetItem = {
      ...newAssetData,
      id: assetId,
      history: [
        {
          id: transferId,
          referenceNo: refNo,
          assetId: assetId,
          fromLocationId: 'loc-himu-hq',
          toLocationId: newAssetData.currentLocationId,
          fromLocationName: 'HIMU Central IT Office (Parañaque City Hall)',
          toLocationName:
            locations.find((l) => l.id === newAssetData.currentLocationId)?.name ||
            'Assigned Barangay',
          dispatchedBy: currentOfficerName,
          dispatchedAt: new Date().toISOString(),
          status: 'received',
          purpose: 'Initial inventory intake and deployment',
        },
      ],
    };

    setAssets((prev) => [newAsset, ...prev]);

    // Automatically highlight and select the assigned location so it is immediately visible in registry & map
    setSelectedLocationId(newAsset.currentLocationId);
    setSelectedCategory('ALL');
    setSelectedStatus('ALL');
    setSearchQuery('');

    // Sync new asset to Supabase cloud
    supabaseService.createAsset(newAsset);

    // Record in Audit Log
    logAudit(
      'ASSET_CREATED',
      'INVENTORY',
      `Registered new hardware ${newAsset.name} (Tag: ${newAsset.assetTag}, SN: ${newAsset.serialNumber})`,
      {
        assetId: newAsset.id,
        assetName: newAsset.name,
        serialNumber: newAsset.serialNumber,
        locationName: locations.find((l) => l.id === newAsset.currentLocationId)?.name,
      }
    );
  };

  const handleOpenAddForLocation = (locationId?: string) => {
    setAddPresetLocationId(locationId);
    setIsAddOpen(true);
  };

  // Quick Deploy Standard Barangay IT Kit (1 Printer, 1 Router, 2 Extension Cords)
  const handleDeployHealthKit = (locationId: string) => {
    const targetLoc = locations.find((l) => l.id === locationId);
    if (!targetLoc) return;

    const ts = Date.now();
    const year = new Date().getFullYear();

    const newKitItems: AssetItem[] = [
      {
        id: `ast-prn-${ts}`,
        assetTag: `HIMU-PRN-${year}-${Math.floor(100 + Math.random() * 900)}`,
        name: 'Epson EcoTank L3210 All-in-One Ink Tank Printer',
        category: 'Printer',
        brandModel: 'Epson EcoTank L3210 (Print / Scan / Copy)',
        serialNumber: `SN-EPS-${year}-${Math.floor(1000 + Math.random() * 9000)}`,
        currentLocationId: locationId,
        status: 'in_service',
        custodianName: `${targetLoc.name} Health Center Nurse Station`,
        custodianRole: 'Clinic Nurse / EMR Encoder',
        acquisitionDate: new Date().toISOString().split('T')[0],
        notes: 'High-volume tank printer for PhilHealth forms, maternal records & prescriptions.',
        history: [
          {
            id: `tr-init-${ts}-1`,
            referenceNo: `TR-PQUE-${year}-${Math.floor(1000 + Math.random() * 9000)}`,
            assetId: `ast-prn-${ts}`,
            fromLocationId: 'loc-himu-hq',
            toLocationId: locationId,
            fromLocationName: 'HIMU Central IT Office (Parañaque City Hall)',
            toLocationName: targetLoc.name,
            dispatchedBy: currentOfficerName,
            dispatchedAt: new Date().toISOString(),
            status: 'received',
            purpose: 'Standard Barangay Health Center IT Kit Deployment',
          },
        ],
      },
      {
        id: `ast-rtr-${ts}`,
        assetTag: `HIMU-RTR-${year}-${Math.floor(100 + Math.random() * 900)}`,
        name: 'TP-Link Archer AX55 Wi-Fi 6 Gigabit Router',
        category: 'Network Router',
        brandModel: 'TP-Link Archer AX55 (AX3000 Dual-Band Gigabit)',
        serialNumber: `SN-TPL-${year}-${Math.floor(1000 + Math.random() * 9000)}`,
        currentLocationId: locationId,
        status: 'in_service',
        custodianName: `${targetLoc.name} IT Station`,
        custodianRole: 'Barangay IT Coordinator',
        acquisitionDate: new Date().toISOString().split('T')[0],
        notes: 'Dedicated EMR clinical VLAN with high-gain antennas for health station tablet sync.',
        history: [
          {
            id: `tr-init-${ts}-2`,
            referenceNo: `TR-PQUE-${year}-${Math.floor(1000 + Math.random() * 9000)}`,
            assetId: `ast-rtr-${ts}`,
            fromLocationId: 'loc-himu-hq',
            toLocationId: locationId,
            fromLocationName: 'HIMU Central IT Office (Parañaque City Hall)',
            toLocationName: targetLoc.name,
            dispatchedBy: currentOfficerName,
            dispatchedAt: new Date().toISOString(),
            status: 'received',
            purpose: 'Standard Barangay Health Center IT Kit Deployment',
          },
        ],
      },
      {
        id: `ast-ext-${ts}-1`,
        assetTag: `HIMU-EXT-${year}-${Math.floor(100 + Math.random() * 900)}`,
        name: 'Omni 5-Gang Heavy-Duty Surge Protector Power Strip (5M)',
        category: 'Extension Cord / Power',
        brandModel: 'Omni WS-500 Heavy Duty 2500W (5 Meters)',
        serialNumber: `SN-OMN-${year}-${Math.floor(1000 + Math.random() * 9000)}`,
        currentLocationId: locationId,
        status: 'in_service',
        custodianName: `${targetLoc.name} Triage Desk`,
        custodianRole: 'Health Center Custodian',
        acquisitionDate: new Date().toISOString().split('T')[0],
        notes: 'Surge protected multi-gang strip for workstation, printer & barcode scanner.',
        history: [
          {
            id: `tr-init-${ts}-3`,
            referenceNo: `TR-PQUE-${year}-${Math.floor(1000 + Math.random() * 9000)}`,
            assetId: `ast-ext-${ts}-1`,
            fromLocationId: 'loc-himu-hq',
            toLocationId: locationId,
            fromLocationName: 'HIMU Central IT Office (Parañaque City Hall)',
            toLocationName: targetLoc.name,
            dispatchedBy: currentOfficerName,
            dispatchedAt: new Date().toISOString(),
            status: 'received',
            purpose: 'Standard Barangay Health Center IT Kit Deployment',
          },
        ],
      },
      {
        id: `ast-ext-${ts}-2`,
        assetTag: `HIMU-EXT-${year}-${Math.floor(100 + Math.random() * 900)}`,
        name: 'Omni 3-Gang Heavy-Duty Extension Cord (3M)',
        category: 'Extension Cord / Power',
        brandModel: 'Omni WS-300 Heavy Duty (3 Meters)',
        serialNumber: `SN-OMN-${year}-${Math.floor(1000 + Math.random() * 9000)}`,
        currentLocationId: locationId,
        status: 'in_service',
        custodianName: `${targetLoc.name} Consultation Desk`,
        custodianRole: 'Health Center Custodian',
        acquisitionDate: new Date().toISOString().split('T')[0],
        notes: 'Power extension for physician consultation diagnostic tablet & lamp.',
        history: [
          {
            id: `tr-init-${ts}-4`,
            referenceNo: `TR-PQUE-${year}-${Math.floor(1000 + Math.random() * 9000)}`,
            assetId: `ast-ext-${ts}-2`,
            fromLocationId: 'loc-himu-hq',
            toLocationId: locationId,
            fromLocationName: 'HIMU Central IT Office (Parañaque City Hall)',
            toLocationName: targetLoc.name,
            dispatchedBy: currentOfficerName,
            dispatchedAt: new Date().toISOString(),
            status: 'received',
            purpose: 'Standard Barangay Health Center IT Kit Deployment',
          },
        ],
      },
    ];

    setAssets((prev) => [...newKitItems, ...prev]);

    // Sync deployed health kit items to Supabase cloud
    newKitItems.forEach((item) => {
      supabaseService.createAsset(item);
    });
  };

  // 1-Click Deploy to All 16 Barangays
  const handleDeployAllBarangaysKit = () => {
    const barangayLocations = locations.filter((l) => l.type === 'barangay');
    const allItems: AssetItem[] = [];
    const year = new Date().getFullYear();

    barangayLocations.forEach((loc, index) => {
      const ts = Date.now() + index * 10;
      allItems.push(
        {
          id: `ast-prn-${ts}`,
          assetTag: `HIMU-PRN-${year}-${100 + index}`,
          name: 'Epson EcoTank L3210 All-in-One Ink Tank Printer',
          category: 'Printer',
          brandModel: 'Epson EcoTank L3210 (Print / Scan / Copy)',
          serialNumber: `SN-EPS-${year}-${2000 + index}`,
          currentLocationId: loc.id,
          status: 'in_service',
          custodianName: `${loc.name} Health Center Nurse Station`,
          custodianRole: 'Clinic Nurse / EMR Encoder',
          acquisitionDate: new Date().toISOString().split('T')[0],
          notes: 'High-volume tank printer for PhilHealth forms, maternal records & prescriptions.',
          history: [
            {
              id: `tr-init-${ts}-1`,
              referenceNo: `TR-PQUE-${year}-${3000 + index}`,
              assetId: `ast-prn-${ts}`,
              fromLocationId: 'loc-himu-hq',
              toLocationId: loc.id,
              fromLocationName: 'HIMU Central IT Office (Parañaque City Hall)',
              toLocationName: loc.name,
              dispatchedBy: currentOfficerName,
              dispatchedAt: new Date().toISOString(),
              status: 'received',
              purpose: 'City-wide Standard Health Center IT Kit Deployment',
            },
          ],
        },
        {
          id: `ast-rtr-${ts}`,
          assetTag: `HIMU-RTR-${year}-${100 + index}`,
          name: 'TP-Link Archer AX55 Wi-Fi 6 Gigabit Router',
          category: 'Network Router',
          brandModel: 'TP-Link Archer AX55 (AX3000 Dual-Band Gigabit)',
          serialNumber: `SN-TPL-${year}-${4000 + index}`,
          currentLocationId: loc.id,
          status: 'in_service',
          custodianName: `${loc.name} IT Station`,
          custodianRole: 'Barangay IT Coordinator',
          acquisitionDate: new Date().toISOString().split('T')[0],
          notes: 'Dedicated EMR clinical VLAN with high-gain antennas for health station tablet sync.',
          history: [
            {
              id: `tr-init-${ts}-2`,
              referenceNo: `TR-PQUE-${year}-${5000 + index}`,
              assetId: `ast-rtr-${ts}`,
              fromLocationId: 'loc-himu-hq',
              toLocationId: loc.id,
              fromLocationName: 'HIMU Central IT Office (Parañaque City Hall)',
              toLocationName: loc.name,
              dispatchedBy: currentOfficerName,
              dispatchedAt: new Date().toISOString(),
              status: 'received',
              purpose: 'City-wide Standard Health Center IT Kit Deployment',
            },
          ],
        },
        {
          id: `ast-ext-${ts}-1`,
          assetTag: `HIMU-EXT-${year}-${100 + index}-A`,
          name: 'Omni 5-Gang Heavy-Duty Surge Protector Power Strip (5M)',
          category: 'Extension Cord / Power',
          brandModel: 'Omni WS-500 Heavy Duty 2500W (5 Meters)',
          serialNumber: `SN-OMN-${year}-${6000 + index}`,
          currentLocationId: loc.id,
          status: 'in_service',
          custodianName: `${loc.name} Triage Desk`,
          custodianRole: 'Health Center Custodian',
          acquisitionDate: new Date().toISOString().split('T')[0],
          notes: 'Surge protected multi-gang strip for workstation, printer & barcode scanner.',
          history: [
            {
              id: `tr-init-${ts}-3`,
              referenceNo: `TR-PQUE-${year}-${7000 + index}`,
              assetId: `ast-ext-${ts}-1`,
              fromLocationId: 'loc-himu-hq',
              toLocationId: loc.id,
              fromLocationName: 'HIMU Central IT Office (Parañaque City Hall)',
              toLocationName: loc.name,
              dispatchedBy: currentOfficerName,
              dispatchedAt: new Date().toISOString(),
              status: 'received',
              purpose: 'City-wide Standard Health Center IT Kit Deployment',
            },
          ],
        },
        {
          id: `ast-ext-${ts}-2`,
          assetTag: `HIMU-EXT-${year}-${100 + index}-B`,
          name: 'Omni 3-Gang Heavy-Duty Extension Cord (3M)',
          category: 'Extension Cord / Power',
          brandModel: 'Omni WS-300 Heavy Duty (3 Meters)',
          serialNumber: `SN-OMN-${year}-${8000 + index}`,
          currentLocationId: loc.id,
          status: 'in_service',
          custodianName: `${loc.name} Consultation Desk`,
          custodianRole: 'Health Center Custodian',
          acquisitionDate: new Date().toISOString().split('T')[0],
          notes: 'Power extension for physician consultation diagnostic tablet & lamp.',
          history: [
            {
              id: `tr-init-${ts}-4`,
              referenceNo: `TR-PQUE-${year}-${9000 + index}`,
              assetId: `ast-ext-${ts}-2`,
              fromLocationId: 'loc-himu-hq',
              toLocationId: loc.id,
              fromLocationName: 'HIMU Central IT Office (Parañaque City Hall)',
              toLocationName: loc.name,
              dispatchedBy: currentOfficerName,
              dispatchedAt: new Date().toISOString(),
              status: 'received',
              purpose: 'City-wide Standard Health Center IT Kit Deployment',
            },
          ],
        }
      );
    });

    setAssets(allItems);
  };

  // Decoupled hero parallax driven directly by ref and requestAnimationFrame (no root re-render)
  const heroImageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (heroImageRef.current) {
            const y = window.scrollY;
            if (y <= 650) {
              heroImageRef.current.style.transform = `translate3d(0, ${y * 0.38}px, 0) scale(${1.06 + Math.min(y * 0.0002, 0.04)})`;
            }
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Authentication Gate: Require authorized officer credentials before accessing dashboard
  if (!currentUser) {
    return (
      <LoginScreen
        users={users}
        onLogin={(user) => {
          setCurrentUser(user);
          supabaseService.recordAuditLog({
            timestamp: new Date().toISOString(),
            action: 'AUTH_LOGIN',
            category: 'SECURITY',
            officerId: user.id,
            officerName: user.name,
            officerRole: user.role,
            details: `${user.name} authenticated into the system`,
          }).then((entry) => {
            setAuditLogs((prev) => [entry, ...prev.filter((p) => p.id !== entry.id)]);
          }).catch(() => {});
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-28 text-neutral-900 selection:bg-neutral-900 selection:text-white">
      {/* Dynamic Header: Transparent over hero at first, self-manages floating rounded white header on scroll */}
      <Header
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenAddModal={() => setIsAddOpen(true)}
        onOpenScanModal={() => setIsScanOpen(true)}
        onOpenAuthModal={() => setIsAuthOpen(true)}
        onOpenChecklistModal={handleOpenQuickChecklist}
        onOpenAuditModal={() => setIsAuditOpen(true)}
        currentUser={currentUser}
        onLogout={handleLogout}
        syncStatus={syncStatus}
      />

      {/* Full-Width 21:9 HIMU Team Background Header with 3D Parallax Effect */}
      {(() => {
        const activeCoverPhoto = currentUser.coverPhotoUrl || globalCoverPhoto || '/himu-team-banner-1920.webp';
        return (
          <div className="no-print relative w-full overflow-hidden bg-neutral-950 aspect-[21/9] min-h-[260px] sm:min-h-[380px] lg:min-h-[480px] max-h-[580px] shadow-xs">
            {activeCoverPhoto === '/himu-team-banner-1920.webp' ? (
              <picture>
                <source
                  type="image/webp"
                  srcSet="/himu-team-banner-800.webp 800w, /himu-team-banner-1920.webp 1920w, /himu-team-banner.webp 2880w"
                  sizes="100vw"
                />
                <img
                  ref={heroImageRef}
                  src="/himu-team-banner-1920.webp"
                  srcSet="/himu-team-banner-800.webp 800w, /himu-team-banner-1920.webp 1920w, /himu-team-banner.webp 2880w"
                  sizes="100vw"
                  alt="HIMU IT Operations Team"
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  style={{
                    transform: 'translate3d(0, 0px, 0) scale(1.06)',
                    willChange: 'transform',
                  }}
                  className="absolute inset-0 h-[125%] -top-[12%] w-full object-cover object-[center_28%] select-none pointer-events-none"
                />
              </picture>
            ) : (
              <img
                ref={heroImageRef}
                src={activeCoverPhoto}
                alt="HIMU Operations Cover"
                loading="eager"
                fetchPriority="high"
                decoding="async"
                style={{
                  transform: 'translate3d(0, 0px, 0) scale(1.06)',
                  willChange: 'transform',
                }}
                className="absolute inset-0 h-[125%] -top-[12%] w-full object-cover object-center select-none pointer-events-none"
              />
            )}
          </div>
        );
      })()}

      {/* Main Content Container with Stat Cards Overlapping Banner */}
      <main className="no-print mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 space-y-6">
        
        {/* Supabase Cloud Setup Banner (shown only if database tables are pending creation) */}
        {syncStatus === 'offline' && (
          <div className="relative z-30 -mt-6 sm:-mt-8 rounded-2xl bg-amber-500/10 border border-amber-500/30 backdrop-blur-md p-3.5 sm:p-4 text-neutral-900 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-ping shrink-0" />
              <div className="text-xs">
                <strong className="text-amber-950 font-bold block sm:inline">Supabase Cloud Ready: </strong>
                <span className="text-amber-900">
                  Run <code className="font-mono bg-amber-100/80 px-1 py-0.5 rounded text-[11px] font-bold">supabase/schema.sql</code> in your Supabase SQL Editor to enable live database storage and multi-device real-time sync.
                </span>
              </div>
            </div>
            <a
              href="https://supabase.com/dashboard/project/obwygaccpfekzjmutjeo/sql"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-900 hover:bg-amber-800 text-white px-3 py-1.5 text-xs font-bold transition shrink-0 shadow-xs"
            >
              Open SQL Editor ↗
            </a>
          </div>
        )}

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

          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => setShowMap(!showMap)}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-white border border-neutral-200/90 px-3.5 py-2 text-xs font-semibold text-neutral-700 hover:text-neutral-950 transition active:scale-95 shadow-2xs"
            >
              <MapIcon className="h-4 w-4 text-emerald-600" />
              <span>{showMap ? 'Hide Map' : 'Show Map'}</span>
            </button>
          </div>
        </div>

        {/* Interactive Parañaque Leaflet Map - Desktop, Tablet & Mobile */}
        {showMap && (isDesktop || mobileTab === 'map') && (
          <div id="paranaque-map-section" className="scroll-mt-24">
            <ErrorBoundary>
              <Suspense
                fallback={
                  <div className="h-[460px] w-full rounded-3xl bg-white border border-neutral-200/90 flex flex-col items-center justify-center gap-2 text-xs font-semibold text-neutral-400 shadow-xs">
                    <div className="h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <span>Loading Parañaque GeoMap...</span>
                  </div>
                }
              >
                <ParanaqueMap
                  locations={locations}
                  assets={assets}
                  selectedLocationId={selectedLocationId}
                  onSelectLocation={setSelectedLocationId}
                  onOpenTransfer={handleOpenTransfer}
                  onOpenAddModal={handleOpenAddForLocation}
                  onDeployKit={handleDeployHealthKit}
                  onDeployAllKits={handleDeployAllBarangaysKit}
                  onQuickRelocate={handleQuickRelocateAsset}
                  onPrintA5ForAsset={handlePrintA5ForAsset}
                  onPrintA5ForBarangay={handlePrintA5ForBarangay}
                  onDeleteBorrow={handleDeleteOrUndoBorrow}
                />
              </Suspense>
            </ErrorBoundary>
          </div>
        )}

        {/* Mobile View: Stations List (Only shown when mobileTab === 'stations' on mobile) */}
        {mobileTab === 'stations' && (
          <div className="md:hidden">
            <BarangayStationsMobileList
              locations={locations}
              assets={assets}
              onOpenTransferForLocation={handleOpenTransferForLocation}
              onPrintA5ForBarangay={handlePrintA5ForBarangay}
              onViewAssetsForLocation={(locId) => {
                setSelectedLocationId(locId);
                setMobileTab('assets');
              }}
            />
          </div>
        )}

        {/* Primary Asset Registry & Barangay Selector (Single mounted instance) */}
        <div className={`${mobileTab === 'stations' || mobileTab === 'map' ? 'hidden md:block' : 'block'} space-y-4 sm:space-y-6`}>
          <BarangaySelector
            locations={locations}
            assets={assets}
            selectedLocationId={selectedLocationId}
            onSelectLocation={setSelectedLocationId}
          />

          <div id="asset-registry-section" className="scroll-mt-24">
            <AssetList
              assets={filteredAssets}
              locations={locations}
              onOpenTransfer={handleOpenTransfer}
              onOpenDetail={handleOpenDetail}
              onOpenAddModal={() => setIsAddOpen(true)}
              onPrintA5ForAsset={handlePrintA5ForAsset}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              selectedStatus={selectedStatus}
              onSelectStatus={setSelectedStatus}
              totalCount={assets.length}
              selectedLocationName={locations.find((l) => l.id === selectedLocationId)?.name || null}
              onResetFilters={() => {
                setSelectedLocationId(null);
                setSelectedCategory('ALL');
                setSelectedStatus('ALL');
                setSearchQuery('');
              }}
            />
          </div>
        </div>

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

      {/* Mobile Native Docked Bottom Navigation Bar */}
      <nav 
        aria-label="Mobile Bottom Navigation"
        className="no-print fixed bottom-0 inset-x-0 z-40 sm:hidden bg-white/95 backdrop-blur-md border-t border-neutral-200/90 shadow-2xl px-2 pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-center justify-around text-xs max-w-md mx-auto">
          {/* 1. Assets Tab */}
          <button
            onClick={() => {
              setMobileTab('assets');
              const el = document.getElementById('asset-registry-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className={`flex flex-1 flex-col items-center justify-center gap-1 py-1 px-1 rounded-2xl transition active:scale-95 ${
              mobileTab === 'assets'
                ? 'text-neutral-950 font-bold bg-neutral-100/90'
                : 'text-neutral-500 hover:text-neutral-900 font-medium'
            }`}
          >
            <Layers className={`h-4.5 w-4.5 ${mobileTab === 'assets' ? 'text-neutral-950' : 'text-neutral-500'}`} />
            <span className="text-[10px]">Assets</span>
          </button>

          {/* 2. Interactive Parañaque Map Tab */}
          <button
            onClick={() => {
              setMobileTab('map');
              setShowMap(true);
              window.scrollTo({ top: 220, behavior: 'smooth' });
            }}
            className={`flex flex-1 flex-col items-center justify-center gap-1 py-1 px-1 rounded-2xl transition active:scale-95 ${
              mobileTab === 'map'
                ? 'text-emerald-700 font-bold bg-emerald-50'
                : 'text-neutral-500 hover:text-neutral-900 font-medium'
            }`}
          >
            <MapIcon className={`h-4.5 w-4.5 ${mobileTab === 'map' ? 'text-emerald-600' : 'text-neutral-500'}`} />
            <span className="text-[10px]">Map</span>
          </button>

          {/* 3. Central Native Floating Add Action (FAB) */}
          <div className="flex-1 flex justify-center -mt-6">
            <button
              onClick={() => setIsAddOpen(true)}
              aria-label="Register New Hardware"
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-900 text-white shadow-xl ring-4 ring-white active:scale-90 transition-transform"
            >
              <Plus className="h-6 w-6 stroke-[2.5]" />
            </button>
          </div>

          {/* 4. Stations Tab (16 Barangays) */}
          <button
            onClick={() => {
              setMobileTab('stations');
              window.scrollTo({ top: 220, behavior: 'smooth' });
            }}
            className={`flex flex-1 flex-col items-center justify-center gap-1 py-1 px-1 rounded-2xl transition active:scale-95 ${
              mobileTab === 'stations'
                ? 'text-emerald-700 font-bold bg-emerald-50'
                : 'text-neutral-500 hover:text-neutral-900 font-medium'
            }`}
          >
            <Building2 className={`h-4.5 w-4.5 ${mobileTab === 'stations' ? 'text-emerald-600' : 'text-neutral-500'}`} />
            <span className="text-[10px]">Stations</span>
          </button>

          {/* 5. Scan QR / Barcode */}
          <button
            onClick={() => setIsScanOpen(true)}
            className="flex flex-1 flex-col items-center justify-center gap-1 py-1 px-1 text-neutral-500 hover:text-neutral-900 font-medium rounded-2xl transition active:scale-95 relative"
          >
            <div className="relative">
              <QrCode className="h-4.5 w-4.5 text-neutral-500" />
              {scannedBatch.length > 0 && (
                <span className="absolute -top-1 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-600 text-[8px] font-bold text-white font-mono animate-pulse">
                  {scannedBatch.length}
                </span>
              )}
            </div>
            <span className="text-[10px]">Scan</span>
          </button>
        </div>
      </nav>

      {/* Floating Batch Dispatch Cart Indicator (Mobile & Desktop) */}
      {scannedBatch.length > 0 && !isScanOpen && !isTransferOpen && (
        <div className="fixed bottom-20 md:bottom-6 right-3 left-3 md:left-auto md:w-96 z-40 bg-neutral-900/95 text-white backdrop-blur-md rounded-2xl p-3 shadow-2xl border border-neutral-700/80 flex items-center justify-between gap-3 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500 text-xs font-black text-neutral-950 font-mono shrink-0">
              {scannedBatch.length}
            </span>
            <div className="min-w-0">
              <span className="text-xs font-bold block truncate">
                {scannedBatch.length} {scannedBatch.length === 1 ? 'Item' : 'Items'} Ready to Transfer
              </span>
              <span className="text-[10px] text-neutral-400 block truncate font-mono">
                {scannedBatch.map((i) => i.assetTag).slice(0, 3).join(', ')}
                {scannedBatch.length > 3 ? ` +${scannedBatch.length - 3} more` : ''}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsScanOpen(true)}
              className="rounded-xl bg-white/10 hover:bg-white/20 px-2.5 py-1.5 text-[11px] font-semibold text-white transition active:scale-95 cursor-pointer"
            >
              + Scan More
            </button>
            <button
              type="button"
              onClick={() => {
                setBatchTransferAssets(scannedBatch);
                setIsTransferOpen(true);
              }}
              className="rounded-xl bg-emerald-500 hover:bg-emerald-400 px-3 py-1.5 text-[11px] font-bold text-neutral-950 shadow-md transition active:scale-95 cursor-pointer flex items-center gap-1"
            >
              <span>Dispatch</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* Lazy-loaded Modals wrapped in ErrorBoundary and Suspense */}
      <ErrorBoundary>
        <Suspense fallback={null}>
          {isTransferOpen && (
            <TransferModal
              isOpen={isTransferOpen}
              onClose={() => {
                setIsTransferOpen(false);
                setBatchTransferAssets([]);
              }}
              asset={activeAsset}
              batchAssets={batchTransferAssets.length > 0 ? batchTransferAssets : undefined}
              allAssets={assets}
              locations={locations}
              defaultDispatcherName={currentUser.name}
              officers={officerNames}
              onConfirmTransfer={handleConfirmTransfer}
              onConfirmBatchTransfer={handleConfirmBatchTransfer}
            />
          )}

          {isDetailOpen && (
            <AssetDetailModal
              isOpen={isDetailOpen}
              onClose={() => setIsDetailOpen(false)}
              asset={activeAsset}
              locations={locations}
              onOpenTransfer={handleOpenTransfer}
              onAcknowledgeReceipt={handleAcknowledgeReceipt}
              onViewChecklist={handleOpenReceiptForRecord}
            />
          )}

          {isAddOpen && (
            <AddAssetModal
              isOpen={isAddOpen}
              onClose={() => {
                setIsAddOpen(false);
                setAddPresetLocationId(undefined);
              }}
              locations={locations}
              existingAssets={assets}
              onAddAsset={handleAddAsset}
              initialLocationId={addPresetLocationId}
            />
          )}

          {isScanOpen && (
            <QuickScanModal
              isOpen={isScanOpen}
              onClose={() => setIsScanOpen(false)}
              assets={assets}
              scannedBatch={scannedBatch}
              onUpdateScannedBatch={setScannedBatch}
              onProceedToBatchTransfer={(batch: AssetItem[]) => {
                setBatchTransferAssets(batch);
                setIsTransferOpen(true);
              }}
              onFoundAsset={(found: AssetItem) => {
                setActiveAsset(found);
                setIsDetailOpen(true);
              }}
              onOpenAddWithSerial={(_serial: string) => {
                setAddPresetLocationId(undefined);
                setIsAddOpen(true);
              }}
            />
          )}

          {isAuthOpen && (
            <AuthModal
              isOpen={isAuthOpen}
              onClose={() => setIsAuthOpen(false)}
              currentUser={currentUser}
              onSwitchUser={setCurrentUser}
              users={users}
              onAddUser={handleAddUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
              onLogout={handleLogout}
              globalCoverPhoto={globalCoverPhoto}
              onUpdateGlobalCoverPhoto={handleUpdateGlobalCoverPhoto}
            />
          )}

          {/* 1:1 Physical A5 Borrow Checklist Receipt Modal */}
          {isReceiptOpen && (
            <BorrowChecklistReceiptModal
              isOpen={isReceiptOpen}
              onClose={() => setIsReceiptOpen(false)}
              record={activeChecklistRecord}
              asset={activeChecklistAsset}
              location={activeChecklistLocation}
              onMarkReturned={handleMarkChecklistReturned}
            />
          )}

          {/* System Audit Trail & Custody Log (COA Compliant) */}
          {isAuditOpen && (
            <AuditLogModal
              isOpen={isAuditOpen}
              onClose={() => setIsAuditOpen(false)}
              logs={auditLogs}
            />
          )}
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}

export default App;
