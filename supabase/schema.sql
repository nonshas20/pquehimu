-- ==============================================================================
-- City of Parañaque • Health Information Management Unit (HIMU)
-- IT Asset Tracking System (HIMU IT Tracker)
-- Supabase / PostgreSQL Production Schema (Free Tier Optimized)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS
DO $$ BEGIN
    CREATE TYPE asset_status_enum AS ENUM (
        'in_service',
        'in_transit',
        'under_repair',
        'standby',
        'decommissioned'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transfer_status_enum AS ENUM (
        'pending_dispatch',
        'in_transit',
        'received',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM (
        'ADMIN',
        'IT_OFFICER'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. USER PROFILES TABLE (Only 2 Roles: ADMIN and IT_OFFICER)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(120) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role user_role_enum NOT NULL DEFAULT 'IT_OFFICER',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. LOCATIONS TABLE (16 Barangays of Parañaque + HIMU Central Depot)
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(120) NOT NULL,
    district SMALLINT NOT NULL DEFAULT 1, -- 0 for HQ, 1 for District 1, 2 for District 2
    type VARCHAR(30) NOT NULL DEFAULT 'barangay' CHECK (type IN ('barangay', 'central_office')),
    contact_person VARCHAR(120),
    contact_phone VARCHAR(50),
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. ASSETS TABLE
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    asset_tag VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(60) NOT NULL,
    brand_model VARCHAR(120) NOT NULL,
    serial_number VARCHAR(100) UNIQUE NOT NULL,
    current_location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
    status asset_status_enum NOT NULL DEFAULT 'in_service',
    custodian_name VARCHAR(120),
    custodian_role VARCHAR(100),
    acquisition_date DATE,
    ip_address VARCHAR(45),
    mac_address VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. ASSET TRANSFERS / CHAIN-OF-CUSTODY TABLE
CREATE TABLE IF NOT EXISTS asset_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reference_no VARCHAR(50) UNIQUE NOT NULL,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
    from_location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
    to_location_id UUID NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
    status transfer_status_enum NOT NULL DEFAULT 'in_transit',
    dispatched_by VARCHAR(120) NOT NULL,
    dispatched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    received_by VARCHAR(120),
    received_at TIMESTAMPTZ,
    purpose TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. INDEXES
CREATE INDEX IF NOT EXISTS idx_assets_serial ON assets(serial_number);
CREATE INDEX IF NOT EXISTS idx_assets_tag ON assets(asset_tag);
CREATE INDEX IF NOT EXISTS idx_assets_location ON assets(current_location_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_transfers_asset ON asset_transfers(asset_id);
CREATE INDEX IF NOT EXISTS idx_transfers_ref ON asset_transfers(reference_no);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON asset_transfers(status);

-- 8. TRIGGER: AUTO-UPDATE ASSET LOCATION & STATUS ON TRANSFER RECEIPT
CREATE OR REPLACE FUNCTION handle_transfer_received()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'received' AND (OLD.status IS DISTINCT FROM 'received') THEN
        UPDATE assets
        SET 
            current_location_id = NEW.to_location_id,
            status = 'in_service',
            custodian_name = COALESCE(NEW.received_by, custodian_name),
            updated_at = NOW()
        WHERE id = NEW.asset_id;
    END IF;

    IF NEW.status = 'in_transit' AND (OLD.status IS DISTINCT FROM 'in_transit') THEN
        UPDATE assets
        SET 
            status = 'in_transit',
            updated_at = NOW()
        WHERE id = NEW.asset_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_transfer_received ON asset_transfers;
CREATE TRIGGER trg_transfer_received
AFTER INSERT OR UPDATE ON asset_transfers
FOR EACH ROW
EXECUTE FUNCTION handle_transfer_received();

-- 9. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read on locations" ON locations FOR SELECT USING (true);
CREATE POLICY "Allow public read on assets" ON assets FOR SELECT USING (true);
CREATE POLICY "Allow public read on transfers" ON asset_transfers FOR SELECT USING (true);
CREATE POLICY "Allow public read on profiles" ON user_profiles FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert on assets" ON assets FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update on assets" ON assets FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated insert on transfers" ON asset_transfers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update on transfers" ON asset_transfers FOR UPDATE USING (true);

-- 10. SEED DATA: 16 BARANGAYS OF PARAÑAQUE + HIMU CENTRAL OFFICE
INSERT INTO locations (code, name, district, type, contact_person, contact_phone, address) VALUES
('HIMU-HQ', 'HIMU Central IT Office (Parañaque City Hall)', 0, 'central_office', 'Health Information Management Unit', '(02) 8820-PQUE', 'City Hall Complex, San Antonio Valley 1, Parañaque City'),
-- District 1
('BRGY-BAC', 'Baclaran', 1, 'barangay', 'Barangay Health Station', '+63 917 001 0001', 'Barangay Hall, Bagong Sikat St., Baclaran, Parañaque City'),
('BRGY-DGL', 'Don Galo', 1, 'barangay', 'Barangay Health Center', '+63 917 001 0002', 'El Quirino Ave., Don Galo, Parañaque City'),
('BRGY-LHT', 'La Huerta', 1, 'barangay', 'Barangay Health Center', '+63 917 001 0003', 'Victor Medina St., La Huerta, Parañaque City'),
('BRGY-SDN', 'San Dionisio', 1, 'barangay', 'Barangay Health Center', '+63 917 001 0004', 'Kabihasnan Rd. cor. Quirino Ave., San Dionisio, Parañaque City'),
('BRGY-SIS', 'San Isidro', 1, 'barangay', 'Barangay Health Station', '+63 917 001 0005', 'San Isidro Parish Compound, Dr. A. Santos Ave., Parañaque City'),
('BRGY-STN', 'Santo Niño', 1, 'barangay', 'Barangay Health Center', '+63 917 001 0006', 'Col. De Leon St., Sto. Niño, Parañaque City'),
('BRGY-TMB', 'Tambo', 1, 'barangay', 'Barangay Health Center', '+63 917 001 0007', 'Quirino Ave. cor. NAIA Rd., Tambo, Parañaque City'),
('BRGY-VTZ', 'Vitalez', 1, 'barangay', 'Barangay Health Post', '+63 917 001 0008', 'Vitalez Compound, Baltao, Parañaque City'),
-- District 2
('BRGY-BFH', 'BF Homes', 2, 'barangay', 'BF Homes Health Center', '+63 917 002 0001', 'Aguirre Ave. cor. President''s Ave., BF Homes, Parañaque City'),
('BRGY-DBC', 'Don Bosco', 2, 'barangay', 'Don Bosco Health Center', '+63 917 002 0002', 'Better Living Subdivision, Don Bosco, Parañaque City'),
('BRGY-MGV', 'Marcelo Green', 2, 'barangay', 'Marcelo Green Health Station', '+63 917 002 0003', 'Severina Diamond Subd., Marcelo Green, Parañaque City'),
('BRGY-MVL', 'Merville', 2, 'barangay', 'Merville Health Center', '+63 917 002 0004', 'Merville Park, Access Rd., Parañaque City'),
('BRGY-MNW', 'Moonwalk', 2, 'barangay', 'Moonwalk Health Center', '+63 917 002 0005', 'Daang Batang St., Moonwalk Phase 1, Parañaque City'),
('BRGY-SAN', 'San Antonio', 2, 'barangay', 'San Antonio Health Center', '+63 917 002 0006', 'San Antonio Valley 1, Parañaque City'),
('BRGY-SMP', 'San Martin de Porres', 2, 'barangay', 'Barangay Health Center', '+63 917 002 0007', 'United Parañaque Subd. 4, San Martin de Porres, Parañaque City'),
('BRGY-SVL', 'Sun Valley', 2, 'barangay', 'Sun Valley Health Center', '+63 917 002 0008', 'Sun Valley Drive, Parañaque City')
ON CONFLICT (code) DO NOTHING;

-- 11. SEED DEFAULT USER ACCOUNTS (2 ROLES ONLY)
INSERT INTO user_profiles (email, full_name, role) VALUES
('john.rodriguez@paranaque.gov.ph', 'JOHN SHANNON O. RODRIGUEZ', 'ADMIN'),
('it.officer@paranaque.gov.ph', 'HIMU IT OFFICER', 'IT_OFFICER')
ON CONFLICT (email) DO NOTHING;
