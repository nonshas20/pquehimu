import { supabase } from '../lib/supabase';
import type {
  BarangayLocation,
  AssetItem,
  AssetTransferRecord,
  BorrowChecklistItem,
  AppUser,
} from '../types/inventory';

// Database column mapping interfaces
interface DbLocation {
  id: string;
  code: string;
  name: string;
  district: number;
  type: 'barangay' | 'central_office';
  contact_person: string | null;
  contact_phone: string | null;
  address: string;
}

interface DbAsset {
  id: string;
  asset_tag: string;
  name: string;
  category: string;
  brand_model: string;
  serial_number: string;
  current_location_id: string;
  status: string;
  custodian_name: string;
  custodian_role: string | null;
  acquisition_date: string | null;
  ip_address: string | null;
  mac_address: string | null;
  notes: string | null;
}

interface DbTransfer {
  id: string;
  reference_no: string;
  asset_id: string;
  from_location_id: string | null;
  to_location_id: string | null;
  from_location_name: string;
  to_location_name: string;
  dispatched_by: string;
  dispatched_at: string;
  received_by: string | null;
  received_at: string | null;
  status: string;
  purpose: string;
  notes: string | null;
  event_name: string | null;
  requesting_office: string | null;
  borrower_name: string | null;
  borrowed_items_list: BorrowChecklistItem[] | null;
  returned_at: string | null;
  returned_checked_by: string | null;
}

interface DbUser {
  id: string;
  name: string;
  username?: string;
  password?: string;
  role: string;
  email?: string | null;
  created_at?: string;
}

// ---------------------------------------------------------------------------
// Transformers (PostgreSQL snake_case <-> TypeScript camelCase)
// ---------------------------------------------------------------------------

export const mapDbUser = (db: DbUser): AppUser => ({
  id: db.id,
  name: db.name,
  username: db.username || (db.id === 'user-admin' ? 'admin' : db.id === 'user-it-officer' ? 'itofficer' : db.name.toLowerCase().replace(/[^a-z0-9]/g, '')),
  password: db.password || 'password123',
  role: db.role as AppUser['role'],
  email: db.email || undefined,
});

export const mapDbLocation = (db: DbLocation): BarangayLocation => ({
  id: db.id,
  code: db.code,
  name: db.name,
  district: db.district as 0 | 1 | 2,
  type: db.type,
  contactPerson: db.contact_person || undefined,
  contactPhone: db.contact_phone || undefined,
  address: db.address,
});

export const mapDbTransfer = (db: DbTransfer): AssetTransferRecord => ({
  id: db.id,
  referenceNo: db.reference_no,
  assetId: db.asset_id,
  fromLocationId: db.from_location_id || '',
  toLocationId: db.to_location_id || '',
  fromLocationName: db.from_location_name,
  toLocationName: db.to_location_name,
  dispatchedBy: db.dispatched_by,
  dispatchedAt: db.dispatched_at,
  receivedBy: db.received_by || undefined,
  receivedAt: db.received_at || undefined,
  status: db.status as AssetTransferRecord['status'],
  purpose: db.purpose,
  notes: db.notes || undefined,
  eventName: db.event_name || undefined,
  requestingOffice: db.requesting_office || undefined,
  borrowerName: db.borrower_name || undefined,
  borrowedItemsList: db.borrowed_items_list || undefined,
  returnedAt: db.returned_at || undefined,
  returnedCheckedBy: db.returned_checked_by || undefined,
});

export const mapDbAsset = (
  db: DbAsset,
  transfers: AssetTransferRecord[] = []
): AssetItem => ({
  id: db.id,
  assetTag: db.asset_tag,
  name: db.name,
  category: db.category as AssetItem['category'],
  brandModel: db.brand_model,
  serialNumber: db.serial_number,
  currentLocationId: db.current_location_id,
  status: db.status as AssetItem['status'],
  custodianName: db.custodian_name,
  custodianRole: db.custodian_role || undefined,
  acquisitionDate: db.acquisition_date || new Date().toISOString().split('T')[0],
  ipAddress: db.ip_address || undefined,
  macAddress: db.mac_address || undefined,
  notes: db.notes || undefined,
  history: transfers,
});

// ---------------------------------------------------------------------------
// Supabase Data Service Operations
// ---------------------------------------------------------------------------

