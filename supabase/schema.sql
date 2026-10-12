-- =============================================================================
-- HIMU IT EQUIPMENT TRACKER & DISPATCH SYSTEM — SUPABASE SCHEMA & SEED
-- City of Parañaque — Health Information Management Unit (HIMU)
-- Project: https://obwygaccpfekzjmutjeo.supabase.co
-- =============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. DROP TABLES IF NEEDED (Clean slate setup)
-- DROP TABLE IF EXISTS transfer_records CASCADE;
-- DROP TABLE IF EXISTS assets CASCADE;
-- DROP TABLE IF EXISTS locations CASCADE;
-- DROP TABLE IF EXISTS app_users CASCADE;

-- 3. LOCATIONS TABLE (16 Official Parañaque Barangays + HIMU Depot)
CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  district INT NOT NULL DEFAULT 1,
  type TEXT NOT NULL DEFAULT 'barangay',
  contact_person TEXT,
  contact_phone TEXT,
  address TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. ASSETS TABLE (Real IT Equipment Fleet)
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  asset_tag TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  brand_model TEXT NOT NULL,
  serial_number TEXT NOT NULL,
  current_location_id TEXT NOT NULL REFERENCES locations(id) ON UPDATE CASCADE,
  status TEXT NOT NULL DEFAULT 'in_service',
  custodian_name TEXT NOT NULL,
  custodian_role TEXT,
  acquisition_date TEXT,
  ip_address TEXT,
  mac_address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. TRANSFER & BORROWING RECORDS TABLE (Official A5 Checklist History)
