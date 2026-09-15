-- ============================================================================
-- Migration 003: Phân hệ Không gian Hành chính & Hạ tầng Môi trường Đô thị
-- Chức năng hỗ trợ: CN 16 (Ranh giới hành chính ST_Within), CN 21 (Điểm thu gom tái chế),
--                   CN 32 (Phân cấp Phường/Quận/Sở), CN 45 (Cơ sở thiết yếu gần sự cố)
-- Hệ quản trị CSDL: PostgreSQL 16 + PostGIS 3.4
-- ============================================================================

-- 8. Bảng Đơn vị Hành chính Phân cấp (Administrative Units)
CREATE TABLE IF NOT EXISTS administrative_units (
    unit_id SERIAL PRIMARY KEY,
    unit_code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    level VARCHAR(20) NOT NULL CHECK (level IN ('PROVINCE', 'DISTRICT', 'WARD')),
    parent_id INT REFERENCES administrative_units(unit_id) ON DELETE SET NULL,
    boundary GEOMETRY(MultiPolygon, 4326),
    centroid GEOMETRY(Point, 4326),
    area_km2 NUMERIC(10, 2),
    population INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Bảng Cơ sở Thiết yếu Đô thị (Essential Facilities - Chức năng 45)
CREATE TABLE IF NOT EXISTS essential_facilities (
    facility_id SERIAL PRIMARY KEY,
    facility_name VARCHAR(200) NOT NULL,
    facility_type VARCHAR(50) NOT NULL CHECK (facility_type IN ('HOSPITAL', 'SCHOOL', 'HEALTH_CENTER', 'FIRE_STATION', 'WATER_PLANT', 'RESIDENTIAL_CLUSTER', 'PUBLIC_PARK')),
    address VARCHAR(255) NOT NULL,
    unit_id INT REFERENCES administrative_units(unit_id),
    location GEOMETRY(Point, 4326) NOT NULL,
    contact_phone VARCHAR(20),
    capacity_people INT,
    vulnerability_level VARCHAR(20) DEFAULT 'HIGH' CHECK (vulnerability_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Bảng Điểm Thu gom Tái chế & Rác nguy hại (Recycling Facilities - Chức năng 21)
CREATE TABLE IF NOT EXISTS recycling_facilities (
    facility_id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    facility_code VARCHAR(50) UNIQUE,
    address VARCHAR(255) NOT NULL,
    unit_id INT REFERENCES administrative_units(unit_id),
    location GEOMETRY(Point, 4326) NOT NULL,
    accepted_waste_types TEXT[] NOT NULL, -- ['PIN_CU', 'THIET_BI_DIEN_TU', 'VO_HOP_SUA', 'NHUA_TAI_CHE', 'THUY_TINH']
    operating_hours VARCHAR(100),         -- '07:30 - 17:00 (T2 - T7)'
    contact_phone VARCHAR(20),
    managing_org VARCHAR(150),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
