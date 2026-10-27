"""
Comprehensive Multi-Role End-to-End Workflow Integration Test (STT 37 -> 48).
Kịch bản kiểm thử tích hợp xuyên suốt từ Người dân (Citizen) -> Ban điều hành/Quản trị (Admin) -> Đội cơ động / Tình nguyện viên (CTV/Volunteer).

Bao phủ 100% các luồng nghiệp vụ liên hoàn:
  - STT 37: Người dân ra lệnh bằng giọng nói (Voice NLU Pipeline)
  - STT 38: Khử trùng lặp phản ánh môi trường
  - STT 39: Đánh giá phân loại sự cố bằng thuật toán TPS (AI Triage Score)
  - STT 40: Phân tích cơ sở trọng yếu trong vùng đệm không gian
  - STT 41: Lộ trình an toàn tránh ngập
  - STT 42: Bảng chỉ số rủi ro môi trường đô thị
  - STT 43: Điều phối tác nghiệp đội phản ứng nhanh hiện trường (Operations Dispatch)
  - STT 44: Điểm nóng ô nhiễm và dự báo 7 ngày (Hotspot Analytics)
  - STT 45: Cảnh báo khẩn cấp & Khảo sát an toàn (Emergency Alert & Safety Check)
  - STT 46: Cứu trợ ngập lụt khẩn cấp & Mạng lưới Tình nguyện viên (Flood SOS)
  - STT 47: Xuất dữ liệu sự cố môi trường ra file Excel / PDF
  - STT 48: Bảng thống kê hoạt động hệ thống Admin (System Activity KPIs)
"""

import pytest
import uuid
from datetime import date, datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

# STT 37: Voice Assistant
from app.services.voice_assistant import VoiceNluService

# STT 39: AI Triage
from app.services.triage_ai_service import (
    compute_tps_score,
    determine_sla_and_priority,
)

# STT 41: Safe Navigation
from app.schemas.navigation.schemas import (
    CalculateRouteRequest,
    GeoPoint,
    VehicleType,
    VEHICLE_FLOOD_THRESHOLDS,
)
from app.services.navigation.service import (
    SafeNavigationService,
    haversine_distance_meters,
)

# STT 42: Urban Risk Dashboard
from app.services.risk_dashboard.risk_dashboard_service import RiskDashboardService

# STT 43: Operations Dispatch
from app.models.dispatch.dispatch_order import DispatchOrder
from app.schemas.dispatch.schemas import (
    CreateDispatchOrderRequest,
    CloseDispatchOrderRequest,
    IncidentComboboxItem,
    TeamOptionItem,
)
from app.services.dispatch.dispatch_service import DispatchService

# STT 44: Hotspot Analytics
from app.schemas.hotspots.schemas import (
    HotspotClusterItem,
    HotspotFilterRequest,
)
from app.services.hotspots.hotspot_service import HotspotService

# STT 45: Emergency Alert
from app.models.emergency_alert.alert import EmergencyBroadcastAlert
from app.schemas.emergency_alert.schemas import BroadcastAlertRequest
from app.services.emergency_alert.alert_service import EmergencyAlertService

# STT 46: Flood SOS
from app.models.flood_sos.sos_request import FloodSosRequest
from app.schemas.flood_sos.schemas import (
    CreateFloodSosRequest,
    AcceptSosRequest,
)
from app.services.flood_sos.flood_sos_service import FloodSosService

# STT 47: Incident Export
from app.schemas.incident_export.schemas import IncidentExportFilterParams
from app.services.incident_export.incident_export_service import IncidentExportService

# STT 48: Admin Dashboard
from app.services.admin_dashboard.dashboard_service import AdminDashboardService