export const supabaseService = {
  /**
   * Fetch all 17 Parañaque Locations from Supabase
   */
  async getLocations(): Promise<BarangayLocation[] | null> {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('district', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        console.warn('[Supabase] Failed to fetch locations:', error.message);
        return null;
      }

      if (!data || data.length === 0) return null;
      return (data as DbLocation[]).map(mapDbLocation);
    } catch (err) {
      console.warn('[Supabase] Exception fetching locations:', err);
      return null;
    }
  },

  /**
   * Fetch all real equipment assets with their nested transfer/borrowing history
   */
  async getAssets(): Promise<AssetItem[] | null> {
    try {
      // 1. Fetch assets
      const { data: assetsData, error: assetsError } = await supabase
        .from('assets')
        .select('*')
        .order('created_at', { ascending: false });

      if (assetsError) {
        console.warn('[Supabase] Failed to fetch assets:', assetsError.message);
        return null;
      }

      // If table exists but empty, return empty array so user can enter real items
      if (!assetsData) return [];

      // 2. Fetch all transfer records
      const { data: transfersData, error: transfersError } = await supabase
        .from('transfer_records')
        .select('*')
        .order('dispatched_at', { ascending: false });

      if (transfersError) {
        console.warn('[Supabase] Failed to fetch transfers:', transfersError.message);
      }

      const allTransfers = ((transfersData as DbTransfer[]) || []).map(mapDbTransfer);

      // 3. Map transfers into respective assets
      return (assetsData as DbAsset[]).map((dbAsset) => {
        const itemHistory = allTransfers.filter((t) => t.assetId === dbAsset.id);
        return mapDbAsset(dbAsset, itemHistory);
      });
    } catch (err) {
      console.warn('[Supabase] Exception fetching assets:', err);
      return null;
    }
  },

  /**
   * Insert a new real asset into Supabase
   */
  async createAsset(asset: AssetItem): Promise<boolean> {
    try {
      const dbAsset: DbAsset = {
        id: asset.id,
        asset_tag: asset.assetTag,
        name: asset.name,
        category: asset.category,
        brand_model: asset.brandModel,
        serial_number: asset.serialNumber,
        current_location_id: asset.currentLocationId,
        status: asset.status,
        custodian_name: asset.custodianName,
        custodian_role: asset.custodianRole || null,
        acquisition_date: asset.acquisitionDate || null,
        ip_address: asset.ipAddress || null,
        mac_address: asset.macAddress || null,
        notes: asset.notes || null,
      };

      const { error: assetError } = await supabase.from('assets').insert([dbAsset]);
      if (assetError) {
        console.error('[Supabase] Error creating asset:', assetError);
        return false;
      }

      // If asset has initial history record, insert it
      if (asset.history && asset.history.length > 0) {
        const firstHistory = asset.history[0];
        await this.createTransferRecord(firstHistory);
      }

      return true;
    } catch (err) {
      console.error('[Supabase] Exception creating asset:', err);
      return false;
    }
  },

  /**
   * Insert a transfer/borrowing checklist record into Supabase
   */
  async createTransferRecord(record: AssetTransferRecord): Promise<boolean> {
    try {
      const dbTransfer: DbTransfer = {
        id: record.id,
        reference_no: record.referenceNo,
        asset_id: record.assetId,
        from_location_id: record.fromLocationId || null,
        to_location_id: record.toLocationId || null,
        from_location_name: record.fromLocationName,
        to_location_name: record.toLocationName,
        dispatched_by: record.dispatchedBy,
        dispatched_at: record.dispatchedAt,
        received_by: record.receivedBy || null,
        received_at: record.receivedAt || null,
        status: record.status,
        purpose: record.purpose,
        notes: record.notes || null,
        event_name: record.eventName || null,
        requesting_office: record.requestingOffice || null,
        borrower_name: record.borrowerName || null,
        borrowed_items_list: record.borrowedItemsList || null,
        returned_at: record.returnedAt || null,
        returned_checked_by: record.returnedCheckedBy || null,
      };

      const { error } = await supabase.from('transfer_records').insert([dbTransfer]);
      if (error) {
        console.error('[Supabase] Error inserting transfer record:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[Supabase] Exception inserting transfer record:', err);
      return false;
    }
  },

  /**
   * Record a full equipment dispatch/borrowing event:
   * 1. Inserts the transfer record
   * 2. Updates the asset location, status, and custodian
   */
  async recordDispatch(
    record: AssetTransferRecord,
    assetUpdate: {
      locationId: string;
      status: AssetItem['status'];
      custodianName: string;
    }
  ): Promise<boolean> {
    try {
      // 1. Insert transfer record
      const transferSaved = await this.createTransferRecord(record);
      if (!transferSaved) return false;

      // 2. Update asset status and location
      const { error: assetError } = await supabase
        .from('assets')
        .update({
          current_location_id: assetUpdate.locationId,
          status: assetUpdate.status,
          custodian_name: assetUpdate.custodianName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', record.assetId);

      if (assetError) {
        console.error('[Supabase] Error updating asset on dispatch:', assetError);
        return false;
      }

      return true;
    } catch (err) {
      console.error('[Supabase] Exception recording dispatch:', err);
      return false;
    }
  },

  /**
   * Mark an equipment borrow as returned to HIMU Central Depot:
   * 1. Updates the transfer record with returned_at and returned_checked_by
   * 2. Returns the asset to 'loc-himu-hq' and sets status to 'in_service'
   */
  async markReturned(
    recordId: string,
    officerName: string,
    assetId: string,
    hqLocationId = 'loc-himu-hq'
  ): Promise<boolean> {
    try {
      const now = new Date().toISOString();

      // 1. Update transfer record
      const { error: transferError } = await supabase
        .from('transfer_records')
        .update({
          status: 'returned',
          returned_at: now,
          returned_checked_by: officerName,
        })
        .eq('id', recordId);

      if (transferError) {
        console.error('[Supabase] Error marking transfer returned:', transferError);
        return false;
      }

      // 2. Return asset to Central HIMU Depot
      const { error: assetError } = await supabase
        .from('assets')
        .update({
          status: 'in_service',
          current_location_id: hqLocationId,
          custodian_name: `HIMU Central Depot (${officerName})`,
          updated_at: now,
        })
        .eq('id', assetId);

      if (assetError) {
        console.error('[Supabase] Error returning asset to HQ:', assetError);
        return false;
      }

      return true;
    } catch (err) {
      console.error('[Supabase] Exception marking returned:', err);
      return false;
    }
  },

  /**
   * Delete an asset from Supabase (cascades to transfer records)
   */
  async deleteAsset(assetId: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('assets').delete().eq('id', assetId);
      if (error) {
        console.error('[Supabase] Error deleting asset:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[Supabase] Exception deleting asset:', err);
      return false;
    }
  },

  /**
   * Fetch all registered HIMU staff users from Supabase app_users table
   */
  async getAppUsers(): Promise<AppUser[] | null> {
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.warn('[Supabase] Failed to fetch users:', error.message);
        return null;
      }

      if (!data || data.length === 0) return null;
      return (data as DbUser[]).map(mapDbUser);
    } catch (err) {
      console.warn('[Supabase] Exception fetching users:', err);
      return null;
    }
  },

  /**
   * Insert a new staff user into Supabase app_users table
   */
  async createAppUser(user: AppUser): Promise<boolean> {
    try {
      const { error } = await supabase.from('app_users').insert([
        {
          id: user.id,
          name: user.name,
          username: user.username.trim().toLowerCase(),
          password: user.password || 'password123',
          role: user.role,
          email: user.email || null,
        },
      ]);

      if (error) {
        console.error('[Supabase] Error creating user:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[Supabase] Exception creating user:', err);
      return false;
    }
  },

  /**
   * Update an existing staff user (profile & password) in Supabase app_users table
   */
  async updateAppUser(user: AppUser): Promise<boolean> {
    try {
      const payload: {
        name: string;
        username: string;
        role: string;
        password?: string;
        email?: string | null;
      } = {
        name: user.name,
        username: user.username.trim().toLowerCase(),
        role: user.role,
      };

      if (user.password) {
        payload.password = user.password;
      }

      if (user.email !== undefined) {
        payload.email = user.email || null;
      }

      const { error } = await supabase
        .from('app_users')
        .update(payload)
        .eq('id', user.id);

      if (error) {
        console.error('[Supabase] Error updating user:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[Supabase] Exception updating user:', err);
      return false;
    }
  },

  /**
   * Delete a staff user from Supabase app_users table
   */
  async deleteAppUser(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('app_users').delete().eq('id', userId);
      if (error) {
        console.error('[Supabase] Error deleting user:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[Supabase] Exception deleting user:', err);
      return false;
    }
  },

  /**
   * Subscribe to Supabase Realtime changes across assets, transfers, and users.
   * Enables seamless live multi-device synchronization.
   */
  subscribeToChanges(onChange: () => void) {
    const channel = supabase
      .channel('himu_live_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'assets' },
        () => {
          onChange();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transfer_records' },
        () => {
          onChange();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_users' },
        () => {
          onChange();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
};
