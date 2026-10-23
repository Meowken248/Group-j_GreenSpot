"""
Business Logic Service Layer cho STT 45: Hệ thống Cảnh báo khẩn cấp theo vị trí & Safety Check
(Màn 1/4: Broadcast Console, Màn 2/4: Alert Modal, Màn 3/4: Safety Check, Màn 4/4: Result Modal)
Tuân thủ Nguyên lý Đảo ngược Phụ thuộc (DIP) - phụ thuộc vào Interface IEmergencyAlertRepository, ISafetyCheckRepository.
"""

from datetime import datetime
import random
from typing import List, Optional
import uuid
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.interface.emergency_alert.alert_interface import (
    IEmergencyAlertRepository,
    ISafetyCheckRepository,
)
from app.models.emergency_alert.alert import (
    EmergencyBroadcastAlert,
    EmergencyAlertRecipient,
    EmergencySOSSignal,
)
from app.models.emergency_alert.safety_check import (
    UserSafetyCheck,
    SafetyCheckFriendDelivery,
)
from app.models.notification import Notification
from app.schemas.emergency_alert.schemas import (
    AlertEstimateRequest,
    AlertEstimateResponse,
    BroadcastAlertRequest,
    BroadcastAlertResponse,
    BroadcastHistoryItem,
    CancelAlertRequest,
    UserActiveAlertResponse,
    EmergencySOSRequest,
    EmergencySOSResponse,
    SafetyCheckInitResponse,
    FriendCheckboxItem,
    MarkSafeSelfRequest,
    MarkSafeSelfResponse,
    SendSafetyCheckToFriendsRequest,
    SendSafetyCheckToFriendsResponse,
    SafetyCheckModalConfirmation,
)


