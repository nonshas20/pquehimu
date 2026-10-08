export type AssetCategory =
  | 'Printer'
  | 'Network Router'
  | 'Network Switch'
  | 'Workstation / PC'
  | 'Biometric / Scanner'
  | 'UPS / Power';

export type AssetStatus =
  | 'in_service'
  | 'in_transit'
  | 'under_repair'
  | 'standby'
  | 'decommissioned';

export interface BarangayLocation {
  id: string;
  code: string;
  name: string;
  type: 'barangay' | 'central_office' | 'repair_center';
  contactPerson: string;
  contactPhone: string;
  address: string;
  assetCount?: number;
}

export interface AssetTransferRecord {
  id: string;
  referenceNo: string;
  assetId: string;
  fromLocationId: string;
  toLocationId: string;
  fromLocationName: string;
  toLocationName: string;
  dispatchedBy: string;
  dispatchedAt: string;
  receivedBy?: string;
  receivedAt?: string;
  status: 'pending_dispatch' | 'in_transit' | 'received' | 'cancelled';
  purpose: string;
  notes?: string;
}

export interface AssetItem {
  id: string;
  assetTag: string;
  name: string;
  category: AssetCategory;
  brandModel: string;
  serialNumber: string;
  currentLocationId: string;
  status: AssetStatus;
  custodianName: string;
  custodianRole: string;
  acquisitionDate: string;
  ipAddress?: string;
  macAddress?: string;
  notes?: string;
  history: AssetTransferRecord[];
}
