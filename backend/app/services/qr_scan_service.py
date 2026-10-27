import math
import uuid
from datetime import datetime, date, timezone
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.rbac import User
from app.models.reward import RewardTransaction
from app.models.qr_lucky import EcoQRCode, UserQRScan
from app.schemas.qr_scan import QRScanResponse, QRCodeDetail

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

        if not qr:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mã QR không hợp lệ hoặc không thuộc hệ thống",
            )

        # 2. Kiểm tra khoảng cách GPS (Anti-fraud)
        distance: Optional[float] = None
        if user_lat is not None and user_lng is not None:
            distance = calculate_haversine_distance(user_lat, user_lng, qr.lat, qr.lng)
            if distance > qr.max_distance_meters:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Vị trí của bạn nằm ngoài phạm vi trạm thu gom. Vui lòng quét trực tiếp tại chỗ",
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

        if already_scanned:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mã này đã được bạn sử dụng hôm nay. Vui lòng quay lại vào ngày mai",
            )

        # 4. Ghi nhận lượt quét thành công & cộng điểm
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

        # Cập nhật ví điểm
        user.green_points += qr.point_reward

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
            description=qr.description,
        )
