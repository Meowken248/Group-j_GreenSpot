import asyncio
import asyncpg

async def main():
    conn = await asyncpg.connect('postgresql://postgres:postgres@localhost:5433/postgres')
    await conn.execute("""
        CREATE TABLE IF NOT EXISTS milestone_posts (
            post_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
            tier_code VARCHAR(20) NOT NULL,
            tier_name VARCHAR(100) NOT NULL,
            content TEXT NOT NULL,
            privacy VARCHAR(20) NOT NULL DEFAULT 'PUBLIC',
            category VARCHAR(50) NOT NULL DEFAULT 'Vinh danh lên cấp',
            likes_count INT NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS idx_milestone_posts_user_id ON milestone_posts(user_id);
        CREATE INDEX IF NOT EXISTS idx_milestone_posts_created_at ON milestone_posts(created_at DESC);
    """)
    print("milestone_posts table created successfully!")
    await conn.close()

if __name__ == '__main__':
    asyncio.run(main())
