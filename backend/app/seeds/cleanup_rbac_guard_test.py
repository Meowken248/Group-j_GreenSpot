"""
Script Dọn Dẹp Dữ Liệu Kiểm Thử (Cleanup Dummy Test Seeder):
Xóa bỏ hoàn toàn 4 vai trò và 4 tài khoản thử nghiệm của RBAC Guard Framework
để trả lại trạng thái dữ liệu nguyên bản cho cơ sở dữ liệu.
"""

import asyncio
from sqlalchemy import text
from app.database import AsyncSessionLocal

GUARD_TEST_EMAILS = [
    "guard_no_access@greenspot.vn",
    "guard_access_only@greenspot.vn",
    "guard_view_only@greenspot.vn",
    "guard_full_editor@greenspot.vn",
]

GUARD_TEST_ROLE_CODES = [
    "GUARD_NO_ACCESS",
    "GUARD_ACCESS_ONLY",
    "GUARD_VIEW_ONLY",
    "GUARD_FULL_EDITOR",
]


async def cleanup_guard_test_data():
    print("🧹 [Cleanup Seeder] Bắt đầu dọn dẹp dữ liệu kiểm thử RBAC Guard...")
    async with AsyncSessionLocal() as session:
        # 1. Xóa user sessions của các tài khoản test
        await session.execute(
            text("""
                DELETE FROM user_sessions 
                WHERE user_id IN (SELECT user_id FROM users WHERE email = ANY(:emails))
            """),
            {"emails": GUARD_TEST_EMAILS}
        )

        # 2. Xóa các tài khoản test
        res_u = await session.execute(
            text("DELETE FROM users WHERE email = ANY(:emails)"),
            {"emails": GUARD_TEST_EMAILS}
        )
        print(f"  -> Đã xóa {res_u.rowcount} tài khoản kiểm thử ({', '.join(GUARD_TEST_EMAILS)})")

        # 3. Xóa các vai trò test (role_permissions sẽ cascade theo FK)
        res_r = await session.execute(
            text("DELETE FROM roles WHERE role_code = ANY(:codes)"),
            {"codes": GUARD_TEST_ROLE_CODES}
        )
        print(f"  -> Đã xóa {res_r.rowcount} vai trò kiểm thử ({', '.join(GUARD_TEST_ROLE_CODES)})")

        await session.commit()
    print("✨ Dọn dẹp hoàn tất, cơ sở dữ liệu đã trở lại trạng thái sạch nguyên bản!")


if __name__ == "__main__":
    asyncio.run(cleanup_guard_test_data())
