from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text


async def query_incidents(db: AsyncSession) -> List[Dict[str, Any]]:
    """Truy vấn danh sách sự cố môi trường từ DB."""
    query = """
        SELECT 
            i.incident_id::text as id,
            i.title as name,
            'incident' as category,
            COALESCE(u.name, 'TP. Hồ Chí Minh') as district,
            i.address_text as address,
            i.latitude::float as latitude,
            i.longitude::float as longitude,
            i.status,
            i.severity,
            i.risk_score::float as risk_score,
            i.description,
            i.tracking_code,
            i.upvotes_count,
            wc.name as category_name
        FROM incidents i
        LEFT JOIN administrative_units u ON i.unit_id = u.unit_id
        LEFT JOIN waste_categories wc ON i.category_id = wc.category_id
        ORDER BY i.created_at DESC;
    """
    rows = await db.execute(text(query))
    return [dict(r) for r in rows.mappings()]


async def query_green_spots(db: AsyncSession) -> List[Dict[str, Any]]:
    """Truy vấn danh sách công viên & điểm xanh sinh thái từ DB."""
    query = """
        SELECT 
            f.facility_id::text as id,
            f.facility_name as name,
            'green_spot' as category,
            COALESCE(u.name, 'TP. Hồ Chí Minh') as district,
            f.address,
            ST_Y(f.location)::float as latitude,
            ST_X(f.location)::float as longitude,
            COALESCE(f.metadata->>'status', 'Không gian xanh trong lành') as status_text,
            f.vulnerability_level,
            f.metadata
        FROM essential_facilities f
        LEFT JOIN administrative_units u ON f.unit_id = u.unit_id
        WHERE f.facility_type IN ('PARK', 'BOTANICAL_GARDEN', 'ECO_TOURISM', 'BIOSPHERE_RESERVE')
        ORDER BY f.facility_id ASC;
    """
    rows = await db.execute(text(query))
    return [dict(r) for r in rows.mappings()]


async def query_recycling_facilities(db: AsyncSession) -> List[Dict[str, Any]]:
    """Truy vấn danh sách trạm thu gom rác tái chế từ DB."""
    query = """
        SELECT 
            r.facility_id::text as id,
            r.name,
            'recycling' as category,
            COALESCE(u.name, 'TP. Hồ Chí Minh') as district,
            r.address,
            ST_Y(r.location)::float as latitude,
            ST_X(r.location)::float as longitude,
            r.is_active,
            r.accepted_waste_types,
            r.operating_hours,
            r.contact_phone,
            r.managing_org
        FROM recycling_facilities r
        LEFT JOIN administrative_units u ON r.unit_id = u.unit_id
        ORDER BY r.facility_id ASC;
    """
    rows = await db.execute(text(query))
    return [dict(r) for r in rows.mappings()]


async def query_iot_sensor_stations(db: AsyncSession) -> List[Dict[str, Any]]:
    """Truy vấn danh sách trạm quan trắc IoT từ DB."""
    query = """
        SELECT 
            s.station_id::text as id,
            s.station_name as name,
            'sensor' as category,
            COALESCE(u.name, 'TP. Hồ Chí Minh') as district,
            s.address,
            ST_Y(s.location)::float as latitude,
            ST_X(s.location)::float as longitude,
            s.station_type,
            s.status,
            s.metadata
        FROM iot_sensor_stations s
        LEFT JOIN administrative_units u ON s.unit_id = u.unit_id
        ORDER BY s.station_id ASC;
    """
    rows = await db.execute(text(query))
    return [dict(r) for r in rows.mappings()]
