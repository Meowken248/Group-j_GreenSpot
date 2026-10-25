import sys
import os
sys.path.insert(0, os.path.abspath('backend'))
import asyncio
from sqlalchemy import text
from app.database import engine

sys.stdout.reconfigure(encoding='utf-8')

async def migrate_and_seed():
    async with engine.begin() as conn:
        print("Checking tables for Features 25, 26, 27...")
        
        # 1. Feature 25: green_challenges
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS green_challenges (
                challenge_id VARCHAR(50) PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                points_reward INT NOT NULL DEFAULT 30,
                category VARCHAR(50) NOT NULL DEFAULT 'DAILY_HABIT',
                icon VARCHAR(50) NOT NULL DEFAULT 'leaf',
                requirements TEXT NOT NULL,
                is_auto_verify BOOLEAN NOT NULL DEFAULT true,
                is_active BOOLEAN NOT NULL DEFAULT true,
                order_index INT NOT NULL DEFAULT 0,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
        """))
        
        # 2. Feature 25: user_challenges
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS user_challenges (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                challenge_id VARCHAR(50) NOT NULL REFERENCES green_challenges(challenge_id) ON DELETE CASCADE,
                week_year VARCHAR(20) NOT NULL,
                status VARCHAR(30) NOT NULL DEFAULT 'NOT_STARTED',
                evidence_image_url TEXT,
                evidence_note VARCHAR(200),
                completed_at TIMESTAMPTZ,
                claimed_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                CONSTRAINT uq_user_challenge_week UNIQUE (user_id, challenge_id, week_year)
            );
        """))
        
        # 3. Feature 27: waste_handbook_items
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS waste_handbook_items (
                item_id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(200) NOT NULL,
                category_code VARCHAR(50) NOT NULL,
                alternative_names TEXT,
                image_url TEXT,
                sorting_guide TEXT NOT NULL,
                bin_color VARCHAR(30) NOT NULL,
                bin_name VARCHAR(100) NOT NULL,
                safety_notes TEXT,
                has_dedicated_station BOOLEAN NOT NULL DEFAULT false,
                is_active BOOLEAN NOT NULL DEFAULT true,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
        """))
        
        # Seed default weekly challenges for Feature 25
        await conn.execute(text("""
            INSERT INTO green_challenges (challenge_id, title, description, points_reward, category, icon, requirements, is_auto_verify, is_active, order_index)
            VALUES
            ('CHALLENGE_SORT_WASTE', 'Phân loại rác tại nguồn', 'Thực hiện phân loại rác hữu cơ và rác vô cơ riêng biệt tại gia đình trong 3 ngày liên tiếp.', 30, 'WASTE_SORTING', 'recycle', 'Chụp ảnh rõ nét lúc bỏ rác tái chế vào thùng phân loại hoặc phân chia các túi rác đúng quy chuẩn tại nhà.', true, true, 1),
            ('CHALLENGE_BATTERY_RETURN', 'Đổi 5 viên pin cũ tại Trạm Xanh', 'Thu gom ít nhất 5 viên pin hoặc ắc quy đã qua sử dụng và mang tới Trạm Xanh hoặc điểm thu hồi chuyên biệt.', 30, 'HAZARDOUS', 'battery-charging', 'Chụp ảnh lúc bàn giao pin cũ tại thùng thu gom chuyên dụng của trạm hoặc hóa đơn/phiếu xác nhận.', true, true, 2),
            ('CHALLENGE_REPORT_LITTER', 'Báo cáo 01 bãi rác có định vị GPS', 'Sử dụng chức năng Báo cáo sự cố môi trường để định vị và gửi ảnh 01 điểm tập kết rác sai quy định.', 50, 'CIVIC_REPORT', 'camera', 'Hệ thống tự động đồng bộ khi bạn gửi 01 báo cáo sự cố ô nhiễm môi trường thành công qua ứng dụng.', true, true, 3),
            ('CHALLENGE_NO_PLASTIC_BAG', 'Ngày không túi nilon', 'Sử dụng túi vải hoặc làn đi chợ cá nhân, từ chối nhận túi nilon một lần khi mua sắm.', 30, 'PLASTIC_FREE', 'shopping-bag', 'Chụp ảnh bạn sử dụng túi vải hoặc túi tái sử dụng tại siêu thị/cửa hàng tiện lợi.', false, true, 4),
            ('CHALLENGE_GREEN_COMMUTE', 'Đi xe đạp hoặc đi bộ đi làm', 'Lựa chọn phương tiện giao thông xanh (xe đạp, xe buýt điện, đi bộ) thay vì xe máy cá nhân cho hành trình trên 2km.', 40, 'GREEN_MOBILITY', 'bike', 'Chụp ảnh đồng hồ đo quãng đường trên ứng dụng thể thao hoặc ảnh xe đạp/vé xe buýt điện của bạn.', true, true, 5)
            ON CONFLICT (challenge_id) DO UPDATE SET
                title = EXCLUDED.title,
                description = EXCLUDED.description,
                points_reward = EXCLUDED.points_reward,
                requirements = EXCLUDED.requirements;
        """))
        
        # Seed waste handbook items for Feature 27 (4 nhóm chuẩn: Hữu cơ, Tái chế, Nguy hại, Rác khác)
        await conn.execute(text("""
            INSERT INTO waste_handbook_items (item_id, name, category_code, alternative_names, image_url, sorting_guide, bin_color, bin_name, safety_notes, has_dedicated_station, is_active)
            VALUES
            ('ITEM_ORGANIC_FOOD', 'Thức ăn thừa & Rau củ quả', 'ORGANIC', 'cơm nguội, vỏ dưa, cuống rau, thức ăn hỏng, bã trà, bã cà phê', 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400', 'Gạt bỏ bao bì nilon, đổ trực tiếp thức ăn thừa vào xô/túi phân hủy sinh học. Để ráo nước trước khi bỏ vào thùng.', '#22c55e', 'Thùng xanh lá (Rác Hữu Cơ)', 'Không lẫn túi nilon hoặc vỏ ốc sò cứng dày khó phân hủy. Có thể ủ làm phân bón compost.', false, true),
            ('ITEM_PLASTIC_PET', 'Chai nhựa PET & Vỏ hộp kim loại', 'RECYCLABLE', 'chai nước khoáng, chai coca, lon bia, lon nước ngọt, vỏ đồ hộp', 'https://images.unsplash.com/photo-1595278069441-2cf29f8005a4?w=400', 'Đổ sạch chất lỏng bên trong, tráng sơ bằng nước lã, bóp bẹp chai nhựa hoặc lon nhôm để tiết kiệm thể tích trước khi vứt.', '#3b82f6', 'Thùng xanh dương / trắng (Rác Tái Chế)', 'Tháo nhãn nilon nếu có thể. Đảm bảo khô ráo để tránh phát sinh mùi hôi hoặc vi khuẩn.', true, true),
            ('ITEM_PAPER_CARTON', 'Giấy báo & Thùng carton', 'RECYCLABLE', 'sách cũ, thùng mì tôm, bìa các tông, vở học sinh, giấy văn phòng', 'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=400', 'Gấp phẳng thùng carton, xếp gọn gàng theo từng xấp và buộc dây cố định. Giữ giấy luôn khô ráo.', '#3b82f6', 'Thùng xanh dương / trắng (Rác Tái Chế)', 'Không bỏ lẫn giấy dính dầu mỡ, giấy vệ sinh hoặc giấy tráng màng nhựa chống thấm.', true, true),
            ('ITEM_OLD_BATTERY', 'Pin đã qua sử dụng & Ắc quy', 'HAZARDOUS', 'pin con thỏ, pin AA, pin AAA, pin cúc áo, pin lithium điện thoại, acquy xe', 'https://images.unsplash.com/photo-1619725002198-6a689b72f41d?w=400', 'Dán băng dính vào hai cực của pin để phòng ngừa đoản mạch gây cháy nổ. Để trong hũ thủy tinh hoặc hộp nhựa kín.', '#ef4444', 'Thùng đỏ / cam (Rác Nguy Hại)', 'Tuyệt đối không đập dập, không đốt pin vì chứa chì, thủy ngân và cadmium cực kỳ độc hại. Mang tới Trạm Xanh thu hồi.', true, true),
            ('ITEM_LIGHT_BULB', 'Bóng đèn huỳnh quang & Đèn Compact', 'HAZARDOUS', 'bóng tuýp, bóng đèn compact hỏng, đèn cao áp thủy ngân', 'https://images.unsplash.com/photo-1550985543-f47f38aeee65?w=400', 'Bọc bóng đèn cẩn thận bằng bìa carton hoặc báo cũ để tránh vỡ trong quá trình lưu trữ và vận chuyển.', '#ef4444', 'Thùng đỏ / cam (Rác Nguy Hại)', 'Không làm đập vỡ bóng đèn vì hơi thủy ngân phát tán trong không khí gây ngộ độc đường hô hấp.', true, true),
            ('ITEM_PLASTIC_BAG_OTHER', 'Túi nilon dùng một lần & Hộp xốp', 'OTHER', 'túi bóng kính, màng bọc thực phẩm bẩn, hộp cơm xốp, ống hút nhựa bẩn', 'https://images.unsplash.com/photo-1526951521990-620dc14c214b?w=400', 'Loại bỏ cặn bẩn thô bên trong, cho vào túi rác sinh hoạt thông thường và buộc kín miệng túi trước giờ xe rác qua.', '#6b7280', 'Thùng xám / vàng (Rác Thải Khác)', 'Đây là nhóm rác khó phân hủy và khó tái chế hiệu quả kinh tế, sẽ được vận chuyển xử lý đốt hoặc chôn lấp hợp vệ sinh.', false, true),
            ('ITEM_DIAPERS_CERAMIC', 'Gốm sứ vỡ & Tã bỉm sinh hoạt', 'OTHER', 'chén bát vỡ, sành sứ, tã lót em bé, đầu mẩu thuốc lá, bông băng y tế cá nhân', 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=400', 'Với mảnh gốm sứ thủy tinh sắc nhọn, cần gói chặt trong nhiều lớp giấy báo rồi mới bỏ vào thùng rác tránh gây thương tích cho công nhân thu gom.', '#6b7280', 'Thùng xám / vàng (Rác Thải Khác)', 'Buộc chặt túi rác sinh hoạt. Đặt trước cửa nhà đúng khung giờ quy định của đội vệ sinh môi trường đô thị.', false, true)
            ON CONFLICT (item_id) DO UPDATE SET
                name = EXCLUDED.name,
                category_code = EXCLUDED.category_code,
                alternative_names = EXCLUDED.alternative_names,
                sorting_guide = EXCLUDED.sorting_guide,
                bin_color = EXCLUDED.bin_color,
                bin_name = EXCLUDED.bin_name,
                safety_notes = EXCLUDED.safety_notes;
        """))
        
        # Check audit_logs seed count
        audit_count = await conn.execute(text("SELECT count(*) FROM audit_logs;"))
        count_val = audit_count.scalar()
        print(f"Current audit_logs count: {count_val}")
        
        # If audit_logs has fewer than 10 sample records, add realistic records with before/after snapshots
        if count_val < 5:
            print("Seeding sample audit logs for demonstration...")
            # Get an admin user id
            user_res = await conn.execute(text("SELECT user_id FROM users LIMIT 1;"))
            user_row = user_res.fetchone()
            sample_uid = f"'{user_row[0]}'" if user_row else "NULL"
            
            await conn.execute(text(f"""
                INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data, new_data, ip_address, user_agent, request_uri, is_suspicious, created_at)
                VALUES
                ({sample_uid}, 'LOGIN', 'user_sessions', 'sess-8491-auth', NULL, '{{"status": "SUCCESS", "auth_method": "JWT_PASSWORD"}}'::jsonb, '192.168.1.45', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0', '/api/v1/auth/login', false, now() - interval '2 hours'),
                ({sample_uid}, 'UPDATE_ROLE', 'roles', 'role-officer-01', '{{"role_name": "CITIZEN", "permissions": ["VIEW_MAP", "SUBMIT_REPORT"]}}'::jsonb, '{{"role_name": "FIELD_OFFICER", "permissions": ["VIEW_MAP", "SUBMIT_REPORT", "VERIFY_CLEANUP"]}}'::jsonb, '118.69.12.80', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) Safari/605.1.15', '/api/v1/admin/users/assign-role', false, now() - interval '5 hours'),
                ({sample_uid}, 'UPDATE_DATA', 'incidents', 'inc-2026-0914', '{{"severity": "MEDIUM", "status": "REPORTED"}}'::jsonb, '{{"severity": "HIGH", "status": "ASSIGNED"}}'::jsonb, '14.241.130.55', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0', '/api/v1/incidents/inc-2026-0914/status', false, now() - interval '1 day'),
                ({sample_uid}, 'REWARD_POINTS', 'citizen_rewards', 'wallet-user-09', '{{"points_balance": 120, "reason": "Báo cáo trước đó"}}'::jsonb, '{{"points_balance": 150, "delta": 30, "reason": "Hoàn thành Thử thách xanh tuần"}}'::jsonb, '118.69.12.80', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0', '/api/v1/challenges/submit', false, now() - interval '1 day 4 hours'),
                ({sample_uid}, 'EXPORT_AUDIT_LOG', 'audit_logs', 'export-batch-01', NULL, '{{"format": "EXCEL", "total_records": 150, "filter_action": "ALL"}}'::jsonb, '192.168.1.45', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0', '/api/v1/system/audit-logs/export', false, now() - interval '2 days');
            """))

    print("Migration and seed for features 25, 26, 27 completed successfully!")

if __name__ == '__main__':
    asyncio.run(migrate_and_seed())
