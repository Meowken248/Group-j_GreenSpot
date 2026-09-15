-- ============================================================================
-- Migration 009: Phân hệ Tương tác Cộng đồng, Điểm thưởng Xanh & AI Chatbot
-- Chức năng hỗ trợ: CN 12 (Điểm thưởng công dân xanh), CN 23 (Chiến dịch Chủ Nhật Xanh),
--                   CN 24 (AI Chatbot trợ lý môi trường)
-- Hệ quản trị CSDL: PostgreSQL 16 + PostGIS 3.4
-- ============================================================================

-- 33. Bảng Chiến dịch Môi trường Cộng đồng (Environmental Campaigns - CN 23)
CREATE TABLE IF NOT EXISTS environmental_campaigns (
    campaign_id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    organizer_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    unit_id INT REFERENCES administrative_units(unit_id),
    target_location GEOMETRY(Point, 4326),
    location_address VARCHAR(255) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    max_volunteers INT DEFAULT 50,
    current_volunteers_count INT DEFAULT 0,
    reward_points_awarded INT DEFAULT 100,
    banner_image_url VARCHAR(500),
    status VARCHAR(30) DEFAULT 'UPCOMING' CHECK (status IN ('UPCOMING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 34. Bảng Tình nguyện viên Tham gia Chiến dịch (Campaign Participants - CN 23)
CREATE TABLE IF NOT EXISTS campaign_participants (
    participant_id SERIAL PRIMARY KEY,
    campaign_id INT NOT NULL REFERENCES environmental_campaigns(campaign_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_checked_in BOOLEAN DEFAULT FALSE,
    checked_in_at TIMESTAMP WITH TIME ZONE,
    points_credited INT DEFAULT 0,
    certificate_issued BOOLEAN DEFAULT FALSE,
    certificate_url VARCHAR(500),
    UNIQUE (campaign_id, user_id)
);

-- 35. Bảng Danh mục Quà tặng / Huy hiệu Công dân Xanh (Citizen Rewards - CN 12)
CREATE TABLE IF NOT EXISTS citizen_rewards (
    reward_id SERIAL PRIMARY KEY,
    reward_code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    points_required INT NOT NULL CHECK (points_required > 0),
    reward_type VARCHAR(30) DEFAULT 'VOUCHER' CHECK (reward_type IN ('VOUCHER', 'BADGE', 'GIFT_ITEM', 'DISCOUNT_CODE')),
    stock_quantity INT DEFAULT 100,
    image_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 36. Bảng Giao dịch Tích lũy & Đổi Thưởng (Reward Transactions - CN 12)
CREATE TABLE IF NOT EXISTS reward_transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    reward_id INT REFERENCES citizen_rewards(reward_id) ON DELETE SET NULL,
    incident_id UUID REFERENCES incidents(incident_id) ON DELETE SET NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('EARN_REPORT', 'EARN_CAMPAIGN', 'REDEEM_GIFT', 'BONUS')),
    points_amount INT NOT NULL, -- Dương khi nhận, âm khi đổi
    balance_after INT NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 37. Bảng Phiên Hội thoại Chatbot Trợ lý Môi trường (Chatbot Conversations - CN 24)
CREATE TABLE IF NOT EXISTS chatbot_conversations (
    conversation_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    session_token VARCHAR(255) NOT NULL,
    channel VARCHAR(30) DEFAULT 'WEB_PORTAL' CHECK (channel IN ('WEB_PORTAL', 'MOBILE_APP', 'ZALO_OA', 'TELEGRAM')),
    is_resolved BOOLEAN DEFAULT FALSE,
    satisfaction_rating INT CHECK (satisfaction_rating BETWEEN 1 AND 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 38. Bảng Chi tiết Tin nhắn Chatbot (Chatbot Messages - CN 24)
CREATE TABLE IF NOT EXISTS chatbot_messages (
    message_id BIGSERIAL PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES chatbot_conversations(conversation_id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('USER', 'BOT', 'HUMAN_SUPPORT')),
    message_text TEXT NOT NULL,
    detected_intent VARCHAR(100),       -- 'REPORT_INCIDENT', 'FIND_RECYCLING_STATION', 'CHECK_SLA_STATUS'
    extracted_entities JSONB,
    confidence_score NUMERIC(5, 4),
    suggested_quick_replies TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
