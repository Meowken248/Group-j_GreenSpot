from typing import Optional
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
    description: Optional[str] = None
