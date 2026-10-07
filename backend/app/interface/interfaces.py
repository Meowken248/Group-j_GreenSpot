from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.flood import FloodHotspot, TideState, TideAlertLevel


class IWeatherService(ABC):
    @abstractmethod
    async def get_hcm_rainfall(self, force_refresh: bool = False) -> Dict[str, Any]:
        """Lấy lượng mưa hiện tại (mm/h) và dự báo mưa trong 1-3 giờ tới tại TP.HCM."""
        pass


class ITideEngine(ABC):
    @classmethod
    @abstractmethod
    def calculate_water_level(
        cls,
        target_time: Optional[datetime] = None,
        station_code: str = "PHU_AN",
    ) -> float:
        """Tính toán mực nước dự báo tại thời điểm t (đơn vị: mét)."""
        pass

    @classmethod
    @abstractmethod
    def get_tide_rate_of_change(
        cls,
        target_time: Optional[datetime] = None,
        station_code: str = "PHU_AN",
        delta_minutes: int = 15,
    ) -> float:
        """Tính đạo hàm dH/dt (tốc độ dâng/rút của nước, đơn vị: mét/giờ)."""
        pass

    @classmethod
    @abstractmethod
    def determine_tide_state(
        cls,
        target_time: Optional[datetime] = None,
        station_code: str = "PHU_AN",
    ) -> TideState:
        """Xác định trạng thái con nước: Đang lên, Đang rút, Đạt đỉnh hoặc Đạt đáy."""
        pass

    @classmethod
    @abstractmethod
    def determine_alert_level(cls, water_level_m: float) -> TideAlertLevel:
        """Phân cấp mức độ nguy cơ triều cường theo quy chuẩn thủy văn TP.HCM."""
        pass

    @classmethod
    @abstractmethod
    def get_current_tide(cls, station_code: str = "PHU_AN") -> Dict[str, Any]:
        """Lấy thông tin trạng thái triều hiện tại đầy đủ."""
        pass

    @classmethod
    @abstractmethod
    def get_tide_forecast(
        cls,
        hours: int = 24,
        interval_minutes: int = 60,
        station_code: str = "PHU_AN",
    ) -> List[Dict[str, Any]]:
        """Dự báo con nước chuỗi thời gian liên tục."""
        pass

    @classmethod
    @abstractmethod
    def find_upcoming_extrema(
        cls,
        window_hours: int = 24,
        station_code: str = "PHU_AN",
    ) -> Dict[str, Any]:
        """Tìm kiếm các đỉnh triều (High Tide) và chân triều (Low Tide) tiếp theo."""
        pass


class IFloodEngine(ABC):
    @classmethod
    @abstractmethod
    def calculate_hotspot_risk(
        cls,
        hotspot: FloodHotspot,
        tide_water_level_m: float,
        rainfall_mmh: float,
    ) -> Dict[str, Any]:
        """Đánh giá mức độ rủi ro ngập tại một điểm đen ngập úng."""
        pass

    @classmethod
    @abstractmethod
    async def evaluate_all_hotspots(
        cls,
        db: AsyncSession,
        tide_level_override: Optional[float] = None,
        rainfall_override: Optional[float] = None,
    ) -> List[Dict[str, Any]]:
        """Đánh giá realtime toàn bộ các điểm đen ngập lụt tại TP.HCM."""
        pass

    @classmethod
    @abstractmethod
    async def check_route_for_flood_hazards(
        cls,
        db: AsyncSession,
        coordinates: List[List[float]],
        buffer_meters: float = 60.0,
        tide_level_override: Optional[float] = None,
        rainfall_override: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Kiểm tra tuyến đường có đi qua hoặc gần điểm đen ngập lụt không."""
        pass
