"""
Seeder dữ liệu mẫu cho STT 39 (AI Triage & Priority Scoring) và STT 40 (Phân tích không gian cơ sở thiết yếu).
Nạp danh mục chất thải, các sự cố môi trường và các trường học, bệnh viện, trạm y tế mẫu tại TP.HCM.
"""

import asyncio
import sys
import uuid
from datetime import datetime, timedelta

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")
from geoalchemy2.elements import WKTElement
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.incident import WasteCategory, Incident, IncidentMedia
from app.models.spatial import AdministrativeUnit, EssentialFacility
from app.models.rbac import User, Role


async def seed_triage_and_spatial_data():
    async with AsyncSessionLocal() as db:
        print("🌱 [Seeder] Đang kiểm tra và nạp dữ liệu mẫu STT 39 & 40...")

        # 1. Lấy hoặc tạo Admin user & Administrative unit
        user_res = await db.execute(select(User).limit(1))
        admin_user = user_res.scalars().first()

        unit_res = await db.execute(select(AdministrativeUnit).limit(1))
        admin_unit = unit_res.scalars().first()
        if not admin_unit:
            admin_unit = AdministrativeUnit(
                unit_code="79_01",
                name="Quận 1, TP. Hồ Chí Minh",
                level="DISTRICT",
                area_km2=7.72,
                population=142000,
            )
            db.add(admin_unit)
            await db.flush()

        from sqlalchemy import text
        await db.execute(text("SELECT setval('waste_categories_category_id_seq', COALESCE((SELECT MAX(category_id) FROM waste_categories), 1));"))
        await db.commit()

        # 2. Tạo danh mục chất thải tương ứng trọng số BaseSeverity
        categories_data = [
            {
                "code": "HAZARDOUS",
                "name": "Chất thải nguy hại / Hóa chất độc hại",
                "desc": "Chất thải y tế, dung môi, hóa chất công nghiệp, pin ắc quy",
                "default_severity": "CRITICAL",
                "sla_hours": 4,
                "color_hex": "#EF4444",
                "icon_name": "biohazard",
            },
            {
                "code": "DRAIN_BLOCKAGE",
                "name": "Rác thải ứ đọng cản trở cống thoát nước",
                "desc": "Rác chắn cửa miệng hố ga, cống thoát nước mùa mưa lũ",
                "default_severity": "HIGH",
                "sla_hours": 12,
                "color_hex": "#F97316",
                "icon_name": "waves",
            },
            {
                "code": "DOMESTIC_OVERFLOW",
                "name": "Rác thải sinh hoạt tồn đọng lâu ngày",
                "desc": "Túi rác sinh hoạt, phế thải hữu cơ ùn ứ quá 48h",
                "default_severity": "MEDIUM",
                "sla_hours": 24,
                "color_hex": "#EAB308",
                "icon_name": "trash-2",
            },
            {
                "code": "ORGANIC_DRY",
                "name": "Tờ rơi quảng cáo / Cành cây khô",
                "desc": "Cành cây sau tỉa, rác cỏ khô, quảng cáo rao vặt",
                "default_severity": "LOW",
                "sla_hours": 48,
                "color_hex": "#22C55E",
                "icon_name": "leaf",
            },
        ]

        cat_map = {}
        for c in categories_data:
            stmt = select(WasteCategory).where(WasteCategory.category_code == c["code"])
            res = await db.execute(stmt)
            cat = res.scalars().first()
            if not cat:
                cat = WasteCategory(
                    category_code=c["code"],
                    name=c["name"],
                    description=c["desc"],
                    default_severity=c["default_severity"],
                    sla_hours=c["sla_hours"],
                    color_hex=c["color_hex"],
                    icon_name=c["icon_name"],
                    is_active=True,
                )
                db.add(cat)
                await db.flush()
            cat_map[c["code"]] = cat

        # 3. Tạo các cơ sở thiết yếu (Essential Facilities) quanh tọa độ ngõ 128 Lê Lợi (10.7725, 106.6980)
        # Cự ly tính toán từ tâm sự cố:
        # - Trường Lê Lợi: ~45m (<= 50m: Rủi ro 100 điểm, cảnh báo nguy hiểm < 100m)
        # - BV Quận 1: ~140m (50-150m: 75 điểm, cảnh báo < 200m)
        # - Trường THCS Chu Văn An: ~180m (150-300m: 50 điểm, cảnh báo < 200m)
        # - Trạm Y tế Cầu Kho: ~650m (> 300m: 0 điểm)
        facilities_data = [
            {
                "name": "Trường Tiểu học Lê Lợi",
                "type": "Trường học",
                "address": "120 Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM",
                "lat": 10.77265,
                "lng": 106.69835,  # ~45m
                "contact_phone": "028 3822 5412",
                "contact_person": "Cô Nguyễn Thị Mai (Hiệu trưởng)",
                "contact_email": "th.leloi@tphcm.edu.vn",
                "capacity": 1250,
                "vulnerability": "Mức dễ tổn thương: Rất cao - Trường tiểu học có hơn 1.200 học sinh",
            },
            {
                "name": "Bệnh viện Đa khoa Quận 1",
                "type": "Bệnh viện",
                "address": "338 Hai Bà Trưng, Phường Tân Định, Quận 1, TP.HCM",
                "lat": 10.77340,
                "lng": 106.69720,  # ~140m
                "contact_phone": "028 3820 0451",
                "contact_person": "Bác sĩ CKII Trần Văn Nam (Trực cấp cứu)",
                "contact_email": "capcuu.bvq1@tphcm.gov.vn",
                "capacity": 450,
                "vulnerability": "Mức dễ tổn thương: Rất cao - Bệnh nhân nội trú và khu cấp cứu",
            },
            {
                "name": "Trường THCS Chu Văn An",
                "type": "Trường học",
                "address": "115 Cống Quỳnh, Phường Nguyễn Cư Trinh, Quận 1, TP.HCM",
                "lat": 10.77110,
                "lng": 106.69880,  # ~180m
                "contact_phone": "028 3839 2174",
                "contact_person": "Thầy Lê Hoàng Long (Phó Hiệu trưởng)",
                "contact_email": "thcs.chuvanan@tphcm.edu.vn",
                "capacity": 980,
                "vulnerability": "Mức dễ tổn thương: Cao - Trường học đông học sinh cấp 2",
            },
            {
                "name": "Trạm Y tế Phường Bến Nghé",
                "type": "Trạm y tế",
                "address": "45 Pasteur, Phường Bến Nghé, Quận 1, TP.HCM",
                "lat": 10.77450,
                "lng": 106.69950,  # ~270m
                "contact_phone": "028 3829 7654",
                "contact_person": "Y sĩ Phạm Thu Hằng (Trạm trưởng)",
                "contact_email": "tyt.bennghe@tphcm.gov.vn",
                "capacity": 80,
                "vulnerability": "Mức dễ tổn thương: Trung bình - Trạm y tế cơ sở",
            },
            {
                "name": "Trạm Y tế Cầu Kho",
                "type": "Trạm y tế",
                "address": "52 Cầu Kho, Quận 1, TP.HCM",
                "lat": 10.76750,
                "lng": 106.69450,  # ~650m
                "contact_phone": "028 3836 1234",
                "contact_person": "Bác sĩ Vũ Mạnh Dũng",
                "contact_email": "tyt.caukho@tphcm.gov.vn",
                "capacity": 60,
                "vulnerability": "Mức dễ tổn thương: Trung bình",
            },
        ]

        for f in facilities_data:
            stmt = select(EssentialFacility).where(EssentialFacility.facility_name == f["name"])
            res = await db.execute(stmt)
            facility = res.scalars().first()
            wkt = f"POINT({f['lng']} {f['lat']})"
            if not facility:
                facility = EssentialFacility(
                    facility_name=f["name"],
                    facility_type=f["type"],
                    address=f["address"],
                    unit_id=admin_unit.unit_id if admin_unit else None,
                    location=WKTElement(wkt, srid=4326),
                    contact_phone=f["contact_phone"],
                    contact_person=f["contact_person"],
                    contact_email=f["contact_email"],
                    capacity_people=f["capacity"],
                    vulnerability_level=f["vulnerability"],
                )
                db.add(facility)
            else:
                facility.contact_phone = f["contact_phone"]
                facility.contact_person = f["contact_person"]
                facility.contact_email = f["contact_email"]
                facility.capacity_people = f["capacity"]
                facility.vulnerability_level = f["vulnerability"]
                facility.location = WKTElement(wkt, srid=4326)

        # 4. Tạo các sự cố mẫu phục vụ STT 39 và STT 40
        incidents_data = [
            {
                "code": "INC-2026-3901",
                "title": "Bãi rác thải sinh hoạt ùn ứ chắn lối đi ngõ 128 Lê Lợi",
                "description": "Bãi rác thải sinh hoạt ùn ứ dài khoảng 15m chắn lối đi ngõ 128 Lê Lợi, bốc mùi hôi thối nồng nặc và có nguy cơ tràn xuống cống thoát nước mưa gây ngập sâu khi trời mưa lớn. Rác lưu cữu 3 ngày nay ruồi nhặng bùng phát dịch bệnh gần trường tiểu học Lê Lợi.",
                "address": "Ngõ 128 Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM",
                "lat": 10.7725,
                "lng": 106.6980,
                "cat_code": "DOMESTIC_OVERFLOW",
                "severity": "HIGH",
                "area_m2": 25.0,
                "ai_summary": "Bãi rác thải sinh hoạt ùn ứ dài khoảng 15m chắn lối đi ngõ 128 Lê Lợi, bốc mùi hôi thối nồng nặc và có nguy cơ tràn xuống cống thoát nước mưa. Cần điều động xe ép rác 5 tấn thu gom khẩn trước giờ tan học.",
                "ai_triage_score": 82.0,
                "ai_suggested_priority": "Cao",
                "ai_factors": {
                    "base_severity": 60,
                    "proximity_risk": 100,
                    "proximity_facility": "Trường Tiểu học Lê Lợi (cách 45m)",
                    "scale_factor": 100,
                    "area_m2": 25.0,
                    "urgency_nlp": 80,
                    "keywords": ["ngập sâu", "bốc mùi nồng nặc", "ruồi nhặng bùng phát dịch bệnh"],
                    "risk_factors": [
                        "Ngập úng sâu khi trời mưa",
                        "Gần trường tiểu học < 50m",
                        "Chắn lối đi ngõ hẻm",
                        "Nguy cơ phát tán dịch bệnh ruồi nhặng"
                    ]
                },
                "media_url": "https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=800",
            },
            {
                "code": "INC-2026-3902",
                "title": "Đổ trộm thùng hóa chất dung môi nguy hại ven kênh",
                "description": "Phát hiện 3 thùng phi rò rỉ dung môi công nghiệp và hóa chất độc hại bốc khói khét lẹt, nguy cơ cháy nổ cực cao và ô nhiễm trực tiếp nguồn nước sinh hoạt.",
                "address": "Kênh Tàu Hủ, Phường Cầu Kho, Quận 1, TP.HCM",
                "lat": 10.7680,
                "lng": 106.6950,
                "cat_code": "HAZARDOUS",
                "severity": "CRITICAL",
                "area_m2": 15.0,
                "ai_summary": "3 thùng phi rò rỉ dung môi hóa chất độc hại bốc khói khét lẹt gần nguồn nước kênh Tàu Hủ. Nguy cơ cháy nổ cao, cần cô lập hiện trường ngay lập tức.",
                "ai_triage_score": 92.0,
                "ai_suggested_priority": "Khẩn cấp",
                "ai_factors": {
                    "base_severity": 100,
                    "proximity_risk": 75,
                    "scale_factor": 70,
                    "urgency_nlp": 100,
                    "keywords": ["hóa chất độc hại", "cháy nổ", "rò rỉ"],
                    "risk_factors": [
                        "Chứa chất thải nguy hại / hóa chất độc hại",
                        "Nguy cơ cháy nổ cao",
                        "Rò rỉ trực tiếp nguồn nước mặt"
                    ]
                },
                "media_url": "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=800",
            },
            {
                "code": "INC-2026-3903",
                "title": "Cành cây khô sau tỉa chưa dọn tại lề đường",
                "description": "Một vài nhánh cây khô nhỏ sau khi tỉa cây để ở lề đường, diện tích khoảng 2m2, không cản trở giao thông hay lối thoát nước.",
                "address": "15 Nguyễn Du, Quận 1, TP.HCM",
                "lat": 10.7780,
                "lng": 106.6990,
                "cat_code": "ORGANIC_DRY",
                "severity": "LOW",
                "area_m2": 2.0,
                "ai_summary": "Nhánh cây khô sau tỉa nằm trên lề đường diện tích ~2m2, không gây cản trở thoát nước. Phân công đội vệ sinh thu dọn trong ca trực ngày.",
                "ai_triage_score": 32.0,
                "ai_suggested_priority": "Thấp",
                "ai_factors": {
                    "base_severity": 25,
                    "proximity_risk": 20,
                    "scale_factor": 35,
                    "urgency_nlp": 10,
                    "keywords": [],
                    "risk_factors": ["Cành cây khô lề đường diện tích nhỏ"]
                },
                "media_url": "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800",
            },
            {
                "code": "INC-2026-3904",
                "title": "Rác thải sinh hoạt lặt vặt",
                "description": "Rác bẩn",  # Mô tả siêu ngắn < 10 ký tự để test tính năng edge case
                "address": "22 Pasteur, Quận 1, TP.HCM",
                "lat": 10.7730,
                "lng": 106.6990,
                "cat_code": "DOMESTIC_OVERFLOW",
                "severity": "LOW",
                "area_m2": 1.0,
                "ai_summary": None,  # Chưa có tóm tắt vì mô tả quá ngắn
                "ai_triage_score": 25.0,
                "ai_suggested_priority": "Thấp",
                "ai_factors": {
                    "base_severity": 25,
                    "proximity_risk": 0,
                    "scale_factor": 35,
                    "urgency_nlp": 0,
                    "keywords": [],
                    "risk_factors": []
                },
                "media_url": None,
            },
        ]

        now = datetime.utcnow()
        for inc_item in incidents_data:
            stmt = select(Incident).where(Incident.tracking_code == inc_item["code"])
            res = await db.execute(stmt)
            inc = res.scalars().first()
            wkt = f"POINT({inc_item['lng']} {inc_item['lat']})"
            cat = cat_map.get(inc_item["cat_code"])

            if not inc:
                inc = Incident(
                    tracking_code=inc_item["code"],
                    title=inc_item["title"],
                    description=inc_item["description"],
                    address_text=inc_item["address"],
                    location=WKTElement(wkt, srid=4326),
                    latitude=inc_item["lat"],
                    longitude=inc_item["lng"],
                    category_id=cat.category_id if cat else 1,
                    unit_id=admin_unit.unit_id if admin_unit else None,
                    reporter_id=admin_user.user_id if admin_user else None,
                    severity=inc_item["severity"],
                    status="PENDING",
                    risk_score=inc_item["ai_triage_score"],
                    ai_summary=inc_item["ai_summary"],
                    ai_triage_score=inc_item["ai_triage_score"],
                    ai_suggested_priority=inc_item["ai_suggested_priority"],
                    ai_factors=inc_item["ai_factors"],
                    ai_generated_at=now,
                    sla_response_deadline=now + timedelta(hours=2),
                    sla_deadline=now + timedelta(hours=12),
                    version=1,
                )
                db.add(inc)
                await db.flush()

                if inc_item["media_url"]:
                    media = IncidentMedia(
                        incident_id=inc.incident_id,
                        media_type="IMAGE",
                        phase="BEFORE",
                        file_url=inc_item["media_url"],
                        mime_type="image/jpeg",
                    )
                    db.add(media)
            else:
                inc.description = inc_item["description"]
                inc.address_text = inc_item["address"]
                inc.latitude = inc_item["lat"]
                inc.longitude = inc_item["lng"]
                inc.location = WKTElement(wkt, srid=4326)
                inc.ai_summary = inc_item["ai_summary"]
                inc.ai_triage_score = inc_item["ai_triage_score"]
                inc.ai_suggested_priority = inc_item["ai_suggested_priority"]
                inc.ai_factors = inc_item["ai_factors"]
                inc.risk_score = inc_item["ai_triage_score"]

        await db.commit()
        print("✅ [Seeder] Hoàn thành nạp dữ liệu mẫu STT 39 & STT 40 thành công!")


if __name__ == "__main__":
    asyncio.run(seed_triage_and_spatial_data())
