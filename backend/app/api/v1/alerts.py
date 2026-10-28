import json
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.alert_notification import (
    AlertCreateRequest,
    AlertListResponse,
    AlertResolveRequest,
    AlertResponse,
    AlertRevokeRequest,
    AlertTemplate,
    AlertUpdateRequest,
)
from app.schemas.alert_config import (
    AlertConfigResponse,
    UpdateThresholdsRequest,
)
from app.schemas.sos_alert import (
    SOSSubmitRequest,
    SOSSubmitResponse,
    SOSBroadcastBannerStatus,
    ToggleSOSBannerRequest,
)
from app.services.alert_service import AlertService
from app.services.alert_config_service import AlertConfigService
from app.services.sos_service import SOSService
from fastapi import Request

router = APIRouter(prefix="/alerts", tags=["Cảnh báo Môi trường & SOS (Chức năng 28, 34, 35)"])


def format_alert_response(alert) -> AlertResponse:
    districts = []
    if alert.affected_districts:
        try:
            districts = json.loads(alert.affected_districts)
        except Exception:
            districts = [d.strip() for d in alert.affected_districts.split(",") if d.strip()]

    return AlertResponse(
        alert_id=alert.alert_id,
        alert_code=alert.alert_code,
        title=alert.title,
        category=alert.category,
        severity_level=alert.severity_level,
        status=alert.status,
        affected_districts=districts,
        description=alert.description,
        safety_advice=alert.safety_advice,
        template_code=alert.template_code,
        published_at=alert.published_at,
        expires_at=alert.expires_at,
        resolved_at=alert.resolved_at,
        resolved_note=alert.resolved_note,
        revoked_at=alert.revoked_at,
        revoke_reason=alert.revoke_reason,
        created_by=alert.created_by,
        created_at=alert.created_at,
        updated_at=alert.updated_at,
    )


@router.get("/templates", response_model=List[AlertTemplate])
async def get_alert_templates():
    """Lấy danh sách các mẫu bản tin cảnh báo chuẩn hóa có sẵn"""
    return AlertService.get_templates()


