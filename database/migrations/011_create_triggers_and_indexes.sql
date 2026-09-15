-- ============================================================================
-- Migration 011: Thiết lập Chỉ mục Tối ưu (Spatial GIST, GIN, B-Tree) & Triggers Nghiệp vụ
-- Hệ quản trị CSDL: PostgreSQL 16 + PostGIS 3.4
-- ============================================================================

-- ============================================================================
-- 1. CHỈ MỤC KHÔNG GIAN POSTGIS (SPATIAL GIST INDEXES)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_admin_units_boundary_gist ON administrative_units USING GIST(boundary);
CREATE INDEX IF NOT EXISTS idx_admin_units_centroid_gist ON administrative_units USING GIST(centroid);
CREATE INDEX IF NOT EXISTS idx_essential_facilities_loc_gist ON essential_facilities USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_recycling_facilities_loc_gist ON recycling_facilities USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_incidents_location_gist ON incidents USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_incidents_masked_loc_gist ON incidents USING GIST(masked_location);
CREATE INDEX IF NOT EXISTS idx_worker_locations_curr_gist ON worker_locations USING GIST(current_location);
CREATE INDEX IF NOT EXISTS idx_watch_areas_center_gist ON user_watch_areas USING GIST(center_point);
CREATE INDEX IF NOT EXISTS idx_watch_areas_polygon_gist ON user_watch_areas USING GIST(geofence_polygon);
CREATE INDEX IF NOT EXISTS idx_clusters_centroid_gist ON incident_clusters_hotspots USING GIST(centroid);
CREATE INDEX IF NOT EXISTS idx_flood_zones_boundary_gist ON flood_zones_monitoring USING GIST(boundary);
CREATE INDEX IF NOT EXISTS idx_campaigns_target_loc_gist ON environmental_campaigns USING GIST(target_location);

-- ============================================================================
-- 2. CHỈ MỤC TÌM KIẾM TOÀN VĂN & MỜ (GIN & TRIGRAM INDEXES)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_incidents_title_trgm ON incidents USING GIN(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_incidents_address_trgm ON incidents USING GIN(address_text gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_fullname_trgm ON users USING GIN(full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_audit_old_data_gin ON audit_logs USING GIN(old_data);
CREATE INDEX IF NOT EXISTS idx_audit_new_data_gin ON audit_logs USING GIN(new_data);
CREATE INDEX IF NOT EXISTS idx_ai_bboxes_gin ON ai_analysis_results USING GIN(bounding_boxes);
CREATE INDEX IF NOT EXISTS idx_map_favorites_params_gin ON user_map_favorites USING GIN(filter_params);

-- ============================================================================
-- 3. CHỈ MỤC HIỆU NĂNG B-TREE (B-TREE INDEXES)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_incidents_status_created ON incidents(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_unit_category ON incidents(unit_id, category_id);
CREATE INDEX IF NOT EXISTS idx_incidents_tracking_code ON incidents(tracking_code);
CREATE INDEX IF NOT EXISTS idx_incident_media_incident_id ON incident_media(incident_id);
CREATE INDEX IF NOT EXISTS idx_assignments_team_status ON assignments(team_id, status);
CREATE INDEX IF NOT EXISTS idx_worker_locations_team_rec ON worker_locations(team_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_jwt ON user_sessions(user_id, jwt_id);

-- ============================================================================
-- 4. FUNCTION & TRIGGERS TỰ ĐỘNG CẬP NHẬT updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_roles_updated_at ON roles;
CREATE TRIGGER trg_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trg_user_privacy_updated_at ON user_privacy_settings;
CREATE TRIGGER trg_user_privacy_updated_at BEFORE UPDATE ON user_privacy_settings FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trg_admin_units_updated_at ON administrative_units;
CREATE TRIGGER trg_admin_units_updated_at BEFORE UPDATE ON administrative_units FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trg_incidents_updated_at ON incidents;
CREATE TRIGGER trg_incidents_updated_at BEFORE UPDATE ON incidents FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trg_work_teams_updated_at ON work_teams;
CREATE TRIGGER trg_work_teams_updated_at BEFORE UPDATE ON work_teams FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trg_assignments_updated_at ON assignments;
CREATE TRIGGER trg_assignments_updated_at BEFORE UPDATE ON assignments FOR EACH ROW EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS trg_watch_areas_updated_at ON user_watch_areas;
CREATE TRIGGER trg_watch_areas_updated_at BEFORE UPDATE ON user_watch_areas FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================================================
-- 5. FUNCTION & TRIGGER TỰ ĐỘNG TÍNH SLA DEADLINE & GEOFENCE POLYGON
-- ============================================================================
CREATE OR REPLACE FUNCTION set_incident_sla_deadline()
RETURNS TRIGGER AS $$
DECLARE
    v_sla_hours INT;
BEGIN
    -- Lấy sla_hours từ danh mục loại rác tương ứng
    SELECT COALESCE(sla_hours, 48) INTO v_sla_hours
    FROM waste_categories
    WHERE category_id = NEW.category_id;

    IF NEW.sla_deadline IS NULL THEN
        NEW.sla_deadline = NEW.created_at + (v_sla_hours || ' hours')::INTERVAL;
    END IF;

    -- Tự động sinh masked_location nếu chưa có (làm lệch ngẫu nhiên 30-50m bảo vệ quyền riêng tư)
    IF NEW.masked_location IS NULL AND NEW.location IS NOT NULL THEN
        NEW.masked_location = ST_SetSRID(
            ST_MakePoint(
                ST_X(NEW.location) + (random() - 0.5) * 0.0006,
                ST_Y(NEW.location) + (random() - 0.5) * 0.0006
            ),
            4326
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_incident_sla_and_masking ON incidents;
CREATE TRIGGER trg_incident_sla_and_masking
BEFORE INSERT ON incidents
FOR EACH ROW EXECUTE FUNCTION set_incident_sla_deadline();

-- Tự động tính Geofence Polygon từ Center Point + Radius Meters
CREATE OR REPLACE FUNCTION generate_geofence_polygon()
RETURNS TRIGGER AS $$
BEGIN
    NEW.geofence_polygon = ST_Transform(
        ST_Buffer(
            ST_Transform(NEW.center_point, 3857),
            NEW.radius_meters
        ),
        4326
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_geofence ON user_watch_areas;
CREATE TRIGGER trg_generate_geofence
BEFORE INSERT OR UPDATE OF center_point, radius_meters ON user_watch_areas
FOR EACH ROW EXECUTE FUNCTION generate_geofence_polygon();

-- ============================================================================
-- 6. BẢO VỆ BẢNG AUDIT LOG BẤT BIẾN (APPEND-ONLY)
-- ============================================================================
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Bảo mật an ninh: Bảng audit_logs là dữ liệu chỉ ghi (Append-Only), nghiêm cấm thao tác SỬA hoặc XÓA!';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();
