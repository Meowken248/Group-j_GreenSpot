"""
Bộ kiểm thử tự động toàn diện cho STT 43: Trung tâm điều phối tác nghiệp
(Operations Dispatch Center)
Bao phủ 7 kịch bản nghiệp vụ:
1. Lấy danh sách lệnh và bộ lọc (Màn 1/6).
2. Khởi tạo và giao lệnh mới, kiểm tra SLA deadline (Màn 2/6).
3. Sửa lệnh, đổi đội cơ động bắt buộc có ghi chú, chặn sửa lệnh đã hoàn tất (Màn 3/6).
4. Huỷ lệnh bắt buộc lý do giải trình (Màn 4/6 & 5/6).
5. Nghiệm thu đóng lệnh bắt buộc có ảnh sau xử lý (Màn 6/6).
6. Truy vấn dữ liệu giám sát hiện trường GPS & Stepper (Màn 6/6).
7. Tích hợp HTTP REST API và kiểm tra phân quyền RBAC.
"""

from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock
import uuid
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import app
from app.crud.dispatch.dispatch_repository import DispatchRepository, INITIAL_DISPATCH_ORDERS
from app.models.dispatch.dispatch_order import DispatchOrder
from app.schemas.dispatch.schemas import (
    DispatchListFilter,
    CreateDispatchOrderRequest,
    EditDispatchOrderRequest,
    CancelDispatchOrderRequest,
    CloseDispatchOrderRequest,
)
from app.services.dispatch.dispatch_service import DispatchService
from app.utils.security import create_access_token


@pytest.fixture
def mock_repo():
    return DispatchRepository()


@pytest.fixture
def service(mock_repo):
    return DispatchService(mock_repo)


@pytest.mark.asyncio
async def test_01_get_dispatch_orders_and_filters(service):
    """Kiểm thử Màn 1/6: Danh sách lệnh và bộ lọc trạng thái, đội cơ động"""
    mock_db = AsyncMock()

    # 1. Lọc tất cả
    res_all = await service.get_dispatch_orders(mock_db, DispatchListFilter(status="ALL", team_id="ALL"))
    assert res_all.has_results is True
    assert res_all.total_count >= 4
    assert res_all.empty_message is None

    # Kiểm tra có các mã lệnh chuẩn theo đặc tả
    codes = [o.order_code for o in res_all.orders]
    assert "LX-1042" in codes
    assert "LX-1043" in codes

    # 2. Lọc theo trạng thái IN_PROGRESS
    res_in_prog = await service.get_dispatch_orders(mock_db, DispatchListFilter(status="IN_PROGRESS"))
    for o in res_in_prog.orders:
        assert o.status == "IN_PROGRESS"
        assert o.status_label == "Đang xử lý"

    # 3. Lọc không có kết quả
    res_empty = await service.get_dispatch_orders(mock_db, DispatchListFilter(status="NON_EXISTING"))
    assert res_empty.has_results is False
    assert res_empty.total_count == 0
    assert "Không tìm thấy lệnh xử lý nào" in res_empty.empty_message


@pytest.mark.asyncio
async def test_02_create_dispatch_order_validation(service):
    """Kiểm thử Màn 2/6: Tạo lệnh mới, kiểm tra hạn SLA deadline"""
    mock_db = AsyncMock()
    inc_id = uuid.UUID("33333333-3333-3333-3333-333333333301")

    # 1. Hạn deadline trong quá khứ -> Lỗi 400
    past_req = CreateDispatchOrderRequest(
        incident_id=inc_id,
        team_id="TEAM_CO_DONG_04",
        priority="HIGH",
        deadline=datetime.now(timezone.utc) - timedelta(hours=1),
    )
    with pytest.raises(HTTPException) as exc_past:
        await service.create_dispatch_order(mock_db, past_req)
    assert exc_past.value.status_code == 400
    assert "Hạn hoàn thành không hợp lệ" in exc_past.value.detail

    # 2. Đội không tồn tại -> Lỗi 404
    bad_team_req = CreateDispatchOrderRequest(
        incident_id=inc_id,
        team_id="TEAM_NON_EXISTENT",
        priority="HIGH",
        deadline=datetime.now(timezone.utc) + timedelta(hours=2),
    )
    with pytest.raises(HTTPException) as exc_team:
        await service.create_dispatch_order(mock_db, bad_team_req)
    assert exc_team.value.status_code == 404

    # 3. Giao lệnh thành công
    valid_req = CreateDispatchOrderRequest(
        incident_id=inc_id,
        team_id="TEAM_CO_DONG_04",
        priority="HIGH",
        deadline=datetime.now(timezone.utc) + timedelta(hours=3),
    )
    result = await service.create_dispatch_order(mock_db, valid_req)
    assert result.success is True
    assert "Giao lệnh xử lý" in result.message
    assert "thành công! Đội cơ động đã nhận thông báo tác nghiệp." in result.message
    assert result.order_code.startswith("LX-")


