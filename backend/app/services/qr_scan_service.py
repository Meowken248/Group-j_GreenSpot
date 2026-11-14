import math
import uuid
from datetime import datetime, date, timezone
from typing import Optional
from sqlalchemy import select, func, desc, or_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.rbac import User
from app.models.reward import RewardTransaction
from app.models.qr_lucky import EcoQRCode, UserQRScan
from app.models.audit import AuditLog
from app.schemas.qr_scan import (
    QRScanResponse,
    QRCodeDetail,
    QRCodeCreateRequest,
    QRCodeListResponse,
)

def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Tính khoảng cách đường chim bay giữa hai tọa độ GPS (mét) theo công thức Haversine"""
    R = 6371000.0  # Bán kính Trái Đất (mét)
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

class QRScanService:
    @staticmethod
    async def process_qr_scan(
        db: AsyncSession,
        user: User,
        code: str,
        user_lat: Optional[float] = None,
        user_lng: Optional[float] = None,
    ) -> QRScanResponse:
        clean_code = code.strip().upper()

        # 1. Tra cứu mã QR trong hệ thống
        stmt = select(EcoQRCode).where(EcoQRCode.code == clean_code, EcoQRCode.is_active == True)
        res = await db.execute(stmt)
        qr = res.scalar_one_or_none()

        # Nếu mã không có trong hệ thống thì báo lỗi không thành công rõ ràng
        if not qr:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Mã QR [{clean_code}] không tồn tại trong hệ thống GreenSpot hoặc đã ngừng hoạt động. Quét không thành công!",
            )

        # 2. Kiểm tra quyền hạn Admin (an toàn không gây MissingGreenlet trên asyncpg)
        is_admin = (user.email in {"admin@greenspot.vn", "admin@ecoreport.gov.vn"})
        try:
            if hasattr(user, "role_id") and user.role_id:
                from app.models.rbac import Role
                r_stmt = select(Role.role_code).where(Role.role_id == user.role_id)
                role_code = (await db.execute(r_stmt)).scalar_one_or_none()
                if role_code == "ADMIN":
                    is_admin = True
        except Exception:
            pass

        distance: Optional[float] = None
        if user_lat is not None and user_lng is not None:
            distance = calculate_haversine_distance(user_lat, user_lng, qr.lat, qr.lng)
            # Với tài khoản ADMIN hoặc kiểm thử môi trường dev, cho phép khoảng cách linh hoạt
            if distance > qr.max_distance_meters and not is_admin:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Vị trí của bạn nằm ngoài phạm vi {int(qr.max_distance_meters)}m của trạm thu gom. Quét không thành công!",
                )

        # 3. Kiểm tra quét trùng trong ngày (1 lượt / mã / ngày)
        today = date.today()
        dup_stmt = select(UserQRScan).where(
            UserQRScan.user_id == user.user_id,
            UserQRScan.qr_id == qr.qr_id,
            UserQRScan.scan_date == today,
        )
        dup_res = await db.execute(dup_stmt)
        already_scanned = dup_res.scalar_one_or_none()

        # Cho phép Admin quét lại để kiểm thử nghiệm thu tính năng
        if already_scanned and not is_admin:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mã QR này bạn đã quét nhận điểm hôm nay rồi. Vui lòng quay lại vào ngày mai. Quét không thành công!",
            )

        # 4. Ghi nhận lượt quét thành công & cộng điểm
        if already_scanned:
            already_scanned.scanned_at = datetime.now(timezone.utc)
            already_scanned.user_lat = user_lat
            already_scanned.user_lng = user_lng
            already_scanned.distance_meters = distance
            scan_record = already_scanned
        else:
            scan_record = UserQRScan(
                scan_id=uuid.uuid4(),
                user_id=user.user_id,
                qr_id=qr.qr_id,
                scanned_at=datetime.now(timezone.utc),
                scan_date=today,
                points_earned=qr.point_reward,
                user_lat=user_lat,
                user_lng=user_lng,
                distance_meters=distance,
            )
            db.add(scan_record)

        # Cập nhật ví điểm (Cộng cả điểm khả dụng và điểm xét hạng trọn đời)
        user.green_points += qr.point_reward
        user.lifetime_points = (user.lifetime_points or 0) + qr.point_reward

        # Ghi nhật ký giao dịch điểm
        tx = RewardTransaction(
            transaction_id=uuid.uuid4(),
            user_id=user.user_id,
            points_amount=qr.point_reward,
            balance_after=user.green_points,
            transaction_type="EARN",
            description=f"Quét mã QR tại {qr.title}",
            created_at=datetime.now(timezone.utc),
        )
        db.add(tx)

        # [CN 26 & CN 34] Ghi nhận AuditLog nhật ký kiểm toán chống gian lận
        try:
            audit = AuditLog(
                user_id=user.user_id,
                action="QR_CHECKIN",
                table_name="user_qr_scans",
                record_id=str(scan_record.scan_id),
                old_data=None,
                new_data={
                    "qr_code": qr.code,
                    "points_earned": qr.point_reward,
                    "location": qr.location_name,
                    "distance_meters": distance,
                },
                ip_address="127.0.0.1",
            )
            db.add(audit)
        except Exception:
            pass

        await db.commit()
        await db.refresh(user)

        return QRScanResponse(
            success=True,
            title=qr.title,
            location_name=qr.location_name,
            point_reward=qr.point_reward,
            message=f"Bạn nhận được +{qr.point_reward} điểm xanh từ {qr.title}",
            scanned_at=datetime.now(timezone.utc).strftime("%H:%M %d/%m/%Y"),
            new_total_points=user.green_points,
            distance_meters=round(distance, 1) if distance is not None else None,
        )

    @staticmethod
    async def get_qr_info(db: AsyncSession, code: str) -> QRCodeDetail:
        clean_code = code.strip().upper()
        stmt = select(EcoQRCode).where(EcoQRCode.code == clean_code, EcoQRCode.is_active == True)
        res = await db.execute(stmt)
        qr = res.scalar_one_or_none()
        if not qr:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Mã QR không hợp lệ hoặc không thuộc hệ thống",
            )
        return QRCodeDetail(
            code=qr.code,
            title=qr.title,
            location_name=qr.location_name,
            point_reward=qr.point_reward,
            qr_type=qr.qr_type,
            lat=qr.lat,
            lng=qr.lng,
            max_distance_meters=qr.max_distance_meters,
            is_active=qr.is_active,
            description=qr.description,
            created_at=qr.created_at.strftime("%H:%M %d/%m/%Y") if qr.created_at else None,
        )

    @staticmethod
    async def create_qr_code(
        db: AsyncSession,
        payload: QRCodeCreateRequest,
        creator: Optional[User] = None,
    ) -> QRCodeDetail:
        """
        Tạo mã QR trạm thu gom / sự kiện sinh thái mới:
        - Kiểm tra trùng mã
        - Lưu vào bảng eco_qr_codes
        - Ghi nhận AuditLog với action CREATE_QR_CODE
        """
        clean_code = payload.code.strip().upper()

        # Kiểm tra trùng lặp mã
        check_stmt = select(EcoQRCode).where(EcoQRCode.code == clean_code)
        existing = (await db.execute(check_stmt)).scalar_one_or_none()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Mã QR [{clean_code}] đã tồn tại trong hệ thống. Vui lòng chọn mã khác!",
            )

        new_qr = EcoQRCode(
            qr_id=uuid.uuid4(),
            code=clean_code,
            title=payload.title.strip(),
            location_name=payload.location_name.strip(),
            point_reward=payload.point_reward,
            qr_type=payload.qr_type,
            lat=payload.lat,
            lng=payload.lng,
            max_distance_meters=payload.max_distance_meters,
            is_active=True,
            description=payload.description.strip() if payload.description else None,
            created_at=datetime.now(timezone.utc),
        )
        db.add(new_qr)

        # Ghi nhận nhật ký an ninh kiểm toán AuditLog
        try:
            from app.services.audit_service import AuditService
            await AuditService.log_activity(
                db=db,
                action="CREATE_QR_CODE",
                table_name="eco_qr_codes",
                user_id=creator.user_id if creator else None,
                record_id=str(new_qr.qr_id),
                new_data={
                    "code": new_qr.code,
                    "title": new_qr.title,
                    "location_name": new_qr.location_name,
                    "point_reward": new_qr.point_reward,
                    "qr_type": new_qr.qr_type,
                    "lat": new_qr.lat,
                    "lng": new_qr.lng,
                },
                request_uri="/api/v1/gamification/qr/generate",
            )
        except Exception as audit_err:
            print(f"[Audit Notice] {audit_err}")

        await db.commit()
        await db.refresh(new_qr)

        return QRCodeDetail(
            code=new_qr.code,
            title=new_qr.title,
            location_name=new_qr.location_name,
            point_reward=new_qr.point_reward,
            qr_type=new_qr.qr_type,
            lat=new_qr.lat,
            lng=new_qr.lng,
            max_distance_meters=new_qr.max_distance_meters,
            is_active=new_qr.is_active,
            description=new_qr.description,
            created_at=new_qr.created_at.strftime("%H:%M %d/%m/%Y") if new_qr.created_at else None,
        )

    @staticmethod
    async def list_qr_codes(
        db: AsyncSession,
        search: Optional[str] = None,
        qr_type: Optional[str] = None,
        page: int = 1,
        limit: int = 20,
    ) -> QRCodeListResponse:
        """
        Lấy danh sách mã QR hệ thống kèm tìm kiếm và phân trang
        """
        q = select(EcoQRCode).where(EcoQRCode.is_active == True)

        if search and search.strip():
            term = f"%{search.strip().upper()}%"
            q = q.where(
                or_(
                    EcoQRCode.code.ilike(term),
                    EcoQRCode.title.ilike(term),
                    EcoQRCode.location_name.ilike(term),
                )
            )

        if qr_type and qr_type != "ALL":
            q = q.where(EcoQRCode.qr_type == qr_type)

        count_q = select(func.count()).select_from(q.subquery())
        total = (await db.execute(count_q)).scalar() or 0

        offset = (page - 1) * limit
        q = q.order_by(desc(EcoQRCode.created_at)).offset(offset).limit(limit)
        res = await db.execute(q)
        records = res.scalars().all()

        items = [
            QRCodeDetail(
                code=r.code,
                title=r.title,
                location_name=r.location_name,
                point_reward=r.point_reward,
                qr_type=r.qr_type,
                lat=r.lat,
                lng=r.lng,
                max_distance_meters=r.max_distance_meters,
                is_active=r.is_active,
                description=r.description,
                created_at=r.created_at.strftime("%H:%M %d/%m/%Y") if r.created_at else None,
            )
            for r in records
        ]

        return QRCodeListResponse(
            items=items,
            total=total,
            page=page,
            limit=limit,
        )
