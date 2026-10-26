"""
Unit & Integration Tests cho STT 46: Cứu hộ ngập cộng đồng (Flood SOS)
Bao phủ 100% 5 màn hình theo đặc tả:
- Màn 1/5: Giao diện phát tín hiệu cấp cứu khẩn cấp (Emergency SOS Dispatch)
- Màn 2/5: Popup xác nhận khẩn cấp (GỬI YÊU CẦU CỨU HỘ?)
- Màn 3/5: Bảng phân bổ cứu hộ Tình nguyện viên & Đội phản ứng nhanh (Community Volunteer Response Dashboard)
- Màn 4/5: Trung tâm theo dõi hành trình cứu nạn (Live Tracking & Stepper & Chat)
- Màn 5/5: Popup xác nhận huỷ yêu cầu SOS & Safeguard cự ly gần (<100m)

Tuân thủ Clean Architecture, DIP (Dependency Inversion Principle) và OCC Concurrency.
"""

from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple
import uuid
import pytest
from pydantic import ValidationError
from fastapi import HTTPException
from fastapi.testclient import TestClient

from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.interface.flood_sos.flood_sos_interface import IFloodSosRepository
from app.models.flood_sos.sos_request import FloodSosRequest, FloodSosChatMessage, VolunteerProfile
from app.schemas.flood_sos.schemas import (
    CreateFloodSosRequest,
    AcceptSosRequest,
    SkipSosRequest,
    UpdateSosProgressRequest,
    SendChatMessageRequest,
    CancelSosRequest,
    CompleteSosRatingRequest,
)
from app.services.flood_sos.flood_sos_service import FloodSosService
from app.api.v1.flood_sos.router import get_flood_sos_service
from app.crud.flood_sos.flood_sos_repository import haversine_distance_meters


