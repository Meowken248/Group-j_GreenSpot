-- ============================================================================
-- Migration 006: Phân hệ Giám sát Thời hạn SLA, Kiểm toán An ninh & Đánh giá KPI
-- Chức năng hỗ trợ: CN 28 (Nhật ký kiểm toán an ninh Audit Log toàn diện),
--                   CN 33 (Quản lý hạn mức thời gian xử lý SLA & Trừ điểm KPI)
-- Hệ quản trị CSDL: PostgreSQL 16 + PostGIS 3.4
-- ============================================================================

-- 22. Bảng Chính sách Cam kết Thời hạn Xử lý (SLA Policies)
CREATE TABLE IF NOT EXISTS sla_policies (
    policy_id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category_id INT REFERENCES waste_categories(category_id) ON DELETE CASCADE,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    response_time_hours INT NOT NULL DEFAULT 4,   -- Thời gian tối đa để cán bộ tiếp nhận & phân công
    resolution_time_hours INT NOT NULL DEFAULT 48, -- Thời gian tối đa để đội thu gom xử lý dứt điểm
    warning_threshold_percentage INT DEFAULT 80,  -- Ngưỡng 80% thời gian để phát cảnh báo vàng
    penalty_points_per_hour NUMERIC(4, 2) DEFAULT 0.5, -- Điểm trừ KPI mỗi giờ quá hạn
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (category_id, severity)
);

-- 23. Bảng Nhật ký Kiểm toán An ninh Bất biến (Security Audit Logs - Append-only - Chức năng 28)
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,            -- LOGIN, LOGOUT, CREATE, UPDATE, DELETE, DISPATCH, VERIFY, EXPORT, BACKUP
    table_name VARCHAR(100) NOT NULL,
    record_id VARCHAR(100),
    old_data JSONB,                         -- Trạng thái dữ liệu trước khi thay đổi (Diff data)
    new_data JSONB,                         -- Trạng thái dữ liệu sau khi thay đổi
    ip_address VARCHAR(45),
    user_agent TEXT,
    request_uri VARCHAR(500),
    is_suspicious BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 24. Bảng Đánh giá Hiệu suất & Chấm điểm KPI Đơn vị (KPI Evaluations - Chức năng 33)
CREATE TABLE IF NOT EXISTS kpi_evaluations (
    evaluation_id SERIAL PRIMARY KEY,
    team_id INT NOT NULL REFERENCES work_teams(team_id) ON DELETE CASCADE,
    unit_id INT REFERENCES administrative_units(unit_id) ON DELETE SET NULL,
    evaluation_month INT NOT NULL CHECK (evaluation_month BETWEEN 1 AND 12),
    evaluation_year INT NOT NULL CHECK (evaluation_year >= 2024),
    total_assigned INT DEFAULT 0,
    completed_on_time INT DEFAULT 0,
    completed_overdue INT DEFAULT 0,
    sla_compliance_rate NUMERIC(5, 2) DEFAULT 100.00, -- Tỷ lệ hoàn thành đúng hạn (%)
    average_cleanliness_score NUMERIC(3, 2) DEFAULT 5.00,
    penalty_score NUMERIC(5, 2) DEFAULT 0.00,
    bonus_score NUMERIC(5, 2) DEFAULT 0.00,
    final_kpi_score NUMERIC(5, 2) DEFAULT 100.00,
    rank_grade VARCHAR(20) DEFAULT 'EXCELLENT' CHECK (rank_grade IN ('EXCELLENT', 'GOOD', 'AVERAGE', 'POOR')),
    notes TEXT,
    evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (team_id, evaluation_month, evaluation_year)
);
