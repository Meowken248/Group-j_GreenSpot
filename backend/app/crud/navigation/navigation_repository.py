"""
Navigation Repository Implementation (STT 41).
Triển khai truy xuất CSDL PostgreSQL / PostGIS theo chuẩn Repository Pattern.
"""

from typing import Any, Dict, List
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.interface.navigation.navigation_interface import INavigationRepository
from app.models.flood import SafeNavigationRoute


class NavigationRepository(INavigationRepository):
    """
    Triển khai truy vấn CSDL cho hệ thống định tuyến an toàn né ngập.
    Tập trung toàn bộ câu truy vấn SQL/PostGIS tại đây.
    """

    async def get_active_flood_hotspots(self, db: AsyncSession) -> List[Dict[str, Any]]:
        """
        Truy vấn toàn bộ các điểm đen ngập lụt đang hoạt động kèm tọa độ không gian PostGIS.
        Sử dụng ST_X và ST_Y để chuyển đổi Geometry Point SRID 4326 sang số thực float.
        """
        query = text("""
            SELECT
                h.hotspot_id,
                h.hotspot_code,
                h.street_name,
                h.district_name,
                h.threshold_tide_meters,
                h.threshold_rain_mm_per_hour,
                h.historical_max_depth_cm,
                h.drainage_system_rating,
                h.primary_cause,
                ST_X(h.location)::float as lng,
                ST_Y(h.location)::float as lat
            FROM flood_hotspots h
            WHERE h.is_active = TRUE;
        """)
        res = await db.execute(query)
        return [dict(r) for r in res.mappings().all()]

    async def save_navigation_route(
        self, db: AsyncSession, route: SafeNavigationRoute
    ) -> SafeNavigationRoute:
        """
        Lưu đối tượng lộ trình định tuyến an toàn vào CSDL phục vụ tra cứu lịch sử và thống kê.
        """
        db.add(route)
        await db.commit()
        await db.refresh(route)
        return route


# Singleton instance sẵn sàng tiêm phụ thuộc (Dependency Injection)
navigation_repository = NavigationRepository()
