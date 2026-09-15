-- ============================================================================
-- Migration 002: Phân hệ Quản trị Người dùng, Phân quyền RBAC & Quản lý Phiên
-- Chức năng hỗ trợ: CN 25 (Xác thực JWT đa nền tảng & Session), CN 26 (RBAC), CN 27 (Bảo mật ẩn danh)
-- Hệ quản trị CSDL: PostgreSQL 16 + PostGIS 3.4
-- ============================================================================

-- 1. Bảng Vai trò Hệ thống (Roles)
CREATE TABLE IF NOT EXISTS roles (
    role_id SERIAL PRIMARY KEY,
    role_code VARCHAR(50) NOT NULL UNIQUE,
    role_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng Danh mục Quyền hạn (Permissions)
CREATE TABLE IF NOT EXISTS permissions (
    permission_id SERIAL PRIMARY KEY,
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    permission_code VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bảng Ma trận Gán quyền theo Vai trò (Role-Permission Matrix)
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INT NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
    permission_id INT NOT NULL REFERENCES permissions(permission_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, permission_id)
);

-- 4. Bảng Tài khoản Người dùng (Users)
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    phone_number VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    avatar_url VARCHAR(500),
    role_id INT NOT NULL REFERENCES roles(role_id),
    status VARCHAR(30) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'PENDING_VERIFY', 'INACTIVE')),
    email_verified_at TIMESTAMP WITH TIME ZONE,
    phone_verified_at TIMESTAMP WITH TIME ZONE,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Bảng Quản lý Phiên Đăng nhập Đa thiết bị (User Sessions - Chức năng 25)
CREATE TABLE IF NOT EXISTS user_sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    jwt_id VARCHAR(255) NOT NULL UNIQUE,
    device_name VARCHAR(150),
    client_type VARCHAR(50) DEFAULT 'WEB' CHECK (client_type IN ('WEB', 'MOBILE_ANDROID', 'MOBILE_IOS', 'TABLET', 'API')),
    ip_address VARCHAR(45),
    user_agent TEXT,
    last_active_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Bảng Quản lý Refresh Token xoay vòng (Refresh Tokens - Chức năng 25)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    token_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    session_id UUID REFERENCES user_sessions(session_id) ON DELETE CASCADE,
    is_used BOOLEAN DEFAULT FALSE,
    is_revoked BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Bảng Cài đặt Bảo mật & Ẩn danh Người tố giác (User Privacy Settings - Chức năng 27)
CREATE TABLE IF NOT EXISTS user_privacy_settings (
    setting_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    is_anonymous_by_default BOOLEAN DEFAULT FALSE,
    hide_exact_gps BOOLEAN DEFAULT TRUE,
    spatial_jitter_radius_meters INT DEFAULT 50 CHECK (spatial_jitter_radius_meters >= 0 AND spatial_jitter_radius_meters <= 500),
    mask_phone_number BOOLEAN DEFAULT TRUE,
    allow_push_notifications BOOLEAN DEFAULT TRUE,
    allow_email_notifications BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