class MockFloodSosRepository(IFloodSosRepository):
    """
    Mock Repository tuân thủ IFloodSosRepository phục vụ kiểm thử đơn vị độc lập,
    chuẩn DIP, không phụ thuộc vào hạ tầng cơ sở dữ liệu vật lý.
    """

    def __init__(self):
        self.requests: Dict[uuid.UUID, FloodSosRequest] = {}
        self.volunteers: Dict[uuid.UUID, VolunteerProfile] = {}
        self.chat_messages: Dict[uuid.UUID, List[FloodSosChatMessage]] = {}

    async def create_sos_request(
        self,
        db: AsyncSession,
        sos_code: str,
        victim_id: Optional[uuid.UUID],
        victim_name: str,
        victim_phone: str,
        total_victims: int,
        elderly_count: int,
        children_count: int,
        medical_urgent_count: int,
        description: str,
        image_url: Optional[str],
        latitude: float,
        longitude: float,
        address_text: str,
        district: Optional[str] = None,
        ward: Optional[str] = None,
        severity_level: str = "CRITICAL",
        flood_depth_meters: Optional[float] = 1.0,
    ) -> FloodSosRequest:
        req_id = uuid.uuid4()
        now = datetime.now(timezone.utc)
        req = FloodSosRequest(
            request_id=req_id,
            sos_code=sos_code,
            victim_id=victim_id,
            victim_name=victim_name,
            victim_phone=victim_phone,
            total_victims=total_victims,
            elderly_count=elderly_count,
            children_count=children_count,
            medical_urgent_count=medical_urgent_count,
            description=description,
            image_url=image_url,
            latitude=latitude,
            longitude=longitude,
            location=f"SRID=4326;POINT({longitude} {latitude})",
            address_text=address_text,
            district=district,
            ward=ward,
            severity_level=severity_level,
            flood_depth_meters=flood_depth_meters,
            status="PENDING",
            version=1,
            created_at=now,
            updated_at=now,
        )
        self.requests[req_id] = req
        self.chat_messages[req_id] = []
        return req

    async def get_sos_by_id(self, db: AsyncSession, request_id: uuid.UUID) -> Optional[FloodSosRequest]:
        req = self.requests.get(request_id)
        if req and req.deleted_at is None:
            return req
        return None

    async def get_nearby_sos_requests(
        self,
        db: AsyncSession,
        lat: float,
        lng: float,
        radius_km: float = 3.0,
    ) -> List[Tuple[FloodSosRequest, float]]:
        results = []
        for req in self.requests.values():
            if req.deleted_at is not None or req.status != "PENDING":
                continue
            dist = haversine_distance_meters(lat, lng, req.latitude, req.longitude)
            if dist <= radius_km * 1000.0:
                results.append((req, dist))
        results.sort(key=lambda x: x[1])
        return results

    async def count_nearby_volunteers(
        self,
        db: AsyncSession,
        lat: float,
        lng: float,
        radius_km: float = 3.0,
    ) -> int:
        return 3

    async def accept_sos_request(
        self,
        db: AsyncSession,
        request_id: uuid.UUID,
        volunteer_id: Optional[uuid.UUID],
        volunteer_name: str,
        volunteer_phone: str,
        team_name: Optional[str],
        vehicle_type: Optional[str],
        vol_lat: float,
        vol_lng: float,
        distance_meters: float,
        eta_minutes: int,
        expected_version: int,
    ) -> Tuple[bool, Optional[FloodSosRequest], Optional[str]]:
        req = self.requests.get(request_id)
        if not req or req.deleted_at is not None:
            return False, None, "Ca cứu hộ không tồn tại hoặc đã kết thúc."
        if req.status != "PENDING":
            return False, None, "Yêu cầu cứu hộ này đã được một tình nguyện viên khác tiếp nhận."
        if req.version != expected_version:
            return False, None, "Yêu cầu cứu hộ này đã được một tình nguyện viên khác tiếp nhận."

        now = datetime.now(timezone.utc)
        req.status = "ACCEPTED"
        req.assigned_volunteer_id = volunteer_id
        req.assigned_rescuer_name = volunteer_name
        req.assigned_rescuer_phone = volunteer_phone
        req.assigned_team_name = team_name
        req.assigned_vehicle_type = vehicle_type
        req.rescuer_latitude = vol_lat
        req.rescuer_longitude = vol_lng
        req.rescuer_distance_meters = distance_meters
        req.rescuer_eta_minutes = eta_minutes
        req.version += 1
        req.assigned_at = now
        req.updated_at = now
        return True, req, None

    async def update_sos_progress(
        self,
        db: AsyncSession,
        request_id: uuid.UUID,
        status: str,
        rescuer_lat: float,
        rescuer_lng: float,
        distance_meters: float,
        eta_minutes: int,
        expected_version: int,
    ) -> Tuple[bool, Optional[FloodSosRequest], Optional[str]]:
        req = self.requests.get(request_id)
        if not req or req.deleted_at is not None:
            return False, None, "Ca cứu hộ không tồn tại."
        if req.version != expected_version:
            return False, None, "Dữ liệu ca cứu hộ đã bị thay đổi bởi phiên làm việc khác."

        now = datetime.now(timezone.utc)
        req.status = status
        req.rescuer_latitude = rescuer_lat
        req.rescuer_longitude = rescuer_lng
        req.rescuer_distance_meters = distance_meters
        req.rescuer_eta_minutes = eta_minutes
        req.version += 1
        req.updated_at = now
        if status == "COMPLETED":
            req.completed_at = now
        return True, req, None

    async def cancel_sos_request(
        self,
        db: AsyncSession,
        request_id: uuid.UUID,
        cancel_reason: str,
        expected_version: int,
    ) -> Tuple[bool, Optional[FloodSosRequest], Optional[str]]:
        req = self.requests.get(request_id)
        if not req or req.deleted_at is not None:
            return False, None, "Ca cứu hộ không tồn tại."
        if req.version != expected_version:
            return False, None, "Dữ liệu ca cứu hộ đã thay đổi."

        now = datetime.now(timezone.utc)
        req.status = "CANCELLED"
        req.cancel_reason = cancel_reason
        req.cancelled_at = now
        req.version += 1
        req.updated_at = now
        return True, req, None

    async def add_chat_message(
        self,
        db: AsyncSession,
        request_id: uuid.UUID,
        sender_id: Optional[uuid.UUID],
        sender_type: str,
        sender_name: str,
        content: str,
    ) -> FloodSosChatMessage:
        msg = FloodSosChatMessage(
            message_id=uuid.uuid4(),
            request_id=request_id,
            sender_id=sender_id,
            sender_type=sender_type,
            sender_name=sender_name,
            content=content,
            created_at=datetime.now(timezone.utc),
        )
        if request_id not in self.chat_messages:
            self.chat_messages[request_id] = []
        self.chat_messages[request_id].append(msg)
        return msg

    async def get_chat_messages(
        self,
        db: AsyncSession,
        request_id: uuid.UUID,
    ) -> List[FloodSosChatMessage]:
        return self.chat_messages.get(request_id, [])

    async def complete_sos_rating(
        self,
        db: AsyncSession,
        request_id: uuid.UUID,
        rating: int,
        feedback_notes: Optional[str] = None,
    ) -> Optional[FloodSosRequest]:
        req = self.requests.get(request_id)
        if not req or req.deleted_at is not None:
            return None
        now = datetime.now(timezone.utc)
        req.rating = rating
        req.feedback_notes = feedback_notes
        req.updated_at = now
        return req

    async def get_sos_by_code(self, db: AsyncSession, sos_code: str) -> Optional[FloodSosRequest]:
        for req in self.requests.values():
            if req.sos_code == sos_code and req.deleted_at is None:
                return req
        return None

    async def soft_delete_sos_request(self, db: AsyncSession, request_id: uuid.UUID) -> bool:
        req = self.requests.get(request_id)
        if not req or req.deleted_at is not None:
            return False
        req.deleted_at = datetime.now(timezone.utc)
        return True


