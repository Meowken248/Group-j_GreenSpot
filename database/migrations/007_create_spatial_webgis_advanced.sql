-- ============================================================================
-- Migration 007: Phân hệ WebGIS Nâng cao, Geofencing, Điểm nóng & Tuyến đường An toàn
-- Chức năng hỗ trợ: CN 13-15 (Heatmap, Lớp bản đồ, Bộ lọc), CN 22 (Geofencing cảnh báo quanh nhà),
--                   CN 39-40 (Phát hiện cụm & Điểm nóng Hotspot), CN 41-42 (Bản đồ nguy cơ ngập động),
--                   CN 43-44 (Tìm tuyến đường an toàn & So sánh rủi ro)
-- Hệ quản trị CSDL: PostgreSQL 16 + PostGIS 3.4
-- ============================================================================

-- 25. Bảng Vùng Cảnh báo Môi trường Công dân (User Watch Areas / Geofencing - Chức năng 22)
CREATE TABLE IF NOT EXISTS user_watch_areas (
    area_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    area_name VARCHAR(150) NOT NULL, -- VD: 'Khu vực quanh nhà tôi', 'Quanh trường con học'
    center_point GEOMETRY(Point, 4326) NOT NULL,
    radius_meters INT NOT NULL DEFAULT 500 CHECK (radius_meters BETWEEN 100 AND 5000),
    geofence_polygon GEOMETRY(Polygon, 4326), -- Tự động sinh từ ST_Buffer(center_point::geography, radius_meters)::geometry
    notify_push BOOLEAN DEFAULT TRUE,
    notify_email BOOLEAN DEFAULT TRUE,
    notify_sms BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 26. Bảng Phân cụm Không gian & Điểm nóng Môi trường (Incident Clusters & Hotspots - Chức năng 39, 40)
CREATE TABLE IF NOT EXISTS incident_clusters_hotspots (
    cluster_id SERIAL PRIMARY KEY,
    unit_id INT REFERENCES administrative_units(unit_id) ON DELETE SET NULL,
    cluster_type VARCHAR(30) DEFAULT 'HOTSPOT' CHECK (cluster_type IN ('HOTSPOT', 'DBSCAN_CLUSTER', 'PERSISTENT_DUMP')),
    centroid GEOMETRY(Point, 4326) NOT NULL,
    boundary GEOMETRY(Polygon, 4326),
    incident_count INT NOT NULL DEFAULT 1,
    average_risk_score NUMERIC(5, 2) DEFAULT 0.00,
    dominant_waste_category_id INT REFERENCES waste_categories(category_id),
    status VARCHAR(30) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISSOLVED', 'MONITORED')),
    first_detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 27. Bảng Cấu hình Bộ lọc Bản đồ Yêu thích (User Map Favorites - Chức năng 14)
CREATE TABLE IF NOT EXISTS user_map_favorites (
    favorite_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    filter_params JSONB NOT NULL, -- Lưu trữ {categories: [], severities: [], date_range: {}, status: []}
    viewport_center GEOMETRY(Point, 4326),
    zoom_level INT DEFAULT 14,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 28. Bảng Giám sát Nguy cơ Ngập lụt Đô thị Động (Flood Zones Monitoring - Chức năng 41, 42)
CREATE TABLE IF NOT EXISTS flood_zones_monitoring (
    zone_id SERIAL PRIMARY KEY,
    zone_name VARCHAR(200) NOT NULL,
    unit_id INT REFERENCES administrative_units(unit_id),
    boundary GEOMETRY(MultiPolygon, 4326) NOT NULL,
    rainfall_mm NUMERIC(6, 2) DEFAULT 0.0,
    flood_depth_cm NUMERIC(6, 2) DEFAULT 0.0,
    risk_level VARCHAR(20) DEFAULT 'LOW' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    blocked_drainage_points_count INT DEFAULT 0, -- Số điểm nghẽn cống do rác thải
    is_actively_flooded BOOLEAN DEFAULT FALSE,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 29. Bảng Lưu vết & So sánh Tuyến đường An toàn (Safe Routes Cache - Chức năng 43, 44)
CREATE TABLE IF NOT EXISTS safe_routes_cache (
    route_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    origin_point GEOMETRY(Point, 4326) NOT NULL,
    destination_point GEOMETRY(Point, 4326) NOT NULL,
    fastest_route_geom GEOMETRY(LineString, 4326),
    fastest_distance_km NUMERIC(6, 2),
    fastest_duration_mins NUMERIC(6, 2),
    fastest_risk_index NUMERIC(5, 2),
    safest_route_geom GEOMETRY(LineString, 4326),
    safest_distance_km NUMERIC(6, 2),
    safest_duration_mins NUMERIC(6, 2),
    safest_risk_index NUMERIC(5, 2),
    hazards_avoided_count INT DEFAULT 0,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
