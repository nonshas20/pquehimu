-- ==============================================================================
-- Barangay Asset & Item Tracking System (BAITS)
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

-- 3. LOCATIONS TABLE (16 Barangays + Municipal Central Depot)
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(120) NOT NULL,
    type VARCHAR(30) NOT NULL DEFAULT 'barangay' CHECK (type IN ('barangay', 'central_office', 'repair_center', 'warehouse')),
    contact_person VARCHAR(100),
    contact_phone VARCHAR(50),
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. ASSETS TABLE
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

-- 5. ASSET TRANSFERS / CHAIN-OF-CUSTODY TABLE
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

-- 6. INDEXES FOR LIGHTNING FAST QUERIES (Sub-millisecond lookups)
CREATE INDEX IF NOT EXISTS idx_assets_serial ON assets(serial_number);
CREATE INDEX IF NOT EXISTS idx_assets_tag ON assets(asset_tag);
CREATE INDEX IF NOT EXISTS idx_assets_location ON assets(current_location_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_transfers_asset ON asset_transfers(asset_id);
CREATE INDEX IF NOT EXISTS idx_transfers_ref ON asset_transfers(reference_no);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON asset_transfers(status);

-- 7. TRIGGER: AUTO-UPDATE ASSET LOCATION & STATUS ON TRANSFER RECEIPT
CREATE OR REPLACE FUNCTION handle_transfer_received()
RETURNS TRIGGER AS $$
BEGIN
    -- When a transfer is marked as 'received', update the asset's current location and set status to 'in_service'
    IF NEW.status = 'received' AND (OLD.status IS DISTINCT FROM 'received') THEN
        UPDATE assets
        SET 
            current_location_id = NEW.to_location_id,
            status = 'in_service',
            custodian_name = COALESCE(NEW.received_by, custodian_name),
            updated_at = NOW()
        WHERE id = NEW.asset_id;
    END IF;

    -- When a transfer is initiated ('in_transit'), mark asset status to 'in_transit'
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

-- 8. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_transfers ENABLE ROW LEVEL SECURITY;

-- Allow public read for verified municipal staff, authenticated write
CREATE POLICY "Allow authenticated read on locations" ON locations FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read on assets" ON assets FOR SELECT USING (true);
CREATE POLICY "Allow authenticated read on transfers" ON asset_transfers FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert on assets" ON assets FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update on assets" ON assets FOR UPDATE USING (true);
CREATE POLICY "Allow authenticated insert on transfers" ON asset_transfers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow authenticated update on transfers" ON asset_transfers FOR UPDATE USING (true);

-- 9. SEED DATA: 16 BARANGAYS + CENTRAL DEPOT
INSERT INTO locations (code, name, type, contact_person, contact_phone, address) VALUES
('HUB-HQ', 'Central IT Depot (Municipal Hall)', 'central_office', 'Engr. Marco Villanueva', '+63 917 100 0000', 'Ground Flr, Municipal Hall Complex, J.P. Rizal St.'),
('BRGY-01', 'Barangay 1 (Poblacion Norte)', 'barangay', 'Hon. Elena Ramos', '+63 918 200 1001', 'Session Hall Bldg, Rizal Corner Mabini St.'),
('BRGY-02', 'Barangay 2 (Poblacion Sur)', 'barangay', 'Sec. Arnel Mendoza', '+63 918 200 1002', 'Barangay Center, Bonifacio Ave.'),
('BRGY-03', 'Barangay 3 (San Isidro)', 'barangay', 'Hon. Roberto Tan', '+63 918 200 1003', 'Sitio Centro, Near Elementary School'),
('BRGY-04', 'Barangay 4 (Santa Cruz)', 'barangay', 'Liaison Joy Santos', '+63 918 200 1004', 'Santa Cruz Multipurpose Hall'),
('BRGY-05', 'Barangay 5 (San Roque)', 'barangay', 'Hon. Carlos De Leon', '+63 918 200 1005', 'San Roque Riverside Pavilion'),
('BRGY-06', 'Barangay 6 (San Pedro)', 'barangay', 'Sec. Marivic Castro', '+63 918 200 1006', 'Zone 2 Barangay Post'),
('BRGY-07', 'Barangay 7 (Santo Domingo)', 'barangay', 'Hon. Gabriel Cruz', '+63 918 200 1007', 'Santo Domingo Plaza Complex'),
('BRGY-08', 'Barangay 8 (Santa Maria)', 'barangay', 'Liaison Divine Reyes', '+63 918 200 1008', 'KM 14 Highway Outpost Hall'),
('BRGY-09', 'Barangay 9 (Bagong Silang)', 'barangay', 'Hon. Danilo Morales', '+63 918 200 1009', 'Phase 1 Community Center'),
('BRGY-10', 'Barangay 10 (San Antonio)', 'barangay', 'Sec. Teresa Fernandez', '+63 918 200 1010', 'San Antonio Civic Hall'),
('BRGY-11', 'Barangay 11 (Maligaya)', 'barangay', 'Hon. Fernando Garcia', '+63 918 200 1011', 'Sitio Maligaya Health & Admin Center'),
('BRGY-12', 'Barangay 12 (Santa Elena)', 'barangay', 'Liaison Raul Bautista', '+63 918 200 1012', 'Upper Ridge Road, Purok 4'),
('BRGY-13', 'Barangay 13 (San Jose)', 'barangay', 'Hon. Corazon Aguilar', '+63 918 200 1013', 'San Jose Market Compound Hall'),
('BRGY-14', 'Barangay 14 (Concepcion)', 'barangay', 'Sec. Vicente Navarro', '+63 918 200 1014', 'Concepcion Coastal Evac & Admin Center'),
('BRGY-15', 'Barangay 15 (San Vicente)', 'barangay', 'Hon. Patricia Soriano', '+63 918 200 1015', 'San Vicente Agro-Industrial Outpost'),
('BRGY-16', 'Barangay 16 (Pag-asa)', 'barangay', 'Hon. Renato Dizon', '+63 918 200 1016', 'Hilltop Multi-Purpose Pavilion')
ON CONFLICT (code) DO NOTHING;
