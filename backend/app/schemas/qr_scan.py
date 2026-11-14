from typing import Optional, List
from pydantic import BaseModel, Field

class QRScanRequest(BaseModel):
    code: str = Field(..., description="Mã QR dán tại điểm thu gom (VD: ECO-BIN-101, RECYCLE-BT-02)")
    user_lat: Optional[float] = Field(None, description="Tọa độ Vĩ độ GPS hiện tại của người dùng")
    user_lng: Optional[float] = Field(None, description="Tọa độ Kinh độ GPS hiện tại của người dùng")

class QRScanResponse(BaseModel):
    success: bool
    title: str
    location_name: str
    point_reward: int
    message: str
    scanned_at: str
    new_total_points: int
    distance_meters: Optional[float] = None

class QRCodeDetail(BaseModel):
    code: str
    title: str
    location_name: str
    point_reward: int
    qr_type: str
    lat: float
    lng: float
    max_distance_meters: Optional[float] = 50.0
    is_active: Optional[bool] = True
    description: Optional[str] = None
    created_at: Optional[str] = None

class QRCodeCreateRequest(BaseModel):
    code: str = Field(..., min_length=3, max_length=100, description="Mã định danh QR duy nhất (VD: ECO-STATION-BT01)")
    title: str = Field(..., min_length=3, max_length=255, description="Tên trạm thu gom hoặc sự kiện")
    location_name: str = Field(..., min_length=3, max_length=255, description="Địa chỉ đặt trạm (VD: 123 Lê Lợi, Q1)")
    point_reward: int = Field(default=20, ge=1, le=500, description="Điểm thưởng cộng cho công dân khi quét")
    qr_type: str = Field(default="RECYCLING_STATION", description="RECYCLING_STATION | EVENT | PROMOTION | GENERAL")
    lat: float = Field(default=10.7769, description="Vĩ độ GPS của trạm thu gom")
    lng: float = Field(default=106.7009, description="Kinh độ GPS của trạm thu gom")
    max_distance_meters: float = Field(default=50.0, ge=5.0, le=5000.0, description="Bán kính GPS hợp lệ (mét)")
    description: Optional[str] = Field(default=None, description="Ghi chú hướng dẫn phân loại tại trạm")

class QRCodeListResponse(BaseModel):
    items: List[QRCodeDetail]
    total: int
    page: int
    limit: int

