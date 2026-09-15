-- ============================================================================
-- Migration 008: Phân hệ Trí tuệ Nhân tạo AI & Phân tích Đô thị Thông minh
-- Chức năng hỗ trợ: CN 37 (AI YOLOv8 nhận diện rác & Ước tính khối lượng),
--                   CN 46 (AI phát hiện báo cáo trùng lặp không gian - thời gian),
--                   CN 47 (AI tóm tắt sự cố tự động & Gợi ý ưu tiên xử lý)
-- Hệ quản trị CSDL: PostgreSQL 16 + PostGIS 3.4
-- ============================================================================

-- 30. Bảng Kết quả Phân tích Thị giác Máy tính AI (AI Analysis Results - YOLOv8 - Chức năng 37)
CREATE TABLE IF NOT EXISTS ai_analysis_results (
    analysis_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    media_id UUID NOT NULL REFERENCES incident_media(media_id) ON DELETE CASCADE,
    incident_id UUID NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
    model_version VARCHAR(50) DEFAULT 'yolov8x-environment-v2.1',
    detected_classes TEXT[] NOT NULL, -- ['PLASTIC_WASTE', 'ELECTRONIC_WASTE', 'ORGANIC_WASTE', 'WATER_HYACINTH']
    confidence_score NUMERIC(5, 4) NOT NULL, -- 0.0000 -> 1.0000
    bounding_boxes JSONB NOT NULL,    -- Array of [{class: 'plastic', box: [ymin, xmin, ymax, xmax], conf: 0.92}]
    estimated_volume_m3 NUMERIC(8, 2),
    estimated_weight_kg NUMERIC(8, 2),
    suggested_severity VARCHAR(20) CHECK (suggested_severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    suggested_category_id INT REFERENCES waste_categories(category_id),
    raw_response JSONB,
    processing_time_ms INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 31. Bảng Nhóm Sự cố Trùng lặp Không gian - Thời gian do AI Phát hiện (AI Duplicate Groups - Chức năng 46)
CREATE TABLE IF NOT EXISTS ai_duplicate_groups (
    group_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    primary_incident_id UUID NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
    duplicate_incident_id UUID NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
    similarity_score NUMERIC(5, 4) NOT NULL, -- Độ tương đồng ảnh & nội dung (0.0000 -> 1.0000)
    spatial_distance_meters NUMERIC(8, 2) NOT NULL,
    time_delta_minutes INT NOT NULL,
    ai_confidence NUMERIC(5, 4) NOT NULL,
    is_confirmed_by_officer BOOLEAN DEFAULT FALSE,
    confirmed_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (primary_incident_id, duplicate_incident_id)
);

-- 32. Bảng Tóm tắt Sự cố & Đề xuất Ưu tiên Bằng Trí tuệ Nhân tạo (AI Incident Summaries - Chức năng 47)
CREATE TABLE IF NOT EXISTS ai_incident_summaries (
    summary_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL UNIQUE REFERENCES incidents(incident_id) ON DELETE CASCADE,
    ai_executive_summary TEXT NOT NULL,
    key_environmental_threats TEXT[],
    suggested_priority VARCHAR(20) CHECK (suggested_priority IN ('LOW', 'MEDIUM', 'HIGH', 'EMERGENCY')),
    recommended_equipment TEXT[],       -- ['XE_EP_RAC_10T', 'CANO_VOT_RAC', 'MAY_HUT_BUN']
    estimated_cleanup_time_hours NUMERIC(4, 1),
    model_name VARCHAR(50) DEFAULT 'Gemini-1.5-Pro',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