@router.post("", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
async def create_alert(
    req: AlertCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Biên tập bản tin cảnh báo môi trường mới.
    Có thể chọn lưu nháp (publish_now=False) hoặc phát hành ngay (publish_now=True).
    """
    alert = await AlertService.create_alert(db, req)
    return format_alert_response(alert)


@router.get("", response_model=AlertListResponse)
async def list_alerts(
    status_filter: Optional[str] = Query("ALL", description="Lọc theo trạng thái: ALL, ACTIVE, DRAFT, RESOLVED, REVOKED"),
    severity_filter: Optional[str] = Query("ALL", description="Lọc theo mức độ: ALL, YELLOW, ORANGE, RED"),
    category_filter: Optional[str] = Query("ALL", description="Lọc theo phân loại: ALL, AIR, WATER, WASTE, HAZARDOUS"),
    district: Optional[str] = Query(None, description="Lọc theo Quận/Huyện/Phường"),
    q: Optional[str] = Query(None, description="Tìm kiếm từ khóa theo mã, tiêu đề, nội dung"),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Danh sách bản tin cảnh báo môi trường với bộ lọc đa tiêu chí và thống kê số lượng"""
    skip = (page - 1) * limit
    items, total, stats = await AlertService.list_alerts(
        db,
        status_filter=status_filter,
        severity_filter=severity_filter,
        category_filter=category_filter,
        district_keyword=district,
        search_query=q,
        skip=skip,
        limit=limit,
    )
    formatted_items = [format_alert_response(item) for item in items]
    return AlertListResponse(
        items=formatted_items,
        total=total,
        active_count=stats["active_count"],
        draft_count=stats["draft_count"],
        resolved_count=stats["resolved_count"],
        revoked_count=stats["revoked_count"],
    )


@router.get("/{alert_id}", response_model=AlertResponse)
async def get_alert_detail(
    alert_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Xem chi tiết một bản tin cảnh báo cụ thể"""
    alert = await AlertService.get_alert(db, alert_id)
    return format_alert_response(alert)


@router.put("/{alert_id}", response_model=AlertResponse)
async def update_alert(
    alert_id: uuid.UUID,
    req: AlertUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Cập nhật hoặc đính chính thông tin bản tin cảnh báo"""
    alert = await AlertService.update_alert(db, alert_id, req)
    return format_alert_response(alert)


@router.post("/{alert_id}/publish", response_model=AlertResponse)
async def publish_alert(
    alert_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Phát hành bản tin cảnh báo (kích hoạt luồng thông báo đẩy thời gian thực)"""
    alert = await AlertService.publish_alert(db, alert_id)
    return format_alert_response(alert)


@router.post("/{alert_id}/resolve", response_model=AlertResponse)
async def resolve_alert(
    alert_id: uuid.UUID,
    req: AlertResolveRequest,
    db: AsyncSession = Depends(get_db),
):
    """Công bố an toàn / hạ cảnh báo ô nhiễm khi môi trường đã bình thường trở lại"""
    alert = await AlertService.resolve_alert(db, alert_id, req)
    return format_alert_response(alert)


@router.post("/{alert_id}/revoke", response_model=AlertResponse)
async def revoke_alert(
    alert_id: uuid.UUID,
    req: AlertRevokeRequest,
    db: AsyncSession = Depends(get_db),
):
    """Thu hồi khẩn cấp bản tin cảnh báo do nhầm lẫn hoặc sai sót"""
    alert = await AlertService.revoke_alert(db, alert_id, req)
    return format_alert_response(alert)


# =====================================================================
# CHỨC NĂNG 34: QUẢN TRỊ NGƯỠNG CẢNH BÁO & PHÂN LOẠI MỨC ĐỘ NGUY HIỂM
# =====================================================================
@router.get("/config/thresholds", response_model=AlertConfigResponse, summary="Lấy danh mục quy chuẩn và ngưỡng bán kính cảnh báo hiện hành")
async def get_alert_thresholds(
    db: AsyncSession = Depends(get_db),
):
    """
    Trả về định mức bán kính phát tin (0.5km - 10.0km), mẫu khuyến cáo y tế mặc định
    cho các cấp độ cảnh báo Vàng, Cam, Đỏ theo quy chuẩn Bảng 4.34.1.
    """
    return await AlertConfigService.get_threshold_configs(db)


@router.put("/config/thresholds", response_model=AlertConfigResponse, summary="Cập nhật quy chuẩn bán kính và mẫu khuyến cáo an toàn")
async def update_alert_thresholds(
    req: UpdateThresholdsRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Quản trị viên thiết lập bán kính phát cảnh báo tự động và mẫu y tế.
    Kiểm tra điều kiện ràng buộc: RULE_001 (>= 0.5km), RULE_002 (<= 10.0km), RULE_003 (không để trống).
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    return await AlertConfigService.update_threshold_configs(db, req, client_ip=client_ip)


@router.post("/config/thresholds/reset", response_model=AlertConfigResponse, summary="Khôi phục quy chuẩn cảnh báo về mặc định chuẩn Bộ TN&MT")
async def reset_alert_thresholds(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Khôi phục định mức chuẩn quốc gia về ngưỡng ô nhiễm và bán kính cảnh báo.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    return await AlertConfigService.reset_to_default(db, client_ip=client_ip)


# =====================================================================
# CHỨC NĂNG 35: KÊNH TIẾP NHẬN TÍN HIỆU CỨU NẠN MÔI TRƯỜNG KHẨN CẤP (SOS)
# =====================================================================
@router.post("/sos", response_model=SOSSubmitResponse, status_code=status.HTTP_201_CREATED, summary="Gửi tín hiệu cứu nạn môi trường SOS khẩn cấp (Dành cho người dân)")
async def submit_sos_alert(
    req: SOSSubmitRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Người dân báo tin nguy cấp (Cháy độc / Tràn hóa chất / Nước ô nhiễm) với thủ tục tối giản.
    Tự động gắn cờ CRITICAL, kích hoạt chuông cảnh báo trên màn hình trực ban cán bộ.
    Ràng buộc: SOS_001 (SĐT 10 số hợp lệ), SOS_002 (Có GPS), SOS_003 (Tối đa 1 tin/5 phút).
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    return await SOSService.submit_sos_incident(db, req, client_ip=client_ip)


@router.get("/sos/active-broadcast", response_model=SOSBroadcastBannerStatus, summary="Kiểm tra trạng thái dải Banner phát sóng cảnh báo khẩn cấp toàn cổng")
async def get_sos_broadcast_banner(
    db: AsyncSession = Depends(get_db),
):
    """
    Lấy thông tin dải Banner khẩn cấp màu đỏ (Marquee Alert) đang chạy trên đầu cổng thông tin.
    """
    return await SOSService.get_broadcast_banner(db)


@router.post("/sos/broadcast-banner", response_model=SOSBroadcastBannerStatus, summary="Kích hoạt hoặc hạ dải Banner cảnh báo khẩn cấp toàn hệ thống (Cán bộ trực ban)")
async def toggle_sos_broadcast_banner(
    req: ToggleSOSBannerRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Cán bộ trực ban xác minh nhanh thông tin và gạt công tắc kích hoạt/hạ Banner khẩn cấp.
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    return await SOSService.toggle_broadcast_banner(db, req, client_ip=client_ip)


@router.get("/sos/incidents", summary="Danh sách sự cố khẩn cấp SOS thời gian thực (Trực ban)")
async def list_recent_sos_incidents(
    db: AsyncSession = Depends(get_db),
):
    """
    Bảng tiếp nhận trực ban: Danh sách các tin SOS đến thời gian thực.
    """
    incidents = await SOSService.get_recent_sos_incidents(db)
    return [
        {
            "incident_id": inc.incident_id,
            "tracking_code": inc.tracking_code,
            "title": inc.title,
            "description": inc.description,
            "address_text": inc.address_text,
            "latitude": float(inc.latitude),
            "longitude": float(inc.longitude),
            "phone": inc.reporter_phone_masked,
            "severity": inc.severity,
            "status": inc.status,
            "created_at": inc.created_at.strftime("%H:%M:%S %d/%m/%Y"),
        }
        for inc in incidents
    ]


# =====================================================================
# CHỨC NĂNG 31: BẢN ĐỒ GIÁM SÁT ĐIỂM CẢNH BÁO Ô NHIỄM TRỰC QUAN CHO CỘNG ĐỒNG
# =====================================================================
@router.get("/live-map-points", summary="Danh sách các điểm cảnh báo ô nhiễm trực quan trên bản đồ số (Chức năng 31)")
async def get_live_map_points(
    category: Optional[str] = Query(None, description="Lọc theo loại: AIR, WATER, WASTE, HAZARDOUS"),
    severity: Optional[str] = Query(None, description="Lọc theo mức độ: YELLOW, ORANGE, RED"),
    db: AsyncSession = Depends(get_db),
):
    """
    Cung cấp danh sách các điểm nóng ô nhiễm không gian địa lý:
    - Hiển thị theo cấp độ màu: Vàng (Chú ý), Cam (Nguy cơ), Đỏ (Khẩn cấp).
    - Hỗ trợ Geolocation định vị vị trí công dân và tính khoảng cách.
    - Kiểm tra tính hợp lệ tọa độ theo quy tắc MAP_001.
    """
    from sqlalchemy import select
    from app.models.incident import Incident
    from app.models.alert_notification import EnvironmentalAlert

    points = []

    # 1. Lấy từ các sự cố nghiêm trọng đang hoạt động trong bảng incidents
    inc_stmt = select(Incident).where(
        Incident.severity.in_(["CRITICAL", "HIGH", "MEDIUM"])
    ).order_by(Incident.created_at.desc()).limit(30)
    inc_res = (await db.execute(inc_stmt)).scalars().all()

    for inc in inc_res:
        try:
            lat = float(inc.latitude) if inc.latitude else 10.7769
            lng = float(inc.longitude) if inc.longitude else 106.7009
            # MAP_001: Kiểm tra tọa độ hợp lệ
            if not (-90.0 <= lat <= 90.0 and -180.0 <= lng <= 180.0):
                continue
        except (ValueError, TypeError):
            continue

        sev = "RED" if inc.severity == "CRITICAL" else ("ORANGE" if inc.severity == "HIGH" else "YELLOW")
        cat = "WASTE"
        if "khói" in inc.title.lower() or "bụi" in inc.title.lower() or "aqi" in inc.title.lower():
            cat = "AIR"
        elif "nước" in inc.title.lower() or "kênh" in inc.title.lower():
            cat = "WATER"
        elif "độc" in inc.title.lower() or "hóa chất" in inc.title.lower():
            cat = "HAZARDOUS"

        if category and category.upper() != "ALL" and cat != category.upper():
            continue
        if severity and severity.upper() != "ALL" and sev != severity.upper():
            continue

        advice = "Đề nghị người dân hạn chế tiếp cận khu vực này cho đến khi đội ngũ vệ sinh hoàn tất thu dọn."
        if sev == "RED":
            advice = "Khu vực nguy hại khẩn cấp: Đeo khẩu trang phòng hộ, đóng cửa nhà và làm theo hướng dẫn lực lượng chức năng!"
        elif sev == "ORANGE":
            advice = "Nguy cơ cao: Tránh lưu thông qua điểm này và chú ý bảo hộ hô hấp/da."

        district = "TP. Hồ Chí Minh"
        addr = inc.address_text or ""
        if "Quận 1" in addr:
            district = "Quận 1"
        elif "Quận 3" in addr:
            district = "Quận 3"
        elif "Thủ Đức" in addr:
            district = "TP. Thủ Đức"
        elif "Bình Thạnh" in addr:
            district = "Bình Thạnh"
        elif "Gò Vấp" in addr:
            district = "Gò Vấp"

        points.append({
            "point_id": str(inc.incident_id),
            "tracking_code": inc.tracking_code,
            "title": inc.title,
            "category": cat,
            "severity_level": sev,
            "latitude": lat,
            "longitude": lng,
            "district": district,
            "address": inc.address_text,
            "description": inc.description,
            "safety_advice": advice,
            "status": inc.status,
            "image_url": None,
            "created_at": inc.created_at.strftime("%H:%M %d/%m/%Y"),
        })

    # 2. Điểm cảnh báo chuẩn mẫu phân bổ các quận trọng điểm
    default_hotspots = [
        {
            "point_id": "ALERT-D1-01",
            "tracking_code": "WRN-2026-001",
            "title": "Ùn ứ rác sinh hoạt sau mưa lớn tại chân cầu Thị Nghè",
            "category": "WASTE",
            "severity_level": "YELLOW",
            "latitude": 10.7891,
            "longitude": 106.7058,
            "district": "Quận 1",
            "address": "Bờ kè kênh Nhiêu Lộc, Phường Bến Nghé, Quận 1",
            "description": "Lượng lớn bọc nilon và rác sinh hoạt trôi dạt tấp vào cống thoát nước.",
            "safety_advice": "Đơn vị thoát nước đô thị đang vớt rác; người dân không vứt rác xuống lòng kênh.",
            "status": "IN_PROGRESS",
            "image_url": "https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=400&q=80",
            "created_at": "08:30 23/10/2026",
        },
        {
            "point_id": "ALERT-THUDUC-02",
            "tracking_code": "WRN-2026-002",
            "title": "Nồng độ bụi mịn PM2.5 tăng cao gần nút giao Cát Lái",
            "category": "AIR",
            "severity_level": "ORANGE",
            "latitude": 10.7932,
            "longitude": 106.7621,
            "district": "TP. Thủ Đức",
            "address": "Nút giao thông An Phú - Cát Lái, TP. Thủ Đức",
            "description": "Lưu lượng xe container tải nặng di chuyển liên tục kết hợp trời nắng hanh làm bụi mịn tăng vượt mức 160 µg/m³.",
            "safety_advice": "Đeo khẩu trang đạt chuẩn N95 khi di chuyển qua nút giao; người có bệnh hô hấp hạn chế ra ngoài.",
            "status": "ACTIVE",
            "image_url": "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=400&q=80",
            "created_at": "09:15 23/10/2026",
        },
        {
            "point_id": "ALERT-BINHTHANH-03",
            "tracking_code": "WRN-2026-003",
            "title": "Nước thải đen bốc mùi tại rạch Xuyên Tâm",
            "category": "WATER",
            "severity_level": "RED",
            "latitude": 10.8062,
            "longitude": 106.6995,
            "district": "Bình Thạnh",
            "address": "Rạch Xuyên Tâm đoạn qua Phường 15, Quận Bình Thạnh",
            "description": "Nước kênh chuyển màu đen kịt bốc mùi xú uế nồng nặc do cống nghẽn ứ đọng rác thải lâu ngày.",
            "safety_advice": "Đóng kín cửa nhà sát mép rạch; không sử dụng nguồn nước này dưới mọi hình thức.",
            "status": "ACTIVE",
            "image_url": "https://images.unsplash.com/photo-1621451537084-482c73073a0f?auto=format&fit=crop&w=400&q=80",
            "created_at": "07:45 23/10/2026",
        },
    ]

    for p in default_hotspots:
        if category and category.upper() != "ALL" and p["category"] != category.upper():
            continue
        if severity and severity.upper() != "ALL" and p["severity_level"] != severity.upper():
            continue
        # Tránh trùng lặp
        if not any(x["tracking_code"] == p["tracking_code"] for x in points):
            points.append(p)

    return points


# =====================================================================
# CHỨC NĂNG 32: ĐĂNG KÝ NHẬN TIN CẢNH BÁO CÁ NHÂN HÓA THEO KHU VỰC CƯ TRÚ
# =====================================================================
@router.get("/subscriptions/me", summary="Lấy cấu hình đăng ký nhận tin cảnh báo cá nhân hóa (Chức năng 32)")
async def get_my_alert_subscription(
    user_id: Optional[str] = Query(None, description="User ID"),
    user_email: Optional[str] = Query(None, description="Email người dùng"),
    db: AsyncSession = Depends(get_db),
):
    """
    Truy xuất sở thích nhận tin cảnh báo của công dân (tối đa 5 khu vực, mức cảnh báo, kênh Web/Email).
    """
    from app.services.alert_subscription_service import AlertSubscriptionService
    effective_user_id = user_id or "default_citizen_user"
    return await AlertSubscriptionService.get_subscription(db, effective_user_id, user_email=user_email)


@router.post("/subscriptions/me", summary="Lưu cấu hình đăng ký nhận tin cảnh báo cá nhân hóa (Chức năng 32)")
async def update_my_alert_subscription(
    req: dict,
    user_id: Optional[str] = Query(None, description="User ID"),
    user_email: Optional[str] = Query(None, description="Email người dùng"),
    db: AsyncSession = Depends(get_db),
):
    """
    Lưu sở thích nhận tin của công dân.
    Ràng buộc nghiệp vụ:
    - SUB_001: Tối đa 5 khu vực địa bàn.
    - SUB_002: Bắt buộc giữ ít nhất 1 kênh nhận tin (Web hoặc Email).
    - SUB_003: Email nhận tin phải hợp lệ khi bật nhận qua Email.
    """
    from app.schemas.alert_subscription import AlertSubscriptionRequest
    from app.services.alert_subscription_service import AlertSubscriptionService

    sub_req = AlertSubscriptionRequest(**req)
    effective_user_id = user_id or "default_citizen_user"
    return await AlertSubscriptionService.update_subscription(
        db, effective_user_id, sub_req, user_email=user_email
    )

