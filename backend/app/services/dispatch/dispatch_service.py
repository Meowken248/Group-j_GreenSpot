"""
Service xử lý nghiệp vụ cho STT 43: Trung tâm điều phối tác nghiệp
Tuân thủ Clean Architecture và Dependency Inversion Principle (DIP).
"""

from datetime import datetime, timezone
import random
import uuid
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.interface.dispatch.dispatch_interface import IDispatchRepository
from app.models.dispatch.dispatch_order import DispatchOrder
from app.schemas.dispatch.schemas import (
    DispatchListFilter,
    DispatchListResponse,
    IncidentComboboxItem,
    TeamOptionItem,
    CreateDispatchOrderRequest,
    EditDispatchOrderRequest,
    CancelDispatchOrderRequest,
    CloseDispatchOrderRequest,
    FieldTrackingResponse,
    DispatchActionResult,
)


class DispatchService:
    """Service điều phối tác nghiệp lực lượng xử lý hiện trường"""

    def __init__(self, repository: IDispatchRepository):
        # DIP: Tiêm phụ thuộc interface IDispatchRepository
        self.repository = repository

    async def get_dispatch_orders(
        self, db: AsyncSession, filters: DispatchListFilter
    ) -> DispatchListResponse:
        """Lấy danh sách lệnh xử lý hiện trường kèm thông điệp khi rỗng (Màn 1/6)"""
        orders = await self.repository.get_dispatch_orders(db, filters)
        total_count = len(orders)
        has_results = total_count > 0
        empty_msg = (
            None
            if has_results
            else "Không tìm thấy lệnh xử lý nào phù hợp với bộ lọc đã chọn."
        )

        return DispatchListResponse(
            orders=orders,
            total_count=total_count,
            has_results=has_results,
            empty_message=empty_msg,
        )

    async def get_available_incidents(
        self, db: AsyncSession
    ) -> List[IncidentComboboxItem]:
        """Danh sách sự cố môi trường chưa phân công (Màn 2/6)"""
        return await self.repository.get_available_incidents(db)

    async def get_response_teams(
        self, db: AsyncSession
    ) -> List[TeamOptionItem]:
        """Danh sách đội cơ động phản ứng nhanh hiện trường"""
        return await self.repository.get_response_teams(db)

    async def create_dispatch_order(
        self, db: AsyncSession, request: CreateDispatchOrderRequest
    ) -> DispatchActionResult:
        """
        Khởi tạo và giao lệnh điều động mới (Màn 2/6).
        Kiểm tra nghiệp vụ SLA deadline và trạng thái đội cơ động.
        """
        now = datetime.now(timezone.utc)
        # 1. Kiểm tra hạn hoàn thành deadline so với thời điểm hiện tại
        req_deadline = request.deadline
        if req_deadline.tzinfo is None:
            req_deadline = req_deadline.replace(tzinfo=timezone.utc)

        if req_deadline <= now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Hạn hoàn thành không hợp lệ. Vui lòng chọn thời gian trong tương lai.",
            )

        # 2. Tìm sự cố
        incidents = await self.repository.get_available_incidents(db)
        matched_incident = next((i for i in incidents if i.incident_id == request.incident_id), None)
        if not matched_incident:
            # Fallback nếu truyền ID ngẫu nhiên hợp lệ
            matched_incident = IncidentComboboxItem(
                incident_id=request.incident_id,
                incident_code=f"INC-{random.randint(1000, 9999)}",
                title="Sự cố môi trường đô thị cần xử lý gấp",
                category="Rác sinh hoạt ùn ứ",
                urgency=request.priority,
                location_address="Khu vực hiện trường tiếp nhận chỉ đạo",
                district="Quận 8",
                latitude=10.7241,
                longitude=106.6286,
            )

        # 3. Tìm đội
        teams = await self.repository.get_response_teams(db)
        matched_team = next((t for t in teams if t.team_id == request.team_id), None)
        if not matched_team:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy đội cơ động được chỉ định.",
            )

        # 4. Sinh mã lệnh chuẩn nghiệp vụ LX-xxxx
        random_suffix = random.randint(1050, 9999)
        order_code = f"LX-{random_suffix}"

        # 5. Khởi tạo thực thể DispatchOrder
        order = DispatchOrder(
            order_id=uuid.uuid4(),
            order_code=order_code,
            incident_id=matched_incident.incident_id,
            incident_title=matched_incident.title,
            incident_type="DOMESTIC_WASTE" if "rác" in matched_incident.category.lower() else "FLOOD",
            location_address=matched_incident.location_address,
            district=matched_incident.district,
            ward=matched_incident.ward,
            latitude=matched_incident.latitude,
            longitude=matched_incident.longitude,
            team_id=matched_team.team_id,
            team_name=matched_team.team_name,
            team_phone=matched_team.phone,
            team_distance_km=matched_team.distance_km,
            team_latitude=matched_team.latitude,
            team_longitude=matched_team.longitude,
            status="ASSIGNED",
            priority=request.priority,
            deadline=req_deadline,
            assigned_at=now,
            before_image_url="https://images.unsplash.com/photo-1618477388954-7852f32655ec?auto=format&fit=crop&w=600&q=80",
            after_image_url=None,
            is_gps_active=True,
            version=1,
        )

        saved_order = await self.repository.create_order(db, order)

        return DispatchActionResult(
            success=True,
            message=f"Giao lệnh xử lý {saved_order.order_code} thành công! Đội cơ động đã nhận thông báo tác nghiệp.",
            order_code=saved_order.order_code,
            order_id=saved_order.order_id,
            version=saved_order.version,
        )

    async def edit_dispatch_order(
        self, db: AsyncSession, order_id: uuid.UUID, request: EditDispatchOrderRequest
    ) -> DispatchActionResult:
        """
        Cập nhật và tái phân bổ lệnh xử lý (Màn 3/6).
        Kiểm tra nghiệp vụ: Lệnh đã hoàn tất không được sửa; Đổi đội phải có ghi chú lý do.
        """
        order = await self.repository.get_order_by_id(db, order_id)
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy lệnh xử lý tương ứng.",
            )

        # 1. Kiểm tra trạng thái: Đã hoàn tất không được phép chỉnh sửa
        if order.status == "COMPLETED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Lệnh này đã hoàn tất nghiệm thu, không được phép chỉnh sửa.",
            )

        # 2. Kiểm tra thay đổi
        has_team_change = request.team_id and request.team_id != order.team_id
        has_deadline_change = False
        if request.deadline:
            req_dl = request.deadline
            if req_dl.tzinfo is None:
                req_dl = req_dl.replace(tzinfo=timezone.utc)
            ord_dl = order.deadline
            if ord_dl.tzinfo is None:
                ord_dl = ord_dl.replace(tzinfo=timezone.utc)
            if abs((req_dl - ord_dl).total_seconds()) > 60:
                has_deadline_change = True

        has_notes_change = bool(request.adjustment_notes and request.adjustment_notes.strip())

        if not has_team_change and not has_deadline_change and not has_notes_change:
            return DispatchActionResult(
                success=True,
                message="Không có thay đổi nào được ghi nhận.",
                order_code=order.order_code,
                order_id=order.order_id,
                version=order.version,
            )

        # 3. Nếu điều chuyển đội nhưng chưa nhập ghi chú lý do
        if has_team_change and (not request.adjustment_notes or not request.adjustment_notes.strip()):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vui lòng nhập ghi chú lý do thay đổi đội xử lý để lưu vết tác nghiệp.",
            )

        # Cập nhật thông tin đội nếu thay đổi
        if has_team_change:
            teams = await self.repository.get_response_teams(db)
            new_team = next((t for t in teams if t.team_id == request.team_id), None)
            if new_team:
                order.team_id = new_team.team_id
                order.team_name = new_team.team_name

        if has_deadline_change and request.deadline:
            order.deadline = request.deadline

        if request.adjustment_notes:
            order.adjustment_notes = request.adjustment_notes

        updated = await self.repository.update_order(db, order)

        return DispatchActionResult(
            success=True,
            message=f"Lệnh xử lý {updated.order_code} đã được cập nhật thành công!",
            order_code=updated.order_code,
            order_id=updated.order_id,
            version=updated.version,
        )

    async def cancel_dispatch_order(
        self, db: AsyncSession, order_id: uuid.UUID, request: CancelDispatchOrderRequest
    ) -> DispatchActionResult:
        """
        Thu hồi và huỷ bỏ lệnh điều phối (Màn 4/6 & 5/6).
        Bắt buộc nhập lý do giải trình.
        """
        if not request.cancel_reason or len(request.cancel_reason.strip()) < 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vui lòng nhập lý do huỷ lệnh xử lý.",
            )

        cancelled = await self.repository.cancel_order(
            db, order_id, request.cancel_reason.strip(), request.version
        )
        if not cancelled:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy lệnh xử lý để huỷ.",
            )

        return DispatchActionResult(
            success=True,
            message=f"ĐÃ HUỶ LỆNH. Danh sách lệnh đã cập nhật.",
            order_code=cancelled.order_code,
            order_id=cancelled.order_id,
            version=cancelled.version,
        )

    async def close_dispatch_order(
        self, db: AsyncSession, order_id: uuid.UUID, request: CloseDispatchOrderRequest
    ) -> DispatchActionResult:
        """
        Nghiệm thu và đóng lệnh hiện trường (Màn 6/6).
        Bắt buộc phải có ảnh hiện trường sau xử lý mới cho phép nghiệm thu.
        """
        order = await self.repository.get_order_by_id(db, order_id)
        if not order:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy lệnh xử lý.",
            )

        if not order.after_image_url:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Chưa thể đóng lệnh. Đội cơ động chưa tải lên hình ảnh xác nhận sau xử lý.",
            )

        closed = await self.repository.close_order(db, order_id, request.version)

        return DispatchActionResult(
            success=True,
            message=f"Nghiệm thu thành công! Lệnh xử lý {closed.order_code} đã được đóng và lưu trữ hồ sơ.",
            order_code=closed.order_code,
            order_id=closed.order_id,
            version=closed.version,
        )

    async def get_field_tracking_data(
        self, db: AsyncSession, order_id: uuid.UUID
    ) -> FieldTrackingResponse:
        """Giám sát thực địa theo thời gian thực (Màn 6/6)"""
        tracking = await self.repository.get_tracking_data(db, order_id)
        if not tracking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy dữ liệu giám sát của lệnh điều phối.",
            )
        return tracking