@pytest.mark.asyncio
async def test_03_edit_dispatch_order(service):
    """Kiểm thử Màn 3/6: Sửa lệnh, đổi đội cơ động và ghi chú lý do"""
    mock_db = AsyncMock()

    # 1. Lệnh đã hoàn tất (LX-1041) không được sửa
    completed_order_id = uuid.UUID("44444444-4444-4444-4444-444444444444")
    edit_completed_req = EditDispatchOrderRequest(
        team_id="TEAM_CO_DONG_03",
        version=1,
    )
    with pytest.raises(HTTPException) as exc_comp:
        await service.edit_dispatch_order(mock_db, completed_order_id, edit_completed_req)
    assert exc_comp.value.status_code == 400
    assert "Lệnh này đã hoàn tất nghiệm thu, không được phép chỉnh sửa." in exc_comp.value.detail

    # 2. Đổi đội nhưng chưa nhập ghi chú lý do -> Lỗi 400
    active_order_id = uuid.UUID("44444444-4444-4444-4444-444444444441")
    reassign_no_notes = EditDispatchOrderRequest(
        team_id="TEAM_CO_DONG_03",
        adjustment_notes="",
        version=1,
    )
    with pytest.raises(HTTPException) as exc_notes:
        await service.edit_dispatch_order(mock_db, active_order_id, reassign_no_notes)
    assert exc_notes.value.status_code == 400
    assert "Vui lòng nhập ghi chú lý do thay đổi đội xử lý" in exc_notes.value.detail

    # 3. Không có thay đổi nào
    no_change_req = EditDispatchOrderRequest(
        version=1,
    )
    res_no_change = await service.edit_dispatch_order(mock_db, active_order_id, no_change_req)
    assert res_no_change.message == "Không có thay đổi nào được ghi nhận."

    # 4. Cập nhật hợp lệ kèm ghi chú
    valid_edit = EditDispatchOrderRequest(
        team_id="TEAM_CO_DONG_03",
        adjustment_notes="Xe chuyên dụng của Đội Q8 bị sự cố động cơ, chuyển giao Đội 03 hỗ trợ khẩn cấp.",
        deadline=datetime.now(timezone.utc) + timedelta(hours=5),
        version=1,
    )
    res_valid = await service.edit_dispatch_order(mock_db, active_order_id, valid_edit)
    assert res_valid.success is True
    assert "đã được cập nhật thành công!" in res_valid.message


@pytest.mark.asyncio
async def test_04_cancel_dispatch_order(service):
    """Kiểm thử Màn 4/6 & 5/6: Huỷ lệnh bắt buộc lý do giải trình"""
    mock_db = AsyncMock()
    order_id = uuid.UUID("44444444-4444-4444-4444-444444444442")

    # 1. Lý do rỗng -> Lỗi validation hoặc 400
    with pytest.raises((HTTPException, Exception)) as exc_reason:
        empty_reason = CancelDispatchOrderRequest(cancel_reason="", version=1)
        await service.cancel_dispatch_order(mock_db, order_id, empty_reason)

    # 2. Huỷ hợp lệ
    valid_cancel = CancelDispatchOrderRequest(
        cancel_reason="Người dân tại chỗ đã tự nạo vét và thông cống thoát nước.",
        version=1,
    )
    res = await service.cancel_dispatch_order(mock_db, order_id, valid_cancel)
    assert res.success is True
    assert "ĐÃ HUỶ LỆNH. Danh sách lệnh đã cập nhật." in res.message


