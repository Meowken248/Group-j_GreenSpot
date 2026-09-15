-- ============================================================================
-- Migration 010: Phân hệ Thông báo Đẩy, Báo cáo Thống kê & Quản trị Hệ thống
-- Chức năng hỗ trợ: CN 34 (Thông báo đẩy WebSocket thời gian thực),
--                   CN 35 (Tự động tạo & Kết xuất báo cáo định kỳ PDF/Excel),
--                   CN 36 (Cấu hình hệ thống & Sao lưu phục hồi CSDL)
-- Hệ quản trị CSDL: PostgreSQL 16 + PostGIS 3.4
-- ============================================================================

-- 39. Bảng Thông báo Đa kênh Thời gian thực (Notifications - CN 34)
CREATE TABLE IF NOT EXISTS notifications (
    notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL, -- 'DISPATCH_NEW', 'SLA_WARNING', 'STATUS_CHANGE', 'GEOFENCE_ALERT', 'CAMPAIGN_REMINDER'
    reference_type VARCHAR(50),             -- 'INCIDENT', 'ASSIGNMENT', 'CAMPAIGN', 'SYSTEM'
    reference_id VARCHAR(100),
    action_url VARCHAR(500),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    delivery_channels TEXT[] DEFAULT ARRAY['IN_APP'], -- ['IN_APP', 'PUSH', 'EMAIL', 'WEBSOCKET']
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 40. Bảng Báo cáo Môi trường Kết xuất Tự động (Reports - CN 35)
CREATE TABLE IF NOT EXISTS reports (
    report_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    report_type VARCHAR(30) NOT NULL CHECK (report_type IN ('WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'INCIDENT_HEATMAP', 'SLA_PERFORMANCE')),
    unit_id INT REFERENCES administrative_units(unit_id) ON DELETE SET NULL,
    generated_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    parameters JSONB,
    summary_data JSONB, -- Lưu trữ {total_incidents, resolved_rate, avg_resolution_hours, top_categories: []}
    file_pdf_url VARCHAR(500),
    file_excel_url VARCHAR(500),
    status VARCHAR(30) DEFAULT 'GENERATING' CHECK (status IN ('GENERATING', 'READY', 'FAILED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 41. Bảng Tham số Cấu hình Hệ thống Động (System Configurations - CN 36)
CREATE TABLE IF NOT EXISTS system_configs (
    config_id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    value_type VARCHAR(20) DEFAULT 'STRING' CHECK (value_type IN ('STRING', 'INTEGER', 'FLOAT', 'BOOLEAN', 'JSON')),
    description TEXT,
    is_public BOOLEAN DEFAULT FALSE, -- Cho phép Frontend đọc không cần Token
    updated_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 42. Bảng Lịch sử Sao lưu & Phục hồi CSDL (Database Backups - CN 36)
CREATE TABLE IF NOT EXISTS db_backups (
    backup_id SERIAL PRIMARY KEY,
    backup_filename VARCHAR(255) NOT NULL,
    backup_type VARCHAR(20) DEFAULT 'FULL' CHECK (backup_type IN ('FULL', 'DIFFERENTIAL', 'SPATIAL_ONLY')),
    file_size_bytes BIGINT NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    checksum_sha256 VARCHAR(64),
    status VARCHAR(20) DEFAULT 'COMPLETED' CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'FAILED')),
    created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