@pytest.fixture
def mock_repo():
    return MockFloodSosRepository()


@pytest.fixture
def service(mock_repo):
    return FloodSosService(repository=mock_repo)


# =========================================================================
# TEST CASES
# =========================================================================

@pytest.mark.asyncio
async def test_01_create_flood_sos_and_format_iso_code(service):
    """Màn 1/5 & 2/5: Tạo yêu cầu cứu hộ khẩn cấp thành công kèm mã định danh SOS chuẩn."""
    payload = CreateFloodSosRequest(
        victim_name="Nguyễn Văn Test",
        victim_phone="0912345678",
        total_victims=4,
        elderly_count=1,
        children_count=1,
        medical_urgent_count=1,
        description="Nước dâng ngang ngực, mất điện, trần nhà sắp ngập, cần phao cứu sinh gấp",
        image_url="https://images.unsplash.com/photo-1547683905-f686c993aae5",
        latitude=10.762622,
        longitude=106.660172,
        address_text="123 Đường Ba Tháng Hai, Phường 11, Quận 10, TP.HCM",
    )

    res = await service.dispatch_sos(db=None, req=payload)
    assert res.success is True
    assert res.request_id is not None
    assert res.sos_code.startswith("SOS-")
    assert res.status == "PENDING"
    assert "Đã phát tín hiệu cứu hộ SOS" in res.message
    assert res.broadcast_radius_km == 3.0


def test_02_validation_empty_victims_raises_error():
    """Màn 1/5: Bỏ trống hoặc nhập số người cần cứu <= 0 phải báo lỗi validation."""
    invalid_data = {
        "victim_name": "Test Citizen",
        "victim_phone": "0901112233",
        "total_victims": 0,  # Invalid: < 1
        "description": "Cần cứu hộ",
        "latitude": 10.75,
        "longitude": 106.68,
        "address_text": "Quận 8, TP.HCM",
    }
    with pytest.raises(ValidationError):
        CreateFloodSosRequest.model_validate(invalid_data)


@pytest.mark.asyncio
async def test_03_nearby_geofencing_3km_for_volunteer(service):
    """Màn 3/5: Tình nguyện viên quét yêu cầu trong bán kính 3km."""
    near_req = CreateFloodSosRequest(
        victim_name="Gia đình gần",
        victim_phone="0988776655",
        total_victims=2,
        description="Nước ngập 1.2m ngõ sâu",
        latitude=10.762000,
        longitude=106.661000,
        address_text="Hẻm 456 CMT8, Quận 10",
    )
    created_near = await service.dispatch_sos(db=None, req=near_req)

    # 1. Quét tại vị trí cách ~300m
    nearby_cards = await service.get_nearby_sos_for_volunteer(
        db=None,
        lat=10.762622,
        lng=106.660172,
        radius_km=3.0,
    )
    assert len(nearby_cards) == 1
    card = nearby_cards[0]
    assert card.request_id == created_near.request_id
    assert card.distance_meters < 1000.0
    assert "Cách bạn" in card.distance_text

    # 2. Quét từ vị trí xa (> 30km)
    far_cards = await service.get_nearby_sos_for_volunteer(
        db=None,
        lat=10.34,
        lng=107.08,
        radius_km=3.0,
    )
    assert len(far_cards) == 0


