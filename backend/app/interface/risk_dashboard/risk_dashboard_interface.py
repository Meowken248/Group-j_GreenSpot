from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession


class IRiskDashboardRepository(ABC):
    """
    Interface trừu tượng cho tầng truy xuất dữ liệu Dashboard phân tích rủi ro đô thị (STT 42).
    Tuân thủ Dependency Inversion Principle (DIP).
    """

    @abstractmethod
    async def get_citywide_overview_metrics(self, db: AsyncSession) -> Dict[str, Any]:
        """Truy vấn các chỉ số tổng hợp toàn đô thị (Điểm chung, số quận nguy cơ cao, sự cố đang mở)"""
        pass

    @abstractmethod
    async def get_district_risk_rankings(self, db: AsyncSession) -> List[Dict[str, Any]]:
        """Truy vấn danh sách điểm số rủi ro xếp theo 22 quận/huyện và TP. Thủ Đức (Biểu đồ cột)"""
        pass

    @abstractmethod
    async def get_30_day_risk_trends(self, db: AsyncSession) -> List[Dict[str, Any]]:
        """Truy vấn chuỗi thời gian xu hướng rủi ro môi trường trong 30 ngày gần nhất (Biểu đồ đường)"""
        pass

    @abstractmethod
    async def get_top_alert_districts(self, db: AsyncSession, limit: int = 5) -> List[Dict[str, Any]]:
        """Truy vấn Top N khu vực có điểm rủi ro cao nhất cần tập trung xử lý khẩn cấp (Khối cảnh báo)"""
        pass

    @abstractmethod
    async def get_filtered_analysis(
        self,
        db: AsyncSession,
        district_ids: Optional[List[int]],
        risk_types: Optional[List[str]],
        start_date: datetime,
        end_date: datetime,
        prev_start_date: datetime,
        prev_end_date: datetime,
    ) -> Dict[str, Any]:
        """Truy vấn bóc tách dữ liệu chuyên sâu và so sánh định lượng chu kỳ (Màn 2/3)"""
        pass

    @abstractmethod
    async def get_district_detail_by_id_or_name(
        self,
        db: AsyncSession,
        unit_id: Optional[int] = None,
        district_name: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """Truy vấn chi tiết rủi ro, sự cố tồn đọng và cơ sở thiết yếu bị đe dọa của 1 quận cụ thể (Màn 3/3 Popup)"""
        pass
