"""
QR Scan Service (STT 34: Quét mã QR nhận điểm) - Mock/Stub Mode
Đã chuyển sang chế độ Mock/Stub an toàn để sẵn sàng triển khai lại từ đầu.
"""

from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.rbac import User
from app.schemas.qr_scan import QRScanResponse, QRCodeDetail


def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    return 0.0


class QRScanService:
    @staticmethod
    async def process_qr_scan(
        db: AsyncSession,
        user: User,
        code: str,
        user_lat: Optional[float] = None,
        user_lng: Optional[float] = None,
    ) -> QRScanResponse:
        return QRScanResponse(
            success=True,
            title="Quét mã QR nhận điểm (Mock)",
            location_name="Trạm Mẫu (Mock/Stub)",
            point_reward=10,
            message="Quét mã QR thành công (Chế độ Mock/Stub)",
            scanned_at=datetime.now(timezone.utc).isoformat(),
            new_total_points=getattr(user, "green_points", 0) + 10,
            distance_meters=0.0,
        )

    @staticmethod
    async def get_qr_info(db: AsyncSession, code: str) -> QRCodeDetail:
        return QRCodeDetail(
            code=code,
            title="Trạm thu gom rác tái chế mẫu",
            location_name="123 Lê Lợi, Quận 1 (Mock/Stub)",
            point_reward=10,
            qr_type="RECYCLING_STATION",
            lat=10.7769,
            lng=106.7009,
            description="Thông tin trạm tái chế phục vụ quét mã QR nhận điểm (Mock/Stub)",
        )
