import asyncio
import unittest
from sqlalchemy import text
from app.database import AsyncSessionLocal


class TestRbacDatabase(unittest.TestCase):
    """Kiểm thử tính toàn vẹn của Cơ sở dữ liệu RBAC (Giai đoạn 1)"""

    def test_all_rbac_database_integrity(self):
        async def _run():
            async with AsyncSessionLocal() as session:
                # 1. Kiểm tra 4 vai trò hệ thống
                result = await session.execute(
                    text("SELECT role_code, role_name, scope, version, is_system FROM roles WHERE is_system = TRUE ORDER BY role_id")
                )
                roles = result.fetchall()
                role_codes = [r[0] for r in roles]
                self.assertIn("ADMIN", role_codes)
                self.assertIn("DISTRICT_MANAGER", role_codes)
                self.assertIn("RESPONDER", role_codes)
                self.assertIn("CITIZEN", role_codes)

                admin_role = next(r for r in roles if r[0] == "ADMIN")
                self.assertEqual(admin_role[2], "CITY")  # scope Toàn thành phố
                self.assertGreaterEqual(admin_role[3], 1)  # version >= 1
                self.assertTrue(admin_role[4])            # is_system = True

                dm_role = next(r for r in roles if r[0] == "DISTRICT_MANAGER")
                self.assertEqual(dm_role[2], "DISTRICT")  # scope Quận

                # 2. Kiểm tra danh mục 15 modules và 54 permissions
                perms_count = await session.execute(text("SELECT count(*) FROM permissions"))
                total = perms_count.scalar()
                self.assertEqual(total, 54)

                modules_res = await session.execute(text("SELECT DISTINCT module FROM permissions"))
                modules = [m[0] for m in modules_res.fetchall()]
                self.assertEqual(len(modules), 15)
                self.assertIn("ROLE", modules)
                self.assertIn("AUDIT_LOG", modules)
                self.assertIn("STATISTICS", modules)
                self.assertIn("GIS_MAP", modules)
                self.assertIn("INCIDENTS", modules)

                # 3. Kiểm tra Admin có đủ 54 permissions
                admin_perms = await session.execute(text("""
                    SELECT count(*) 
                    FROM role_permissions rp 
                    JOIN roles r ON rp.role_id = r.role_id 
                    WHERE r.role_code = 'ADMIN'
                """))
                self.assertEqual(admin_perms.scalar(), 54)

                # 4. Kiểm tra tài khoản ddatmguyen2023+test@gmail.com có quyền ADMIN
                user_res = await session.execute(text("""
                    SELECT u.email, r.role_code 
                    FROM users u 
                    JOIN roles r ON u.role_id = r.role_id 
                    WHERE u.email = 'ddatmguyen2023+test@gmail.com'
                """))
                user = user_res.fetchone()
                self.assertIsNotNone(user)
                self.assertEqual(user[1], "ADMIN")

        asyncio.run(_run())


if __name__ == "__main__":
    unittest.main()
