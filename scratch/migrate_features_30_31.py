import asyncio
import asyncpg
from datetime import datetime, timezone, timedelta

async def migrate():
    conn = await asyncpg.connect("postgresql://postgres:postgres@localhost:5433/postgres")
    
    # 1. Update citizen_rewards table
    print("Checking citizen_rewards columns...")
    cols = [r['column_name'] for r in await conn.fetch("""
        SELECT column_name FROM information_schema.columns WHERE table_name = 'citizen_rewards';
    """)]
    
    if 'brand' not in cols:
        print("Adding column 'brand' to citizen_rewards...")
        await conn.execute("ALTER TABLE citizen_rewards ADD COLUMN brand VARCHAR(100) DEFAULT 'GreenSpot ESG';")
    
    if 'expiry_date' not in cols:
        print("Adding column 'expiry_date' to citizen_rewards...")
        await conn.execute("ALTER TABLE citizen_rewards ADD COLUMN expiry_date TIMESTAMP WITH TIME ZONE;")
        
    if 'total_redeemed' not in cols:
        print("Adding column 'total_redeemed' to citizen_rewards...")
        await conn.execute("ALTER TABLE citizen_rewards ADD COLUMN total_redeemed INTEGER DEFAULT 0;")

    # 2. Create user_vouchers table if not exists
    print("Creating user_vouchers table if not exists...")
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS user_vouchers (
            voucher_id UUID PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
            reward_id INTEGER NOT NULL REFERENCES citizen_rewards(reward_id) ON DELETE CASCADE,
            voucher_code VARCHAR(50) UNIQUE NOT NULL,
            points_spent INTEGER NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
            terms_and_conditions TEXT,
            qr_data VARCHAR(255),
            redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            used_at TIMESTAMP WITH TIME ZONE
        );
        CREATE INDEX IF NOT EXISTS idx_user_vouchers_user_id ON user_vouchers(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_vouchers_status ON user_vouchers(status);
        CREATE INDEX IF NOT EXISTS idx_user_vouchers_code ON user_vouchers(voucher_code);
    """)

    # 3. Check existing rewards
    rewards_count = await conn.fetchval("SELECT COUNT(*) FROM citizen_rewards;")
    print(f"Current rewards count: {rewards_count}")

    # Seed standard initial items if empty or update their expiry_date
    now = datetime.now(timezone.utc)
    one_year_later = now + timedelta(days=365)
    
    await conn.execute("""
        UPDATE citizen_rewards 
        SET expiry_date = $1, brand = COALESCE(brand, 'GreenSpot ESG')
        WHERE expiry_date IS NULL;
    """, one_year_later)

    print("Migration finished successfully!")
    await conn.close()

if __name__ == "__main__":
    asyncio.run(migrate())
