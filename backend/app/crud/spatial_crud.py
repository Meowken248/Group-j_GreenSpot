from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text


async def query_district_boundaries(db: AsyncSession) -> List[Dict[str, Any]]:
    """
    Truy vấn thông tin ranh giới quận huyện và số lượng sự cố (tối ưu hóa 1 câu SQL).
    """
    query = """
        SELECT 
            u.unit_id,
            u.unit_code,
            u.name,
            u.area_km2::float as area_km2,
            u.population,
            ST_AsGeoJSON(u.boundary) as geojson_geom,
            ST_X(u.centroid)::float as lng,
            ST_Y(u.centroid)::float as lat,
            COUNT(i.incident_id) as incidents_count
        FROM administrative_units u
        LEFT JOIN incidents i ON i.unit_id = u.unit_id
        WHERE u.boundary IS NOT NULL
        GROUP BY u.unit_id, u.unit_code, u.name, u.area_km2, u.population, u.boundary, u.centroid
        ORDER BY u.unit_id ASC;
    """
    rows = await db.execute(text(query))
    return [dict(r) for r in rows.mappings()]


async def query_nearest_spots(
    db: AsyncSession,
    lat: float,
    lng: float,
    radius_meters: float,
    category: Optional[str] = None,
    limit: int = 20,
) -> List[Dict[str, Any]]:
    """
    Truy vấn PostGIS tìm các điểm gần nhất quanh tọa độ GPS với ST_DWithin và ST_DistanceSphere.
    """
    query = """
        WITH user_pt AS (
            SELECT ST_SetSRID(ST_MakePoint(:lng, :lat), 4326) as geom
        )
        SELECT 
            'incident' as category,
            i.incident_id::text as id,
            i.title as name,
            i.address_text as address,
            i.latitude::float as latitude,
            i.longitude::float as longitude,
            ST_DistanceSphere(i.location, u.geom)::float as distance_m,
            i.severity as extra_info
        FROM incidents i, user_pt u
        WHERE ST_DWithin(i.location::geography, u.geom::geography, :radius_m)
          AND (:cat IS NULL OR :cat = 'incident')

        UNION ALL

        SELECT 
            'green_spot' as category,
            f.facility_id::text as id,
            f.facility_name as name,
            f.address,
            ST_Y(f.location)::float as latitude,
            ST_X(f.location)::float as longitude,
            ST_DistanceSphere(f.location, u.geom)::float as distance_m,
            f.facility_type as extra_info
        FROM essential_facilities f, user_pt u
        WHERE ST_DWithin(f.location::geography, u.geom::geography, :radius_m)
          AND (:cat IS NULL OR :cat = 'green_spot')

        UNION ALL

        SELECT 
            'recycling' as category,
            r.facility_id::text as id,
            r.name,
            r.address,
            ST_Y(r.location)::float as latitude,
            ST_X(r.location)::float as longitude,
            ST_DistanceSphere(r.location, u.geom)::float as distance_m,
            r.operating_hours as extra_info
        FROM recycling_facilities r, user_pt u
        WHERE ST_DWithin(r.location::geography, u.geom::geography, :radius_m)
          AND (:cat IS NULL OR :cat = 'recycling')

        ORDER BY distance_m ASC
        LIMIT :lim;
    """

    params = {
        "lat": lat,
        "lng": lng,
        "radius_m": radius_meters,
        "cat": category if category and category != "all" else None,
        "lim": limit,
    }

    rows = await db.execute(text(query), params)
    return [dict(r) for r in rows.mappings()]
