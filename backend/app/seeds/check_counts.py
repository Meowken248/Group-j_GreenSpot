import asyncio
import asyncpg
from app.core.config import settings

async def main():
    url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(url)
    p_cnt = await conn.fetchval("SELECT count(1) FROM administrative_units WHERE level = 'PROVINCE';")
    d_cnt = await conn.fetchval("SELECT count(1) FROM administrative_units WHERE level = 'DISTRICT';")
    b_cnt = await conn.fetchval("SELECT count(1) FROM administrative_units WHERE boundary IS NOT NULL;")
    inc_cnt = await conn.fetchval("SELECT count(1) FROM incidents;")
    fac_cnt = await conn.fetchval("SELECT count(1) FROM essential_facilities;")
    rec_cnt = await conn.fetchval("SELECT count(1) FROM recycling_facilities;")
    iot_cnt = await conn.fetchval("SELECT count(1) FROM iot_sensor_stations;")
    
    print(f"Provinces: {p_cnt}")
    print(f"Districts: {d_cnt}")
    print(f"Boundaries (Districts with Polygon): {b_cnt}")
    print(f"Incidents: {inc_cnt}")
    print(f"Green Spaces: {fac_cnt}")
    print(f"Recycling: {rec_cnt}")
    print(f"IoT Stations: {iot_cnt}")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
