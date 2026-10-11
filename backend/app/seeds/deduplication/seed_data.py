import sys
import uuid
import asyncio
from datetime import datetime, timezone
from pathlib import Path

# Đảm bảo UTF-8 cho console Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

current_dir = Path(__file__).resolve().parent
backend_dir = current_dir.parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from sqlalchemy import select, delete
from geoalchemy2.shape import from_shape
from shapely.geometry import Point

from app.database import AsyncSessionLocal, engine
import app.models
from app.models.rbac import User, Role
from app.models.spatial import AdministrativeUnit
from app.models.incident import WasteCategory, Incident, IncidentMedia
from app.models.deduplication import IncidentDuplicateCluster
from app.utils.security import hash_password


async def seed_deduplication():
    print("=" * 60)
    print("🚀 [Deduplication Seeder] Bắt đầu nạp dữ liệu mẫu phát hiện báo cáo trùng lặp...")

    async with AsyncSessionLocal() as session:
        # 1. Đảm bảo vai trò CITIZEN
        r_cit_res = await session.execute(select(Role).where(Role.role_code == "CITIZEN"))
        cit_role = r_cit_res.scalar_one_or_none()
        if not cit_role:
            cit_role = Role(
                role_code="CITIZEN",
                role_name="Citizen",
                description="Công dân sinh thái",
                is_system=True,
                scope="CITY",
                version=1,
            )
            session.add(cit_role)
            await session.flush()

        # 2. Đảm bảo 2 tài khoản công dân mẫu
        citizen_a_email = "citizen_a@ecoreport.gov.vn"
        citizen_b_email = "citizen_b@ecoreport.gov.vn"

        res_a = await session.execute(select(User).where(User.email == citizen_a_email))
        user_a = res_a.scalar_one_or_none()
        if not user_a:
            user_a = User(
                user_id=uuid.uuid4(),
                email=citizen_a_email,
                password_hash=hash_password("citizen123"),
                full_name="Nguyễn Văn An",
                phone_number="0901234567",
                role_id=cit_role.role_id,
                status="ACTIVE",
                version=1,
            )
            session.add(user_a)

        res_b = await session.execute(select(User).where(User.email == citizen_b_email))
        user_b = res_b.scalar_one_or_none()
        if not user_b:
            user_b = User(
                user_id=uuid.uuid4(),
                email=citizen_b_email,
                password_hash=hash_password("citizen123"),
                full_name="Trần Thị Bình",
                phone_number="0987654321",
                role_id=cit_role.role_id,
                status="ACTIVE",
                version=1,
            )
            session.add(user_b)
        await session.flush()

        # 3. Lấy danh mục rác thải
        w_res = await session.execute(select(WasteCategory))
        cat = w_res.scalars().first()
        if not cat:
            cat = WasteCategory(
                category_code="HOUSEHOLD_WASTE",
                name="Rác thải sinh hoạt & tự phát",
                description="Các bãi rác sinh hoạt tự phát, túi nilon, rác bao bì tồn đọng",
                default_severity="MEDIUM",
                sla_hours=48,
            )
            session.add(cat)
            await session.flush()

        # 4. Lấy các đơn vị hành chính (Quận 1, Bình Thạnh, Thủ Đức)
        dist_res = await session.execute(select(AdministrativeUnit))
        districts = {d.name: d for d in dist_res.scalars().all()}

        unit_q1 = districts.get("Quận 1")
        unit_bt = districts.get("Quận Bình Thạnh")
        unit_td = districts.get("Thành phố Thủ Đức") or districts.get("TP. Thủ Đức")

        # Xóa các cụm cũ để nạp mới chuẩn xác
        await session.execute(delete(IncidentDuplicateCluster))
        await session.flush()

        # =========================================================================
        # NHÓM 1: 3 báo cáo | giống 92% (Quận 1)
        # =========================================================================
        t1 = datetime(2026, 9, 15, 8, 15, 0, tzinfo=timezone.utc)
        t2 = datetime(2026, 9, 15, 9, 30, 0, tzinfo=timezone.utc)
        t3 = datetime(2026, 9, 15, 10, 0, 0, tzinfo=timezone.utc)

        inc_1a = Incident(
            incident_id=uuid.uuid4(),
            tracking_code=f"RPT-Q1-{uuid.uuid4().hex[:6].upper()}",
            reporter_id=user_a.user_id,
            category_id=cat.category_id,
            unit_id=unit_q1.unit_id if unit_q1 else None,
            title="Bãi rác tự phát bốc mùi trước hẻm 45 Nguyễn Huệ",
            description="Nhiều túi rác sinh hoạt và chai nhựa vứt bừa bãi góc đường Nguyễn Huệ, cản trở lối đi và bốc mùi hôi thối nồng nặc.",
            address_text="45 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM",
            location=from_shape(Point(106.703200, 10.774500), srid=4326),
            latitude=10.774500,
            longitude=106.703200,
            severity="HIGH",
            status="PENDING",
            created_at=t1,
            version=1,
        )
        session.add(inc_1a)
        await session.flush()

        media_1a = IncidentMedia(
            incident_id=inc_1a.incident_id,
            media_type="IMAGE",
            phase="BEFORE",
            file_url="https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80",
            created_at=t1,
        )
        session.add(media_1a)

        inc_1b = Incident(
            incident_id=uuid.uuid4(),
            tracking_code=f"RPT-Q1-{uuid.uuid4().hex[:6].upper()}",
            reporter_id=user_b.user_id,
            category_id=cat.category_id,
            unit_id=unit_q1.unit_id if unit_q1 else None,
            title="Đống rác ngổn ngang góc đường Nguyễn Huệ",
            description="Người dân vứt rác đè lên nhau từ tối qua, nhiều bao rác đen to góc vỉa hè chưa có đơn vị thu gom.",
            address_text="Góc Nguyễn Huệ - Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM",
            location=from_shape(Point(106.703320, 10.774620), srid=4326),
            latitude=10.774620,
            longitude=106.703320,
            severity="MEDIUM",
            status="PENDING",
            created_at=t2,
            version=1,
        )
        session.add(inc_1b)
        await session.flush()

        media_1b = IncidentMedia(
            incident_id=inc_1b.incident_id,
            media_type="IMAGE",
            phase="BEFORE",
            file_url="https://images.unsplash.com/photo-1605600659908-0ef719419d41?auto=format&fit=crop&w=800&q=80",
            created_at=t2,
        )
        session.add(media_1b)

        # Báo cáo 1c (báo cáo phụ thứ 3 trong nhóm 1)
        inc_1c = Incident(
            incident_id=uuid.uuid4(),
            tracking_code=f"RPT-Q1-{uuid.uuid4().hex[:6].upper()}",
            reporter_id=user_a.user_id,
            category_id=cat.category_id,
            unit_id=unit_q1.unit_id if unit_q1 else None,
            title="Túi rác đen dồn ứ trước số 47 Nguyễn Huệ",
            description="Túi rác tràn lan trên hè phố người đi bộ.",
            address_text="47 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM",
            location=from_shape(Point(106.703250, 10.774550), srid=4326),
            latitude=10.774550,
            longitude=106.703250,
            severity="MEDIUM",
            status="PENDING",
            created_at=t3,
            version=1,
        )
        session.add(inc_1c)
        await session.flush()

        cluster_1 = IncidentDuplicateCluster(
            cluster_id=uuid.uuid4(),
            cluster_code="CLUSTER-001",
            cluster_name="Nhóm 1",
            unit_id=unit_q1.unit_id if unit_q1 else None,
            district_name="Quận 1",
            incident_a_id=inc_1a.incident_id,
            incident_b_id=inc_1b.incident_id,
            report_count=3,
            similarity_rate=92.00,
            gps_distance_m=18.50,
            time_diff_hours=1.25,
            visual_similarity=94.00,
            ai_conclusion="Tọa độ lệch 18.5m (< 50m), thời gian chênh 1h15p (< 48h), độ tương đồng ảnh rác thải đạt 94%. Đề xuất gộp báo cáo B vào báo cáo A.",
            status="PENDING_REVIEW",
            version=1,
        )
        session.add(cluster_1)

        # =========================================================================
        # NHÓM 2: 2 báo cáo | giống 85% (Bình Thạnh)
        # =========================================================================
        t4 = datetime(2026, 9, 15, 14, 0, 0, tzinfo=timezone.utc)
        t5 = datetime(2026, 9, 15, 17, 30, 0, tzinfo=timezone.utc)

        inc_2a = Incident(
            incident_id=uuid.uuid4(),
            tracking_code=f"RPT-BT-{uuid.uuid4().hex[:6].upper()}",
            reporter_id=user_a.user_id,
            category_id=cat.category_id,
            unit_id=unit_bt.unit_id if unit_bt else None,
            title="Rác thải xây dựng và cành cây tràn vỉa hè Điện Biên Phủ",
            description="Xà bần gạch vụn và cành cây khô tập kết trái phép chiếm lối đi bộ của người dân.",
            address_text="120 Điện Biên Phủ, Phường 15, Quận Bình Thạnh, TP.HCM",
            location=from_shape(Point(106.701100, 10.796200), srid=4326),
            latitude=10.796200,
            longitude=106.701100,
            severity="HIGH",
            status="PENDING",
            created_at=t4,
            version=1,
        )
        session.add(inc_2a)
        await session.flush()

        media_2a = IncidentMedia(
            incident_id=inc_2a.incident_id,
            media_type="IMAGE",
            phase="BEFORE",
            file_url="https://images.unsplash.com/photo-1595278069441-2cf29f8005a4?auto=format&fit=crop&w=800&q=80",
            created_at=t4,
        )
        session.add(media_2a)

        inc_2b = Incident(
            incident_id=uuid.uuid4(),
            tracking_code=f"RPT-BT-{uuid.uuid4().hex[:6].upper()}",
            reporter_id=user_b.user_id,
            category_id=cat.category_id,
            unit_id=unit_bt.unit_id if unit_bt else None,
            title="Đống phế thải gạch đá và bao bì đổ trộm ven đường Điện Biên Phủ",
            description="Có xe chở phế thải đổ trộm đống xà bần to ven đường gây bụi bặm ô nhiễm.",
            address_text="128 Điện Biên Phủ, Phường 15, Quận Bình Thạnh, TP.HCM",
            location=from_shape(Point(106.701350, 10.796350), srid=4326),
            latitude=10.796350,
            longitude=106.701350,
            severity="MEDIUM",
            status="PENDING",
            created_at=t5,
            version=1,
        )
        session.add(inc_2b)
        await session.flush()

        media_2b = IncidentMedia(
            incident_id=inc_2b.incident_id,
            media_type="IMAGE",
            phase="BEFORE",
            file_url="https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=800&q=80",
            created_at=t5,
        )
        session.add(media_2b)

        cluster_2 = IncidentDuplicateCluster(
            cluster_id=uuid.uuid4(),
            cluster_code="CLUSTER-002",
            cluster_name="Nhóm 2",
            unit_id=unit_bt.unit_id if unit_bt else None,
            district_name="Quận Bình Thạnh",
            incident_a_id=inc_2a.incident_id,
            incident_b_id=inc_2b.incident_id,
            report_count=2,
            similarity_rate=85.00,
            gps_distance_m=29.00,
            time_diff_hours=3.50,
            visual_similarity=86.50,
            ai_conclusion="Tọa độ lệch 29m (< 50m), thời gian chênh 3.5 giờ (< 48h), độ tương đồng ảnh xà bần 86.5%. Đề xuất gộp báo cáo.",
            status="PENDING_REVIEW",
            version=1,
        )
        session.add(cluster_2)

        # =========================================================================
        # NHÓM 3: 2 báo cáo | giống 78% (TP. Thủ Đức)
        # =========================================================================
        t6 = datetime(2026, 9, 16, 7, 0, 0, tzinfo=timezone.utc)
        t7 = datetime(2026, 9, 16, 11, 20, 0, tzinfo=timezone.utc)

        inc_3a = Incident(
            incident_id=uuid.uuid4(),
            tracking_code=f"RPT-TD-{uuid.uuid4().hex[:6].upper()}",
            reporter_id=user_a.user_id,
            category_id=cat.category_id,
            unit_id=unit_td.unit_id if unit_td else None,
            title="Bọc rác đen và vỏ hộp xốp ùn ứ chân cầu Sài Gòn",
            description="Nhiều bọc rác và hộp cơm xốp tập kết ven chân cầu Sài Gòn hướng về Thảo Điền.",
            address_text="Chân cầu Sài Gòn, Phường Thảo Điền, TP. Thủ Đức, TP.HCM",
            location=from_shape(Point(106.728000, 10.799500), srid=4326),
            latitude=10.799500,
            longitude=106.728000,
            severity="MEDIUM",
            status="PENDING",
            created_at=t6,
            version=1,
        )
        session.add(inc_3a)
        await session.flush()

        media_3a = IncidentMedia(
            incident_id=inc_3a.incident_id,
            media_type="IMAGE",
            phase="BEFORE",
            file_url="https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=800&q=80",
            created_at=t6,
        )
        session.add(media_3a)

        inc_3b = Incident(
            incident_id=uuid.uuid4(),
            tracking_code=f"RPT-TD-{uuid.uuid4().hex[:6].upper()}",
            reporter_id=user_b.user_id,
            category_id=cat.category_id,
            unit_id=unit_td.unit_id if unit_td else None,
            title="Rác nhựa phát tán mép bờ sông gần chân cầu Sài Gòn",
            description="Túi bóng và vỏ chai nhựa nổi bập bềnh gần mép nước chân cầu.",
            address_text="Bờ sông chân cầu Sài Gòn, Phường Thảo Điền, TP. Thủ Đức, TP.HCM",
            location=from_shape(Point(106.728350, 10.799750), srid=4326),
            latitude=10.799750,
            longitude=106.728350,
            severity="LOW",
            status="PENDING",
            created_at=t7,
            version=1,
        )
        session.add(inc_3b)
        await session.flush()

        media_3b = IncidentMedia(
            incident_id=inc_3b.incident_id,
            media_type="IMAGE",
            phase="BEFORE",
            file_url="https://images.unsplash.com/photo-1621451537084-482c73073a0f?auto=format&fit=crop&w=800&q=80",
            created_at=t7,
        )
        session.add(media_3b)

        cluster_3 = IncidentDuplicateCluster(
            cluster_id=uuid.uuid4(),
            cluster_code="CLUSTER-003",
            cluster_name="Nhóm 3",
            unit_id=unit_td.unit_id if unit_td else None,
            district_name="TP. Thủ Đức",
            incident_a_id=inc_3a.incident_id,
            incident_b_id=inc_3b.incident_id,
            report_count=2,
            similarity_rate=78.00,
            gps_distance_m=42.00,
            time_diff_hours=4.33,
            visual_similarity=81.00,
            ai_conclusion="Tọa độ lệch 42m (< 50m), thời gian chênh 4.3 giờ (< 48h), độ tương đồng ảnh 81%.",
            status="PENDING_REVIEW",
            version=1,
        )
        session.add(cluster_3)

        await session.commit()
        print("✅ Đã nạp thành công 3 cụm báo cáo trùng lặp AI mẫu!")
        print("   - Nhóm 1: 3 báo cáo | giống 92% (Quận 1)")
        print("   - Nhóm 2: 2 báo cáo | giống 85% (Bình Thạnh)")
        print("   - Nhóm 3: 2 báo cáo | giống 78% (TP. Thủ Đức)")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(seed_deduplication())