CREATE TABLE IF NOT EXISTS transfer_records (
  id TEXT PRIMARY KEY,
  reference_no TEXT NOT NULL,
  asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  from_location_id TEXT REFERENCES locations(id) ON UPDATE CASCADE,
  to_location_id TEXT REFERENCES locations(id) ON UPDATE CASCADE,
  from_location_name TEXT NOT NULL,
  to_location_name TEXT NOT NULL,
  dispatched_by TEXT NOT NULL,
  dispatched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  received_by TEXT,
  received_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'in_transit',
  purpose TEXT NOT NULL,
  notes TEXT,
  event_name TEXT,
  requesting_office TEXT,
  borrower_name TEXT,
  borrowed_items_list JSONB DEFAULT '[]'::jsonb,
  returned_at TIMESTAMPTZ,
  returned_checked_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. APP USERS / STAFF ROLES TABLE
CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL DEFAULT 'password123',
  role TEXT NOT NULL DEFAULT 'IT_OFFICER',
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_assets_location ON assets(current_location_id);
CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_transfers_asset ON transfer_records(asset_id);
CREATE INDEX IF NOT EXISTS idx_transfers_reference ON transfer_records(reference_no);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfer_records(status);
CREATE INDEX IF NOT EXISTS idx_users_username ON app_users(username);

-- 8. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- Allow read & write for authorized client operations
DROP POLICY IF EXISTS "Public read locations" ON locations;
CREATE POLICY "Public read locations" ON locations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public modify locations" ON locations;
CREATE POLICY "Public modify locations" ON locations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public read assets" ON assets;
CREATE POLICY "Public read assets" ON assets FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public modify assets" ON assets;
CREATE POLICY "Public modify assets" ON assets FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public read transfer_records" ON transfer_records;
CREATE POLICY "Public read transfer_records" ON transfer_records FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public modify transfer_records" ON transfer_records;
CREATE POLICY "Public modify transfer_records" ON transfer_records FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public read app_users" ON app_users;
CREATE POLICY "Public read app_users" ON app_users FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public modify app_users" ON app_users;
CREATE POLICY "Public modify app_users" ON app_users FOR ALL USING (true) WITH CHECK (true);

-- 9. REALTIME PUBLICATION CONFIGURATION
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'assets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE assets;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'transfer_records'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE transfer_records;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'app_users'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE app_users;
  END IF;
END $$;

-- 10. SEED AUTHENTIC PARAÑAQUE LOCATIONS (Central HQ + 16 Barangays)
INSERT INTO locations (id, code, name, district, type, contact_person, contact_phone, address)
VALUES
  ('loc-himu-hq', 'HIMU-HQ', 'HIMU Central IT Office (Parañaque City Hall)', 0, 'central_office', 'Health Information Management Unit', '(02) 8820-PQUE', 'City Hall Complex, San Antonio Valley 1, Parañaque City'),
  -- District 1
  ('loc-baclaran', 'BRGY-BAC', 'Baclaran', 1, 'barangay', 'Barangay Secretary / Health Station', '+63 917 001 0001', 'Barangay Hall, Bagong Sikat St., Baclaran, Parañaque City'),
  ('loc-don-galo', 'BRGY-DGL', 'Don Galo', 1, 'barangay', 'Barangay Liaison / Health Center', '+63 917 001 0002', 'El Quirino Ave., Don Galo, Parañaque City'),
  ('loc-la-huerta', 'BRGY-LHT', 'La Huerta', 1, 'barangay', 'Barangay Health Center', '+63 917 001 0003', 'Victor Medina St., La Huerta, Parañaque City'),
  ('loc-san-dionisio', 'BRGY-SDN', 'San Dionisio', 1, 'barangay', 'Barangay Health & Administrative Center', '+63 917 001 0004', 'Kabihasnan Rd. cor. Quirino Ave., San Dionisio, Parañaque City'),
  ('loc-san-isidro', 'BRGY-SIS', 'San Isidro', 1, 'barangay', 'Barangay Health Station', '+63 917 001 0005', 'San Isidro Parish Compound, Dr. A. Santos Ave., Parañaque City'),
  ('loc-santo-nino', 'BRGY-STN', 'Santo Niño', 1, 'barangay', 'Barangay Health Center', '+63 917 001 0006', 'Col. De Leon St., Sto. Niño, Parañaque City'),
  ('loc-tambo', 'BRGY-TMB', 'Tambo', 1, 'barangay', 'Barangay Health Center', '+63 917 001 0007', 'Quirino Ave. cor. NAIA Rd., Tambo, Parañaque City'),
  ('loc-vitalez', 'BRGY-VTZ', 'Vitalez', 1, 'barangay', 'Barangay Health Station', '+63 917 001 0008', 'Airport Village, Vitalez, Parañaque City'),
  -- District 2
  ('loc-bf-homes', 'BRGY-BFH', 'BF Homes', 2, 'barangay', 'BF Health Center / Satellite Station', '+63 917 002 0001', 'President''s Ave., BF Homes, Parañaque City'),
  ('loc-don-bosco', 'BRGY-DBC', 'Don Bosco', 2, 'barangay', 'Barangay Health Center', '+63 917 002 0002', 'Don Bosco St. cor. Armstrong Ave., Parañaque City'),
  ('loc-marcelo-green', 'BRGY-MCL', 'Marcelo Green', 2, 'barangay', 'Barangay Health Center', '+63 917 002 0003', 'Severina Diamond Subd., Marcelo Green, Parañaque City'),
  ('loc-merville', 'BRGY-MRV', 'Merville', 2, 'barangay', 'Barangay Health Center', '+63 917 002 0004', 'Merville Park Subd., Parañaque City'),
  ('loc-moonwalk', 'BRGY-MNW', 'Moonwalk', 2, 'barangay', 'Barangay Health Center', '+63 917 002 0005', 'Daang Batang St., Moonwalk, Parañaque City'),
  ('loc-san-antonio', 'BRGY-SAN', 'San Antonio', 2, 'barangay', 'Barangay Health & Emergency Center', '+63 917 002 0006', 'San Antonio Ave., Valley 1, Parañaque City'),
  ('loc-san-martin-de-porres', 'BRGY-SMP', 'San Martin de Porres', 2, 'barangay', 'Barangay Health Station', '+63 917 002 0007', 'United Hills Village, San Martin de Porres, Parañaque City'),
  ('loc-sun-valley', 'BRGY-SNV', 'Sun Valley', 2, 'barangay', 'Barangay Health Center', '+63 917 002 0008', 'Sun Valley Dr., Sun Valley, Parañaque City')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  district = EXCLUDED.district,
  contact_person = EXCLUDED.contact_person,
  contact_phone = EXCLUDED.contact_phone;

-- 11. SEED DEFAULT AUTHORIZED SYSTEM USERS
INSERT INTO app_users (id, name, username, password, role, email)
VALUES
  ('user-admin', 'JOHN SHANNON O. RODRIGUEZ', 'admin', 'password123', 'ADMIN', 'john.rodriguez@paranaque.gov.ph'),
  ('user-it-officer', 'HIMU IT OFFICER', 'itofficer', 'password123', 'IT_OFFICER', 'it.officer@paranaque.gov.ph')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  username = EXCLUDED.username,
  password = EXCLUDED.password,
  role = EXCLUDED.role;

-- Complete! Tables and official Parañaque locations are ready for real IT equipment entries.
