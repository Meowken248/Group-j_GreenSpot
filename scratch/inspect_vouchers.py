import asyncio
import asyncpg

async def check():
    conn = await asyncpg.connect("postgresql://postgres:postgres@localhost:5433/postgres")
    cols = await conn.fetch("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'citizen_rewards';
    """)
    print("citizen_rewards cols:", [(c['column_name'], c['data_type']) for c in cols])
    rows = await conn.fetch("SELECT * FROM citizen_rewards LIMIT 5;")
    print("citizen_rewards count:", len(rows))
    for r in rows:
        print(dict(r))
    await conn.close()

if __name__ == "__main__":
    asyncio.run(check())
