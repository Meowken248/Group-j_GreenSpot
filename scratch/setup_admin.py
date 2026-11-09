import asyncio
import uuid
import hashlib
import os
import asyncpg

def hash_password(password: str) -> str:
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations=100_000)
    return f"{salt.hex()}${key.hex()}"

async def main():
    conn = await asyncpg.connect("postgresql://postgres:postgres@localhost:5433/postgres")
    pwd_hash = hash_password("admin123")
    
    # 1. Check if 'admin' user already exists
    existing = await conn.fetchrow("SELECT user_id, email, role_id, status FROM users WHERE email = $1", "admin")
    if existing:
        await conn.execute(
            "UPDATE users SET password_hash = $1, role_id = 1, status = 'ACTIVE', full_name = 'Quản trị viên Hệ thống (Admin)' WHERE email = $2",
            pwd_hash, "admin"
        )
        print("Updated existing admin user!")
    else:
        new_id = uuid.uuid4()
        await conn.execute("""
            INSERT INTO users (user_id, email, password_hash, full_name, role_id, status, reputation_score, green_points, lifetime_points, created_at, updated_at)
            VALUES ($1, 'admin', $2, 'Quản trị viên Hệ thống (Admin)', 1, 'ACTIVE', 100, 99999, 99999, NOW(), NOW())
        """, new_id, pwd_hash)
        print("Created new admin user with id:", new_id)

    # 2. Also update admin@ecoreport.gov.vn
    await conn.execute("UPDATE users SET password_hash = $1, role_id = 1, status = 'ACTIVE' WHERE email = $2", pwd_hash, "admin@ecoreport.gov.vn")
    
    # 3. Also create or update admin@greenspot.vn
    existing_greenspot = await conn.fetchrow("SELECT user_id FROM users WHERE email = $1", "admin@greenspot.vn")
    if not existing_greenspot:
        await conn.execute("""
            INSERT INTO users (user_id, email, password_hash, full_name, role_id, status, reputation_score, green_points, lifetime_points, created_at, updated_at)
            VALUES ($1, 'admin@greenspot.vn', $2, 'Quản trị viên Hệ thống (GreenSpot)', 1, 'ACTIVE', 100, 99999, 99999, NOW(), NOW())
        """, uuid.uuid4(), pwd_hash)
    else:
        await conn.execute("UPDATE users SET password_hash = $1, role_id = 1, status = 'ACTIVE' WHERE email = $2", pwd_hash, "admin@greenspot.vn")

    # 4. Clear any locked attempts
    await conn.execute("DELETE FROM login_attempts WHERE email IN ('admin', 'admin@greenspot.vn', 'admin@ecoreport.gov.vn')")
    print("Reset login attempts successfully!")

    # 5. Verify users
    admins = await conn.fetch("SELECT user_id, email, role_id, status, full_name FROM users WHERE role_id = 1")
    print(f"Current ADMIN accounts count: {len(admins)}")
    for a in admins:
        print(f" - Email: {a['email']} | Role: {a['role_id']} | Status: {a['status']} | Name: {a['full_name']}")
        
    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
