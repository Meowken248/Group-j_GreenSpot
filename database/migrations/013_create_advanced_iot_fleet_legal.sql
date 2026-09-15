-- ============================================================================
-- Migration 013: Phân hệ Nâng cao - IoT Quan trắc, Đội xe Logistics & Pháp lý Xử phạt
-- Bổ sung 12 bảng nâng cao mở rộng hệ thống EcoReport đạt quy chuẩn Smart City
-- Hệ quản trị CSDL: PostgreSQL 16 + PostGIS 3.4
-- ============================================================================

-- ============================================================================
-- PHÂN HỆ 10: QUAN TRẮC MÔI TRƯỜNG THỜI GIAN THỰC QUA CẢM BIẾN IOT
-- ============================================================================

-- 43. Bảng Trạm Cảm biến IoT Quan trắc Môi trường (IoT Sensor Stations)
CREATE TABLE IF NOT EXISTS iot_sensor_stations (
    station_id SERIAL PRIMARY KEY,
    station_code VARCHAR(50) NOT NULL UNIQUE,
    station_name VARCHAR(150) NOT NULL,
    station_type VARCHAR(50) NOT NULL CHECK (station_type IN ('AIR_QUALITY', 'WATER_QUALITY', 'FLOOD_ULTRASONIC', 'WEATHER')),
    unit_id INT REFERENCES administrative_units(unit_id) ON DELETE SET NULL,
    location GEOMETRY(Point, 4326) NOT NULL,
    address VARCHAR(255) NOT NULL,
    installation_date DATE,
    firmware_version VARCHAR(50) DEFAULT 'v1.4.2',
    battery_powered BOOLEAN DEFAULT FALSE,
    solar_powered BOOLEAN DEFAULT TRUE,
    status VARCHAR(30) DEFAULT 'ONLINE' CHECK (status IN ('ONLINE', 'OFFLINE', 'MAINTENANCE', 'ERROR')),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 44. Bảng Dữ liệu Đo đạc Chuỗi Thời gian từ Cảm biến (IoT Sensor Telemetry - Time-series)
CREATE TABLE IF NOT EXISTS iot_sensor_telemetry (
    telemetry_id BIGSERIAL PRIMARY KEY,
    station_id INT NOT NULL REFERENCES iot_sensor_stations(station_id) ON DELETE CASCADE,
    aqi_index INT,                       -- Chỉ số chất lượng không khí tổng hợp (0 - 500)
    pm2_5 NUMERIC(6, 2),                 -- Bụi mịn PM2.5 (ug/m3)
    pm10 NUMERIC(6, 2),                  -- Bụi PM10 (ug/m3)
    co2_ppm NUMERIC(7, 2),               -- Nồng độ CO2 (ppm)
    temperature_c NUMERIC(4, 1),         -- Nhiệt độ môi trường (°C)
    humidity_percent NUMERIC(4, 1),      -- Độ ẩm tương đối (%)
    water_level_cm NUMERIC(6, 2),        -- Mực nước đo bằng cảm biến siêu âm (cm)
    water_ph NUMERIC(4, 2),              -- Độ pH nguồn nước
    dissolved_oxygen_mg_l NUMERIC(5, 2), -- Oxy hòa tan DO (mg/L)
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 45. Bảng Cảnh báo Tự động Khi Thông số Vượt Ngưỡng QCVN (IoT Sensor Alerts)
CREATE TABLE IF NOT EXISTS iot_sensor_alerts (
    alert_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id INT NOT NULL REFERENCES iot_sensor_stations(station_id) ON DELETE CASCADE,
    parameter_name VARCHAR(50) NOT NULL,  -- 'PM2_5', 'WATER_LEVEL', 'CO2'
    measured_value NUMERIC(10, 2) NOT NULL,
    threshold_limit NUMERIC(10, 2) NOT NULL,
    qcvn_standard VARCHAR(50) DEFAULT 'QCVN 05:2023/BTNM',
    alert_level VARCHAR(20) DEFAULT 'WARNING' CHECK (alert_level IN ('INFO', 'WARNING', 'DANGER', 'CRITICAL')),
    message TEXT NOT NULL,
    is_acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PHÂN HỆ 11: QUẢN LÝ LỘ TRÌNH THU GOM RÁC & ĐỘI XE THÔNG MINH
-- ============================================================================

-- 46. Bảng Lộ trình Thu gom Rác Đô thị Cố định (Waste Collection Routes)
CREATE TABLE IF NOT EXISTS waste_collection_routes (
    route_id SERIAL PRIMARY KEY,
    route_code VARCHAR(50) NOT NULL UNIQUE,
    route_name VARCHAR(150) NOT NULL,
    unit_id INT REFERENCES administrative_units(unit_id) ON DELETE SET NULL,
    assigned_team_id INT REFERENCES work_teams(team_id) ON DELETE SET NULL,
    route_path GEOMETRY(MultiLineString, 4326) NOT NULL,
    total_distance_km NUMERIC(6, 2) NOT NULL,
    estimated_duration_minutes INT NOT NULL,
    operating_days VARCHAR(50) DEFAULT '2,4,6', -- Thứ 2, 4, 6 trong tuần
    start_time_scheduled TIME NOT NULL DEFAULT '05:00:00',
    end_time_scheduled TIME NOT NULL DEFAULT '11:00:00',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 47. Bảng Điểm Dừng Gom Rác Dọc Tuyến (Route Checkpoints)
CREATE TABLE IF NOT EXISTS route_checkpoints (
    checkpoint_id SERIAL PRIMARY KEY,
    route_id INT NOT NULL REFERENCES waste_collection_routes(route_id) ON DELETE CASCADE,
    checkpoint_name VARCHAR(150) NOT NULL,
    sequence_order INT NOT NULL,
    location GEOMETRY(Point, 4326) NOT NULL,
    address VARCHAR(255) NOT NULL,
    expected_arrival_time TIME,
    expected_waste_volume_m3 NUMERIC(6, 2) DEFAULT 1.5,
    stop_duration_minutes INT DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (route_id, sequence_order)
);

-- 48. Bảng Nhật ký Nhiên liệu & Vận hành Xe Rác (Vehicle Fuel & Mileage Logs)
CREATE TABLE IF NOT EXISTS vehicle_fuel_logs (
    log_id BIGSERIAL PRIMARY KEY,
    team_id INT NOT NULL REFERENCES work_teams(team_id) ON DELETE CASCADE,
    driver_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    log_date DATE NOT NULL,
    start_odometer_km NUMERIC(9, 2) NOT NULL,
    end_odometer_km NUMERIC(9, 2) NOT NULL,
    distance_traveled_km NUMERIC(7, 2) GENERATED ALWAYS AS (end_odometer_km - start_odometer_km) STORED,
    fuel_liters_added NUMERIC(6, 2) DEFAULT 0.0,
    fuel_cost_vnd NUMERIC(12, 2) DEFAULT 0.0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PHÂN HỆ 12: CHẾ TÀI XỬ PHẠT VI PHẠM HÀNH CHÍNH MÔI TRƯỜNG
-- ============================================================================

-- 49. Bảng Khung Quy định Pháp lý Xử phạt Vi phạm (Penalty Regulations - Nghị định 45/2022/NĐ-CP)
CREATE TABLE IF NOT EXISTS penalty_regulations (
    regulation_id SERIAL PRIMARY KEY,
    decree_reference VARCHAR(100) NOT NULL DEFAULT 'Nghị định 45/2022/NĐ-CP',
    article_clause VARCHAR(50) NOT NULL,    -- VD: 'Điều 26 Khoản 1'
    violation_behavior TEXT NOT NULL,       -- 'Vứt, thải, bỏ rác thải sinh hoạt bừa bãi tại nơi công cộng'
    min_fine_vnd NUMERIC(12, 2) NOT NULL,   -- Mức phạt tiền tối thiểu (VNĐ)
    max_fine_vnd NUMERIC(12, 2) NOT NULL,   -- Mức phạt tiền tối đa (VNĐ)
    remedial_measures TEXT,                 -- Biện pháp khắc phục hậu quả: 'Buộc dọn sạch phế thải'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 50. Bảng Biên bản Vi phạm Hành chính Môi trường (Violation Records)
CREATE TABLE IF NOT EXISTS violation_records (
    record_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    record_code VARCHAR(50) NOT NULL UNIQUE, -- Định dạng: BB-VP-YYYYMMDD-XXXX
    incident_id UUID REFERENCES incidents(incident_id) ON DELETE SET NULL,
    regulation_id INT NOT NULL REFERENCES penalty_regulations(regulation_id),
    unit_id INT REFERENCES administrative_units(unit_id),
    offender_name VARCHAR(150),
    offender_id_card VARCHAR(20),
    offender_vehicle_plate VARCHAR(30),     -- Biển số xe đổ trộm rác
    location GEOMETRY(Point, 4326) NOT NULL,
    address VARCHAR(255) NOT NULL,
    recorded_by UUID NOT NULL REFERENCES users(user_id),
    fine_amount_vnd NUMERIC(12, 2) NOT NULL,
    status VARCHAR(30) DEFAULT 'PENDING_PAYMENT' CHECK (status IN ('DRAFT', 'ISSUED', 'PENDING_PAYMENT', 'PAID', 'ENFORCED', 'CANCELLED')),
    evidence_media_urls TEXT[],
    payment_deadline DATE,
    paid_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PHÂN HỆ 13: ĐA NGÔN NGỮ, LƯU TRỮ S3 & TRI THỨC AI RAG
-- ============================================================================

-- 51. Bảng Bản địa hóa Đa ngôn ngữ Giao diện (System Translations - i18n)
CREATE TABLE IF NOT EXISTS system_translations (
    translation_id SERIAL PRIMARY KEY,
    locale VARCHAR(10) NOT NULL,           -- 'vi', 'en'
    translation_key VARCHAR(150) NOT NULL, -- 'incident.report_button', 'map.filter_title'
    translation_text TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'UI',     -- 'UI', 'EMAIL', 'NOTIFICATION', 'SLA'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (locale, translation_key)
);

-- 52. Bảng Siêu dữ liệu Quản lý Lưu trữ Tệp tin Tập trung (File Storage Assets - S3/MinIO)
CREATE TABLE IF NOT EXISTS file_storage_assets (
    asset_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    storage_provider VARCHAR(30) DEFAULT 'MINIO' CHECK (storage_provider IN ('LOCAL', 'MINIO', 'AWS_S3', 'CLOUDINARY')),
    bucket_name VARCHAR(100) NOT NULL DEFAULT 'ecoreport-media',
    file_path VARCHAR(500) NOT NULL UNIQUE,
    original_filename VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    sha256_hash VARCHAR(64) NOT NULL,
    cdn_url VARCHAR(500),
    is_public BOOLEAN DEFAULT TRUE,
    virus_scan_status VARCHAR(20) DEFAULT 'CLEAN' CHECK (virus_scan_status IN ('PENDING', 'SCANNING', 'CLEAN', 'INFECTED')),
    uploader_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 53. Bảng Đăng ký Nhận Tin Môi trường & Cảnh báo Khu vực (Environmental Subscriptions)
CREATE TABLE IF NOT EXISTS environmental_subscriptions (
    subscription_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    email VARCHAR(255),
    topic VARCHAR(50) NOT NULL CHECK (topic IN ('DAILY_AQI_SUMMARY', 'FLOOD_WARNING', 'COMMUNITY_CAMPAIGN', 'WEEKLY_REPORT')),
    unit_id INT REFERENCES administrative_units(unit_id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    unsubscribed_at TIMESTAMP WITH TIME ZONE
);

-- 54. Bảng Cơ sở Tri thức Môi trường Số hóa cho AI RAG (AI Knowledge Embeddings)
CREATE TABLE IF NOT EXISTS ai_knowledge_embeddings (
    knowledge_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_title VARCHAR(255) NOT NULL,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('LEGAL_REGULATION', 'WASTE_SORTING_GUIDE', 'SOP_PROCEDURE', 'FAQ')),
    chunk_index INT NOT NULL DEFAULT 0,
    chunk_content TEXT NOT NULL,
    metadata JSONB,                        -- Nguồn tài liệu, ngày ban hành, chương mục
    embedding_dimension INT DEFAULT 1536,  -- Vector embeddings từ text-embedding-3-small
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- CHỈ MỤC KHÔNG GIAN BỔ SUNG CHO CÁC BẢNG MỚI
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_iot_stations_loc_gist ON iot_sensor_stations USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_telemetry_station_time ON iot_sensor_telemetry(station_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_routes_path_gist ON waste_collection_routes USING GIST(route_path);
CREATE INDEX IF NOT EXISTS idx_checkpoints_loc_gist ON route_checkpoints USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_violations_loc_gist ON violation_records USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_translations_key ON system_translations(locale, translation_key);
CREATE INDEX IF NOT EXISTS idx_assets_hash ON file_storage_assets(sha256_hash);