@pytest.mark.asyncio
async def test_04_accept_sos_and_occ_conflict_409(service):
    """Màn 3/5: Tiếp nhận ca cứu hộ và kiểm tra Optimistic Concurrency Control (OCC 409)."""
    req_data = CreateFloodSosRequest(
        victim_name="Nạn nhân Cần cứu",
        victim_phone="0977112233",
        total_victims=3,
        description="Kẹt tầng trệt nước cao",
        latitude=10.745,
        longitude=106.655,
        address_text="Khu vực Bến Phú Định, Quận 8",
    )
    created = await service.dispatch_sos(db=None, req=req_data)

    # Tình nguyện viên 1 nhận yêu cầu với version=1
    accept_payload = AcceptSosRequest(
        version=1,
        volunteer_latitude=10.748,
        volunteer_longitude=106.658,
        team_name="Đội Xuồng cứu hộ Quận 8",
        vehicle_type="Xuồng máy composite 15HP",
    )
    tracking_res = await service.accept_sos(db=None, request_id=created.request_id, req=accept_payload)
    assert tracking_res.status == "ACCEPTED"
    assert tracking_res.version == 2
    assert tracking_res.status_step == 2

    # Tình nguyện viên 2 cố gắng nhận với version cũ (version=1) -> Phải ném HTTP 409 Conflict
    accept_payload_2 = AcceptSosRequest(
        version=1,
        volunteer_latitude=10.749,
        volunteer_longitude=106.659,
        team_name="Tình nguyện viên Tự do",
        vehicle_type="Thuyền phao",
    )
    with pytest.raises(HTTPException) as exc:
        await service.accept_sos(db=None, request_id=created.request_id, req=accept_payload_2)
    assert exc.value.status_code == 409
    assert "tiếp nhận" in exc.value.detail


@pytest.mark.asyncio
async def test_05_volunteer_skip_request(service):
    """Màn 3/5: Tình nguyện viên bấm Bỏ qua yêu cầu."""
    req_data = CreateFloodSosRequest(
        victim_name="Nạn nhân Bỏ qua",
        victim_phone="0911223344",
        total_victims=1,
        description="Cần cứu hộ",
        latitude=10.75,
        longitude=106.65,
        address_text="Quận 8",
    )
    created = await service.dispatch_sos(db=None, req=req_data)

    res = await service.skip_sos(db=None, request_id=created.request_id, req=SkipSosRequest(reason="Bận việc khác"))
    assert res["success"] is True
    assert "Đã bỏ qua yêu cầu" in res["message"]


@pytest.mark.asyncio
async def test_06_live_tracking_stepper_and_chat(service):
    """Màn 4/5: Theo dõi tiến độ Stepper, cập nhật vị trí live tracking và chat trao đổi."""
    req_data = CreateFloodSosRequest(
        victim_name="Bác Ba Cứu Hộ",
        victim_phone="0933445566",
        total_victims=2,
        description="Có 1 người già bị khớp, cần di chuyển",
        latitude=10.750,
        longitude=106.660,
        address_text="Phường 4, Quận 8",
    )
    created = await service.dispatch_sos(db=None, req=req_data)

    # 1. Tình nguyện viên nhận
    await service.accept_sos(
        db=None,
        request_id=created.request_id,
        req=AcceptSosRequest(
            version=1,
            volunteer_latitude=10.755,
            volunteer_longitude=106.665,
            team_name="Đội Xuồng cứu hộ Quận 8",
            vehicle_type="Xuồng cứu nạn",
        ),
    )

    # 2. Nạn nhân gửi tin nhắn nhận diện
    msg_victim = await service.send_chat_message(
        db=None,
        request_id=created.request_id,
        req=SendChatMessageRequest(
            sender_type="VICTIM",
            sender_name="Bác Ba Cứu Hộ",
            content="Tôi đang mặc áo mưa vàng trên mái nhà",
        ),
    )
    assert msg_victim.sender_type == "VICTIM"
    assert "áo mưa vàng" in msg_victim.content

    # 3. Đội cứu hộ cập nhật trạng thái EN_ROUTE và vị trí di chuyển
    tracking_en_route = await service.update_sos_progress(
        db=None,
        request_id=created.request_id,
        req=UpdateSosProgressRequest(
            status="EN_ROUTE",
            rescuer_latitude=10.752,
            rescuer_longitude=106.662,
            version=2,
        ),
    )
    assert tracking_en_route.status == "EN_ROUTE"
    assert tracking_en_route.status_step == 3

    # 4. Lấy lại tracking detail
    detail = await service.get_sos_tracking(db=None, request_id=created.request_id)
    assert len(detail.messages) >= 3
    assert detail.status_step == 3

    # 5. Hoàn tất cứu nạn & Đánh giá sao
    await service.update_sos_progress(
        db=None,
        request_id=created.request_id,
        req=UpdateSosProgressRequest(
            status="COMPLETED",
            rescuer_latitude=10.750,
            rescuer_longitude=106.660,
            version=3,
        ),
    )

    rating_res = await service.submit_rating(
        db=None,
        request_id=created.request_id,
        req=CompleteSosRatingRequest(
            rating=5,
            feedback_notes="Đội cứu hộ đến rất nhanh, thái độ nhiệt tình chuyên nghiệp!",
        ),
    )
    assert rating_res["success"] is True
    assert rating_res["rating"] == 5


