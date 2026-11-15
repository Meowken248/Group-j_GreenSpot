import asyncio
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import text
from app.database import AsyncSessionLocal

async def seed_audit_logs():
    async with AsyncSessionLocal() as session:
        # 1. Get real admin user ID
        res = await session.execute(text("SELECT user_id FROM users WHERE email = 'admin' OR email = 'admin@greenspot.vn' ORDER BY role_id ASC LIMIT 1;"))
        admin_row = res.fetchone()
        admin_id = admin_row[0] if admin_row else uuid.UUID('e3238008-2dff-4be2-a8fb-882ab6b7a4dc')
        print(f"Using Admin user_id: {admin_id}")

        # 2. Get another citizen user ID if available
        res_citizen = await session.execute(text("SELECT user_id FROM users WHERE role_id != 1 LIMIT 1;"))
        citizen_row = res_citizen.fetchone()
        citizen_id = citizen_row[0] if citizen_row else admin_id

        # 3. Clean up older dummy logs with user_id '11111111-1111-1111-1111-111111111111'
        await session.execute(text("DELETE FROM audit_logs WHERE user_id = '11111111-1111-1111-1111-111111111111';"))
        await session.commit()

        # 4. Define realistic logs
        now = datetime.now(timezone.utc)
        
        sample_logs = [
            # 1. Today 09:30 AM (Oct 16) - LOGIN
            {
                "user_id": admin_id,
                "action": "LOGIN",
                "table_name": "user_sessions",
                "record_id": f"sess-adm-{now.strftime('%Y%m%d%H%M')}",
                "old_data": None,
                "new_data": {
                    "session_id": f"sess-{uuid.uuid4().hex[:12]}",
                    "auth_method": "JWT_BEARER",
                    "login_status": "SUCCESS",
                    "role": "ADMIN",
                    "client_platform": "Web Admin Portal"
                },
                "ip_address": "127.0.0.1",
                "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
                "request_uri": "/api/v1/auth/login",
                "is_suspicious": False,
                "created_at": now - timedelta(minutes=25)
            },
            # 2. Today 08:45 AM (Oct 16) - UPDATE_DATA (Air Quality Alert Threshold)
            {
                "user_id": admin_id,
                "action": "UPDATE_DATA",
                "table_name": "system_configs",
                "record_id": "CONF-AQI-THRESHOLD-PM25",
                "old_data": {
                    "config_key": "AQI_PM25_WARNING_THRESHOLD",
                    "threshold_ug_m3": 75.0,
                    "alert_level": "WARNING",
                    "auto_notify_citizen": False,
                    "updated_by": "system"
                },
                "new_data": {
                    "config_key": "AQI_PM25_WARNING_THRESHOLD",
                    "threshold_ug_m3": 50.0,
                    "alert_level": "WARNING",
                    "auto_notify_citizen": True,
                    "updated_by": "admin"
                },
                "ip_address": "127.0.0.1",
                "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
                "request_uri": "/api/v1/system/configs/AQI_PM25_WARNING_THRESHOLD",
                "is_suspicious": False,
                "created_at": now - timedelta(hours=1, minutes=10)
            },
            # 3. Yesterday (Oct 15) 16:20 - UPDATE_ROLE (RBAC Permission Change)
            {
                "user_id": admin_id,
                "action": "UPDATE_ROLE",
                "table_name": "roles",
                "record_id": "ROLE-2",
                "old_data": {
                    "role_id": 2,
                    "role_name": "EDITOR",
                    "description": "Biên tập viên bản tin cảnh báo môi trường",
                    "permissions_count": 18,
                    "can_publish_emergency_alert": False
                },
                "new_data": {
                    "role_id": 2,
                    "role_name": "EDITOR",
                    "description": "Biên tập viên bản tin cảnh báo môi trường & phát sóng SOS",
                    "permissions_count": 22,
                    "can_publish_emergency_alert": True
                },
                "ip_address": "127.0.0.1",
                "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
                "request_uri": "/api/v1/rbac/roles/2/permissions",
                "is_suspicious": False,
                "created_at": now - timedelta(days=1, hours=2)
            },
            # 4. Yesterday (Oct 15) 14:15 - REWARD_POINTS (Award green points)
            {
                "user_id": admin_id,
                "action": "REWARD_POINTS",
                "table_name": "reward_transactions",
                "record_id": "TX-20261015-8492",
                "old_data": {
                    "user_id": str(citizen_id),
                    "green_points": 350,
                    "membership_tier": "SILVER"
                },
                "new_data": {
                    "user_id": str(citizen_id),
                    "green_points": 450,
                    "membership_tier": "GOLD",
                    "points_change": "+100",
                    "transaction_type": "EARNED",
                    "reason": "Duyệt nghiệm thu dọn sạch điểm đen ô nhiễm #RC-8492"
                },
                "ip_address": "127.0.0.1",
                "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
                "request_uri": "/api/v1/rewards/claim",
                "is_suspicious": False,
                "created_at": now - timedelta(days=1, hours=4, minutes=15)
            },
            # 5. Yesterday (Oct 15) 10:05 - LOGIN from macOS Safari
            {
                "user_id": admin_id,
                "action": "LOGIN",
                "table_name": "user_sessions",
                "record_id": f"sess-adm-mac-{uuid.uuid4().hex[:8]}",
                "old_data": None,
                "new_data": {
                    "session_id": f"sess-{uuid.uuid4().hex[:12]}",
                    "auth_method": "JWT_REFRESH_TOKEN",
                    "login_status": "SUCCESS"
                },
                "ip_address": "14.161.35.88",
                "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15",
                "request_uri": "/api/v1/auth/refresh",
                "is_suspicious": False,
                "created_at": now - timedelta(days=1, hours=8)
            },
            # 6. Oct 14 18:30 - APPROVE_VERIFICATION
            {
                "user_id": admin_id,
                "action": "APPROVE_VERIFICATION",
                "table_name": "incidents",
                "record_id": "INC-2026-0089",
                "old_data": {
                    "incident_id": "INC-2026-0089",
                    "status": "IN_PROGRESS",
                    "verified_by": None,
                    "resolution_rating": None
                },
                "new_data": {
                    "incident_id": "INC-2026-0089",
                    "status": "RESOLVED",
                    "verified_by": "Bùi Nguyễn Minh Quân (Admin)",
                    "resolution_rating": 5,
                    "proof_after_url": "https://greenspot.vn/uploads/proofs/after_0089.jpg"
                },
                "ip_address": "127.0.0.1",
                "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
                "request_uri": "/api/v1/incidents/INC-2026-0089/approve",
                "is_suspicious": False,
                "created_at": now - timedelta(days=2, hours=1)
            },
            # 7. Oct 14 11:15 - DISPATCH_TEAM
            {
                "user_id": admin_id,
                "action": "DISPATCH_TEAM",
                "table_name": "incident_dispatches",
                "record_id": "DISP-20261014-012",
                "old_data": {
                    "incident_id": "INC-2026-0089",
                    "assigned_team": None,
                    "dispatch_status": "PENDING"
                },
                "new_data": {
                    "incident_id": "INC-2026-0089",
                    "assigned_team": "Đội Vệ sinh Môi trường Đô thị Quận 1 - Kíp trực 02",
                    "dispatch_status": "DISPATCHED",
                    "dispatched_at": (now - timedelta(days=2, hours=8)).isoformat()
                },
                "ip_address": "127.0.0.1",
                "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
                "request_uri": "/api/v1/incidents/INC-2026-0089/dispatch",
                "is_suspicious": False,
                "created_at": now - timedelta(days=2, hours=8)
            },
            # 8. Oct 13 23:00 - DB_BACKUP
            {
                "user_id": None,
                "action": "DB_BACKUP",
                "table_name": "system_backups",
                "record_id": "BCK-20261013-AUTO",
                "old_data": None,
                "new_data": {
                    "backup_id": "BCK-20261013-AUTO",
                    "backup_type": "FULL_SNAPSHOT",
                    "size_bytes": 14582910,
                    "tables_count": 28,
                    "status": "SUCCESS",
                    "storage_target": "s3://greenspot-backups/daily_20261013.sql.gz"
                },
                "ip_address": "127.0.0.1",
                "user_agent": "PostgreSQL pg_dump / Cron Daemon",
                "request_uri": "/internal/cron/db-backup",
                "is_suspicious": False,
                "created_at": now - timedelta(days=3, hours=2)
            },
            # 9. Oct 13 15:40 - Suspicious Login Attempt
            {
                "user_id": None,
                "action": "LOGIN",
                "table_name": "user_sessions",
                "record_id": "FAILED-BRUTE-01",
                "old_data": None,
                "new_data": {
                    "target_account": "admin",
                    "failed_attempts": 5,
                    "reason": "INVALID_PASSWORD_THRESHOLD_EXCEEDED",
                    "lockout_applied_minutes": 15
                },
                "ip_address": "103.28.36.19",
                "user_agent": "python-requests/2.31.0",
                "request_uri": "/api/v1/auth/login",
                "is_suspicious": True,
                "created_at": now - timedelta(days=3, hours=9)
            },
            # 10. Oct 12 14:10 - EXPORT_AUDIT_LOG
            {
                "user_id": admin_id,
                "action": "EXPORT_AUDIT_LOG",
                "table_name": "audit_logs",
                "record_id": f"export-excel-{int(now.timestamp())}",
                "old_data": None,
                "new_data": {
                    "format": "EXCEL",
                    "total_rows": 32,
                    "filter_action": "ALL",
                    "filter_actor": "ALL",
                    "date_from": (now - timedelta(days=10)).isoformat(),
                    "date_to": (now - timedelta(days=3)).isoformat()
                },
                "ip_address": "127.0.0.1",
                "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
                "request_uri": "/api/v1/system/audit-logs/export",
                "is_suspicious": False,
                "created_at": now - timedelta(days=4)
            },
            # 11. Oct 11 16:20 - UPDATE_DATA (Waste category threshold)
            {
                "user_id": admin_id,
                "action": "UPDATE_DATA",
                "table_name": "waste_categories",
                "record_id": "CAT-PIN-01",
                "old_data": {
                    "category_id": "CAT-PIN-01",
                    "category_name": "Pin và pin sạc lithium cũ",
                    "danger_level": "MEDIUM",
                    "points_reward_per_unit": 20
                },
                "new_data": {
                    "category_id": "CAT-PIN-01",
                    "category_name": "Pin và pin sạc lithium cũ",
                    "danger_level": "HAZARDOUS",
                    "points_reward_per_unit": 50
                },
                "ip_address": "127.0.0.1",
                "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
                "request_uri": "/api/v1/waste-categories/CAT-PIN-01",
                "is_suspicious": False,
                "created_at": now - timedelta(days=5)
            },
            # 12. Oct 10 09:12 - REWARD_POINTS (Redemption)
            {
                "user_id": citizen_id,
                "action": "REWARD_POINTS",
                "table_name": "reward_transactions",
                "record_id": "TX-RED-20261010-0912",
                "old_data": {
                    "user_id": str(citizen_id),
                    "green_points": 450,
                    "membership_tier": "GOLD"
                },
                "new_data": {
                    "user_id": str(citizen_id),
                    "green_points": 400,
                    "membership_tier": "GOLD",
                    "points_change": "-50",
                    "transaction_type": "REDEEMED",
                    "reward_item": "Voucher Giảm 20.000đ Cửa hàng Tiêu dùng Xanh GreenMart"
                },
                "ip_address": "171.244.12.8",
                "user_agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
                "request_uri": "/api/v1/rewards/redeem",
                "is_suspicious": False,
                "created_at": now - timedelta(days=6)
            },
            # 13. Oct 09 08:30 - LOGIN
            {
                "user_id": admin_id,
                "action": "LOGIN",
                "table_name": "user_sessions",
                "record_id": f"sess-adm-{uuid.uuid4().hex[:8]}",
                "old_data": None,
                "new_data": {
                    "session_id": f"sess-{uuid.uuid4().hex[:12]}",
                    "auth_method": "JWT_PASSWORD",
                    "login_status": "SUCCESS"
                },
                "ip_address": "127.0.0.1",
                "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
                "request_uri": "/api/v1/auth/login",
                "is_suspicious": False,
                "created_at": now - timedelta(days=7)
            }
        ]

        from app.models.audit import AuditLog
        for item in sample_logs:
            log = AuditLog(
                user_id=item["user_id"],
                action=item["action"],
                table_name=item["table_name"],
                record_id=item["record_id"],
                old_data=item["old_data"],
                new_data=item["new_data"],
                ip_address=item["ip_address"],
                user_agent=item["user_agent"],
                request_uri=item["request_uri"],
                is_suspicious=item["is_suspicious"],
                created_at=item["created_at"]
            )
            session.add(log)
        
        await session.commit()
        print(f"Successfully seeded {len(sample_logs)} audit logs!")

if __name__ == "__main__":
    asyncio.run(seed_audit_logs())
