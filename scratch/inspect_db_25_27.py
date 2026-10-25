import sys
import os
sys.path.insert(0, os.path.abspath('backend'))
import asyncio
from sqlalchemy import text
from app.database import engine

sys.stdout.reconfigure(encoding='utf-8')

async def main():
    async with engine.connect() as conn:
        res = await conn.execute(text("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        """))
        tables = [row[0] for row in res.fetchall()]
        print("Existing DB Tables:", tables)
        
        # Check audit_logs columns
        if 'audit_logs' in tables:
            cols = await conn.execute(text("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'audit_logs';
            """))
            print("audit_logs cols:", cols.fetchall())
            
        # Check waste_categories columns
        if 'waste_categories' in tables:
            cols = await conn.execute(text("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'waste_categories';
            """))
            print("waste_categories cols:", cols.fetchall())

if __name__ == '__main__':
    asyncio.run(main())