@pytest.mark.asyncio
async def test_07_cancel_sos_safeguard_under_100m(service):
    """Màn 5/5: Huỷ yêu cầu SOS và kiểm tra bảo vệ cảnh báo khi người cứu hộ < 100m."""
    req_data = CreateFloodSosRequest(
        victim_name="Nạn nhân Gần",
        victim_phone="0911889901",
        total_victims=1,
        description="Cần cứu",
        latitude=10.750000,
        longitude=106.660000,
        address_text="Bình Hưng, Bình Chánh",
    )
    created = await service.dispatch_sos(db=None, req=req_data)

    # Rescuer nhận và vị trí cực gần (~15m)
    await service.accept_sos(
        db=None,
        request_id=created.request_id,
        req=AcceptSosRequest(
            version=1,
            volunteer_latitude=10.750100,  # ~11m
            volunteer_longitude=106.660100,
            team_name="Đội Cơ động 1",
            vehicle_type="Cano",
        ),
    )

    # Nạn nhân bấm huỷ nhưng CHƯA xác nhận cảnh báo gần (is_confirmed_near=False)
    near_warning_res = await service.cancel_sos(
        db=None,
        request_id=created.request_id,
        req=CancelSosRequest(version=2, cancel_reason="Nước đã rút", is_confirmed_near=False),
    )
    assert near_warning_res.requires_near_confirmation is True
    assert "rất gần" in near_warning_res.warning_message
    assert near_warning_res.success is False

    # Nạn nhân xác nhận lần 2 (is_confirmed_near=True)
    final_cancel_res = await service.cancel_sos(
        db=None,
        request_id=created.request_id,
        req=CancelSosRequest(version=2, cancel_reason="Nước đã rút", is_confirmed_near=True),
    )
    assert final_cancel_res.requires_near_confirmation is False
    assert final_cancel_res.success is True


def test_08_rest_api_http_endpoints():
    """Kiểm thử tích hợp qua REST API TestClient bằng Dependency Overrides."""
    mock_repository = MockFloodSosRepository()
    mock_service = FloodSosService(repository=mock_repository)

    # Ghi đè dependency cung cấp service
    app.dependency_overrides[get_flood_sos_service] = lambda: mock_service
    client = TestClient(app)

    try:
        # 1. Dispatch
        dispatch_res = client.post(
            "/api/v1/flood-sos/dispatch",
            json={
                "victim_name": "API Caller",
                "victim_phone": "0987654321",
                "total_victims": 2,
                "elderly_count": 0,
                "children_count": 1,
                "medical_urgent_count": 0,
                "description": "Gọi qua TestClient API",
                "latitude": 10.765,
                "longitude": 106.665,
                "address_text": "Quận 10",
            },
        )
        assert dispatch_res.status_code == 201
        data = dispatch_res.json()
        req_id = data["request_id"]
        assert data["sos_code"].startswith("SOS-")

        # 2. Nearby
        nearby_res = client.get(
            f"/api/v1/flood-sos/nearby?latitude=10.765&longitude=106.665&radius_km=3.0"
        )
        assert nearby_res.status_code == 200
        items = nearby_res.json()
        assert any(item["request_id"] == req_id for item in items)

        # 3. Chat
        chat_res = client.post(
            f"/api/v1/flood-sos/{req_id}/chat",
            json={
                "sender_type": "VICTIM",
                "sender_name": "API Caller",
                "content": "Tôi đang ở tầng 2",
            },
        )
        assert chat_res.status_code == 201
        assert chat_res.json()["content"] == "Tôi đang ở tầng 2"

        # 4. Tracking
        tracking_res = client.get(f"/api/v1/flood-sos/{req_id}/tracking")
        assert tracking_res.status_code == 200
        track_data = tracking_res.json()
        assert track_data["request_id"] == req_id
        assert len(track_data["messages"]) >= 2
    finally:
        app.dependency_overrides.clear()