@pytest.mark.asyncio
async def test_05_close_dispatch_order(service):
    """Kiểm thử Màn 6/6: Nghiệm thu đóng lệnh bắt buộc có ảnh minh chứng sau xử lý"""
    mock_db = AsyncMock()

    # 1. Chưa có ảnh sau xử lý (LX-1042) -> Lỗi 400
    order_id_no_after = uuid.UUID("44444444-4444-4444-4444-444444444441")
    req = CloseDispatchOrderRequest(version=1)
    with pytest.raises(HTTPException) as exc_img:
        await service.close_dispatch_order(mock_db, order_id_no_after, req)
    assert exc_img.value.status_code == 400
    assert "Chưa thể đóng lệnh. Đội cơ động chưa tải lên hình ảnh xác nhận sau xử lý." in exc_img.value.detail

    # 2. Có ảnh sau xử lý -> Đóng lệnh thành công
    for item in INITIAL_DISPATCH_ORDERS:
        if item["order_id"] == order_id_no_after:
            item["after_image_url"] = "https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600"
            break

    res_close = await service.close_dispatch_order(mock_db, order_id_no_after, req)
    assert res_close.success is True
    assert "Nghiệm thu thành công!" in res_close.message
    assert "đã được đóng và lưu trữ hồ sơ." in res_close.message


@pytest.mark.asyncio
async def test_06_field_tracking_data(service):
    """Kiểm thử Màn 6/6: Dữ liệu giám sát GPS thời gian thực và Stepper 4 bước"""
    mock_db = AsyncMock()
    order_id = uuid.UUID("44444444-4444-4444-4444-444444444443")

    tracking = await service.get_field_tracking_data(mock_db, order_id)
    assert tracking.order_code == "LX-1044"
    assert tracking.status == "ASSIGNED"
    assert tracking.team_name == "Đội Cơ động số 3"
    assert tracking.team_phone == "0903.778.899"
    assert tracking.incident_lat == 10.8521
    assert tracking.incident_lng == 106.6214

    # Kiểm tra Stepper 4 bước: ASSIGNED, EN_ROUTE, IN_PROGRESS, COMPLETED
    step_keys = [s.key for s in tracking.stepper]
    assert step_keys == ["ASSIGNED", "EN_ROUTE", "IN_PROGRESS", "COMPLETED"]
    assert tracking.stepper[0].is_current is True
    assert tracking.stepper[0].label == "Đã giao"


def test_07_http_endpoints_and_rbac_guard():
    """Kiểm thử tích hợp REST API và bảo vệ phân quyền RBAC"""
    client = TestClient(app)

    # 1. Truy cập danh sách lệnh (không token hoặc role công dân CITIZEN -> bị từ chối 403)
    citizen_token = create_access_token(
        user_id="11111111-1111-1111-1111-111111111111",
        email="citizen@test.com",
        role="CITIZEN",
        session_id="session-cit-123",
    )
    headers_citizen = {"Authorization": f"Bearer {citizen_token}"}
    resp_cit = client.get("/api/v1/dispatch/orders", headers=headers_citizen)
    assert resp_cit.status_code == 403
    assert "Chỉ Quản trị viên và Cán bộ điều phối" in resp_cit.json().get("detail", "")

    # 2. Truy cập với quyền ADMIN
    admin_token = create_access_token(
        user_id="22222222-2222-2222-2222-222222222222",
        email="admin@test.com",
        role="ADMIN",
        session_id="session-adm-123",
    )
    headers_admin = {"Authorization": f"Bearer {admin_token}"}

    # GET /orders
    resp_orders = client.get("/api/v1/dispatch/orders", headers=headers_admin)
    assert resp_orders.status_code == 200
    data_orders = resp_orders.json()
    assert "orders" in data_orders
    assert data_orders["total_count"] >= 3

    # GET /incidents
    resp_inc = client.get("/api/v1/dispatch/incidents", headers=headers_admin)
    assert resp_inc.status_code == 200
    assert len(resp_inc.json()) >= 3

    # GET /teams
    resp_teams = client.get("/api/v1/dispatch/teams", headers=headers_admin)
    assert resp_teams.status_code == 200
    assert len(resp_teams.json()) >= 4

    # GET /orders/{order_id}/tracking
    tracking_id = "44444444-4444-4444-4444-444444444441"
    resp_track = client.get(f"/api/v1/dispatch/orders/{tracking_id}/tracking", headers=headers_admin)
    assert resp_track.status_code == 200
    assert resp_track.json()["order_code"] == "LX-1042"

    # POST /orders/{order_id}/accept
    resp_acc = client.post(f"/api/v1/dispatch/orders/{tracking_id}/accept", headers=headers_admin)
    assert resp_acc.status_code == 200
    assert resp_acc.json()["success"] is True
    assert "tiếp nhận" in resp_acc.json()["message"]