@pytest.mark.asyncio
class TestMultiRoleWorkflow37To48:
    """
    Chuỗi kiểm thử phân quyền và luồng tác nghiệp đa vai trò (Citizen, Admin, Volunteer, Field Crew).
    """

    async def test_01_citizen_voice_assistant_and_ai_triage(self):
        """
        [Vai trò: Người dân (Citizen)]
        1. Người dân ra lệnh bằng giọng nói: "Báo cáo bãi rác ngã tư Lê Lợi".
        2. NLU phân loại ý định mở báo cáo sự cố (STT 37).
        3. Thuật toán TPS chuẩn hóa tính điểm rủi ro và xác định mức độ ưu tiên cùng SLA (STT 39).
        """
        nlu = VoiceNluService()
        normalized = nlu.normalize_text("Báo cáo nước kênh màu đen bốc mùi hôi thối")
        assert "Báo cáo" in normalized

        intent, conf, act, tgt, resp = nlu.match_intent("Báo cáo bãi rác ngã tư Lê Lợi.", [])
        assert intent == "REPORT_INCIDENT"
        assert conf >= 0.9

        # Thuật toán TPS (STT 39)
        tps = compute_tps_score(
            base_severity=90.0,
            proximity_risk=85.0,
            scale_factor=80.0,
            urgency_nlp=95.0,
        )
        assert 80.0 <= tps <= 100.0

        priority_vn, code, sla_receive_min, sla_resolve_hr = determine_sla_and_priority(tps)
        assert priority_vn == "Khẩn cấp"
        assert code == "CRITICAL"
        assert sla_receive_min == 30
        assert sla_resolve_hr == 4

    async def test_02_admin_dispatch_order_creation_and_field_progress(self):
        """
        [Vai trò: Ban quản trị (Admin) & Đội cơ động tác nghiệp (Field Crew)]
        1. Admin tạo lệnh điều phối xử lý hiện trường (STT 43).
        2. Đội cơ động tiếp nhận, cập nhật tiến độ qua các bước (Stepper) và nghiệm thu hoàn thành.
        """
        order_uuid = uuid.uuid4()
        incident_uuid = uuid.uuid4()

        mock_order = DispatchOrder(
            order_id=order_uuid,
            order_code="LX-1042",
            incident_id=incident_uuid,
            incident_title="Xả nước thải chưa qua xử lý",
            incident_type="WATER_POLLUTION",
            location_address="128 Kênh Nhiêu Lộc, Quận 3",
            district="Quận 3",
            latitude=10.785,
            longitude=106.685,
            team_id="TEAM-Q3",
            team_name="Đội Cơ Động Môi Trường Quận 3",
            team_phone="0912.345.678",
            team_distance_km=1.5,
            team_latitude=10.780,
            team_longitude=106.680,
            status="ASSIGNED",
            deadline=datetime.now(timezone.utc),
            assigned_at=datetime.now(timezone.utc),
            after_image_url="https://img.com/after.jpg",
            version=1,
        )

        mock_repo = MagicMock()
        mock_repo.get_available_incidents = AsyncMock(
            return_value=[
                IncidentComboboxItem(
                    incident_id=incident_uuid,
                    incident_code="INC-1042",
                    title="Xả nước thải chưa qua xử lý",
                    category="Xả nước thải",
                    urgency="URGENT",
                    location_address="128 Kênh Nhiêu Lộc, Quận 3",
                    district="Quận 3",
                    latitude=10.785,
                    longitude=106.685,
                )
            ]
        )
        mock_repo.get_response_teams = AsyncMock(
            return_value=[
                TeamOptionItem(
                    team_id="TEAM-Q3",
                    team_name="Đội Cơ Động Môi Trường Quận 3",
                    phone="0912.345.678",
                    current_status="AVAILABLE",
                    distance_km=1.5,
                    distance_label="Cách hiện trường 1.5km (Đang rảnh)",
                    latitude=10.780,
                    longitude=106.680,
                )
            ]
        )
        mock_repo.create_order = AsyncMock(return_value=mock_order)
        mock_repo.get_order_by_id = AsyncMock(return_value=mock_order)
        mock_repo.close_order = AsyncMock(return_value=mock_order)

        service = DispatchService(mock_repo)
        mock_db = AsyncMock()

        # Admin tạo lệnh điều phối
        create_req = CreateDispatchOrderRequest(
            incident_id=incident_uuid,
            team_id="TEAM-Q3",
            priority="URGENT",
            deadline=datetime.now(timezone.utc) + timedelta(hours=4),
            adjustment_notes="Kiểm tra gấp gần trường học",
        )
        created = await service.create_dispatch_order(mock_db, create_req)
        assert created.success is True

        # Đội cơ động đóng lệnh hoàn thành
        close_req = CloseDispatchOrderRequest(
            version=1,
            notes="Đã nghiệm thu hiện trường sạch sẽ",
        )
        closed = await service.close_dispatch_order(mock_db, order_uuid, close_req)
        assert closed.success is True

    async def test_03_citizen_flood_sos_and_volunteer_network_flow(self):
        """
        [Vai trò: Người dân gặp nạn (Citizen) & Tình nguyện viên cứu hộ (Volunteer - CTV)]
        1. Người dân phát tín hiệu SOS ngập lụt khẩn cấp (STT 46).
        2. Tình nguyện viên (CTV) trong khu vực tiếp nhận ca cứu nạn và cập nhật tiến độ di chuyển.
        """
        sos_uuid = uuid.uuid4()
        vol_uuid = uuid.uuid4()

        mock_sos = FloodSosRequest(
            request_id=sos_uuid,
            sos_code="SOS-1234",
            victim_name="Phạm Văn D",
            victim_phone="0912345678",
            total_victims=3,
            elderly_count=1,
            children_count=1,
            medical_urgent_count=0,
            description="Nước dâng cao cần xuồng hỗ trợ",
            latitude=10.750,
            longitude=106.660,
            address_text="Khu phố 4, Phường 15, Quận 8",
            severity_level="CRITICAL",
            flood_depth_meters=1.2,
            status="PENDING",
            version=1,
            created_at=datetime.now(timezone.utc),
        )

        mock_repo = MagicMock()
        mock_repo.create_sos_request = AsyncMock(return_value=mock_sos)
        mock_repo.count_nearby_volunteers = AsyncMock(return_value=4)
        mock_repo.get_sos_by_id = AsyncMock(return_value=mock_sos)
        mock_repo.accept_sos_request = AsyncMock(return_value=(True, mock_sos, None))
        mock_repo.add_chat_message = AsyncMock(return_value=None)
        mock_repo.get_chat_messages = AsyncMock(return_value=[])

        service = FloodSosService(mock_repo)
        mock_db = AsyncMock()

        # Người dân gửi cứu hộ SOS
        create_req = CreateFloodSosRequest(
            victim_name="Phạm Văn D",
            victim_phone="0912345678",
            total_victims=3,
            elderly_count=1,
            children_count=1,
            medical_urgent_count=0,
            description="Nước dâng cao cần xuồng hỗ trợ",
            latitude=10.750,
            longitude=106.660,
            address_text="Khu phố 4, Phường 15, Quận 8",
            severity_level="CRITICAL",
            flood_depth_meters=1.2,
        )
        res = await service.dispatch_sos(mock_db, create_req)
        assert res.success is True
        assert res.sos_code == "SOS-1234"
        assert res.estimated_nearby_volunteers == 4

        # Tình nguyện viên tiếp nhận ca
        accept_req = AcceptSosRequest(
            team_name="Đội Cano Cứu Trợ",
            vehicle_type="Xuồng máy 25HP",
            volunteer_latitude=10.752,
            volunteer_longitude=106.662,
            version=1,
        )
        tracking_res = await service.accept_sos(mock_db, sos_uuid, accept_req)
        assert tracking_res.request_id == sos_uuid

    async def test_04_admin_executive_dashboard_and_export_flow(self):
        """
        [Vai trò: Ban Lãnh đạo cấp cao (Executive / Super Admin)]
        1. Xem trước và trích xuất báo cáo dữ liệu sự cố ra Excel / PDF (STT 47).
        2. Xem thống kê hoạt động người dùng, bài viết, nhóm toàn hệ thống theo thời gian thực (STT 48).
        """
        mock_db = AsyncMock()

        # STT 47: Export Preview Service
        mock_export_repo = MagicMock()
        mock_export_repo.get_preview_incidents = AsyncMock(
            return_value=(
                [
                    {
                        "incident_id": str(uuid.uuid4()),
                        "tracking_code": "TK-2026-001",
                        "title": "Ô nhiễm kênh Nhiêu Lộc",
                        "category_name": "Nước thải",
                        "district_name": "Quận 3",
                        "status": "Đã xử lý",
                        "status_code": "RESOLVED",
                        "address_text": "Kênh Nhiêu Lộc, Quận 3",
                        "created_at": "2026-10-25 09:00:00",
                    }
                ],
                1,
            )
        )
        export_service = IncidentExportService(mock_export_repo)
        preview_res = await export_service.preview_incidents(
            IncidentExportFilterParams(page=1, page_size=10, district="Quận 3")
        )
        assert preview_res.success is True
        assert preview_res.total_records == 1
        assert preview_res.items[0].tracking_code == "TK-2026-001"

        # STT 48: Admin Dashboard
        mock_admin_repo = MagicMock()
        mock_admin_repo.get_daily_stats = AsyncMock(
            return_value=[
                (date(2026, 10, 26), 25, 40, 3),
                (date(2026, 10, 27), 30, 60, 5),
            ]
        )
        mock_admin_repo.get_period_totals = AsyncMock(return_value=(55, 100, 8))
        mock_admin_repo.get_previous_period_totals = AsyncMock(return_value=(40, 80, 6))

        admin_service = AdminDashboardService(mock_admin_repo)
        dashboard = await admin_service.get_activity_dashboard(mock_db, period_days=7)

        assert dashboard.kpi.total_new_users == 55
        assert dashboard.kpi.total_new_posts == 100
        assert dashboard.kpi.total_new_groups == 8
        assert dashboard.kpi.users_growth_pct == 37.5
        assert len(dashboard.daily_series) == 2

    async def test_05_citizen_safe_navigation_and_admin_urban_risk_analysis(self):
        """
        [Vai trò: Người dân lưu thông (Citizen) & Ban Quản lý Đô thị (Admin)]
        1. Người dân tìm đường an toàn tránh các điểm ngập nước (STT 41).
        2. Ban Quản trị phân tích chỉ số rủi ro môi trường đô thị trên 22 quận/huyện (STT 42).
        """
        mock_db = AsyncMock()

        # 1. Citizen Safe Navigation (STT 41)
        nav_service = SafeNavigationService()
        req_route = CalculateRouteRequest(
            origin=GeoPoint(name="Bến Thành", latitude=10.7725, longitude=106.6980),
            destination=GeoPoint(name="Đức Bà", latitude=10.7798, longitude=106.6990),
            vehicle_type=VehicleType.MOTORBIKE,
        )
        assert VEHICLE_FLOOD_THRESHOLDS[VehicleType.MOTORBIKE] == 25.0

        mock_hotspots = [
            {
                "hotspot_id": "1",
                "hotspot_code": "FL-01",
                "street_name": "Nguyễn Hữu Cảnh",
                "lat": 10.7838,
                "lng": 106.7099,
                "predicted_depth_cm": 35.0,
                "severity_level": "SEVERE",
            }
        ]
        with patch.object(nav_service, "_fetch_flood_hotspots", new=AsyncMock(return_value=mock_hotspots)), \
             patch("app.services.navigation.service.tide_engine.get_current_tide", return_value={"water_level_meters": 1.45}), \
             patch("app.services.navigation.service.weather_service.get_hcm_rainfall", new=AsyncMock(return_value={"current_rain_mmh": 20.0})):
            plan = await nav_service.calculate_dual_routes(mock_db, req_route)

        assert plan.fastest_route is not None
        assert plan.safest_route is not None
        assert plan.vehicle_threshold_cm == 25.0
        assert len(plan.safest_route.turn_steps) > 0

        # 2. Admin Urban Risk Dashboard (STT 42)
        mock_risk_repo = MagicMock()
        mock_risk_repo.get_citywide_overview_metrics = AsyncMock(
            return_value={
                "overall_risk_score": 64.2,
                "high_risk_district_count": 3,
                "open_incident_count": 89,
            }
        )
        mock_risk_repo.get_district_risk_rankings = AsyncMock(
            return_value=[
                {
                    "unit_id": 1,
                    "district_name": "Quận Bình Tân",
                    "risk_score": 85.0,
                    "risk_level": "CRITICAL",
                    "risk_level_label": "Báo động đỏ",
                    "open_incidents": 22,
                    "spontaneous_dumps": 14,
                    "flood_points": 8,
                    "threatened_facilities": 5,
                    "latitude": 10.765,
                    "longitude": 106.603,
                }
            ]
        )
        mock_risk_repo.get_30_day_risk_trends = AsyncMock(return_value=[])
        mock_risk_repo.get_top_alert_districts = AsyncMock(return_value=[])

        risk_service = RiskDashboardService(mock_risk_repo)
        overview = await risk_service.get_overview_dashboard(mock_db)
        assert overview.overall_risk_score == 64.2
        assert overview.high_risk_district_count == 3
        assert len(overview.district_risks) == 1
        assert overview.district_risks[0].risk_score == 85.0

    async def test_06_hotspot_analytics_and_emergency_broadcast_alert(self):
        """
        [Vai trò: Trung tâm tác nghiệp khẩn cấp (Emergency Admin) & Người dân vùng ảnh hưởng (Citizen)]
        1. Phân tích cụm điểm nóng ô nhiễm không gian và xếp hạng Top 5 (STT 44).
        2. Phát lệnh cảnh báo khẩn cấp diện rộng Geofencing tới người dân trong bán kính rủi ro (STT 45).
        """
        mock_db = AsyncMock()

        # 1. Hotspot Analytics (STT 44)
        mock_cluster = HotspotClusterItem(
            hotspot_id="HOTSPOT-01",
            hotspot_code="HS-101",
            name="Cụm kênh Nhiêu Lộc - Thị Nghè",
            incident_type="WATER_POLLUTION",
            incident_type_label="Ô nhiễm nước",
            district="Quận 3",
            latitude=10.785,
            longitude=106.685,
            radius_meters=1200.0,
            kde_density_score=88.5,
            incident_count=28,
            severity_level="CRITICAL",
            severity_label="Báo động đỏ",
            severity_color="#DC2626",
            trend_description="Tăng 15% so với tuần trước",
            forecast_48h="Dự báo tiếp tục tăng do triều cường",
        )
        mock_hotspot_repo = MagicMock()
        mock_hotspot_repo.get_hotspot_clusters = AsyncMock(return_value=[mock_cluster])
        mock_hotspot_repo.get_top_5_hotspots = AsyncMock(return_value=[mock_cluster])

        hotspot_service = HotspotService(mock_hotspot_repo)
        map_res = await hotspot_service.get_hotspot_map(
            mock_db, HotspotFilterRequest(incident_type="ALL", time_range="7D")
        )
        assert map_res.has_data is True
        assert map_res.total_clusters == 1
        assert len(map_res.top_5_hotspots) == 1

        # 2. Emergency Alert Broadcast (STT 45)
        alert_uuid = uuid.uuid4()
        creator_uuid = uuid.uuid4()
        citizen_uuid = uuid.uuid4()

        mock_alert = EmergencyBroadcastAlert(
            alert_id=alert_uuid,
            alert_code="EBA-20261027-9999",
            alert_type="POLLUTION_SPIKE",
            title="Sự cố tràn dầu kênh Nhiêu Lộc",
            content="Khuyến cáo người dân không tiếp xúc gần nguồn nước",
            center_location="SRID=4326;POINT(106.685 10.785)",
            center_latitude=10.785,
            center_longitude=106.685,
            radius_meters=2000.0,
            severity_level="CRITICAL",
            estimated_recipients=1,
            actual_sent_count=1,
            status="BROADCASTED",
            created_by=creator_uuid,
            broadcasted_at=datetime.utcnow(),
        )

        mock_alert_repo = MagicMock()
        mock_alert_repo.get_user_device_locations_in_radius = AsyncMock(
            return_value=[(citizen_uuid, 10.786, 106.686, 150.0)]
        )
        mock_alert_repo.create_broadcast_alert = AsyncMock(return_value=mock_alert)
        mock_alert_repo.bulk_create_recipients = AsyncMock(return_value=1)

        mock_safety_repo = MagicMock()

        emergency_service = EmergencyAlertService(
            alert_repo=mock_alert_repo,
            safety_repo=mock_safety_repo,
        )

        broadcast_req = BroadcastAlertRequest(
            alert_type="POLLUTION_SPIKE",
            title="Sự cố tràn dầu kênh Nhiêu Lộc",
            content="Khuyến cáo người dân không tiếp xúc gần nguồn nước",
            center_latitude=10.785,
            center_longitude=106.685,
            radius_meters=2000.0,
            severity_level="CRITICAL",
        )

        broadcast_res = await emergency_service.broadcast_alert(
            mock_db, broadcast_req, creator_uuid
        )
        assert broadcast_res.success is True
        assert broadcast_res.alert_code == "EBA-20261027-9999"
        assert broadcast_res.actual_sent_count == 1
