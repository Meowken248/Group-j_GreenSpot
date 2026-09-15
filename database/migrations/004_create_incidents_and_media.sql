-- ============================================================================
-- Migration 004: Phân hệ Tiếp nhận, Quản lý Sự cố & Dữ liệu Đa phương tiện
-- Chức năng hỗ trợ: CN 1-12 (Tiếp nhận sự cố, Đa phương tiện, GPS, Phân loại),
--                   CN 27 (Ẩn danh/Masked GPS), CN 31 (Ảnh Trước-Sau),
--                   CN 32 (Chuyển cấp Phường/Quận/Sở), CN 37-38 (Risk Score & Mức độ)
-- Hệ quản trị CSDL: PostgreSQL 16 + PostGIS 3.4
-- ============================================================================

-- 11. Bảng Danh mục Phân loại Rác thải & Ô nhiễm (Waste Categories)
CREATE TABLE IF NOT EXISTS waste_categories (
    category_id SERIAL PRIMARY KEY,
    category_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    default_severity VARCHAR(20) DEFAULT 'MEDIUM' CHECK (default_severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    sla_hours INT NOT NULL DEFAULT 48,
    color_hex VARCHAR(10) DEFAULT '#22C55E',
    icon_name VARCHAR(50) DEFAULT 'trash-2',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Bảng Sự cố Ô nhiễm Môi trường Trung tâm (Incidents)
CREATE TABLE IF NOT EXISTS incidents (
    incident_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tracking_code VARCHAR(30) NOT NULL UNIQUE, -- Định dạng: ECO-YYYYMMDD-XXXX
    reporter_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    category_id INT NOT NULL REFERENCES waste_categories(category_id),
    unit_id INT REFERENCES administrative_units(unit_id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    address_text VARCHAR(500) NOT NULL,
    location GEOMETRY(Point, 4326) NOT NULL,
    masked_location GEOMETRY(Point, 4326), -- Tọa độ đã làm mờ/jittering bảo mật công dân
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'VERIFIED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'CLOSED')),
    risk_score NUMERIC(5, 2) DEFAULT 0.00, -- Điểm rủi ro (0 - 100) tính từ AI và các tham số môi trường
    estimated_volume_m3 NUMERIC(8, 2),    -- Thể tích rác thải ước tính (m3)
    is_anonymous BOOLEAN DEFAULT FALSE,
    reporter_phone_masked VARCHAR(20),
    upvotes_count INT DEFAULT 0,
    sla_deadline TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    closed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. Bảng Tệp Đa phương tiện Đính kèm Sự cố (Incident Media - Trước / Sau)
CREATE TABLE IF NOT EXISTS incident_media (
    media_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
    media_type VARCHAR(20) NOT NULL CHECK (media_type IN ('IMAGE', 'VIDEO', 'AUDIO')),
    phase VARCHAR(20) NOT NULL DEFAULT 'BEFORE' CHECK (phase IN ('BEFORE', 'DURING', 'AFTER', 'VERIFICATION')),
    file_url VARCHAR(500) NOT NULL,
    thumbnail_url VARCHAR(500),
    file_size_bytes BIGINT,
    mime_type VARCHAR(100),
    exif_latitude NUMERIC(10, 7),
    exif_longitude NUMERIC(10, 7),
    exif_captured_at TIMESTAMP WITH TIME ZONE,
    is_tampered_warning BOOLEAN DEFAULT FALSE,
    uploader_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Bảng Lịch sử Chuyển trạng thái Sự cố (Incident Status History)
CREATE TABLE IF NOT EXISTS incident_status_history (
    history_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
    from_status VARCHAR(30),
    to_status VARCHAR(30) NOT NULL,
    changed_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    change_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 15. Bảng Bình luận & Tương tác Cộng đồng (Incident Comments)
CREATE TABLE IF NOT EXISTS incident_comments (
    comment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE, -- Bình luận nội bộ giữa các cán bộ
    parent_comment_id UUID REFERENCES incident_comments(comment_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. Bảng Nhật ký Chuyển cấp Hồ sơ Hành chính (Incident Transfers - Chức năng 32)
CREATE TABLE IF NOT EXISTS incident_transfers (
    transfer_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
    from_unit_id INT NOT NULL REFERENCES administrative_units(unit_id),
    to_unit_id INT NOT NULL REFERENCES administrative_units(unit_id),
    transferred_by UUID NOT NULL REFERENCES users(user_id),
    reason TEXT NOT NULL,
    escalation_level VARCHAR(20) DEFAULT 'WARD_TO_DISTRICT' CHECK (escalation_level IN ('WARD_TO_DISTRICT', 'DISTRICT_TO_PROVINCE', 'HORIZONTAL_TRANSFER')),
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);
