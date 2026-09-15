-- ============================================================================
-- Migration 005: Phân hệ Phân công, Điều phối Hiện trường & Nghiệm thu Trước - Sau
-- Chức năng hỗ trợ: CN 30 (Phân công điều phối đội thu gom & GPS xe rác gần nhất),
--                   CN 31 (Quy trình tiếp nhận, tiến độ & Nghiệm thu ảnh Trước - Sau)
-- Hệ quản trị CSDL: PostgreSQL 16 + PostGIS 3.4
-- ============================================================================

-- 17. Bảng Đội Thu gom Hiện trường (Work Teams)
CREATE TABLE IF NOT EXISTS work_teams (
    team_id SERIAL PRIMARY KEY,
    team_code VARCHAR(50) NOT NULL UNIQUE,
    team_name VARCHAR(150) NOT NULL,
    leader_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    unit_id INT REFERENCES administrative_units(unit_id) ON DELETE SET NULL,
    contact_phone VARCHAR(20),
    vehicle_plate VARCHAR(30),
    vehicle_type VARCHAR(50) DEFAULT 'COMPACTOR_TRUCK', -- Xe ép rác, xe ba gác, cano vớt rác...
    capacity_tons NUMERIC(5, 2) DEFAULT 5.0,
    status VARCHAR(30) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'BUSY', 'OFF_DUTY', 'MAINTENANCE')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 18. Bảng Thành viên Đội Thu gom (Team Members)
CREATE TABLE IF NOT EXISTS team_members (
    membership_id SERIAL PRIMARY KEY,
    team_id INT NOT NULL REFERENCES work_teams(team_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    role_in_team VARCHAR(50) DEFAULT 'WORKER' CHECK (role_in_team IN ('LEADER', 'DRIVER', 'WORKER', 'SPECIALIST')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE (team_id, user_id)
);

-- 19. Bảng Theo dõi Vị trí GPS Thời gian thực Đội thu gom (Worker Locations - Chức năng 30)
CREATE TABLE IF NOT EXISTS worker_locations (
    location_id BIGSERIAL PRIMARY KEY,
    team_id INT NOT NULL REFERENCES work_teams(team_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    current_location GEOMETRY(Point, 4326) NOT NULL,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    speed_kmh NUMERIC(5, 2) DEFAULT 0.0,
    heading_degrees NUMERIC(5, 2),
    battery_percentage INT,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 20. Bảng Lệnh Phân công Điều phối Hiện trường (Assignments)
CREATE TABLE IF NOT EXISTS assignments (
    assignment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_code VARCHAR(30) NOT NULL UNIQUE,
    incident_id UUID NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
    team_id INT NOT NULL REFERENCES work_teams(team_id),
    assigned_by UUID NOT NULL REFERENCES users(user_id),
    priority VARCHAR(20) DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'EMERGENCY')),
    dispatch_notes TEXT,
    deadline TIMESTAMP WITH TIME ZONE,
    status VARCHAR(30) DEFAULT 'ASSIGNED' CHECK (status IN ('ASSIGNED', 'ACCEPTED', 'EN_ROUTE', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED')),
    accepted_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 21. Bảng Nghiệm thu Hiện trường & So sánh ảnh Trước - Sau (Verifications - Chức năng 31)
CREATE TABLE IF NOT EXISTS verifications (
    verification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL UNIQUE REFERENCES assignments(assignment_id) ON DELETE CASCADE,
    incident_id UUID NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
    verified_by UUID NOT NULL REFERENCES users(user_id),
    status VARCHAR(30) NOT NULL CHECK (status IN ('APPROVED', 'REJECTED', 'REQUEST_REWORK')),
    cleanliness_score INT CHECK (cleanliness_score BETWEEN 1 AND 5),
    before_media_id UUID REFERENCES incident_media(media_id) ON DELETE SET NULL,
    after_media_id UUID REFERENCES incident_media(media_id) ON DELETE SET NULL,
    actual_waste_volume_m3 NUMERIC(8, 2),
    actual_disposal_method VARCHAR(100), -- Vận chuyển bãi rác Đa Phước, Trạm trung chuyển Hiệp Bình Chánh...
    feedback_notes TEXT,
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
