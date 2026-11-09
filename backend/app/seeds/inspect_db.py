import asyncio
import asyncpg
from app.core.config import settings

async def main():
    url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(url)
    
    # Check enum types
    enums = await conn.fetch("""
        SELECT t.typname, e.enumlabel 
        FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid 
        ORDER BY t.typname, e.enumsortorder;
    """)
    enum_dict = {}
    for r in enums:
        enum_dict.setdefault(r['typname'], []).append(r['enumlabel'])
    for k, v in enum_dict.items():
        print(f"Enum {k}: {v}")
        
    print("\n--- Check existing tables and row counts ---")
    tables = ['roles', 'users', 'waste_categories', 'administrative_units', 'incidents', 'essential_facilities', 'recycling_facilities', 'iot_sensor_stations']
    for tbl in tables:
        cnt = await conn.fetchval(f"SELECT count(1) FROM {tbl};")
        print(f"Table {tbl}: {cnt} rows")

    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
