import asyncio
import asyncpg
from app.core.config import settings

async def main():
    url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(url)
    
    constraints = await conn.fetch("""
        SELECT conrelid::regclass AS table_name, conname, pg_get_constraintdef(c.oid)
        FROM pg_constraint c
        JOIN pg_namespace n ON n.oid = c.connamespace
        WHERE contype = 'c' AND n.nspname = 'public'
        ORDER BY conrelid::regclass::text;
    """)
    for c in constraints:
        print(f"{c['table_name']}.{c['conname']}: {c['pg_get_constraintdef']}")

    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