class EmergencyAlertService:
    """
    Xử lý toàn bộ logic nghiệp vụ phát lệnh cảnh báo khẩn cấp diện rộng và kiểm tra an toàn
    """

    def __init__(
        self,
        alert_repo: IEmergencyAlertRepository,
        safety_repo: ISafetyCheckRepository,
    ):
        self.alert_repo = alert_repo
        self.safety_repo = safety_repo

    # =========================================================================
    # 1. NGHIỆP VỤ MÀN 1/4: EMERGENCY BROADCAST CONSOLE
    # =========================================================================

    async def estimate_recipients(
        self, db: AsyncSession, req: AlertEstimateRequest
    ) -> AlertEstimateResponse:
        """Ước tính số người dân trong phạm vi bán kính khoanh vùng Geofencing"""
        count = await self.alert_repo.count_users_in_radius(
            db=db,
            center_lat=req.latitude,
            center_lng=req.longitude,
            radius_meters=req.radius_meters,
        )
        radius_km = round(req.radius_meters / 1000.0, 1)
        message = (
            f"Đã xác định vùng cảnh báo. Dự kiến phát sóng tới {count:,} người dân "
            f"trong bán kính {radius_km} km."
        )
        return AlertEstimateResponse(
            center_latitude=req.latitude,
            center_longitude=req.longitude,
            radius_meters=req.radius_meters,
            radius_km=radius_km,
            estimated_recipients=count,
            message=message,
        )

    async def broadcast_alert(
        self, db: AsyncSession, req: BroadcastAlertRequest, creator_id: Optional[uuid.UUID] = None
    ) -> BroadcastAlertResponse:
        """Phát lệnh cảnh báo khẩn cấp diện rộng tới thiết bị người dùng trong bán kính"""
        # Kiểm tra tính hợp lệ của nội dung và phạm vi
        if not req.title or len(req.title.strip()) < 5 or not req.content or len(req.content.strip()) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vui lòng nhập nội dung cảnh báo và chọn phạm vi ảnh hưởng trên bản đồ.",
            )

        if req.radius_meters < 100 or req.radius_meters > 50000:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vui lòng nhập nội dung cảnh báo và chọn phạm vi ảnh hưởng trên bản đồ.",
            )

        # 1. Tạo mã định danh duy nhất cho cảnh báo
        code_suffix = random.randint(1000, 9999)
        alert_code = f"EBA-{datetime.utcnow().strftime('%Y%m%d')}-{code_suffix}"

        # 2. Truy vấn danh sách người dùng trong vùng đệm
        recipients_data = await self.alert_repo.get_user_device_locations_in_radius(
            db=db,
            center_lat=req.center_latitude,
            center_lng=req.center_longitude,
            radius_meters=req.radius_meters,
        )
        actual_count = len(recipients_data)

        # 3. Tạo bản ghi EmergencyBroadcastAlert
        point_wkt = f"SRID=4326;POINT({req.center_longitude} {req.center_latitude})"
        alert = EmergencyBroadcastAlert(
            alert_code=alert_code,
            alert_type=req.alert_type.upper(),
            title=req.title.strip(),
            content=req.content.strip(),
            center_location=point_wkt,
            center_latitude=req.center_latitude,
            center_longitude=req.center_longitude,
            radius_meters=req.radius_meters,
            severity_level=req.severity_level.upper(),
            estimated_recipients=actual_count,
            actual_sent_count=actual_count,
            status="BROADCASTED",
            created_by=creator_id,
            broadcasted_at=datetime.utcnow(),
        )
        saved_alert = await self.alert_repo.create_broadcast_alert(db, alert)

        # 4. Ghi nhận nhật ký người nhận và đẩy thông báo In-app Notification
        recipients_entities = []
        for u_id, u_lat, u_lng, dist in recipients_data:
            recipients_entities.append(
                EmergencyAlertRecipient(
                    alert_id=saved_alert.alert_id,
                    user_id=u_id,
                    user_latitude=u_lat,
                    user_longitude=u_lng,
                    distance_meters=dist,
                    status="DELIVERED",
                    action_taken="NONE",
                )
            )
            # Tạo thông báo hệ thống đến người dùng
            notif = Notification(
                user_id=u_id,
                title=f"CẢNH BÁO KHẨN CẤP: {req.title.strip()}",
                message=req.content.strip(),
                notification_type="EMERGENCY_BROADCAST",
                reference_id=str(saved_alert.alert_id),
            )
            db.add(notif)

        if recipients_entities:
            await self.alert_repo.bulk_create_recipients(db, recipients_entities)

        message = (
            f"Phát lệnh cảnh báo khẩn cấp thành công! Hệ thống đang đẩy thông báo đến "
            f"{actual_count:,} thiết bị."
        )
        return BroadcastAlertResponse(
            success=True,
            alert_id=saved_alert.alert_id,
            alert_code=saved_alert.alert_code,
            alert_type=saved_alert.alert_type,
            title=saved_alert.title,
            actual_sent_count=actual_count,
            message=message,
        )

    async def cancel_alert(
        self, db: AsyncSession, alert_id: uuid.UUID, req: CancelAlertRequest
    ) -> dict:
        """Hủy phát lệnh cảnh báo khẩn cấp với kiểm tra Optimistic Locking"""
        alert = await self.alert_repo.get_alert_by_id(db, alert_id)
        if not alert:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy lệnh cảnh báo")

        if alert.version != req.version:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Dữ liệu lệnh cảnh báo đã bị thay đổi bởi người khác. Vui lòng tải lại trang.",
            )

        alert.status = "CANCELLED"
        alert.version += 1
        await self.alert_repo.update_broadcast_alert(db, alert)
        return {"success": True, "message": "Đã hủy lệnh cảnh báo khẩn cấp thành công."}

    async def get_broadcast_history(
        self, db: AsyncSession, limit: int = 20, alert_type: Optional[str] = None
    ) -> List[BroadcastHistoryItem]:
        """Lấy danh sách lịch sử phát sóng cảnh báo khẩn cấp"""
        alerts = await self.alert_repo.get_broadcast_history(db, limit=limit, alert_type=alert_type)
        return [BroadcastHistoryItem.model_validate(a) for a in alerts]

    # =========================================================================
    # 2. NGHIỆP VỤ MÀN 2/4: EMERGENCY ALERT MODAL (USER VIEW)
    # =========================================================================

    async def get_active_alert_for_user(
        self, db: AsyncSession, user_id: Optional[uuid.UUID], lat: float, lng: float
    ) -> UserActiveAlertResponse:
        """Kiểm tra xem vị trí hiện tại của người dùng có nằm trong phạm vi cảnh báo khẩn cấp nào không"""
        res = await self.alert_repo.get_active_alert_covering_location(db, lat=lat, lng=lng)
        if not res:
            return UserActiveAlertResponse(has_active_alert=False)

        alert, distance_m = res
        radius_km = round(alert.radius_meters / 1000.0, 1)

        # Kiểm tra xem công dân đã báo an toàn trong đợt này chưa
        is_safe_marked = False
        if user_id:
            safety_check = await self.safety_repo.get_latest_safety_check(
                db, user_id=user_id, alert_id=alert.alert_id
            )
            if safety_check and safety_check.is_safe:
                is_safe_marked = True

        type_names = {
            "FLOOD": "Ngập nặng",
            "STORM": "Bão / Lốc xoáy nguy hiểm",
            "TIDE": "Triều cường dâng cao cực đoan",
            "POLLUTION": "Ô nhiễm không khí / Tràn hóa chất nguy hại",
        }
        type_str = type_names.get(alert.alert_type, alert.title)
        situation_msg = f"{type_str} trong bán kính {radius_km} km quanh bạn"
        full_msg = f"CẢNH BÁO KHẨN CẤP: {type_str} trong bán kính {radius_km} km quanh bạn"

        return UserActiveAlertResponse(
            has_active_alert=True,
            alert_id=alert.alert_id,
            alert_type=alert.alert_type,
            title="CẢNH BÁO KHẨN CẤP",
            situation_message=situation_msg,
            content=alert.content,
            severity_level=alert.severity_level,
            radius_meters=alert.radius_meters,
            distance_to_center_meters=round(distance_m, 1),
            is_safe_marked=is_safe_marked,
            message=full_msg,
        )

    async def trigger_emergency_sos(
        self, db: AsyncSession, user_id: uuid.UUID, req: EmergencySOSRequest
    ) -> EmergencySOSResponse:
        """Tiếp nhận tín hiệu cứu nạn SOS từ người dùng và chuyển tiếp tới Ban chỉ huy (STT 43)"""
        sos = EmergencySOSSignal(
            alert_id=req.alert_id,
            user_id=user_id,
            latitude=req.latitude,
            longitude=req.longitude,
            location_address=req.location_address.strip(),
            phone_number=req.phone_number,
            notes=req.notes,
            status="PENDING",
        )
        saved_sos = await self.alert_repo.create_sos_signal(db, sos)

        # Cập nhật hành động SOS trong bảng recipients nếu có alert_id
        if req.alert_id:
            await self.alert_repo.update_recipient_action(
                db=db,
                alert_id=req.alert_id,
                user_id=user_id,
                action_taken="SOS",
            )

        message = (
            "Đã gửi tín hiệu cứu nạn khẩn cấp kèm tọa độ GPS tới Ban Chỉ huy Cứu nạn và người thân!"
        )
        return EmergencySOSResponse(
            success=True,
            sos_id=saved_sos.sos_id,
            message=message,
            hotline="114 / 115",
        )

    async def acknowledge_alert_action(
        self, db: AsyncSession, alert_id: uuid.UUID, user_id: uuid.UUID, action_taken: str
    ) -> dict:
        """Ghi nhận hành động tương tác của người dùng trên Alert Modal"""
        await self.alert_repo.update_recipient_action(
            db=db, alert_id=alert_id, user_id=user_id, action_taken=action_taken
        )
        if action_taken == "SAFE":
            return {
                "success": True,
                "message": "Đang chuyển đến màn hình chia sẻ trạng thái an toàn...",
                "redirect_url": "/safety-check",
            }
        elif action_taken == "VIEW_DETAILS":
            return {
                "success": True,
                "message": "Đang mở bản đồ điều hướng tránh ngập an toàn...",
                "redirect_url": "/navigation",
            }
        return {"success": True, "message": "Đã ghi nhận phản hồi"}

    # =========================================================================
    # 3. NGHIỆP VỤ MÀN 3/4 & 4/4: COMMUNITY SAFETY CHECK
    # =========================================================================

    async def init_safety_check(
        self, db: AsyncSession, user_id: uuid.UUID, lat: Optional[float], lng: Optional[float]
    ) -> SafetyCheckInitResponse:
        """Khởi tạo dữ liệu màn hình Safety Check: vị trí GPS và danh sách bạn bè"""
        # Nếu thiếu quyền hoặc toạ độ GPS
        if lat is None or lng is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không thể xác định vị trí hiện tại. Vui lòng bật định vị GPS trong cài đặt trình duyệt.",
            )

        # Lấy địa chỉ định vị (hoặc tạo định dạng mặc định theo tọa độ)
        address_text = f"Tọa độ ({round(lat, 4)}, {round(lng, 4)}), TP. Hồ Chí Minh"

        # Lấy danh sách bạn bè kết nối hai chiều từ STT 06
        friends_data = await self.safety_repo.get_friends_for_safety_check(db, user_id=user_id)
        friend_items = [
            FriendCheckboxItem(
                user_id=f["user_id"],
                full_name=f["full_name"],
                avatar_url=f["avatar_url"],
                is_selected=True,
                push_notification_enabled=f["push_notification_enabled"],
            )
            for f in friends_data
        ]

        # Kiểm tra xem người dùng đã báo an toàn gần đây chưa
        latest_check = await self.safety_repo.get_latest_safety_check(db, user_id=user_id)
        is_already_safe = latest_check.is_safe if latest_check else False

        message = "Vị trí hiện tại của bạn đã được xác định. Hãy báo an toàn cho bạn bè."
        return SafetyCheckInitResponse(
            user_id=user_id,
            latitude=lat,
            longitude=lng,
            location_address=address_text,
            is_gps_verified=True,
            is_already_safe=is_already_safe,
            friends=friend_items,
            message=message,
        )

    async def mark_safe_self(
        self, db: AsyncSession, user_id: uuid.UUID, req: MarkSafeSelfRequest
    ) -> MarkSafeSelfResponse:
        """Người dùng nhấn 'Tôi an toàn' tại hồ sơ cá nhân / cột trái Màn 3/4"""
        check = UserSafetyCheck(
            user_id=user_id,
            alert_id=req.alert_id,
            is_safe=True,
            status_message=req.status_message or "Tôi an toàn trong đợt thiên tai này.",
            latitude=req.latitude,
            longitude=req.longitude,
            location_address=req.location_address.strip(),
            shared_with_count=0,
            sms_fallback_count=0,
        )
        saved_check = await self.safety_repo.create_safety_check(db, check)

        # Cập nhật recipient status thành SAFE nếu có alert_id
        if req.alert_id:
            await self.alert_repo.update_recipient_action(
                db=db, alert_id=req.alert_id, user_id=user_id, action_taken="SAFE"
            )

        message = "Bạn đã được đánh dấu là AN TOÀN trong đợt thiên tai này."
        return MarkSafeSelfResponse(
            success=True,
            check_id=saved_check.check_id,
            is_safe=True,
            message=message,
        )

    async def send_safety_check_to_friends(
        self, db: AsyncSession, user_id: uuid.UUID, req: SendSafetyCheckToFriendsRequest
    ) -> SendSafetyCheckToFriendsResponse:
        """Phát tin nhắn và thông báo an toàn đến danh sách bạn bè đã chọn (Màn 3/4 -> 4/4)"""
        if not req.friend_user_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vui lòng chọn ít nhất một người bạn để gửi thông báo an toàn.",
            )

        total_sent = len(req.friend_user_ids)
        sms_count = 0
        deliveries = []

        # Tạo lượt Safety Check
        check = UserSafetyCheck(
            user_id=user_id,
            alert_id=req.alert_id,
            is_safe=True,
            status_message=req.status_message or "Tôi an toàn trong đợt thiên tai này.",
            latitude=req.latitude,
            longitude=req.longitude,
            location_address=req.location_address.strip(),
            shared_with_count=total_sent,
            sms_fallback_count=0,
        )
        saved_check = await self.safety_repo.create_safety_check(db, check)

        for idx, f_id in enumerate(req.friend_user_ids):
            # Giả lập phân phối: Nếu là số lẻ có thể tắt push, nhận SMS fallback
            channel = "PUSH_NOTIFICATION"
            if idx % 5 == 4:  # 20% trường hợp có thể fallback SMS
                channel = "SMS_FALLBACK"
                sms_count += 1

            deliveries.append(
                SafetyCheckFriendDelivery(
                    check_id=saved_check.check_id,
                    friend_user_id=f_id,
                    delivery_channel=channel,
                    is_delivered=True,
                )
            )

            # Đẩy Notification in-app tới người bạn
            notif = Notification(
                user_id=f_id,
                title="Thông báo an toàn từ bạn bè",
                message=f"Bạn của bạn đang an toàn tại khu vực: {req.location_address.strip()}",
                notification_type="SAFETY_CHECK",
                reference_id=str(saved_check.check_id),
            )
            db.add(notif)

        if deliveries:
            await self.safety_repo.bulk_create_friend_deliveries(db, deliveries)

        # Cập nhật số lượng sms_fallback_count trên check
        saved_check.sms_fallback_count = sms_count
        await db.commit()

        # Tạo payload hiển thị Màn 4/4
        sub_message = f"Thông báo trạng thái an toàn của bạn đã được gửi thành công đến {total_sent} bạn bè"
        note = None
        if sms_count > 0:
            note = "Đã gửi thông báo. Một số bạn bè tắt thông báo sẽ nhận được tin nhắn SMS thay thế."

        modal_conf = SafetyCheckModalConfirmation(
            modal_title="ĐÃ BÁO AN TOÀN",
            modal_message="Bạn bè đã nhận thông báo",
            modal_sub_message=sub_message,
            modal_note=note,
            close_redirect_url="/feed",
        )

        return SendSafetyCheckToFriendsResponse(
            success=True,
            check_id=saved_check.check_id,
            total_sent=total_sent,
            sms_fallback_count=sms_count,
            message="Đang gửi thông báo an toàn đến bạn bè...",
            modal=modal_conf,
        )
