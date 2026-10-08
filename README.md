# HIMU IT Asset Tracker — City of Parañaque
> Official Chain-of-Custody IT Equipment Tracking System for the **Health Information Management Unit (HIMU)** and **Universal Health Care (UHC) Alagang Parañaque**, managing hardware across **16 Barangays**.

---

## 📌 Overview & Scope

The **HIMU IT Asset Tracker** provides live custody, movement, and verification tracking for all IT equipment (printers, routers, switches, EMR workstations, biometric terminals) deployed across the **16 Barangays of the City of Parañaque** and the **HIMU Central IT Office (Parañaque City Hall)**.

### Official Jurisdictions Tracked
- **District 1 (8 Barangays):** Baclaran, Don Galo, La Huerta, San Dionisio, San Isidro, Santo Niño, Tambo, Vitalez.
- **District 2 (8 Barangays):** BF Homes, Don Bosco, Marcelo Green, Merville, Moonwalk, San Antonio, San Martin de Porres, Sun Valley.
- **Central Depot:** HIMU Central IT Office (Parañaque City Hall Complex).

---

## 🔐 2 Authorized System Roles

In accordance with municipal governance and audit standards, access is strictly partitioned into **two roles**:

1. **`ADMIN` (Full Control)**
   - Complete administrative oversight: register new hardware, assign initial locations, dispatch & approve transfers, reassign custodians, and generate official Property Acknowledgement Receipts (PAR).
   - Default: `JOHN SHANNON O. RODRIGUEZ` (`john.rodriguez@paranaque.gov.ph`)
2. **`IT_OFFICER` (Operations & Custody)**
   - Operational field role: initiate custody transfers, scan hardware barcode tags in the field, verify serial numbers, and acknowledge receipt at destination barangay health centers.
   - Default: `HIMU IT OFFICER` (`it.officer@paranaque.gov.ph`)

### Authorized Dispatch Personnel
Transfers must be recorded by one of the 8 designated IT officers:
1. `JOHN SHANNON O. RODRIGUEZ`
2. `CHAN PEREZ`
3. `KEN LLAGUNO`
4. `JAY CONCON`
5. `DANT TE GUTZ`
6. `MICH CRUTO`
7. `JUSTIN RY PUNLA`
8. `ISAIAH SAN PEDRO`

---

## 🗺️ Interactive Parañaque Leaflet Map

Adapted from the geospatial architecture in `mrsia`:
- **Boundary Polygons:** Real GeoJSON boundaries for all 16 Barangays (`src/data/paranaque-barangays.json`).
- **Free, Watermark-Free Tiles:** Esri World Gray Canvas tile service.
- **Dynamic Shading:** Polygons shade green for active equipment and highlight on click.
- **Mobile Friendly:** Integrated zoom controls, recenter button, and full-screen modal expansion.
- **Two-Way Synchronization:** Tapping any barangay on the map filters the inventory table and detail sheets below.

---

## 📱 Apple Liquid Glass UI Design

- **Frosted Glassmorphism:** Layered translucent surfaces (`backdrop-blur-2xl`), specular top edge highlights, and high-contrast typography.
- **Mobile Thumb Ergonomics:** Fixed floating liquid-glass bottom navigation bar providing instant access to Assets, Map, Scan Tag, New Asset, and Role Switcher.
- **Official Dual Logos:** Embedded UHC Alagang Parañaque and HIMU emblems in the header and property print receipts.

---

## 🚀 Quick Start

```powershell
# Run the local development server
npm run dev

# Build for production
npm run build
```

Visit `http://localhost:5173` to test.

### Supabase Cloud Setup (Zero-Cost Free Tier)
1. Open your project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor** and execute [`supabase/schema.sql`](file:///c:/Users/johns/OneDrive/Documents/HIMUIT/supabase/schema.sql).
3. All 16 Parañaque Barangays, default user roles, and custody triggers will be initialized immediately.
