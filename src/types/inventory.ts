export type UserRole = 'ADMIN' | 'IT_OFFICER';

export interface AppUser {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: UserRole;
  email?: string;
  avatarUrl?: string;
  coverPhotoUrl?: string;
}

export type AssetCategory =
  | 'Printer'
  | 'Network Router'
  | 'Extension Cord / Power'
  | 'Network Switch'
  | 'Workstation / PC'
  | 'Biometric / Scanner'
  | 'UPS / Power'
  | 'Other IT Equipment';

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
  district: 1 | 2 | 0; // 0 for Central IT Depot
  type: 'barangay' | 'central_office';
  contactPerson?: string;
  contactPhone?: string;
  address: string;
}

export interface BorrowChecklistItem {
  itemEquipment: string;
  serialNo?: string;
  quantity: number | string;
  remarks?: string;
  assetId?: string;
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
  status: 'pending_dispatch' | 'in_transit' | 'received' | 'returned' | 'cancelled';
  purpose: string;
  notes?: string;

  // Official A5 Event Equipment Borrowing Checklist Fields
  eventName?: string;
  requestingOffice?: string;
  borrowerName?: string;
  borrowedItemsList?: BorrowChecklistItem[];
  returnedAt?: string;
  returnedCheckedBy?: string;
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
  custodianRole?: string;
  acquisitionDate: string;
  ipAddress?: string;
  macAddress?: string;
  notes?: string;
  history: AssetTransferRecord[];
}

export const DISPATCH_OFFICERS = [
  'JOHN SHANNON O. RODRIGUEZ',
  'CHAN PEREZ',
  'KEN LLAGUNO',
  'JAY CONCON',
  'DANT TE GUTZ',
  'MICH CRUTO',
  'JUSTIN RY PUNLA',
  'ISAIAH SAN PEDRO',
] as const;

export type DispatchOfficer = (typeof DISPATCH_OFFICERS)[number];

export type AuditActionType =
  | 'AUTH_LOGIN'
  | 'AUTH_LOGOUT'
  | 'AUTH_PROFILE_UPDATE'
  | 'AUTH_PASSWORD_CHANGE'
  | 'ASSET_CREATED'
  | 'ASSET_UPDATED'
  | 'ASSET_DELETED'
  | 'ASSET_DISPATCHED'
  | 'ASSET_RETURNED'
  | 'CHECKLIST_PRINTED'
  | 'CSV_EXPORTED';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: AuditActionType;
  category: 'SECURITY' | 'DISPATCH' | 'INVENTORY' | 'COMPLIANCE';
  officerId?: string;
  officerName: string;
  officerRole: string;
  details: string;
  assetId?: string;
  assetName?: string;
  serialNumber?: string;
  locationName?: string;
  referenceNo?: string;
  metadata?: Record<string, any>;
}
