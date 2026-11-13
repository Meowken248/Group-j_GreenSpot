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
from sqlalchemy import select, text
from app.database import AsyncSessionLocal
from app.models.incident import WasteCategory, Incident, IncidentMedia
from app.models.spatial import AdministrativeUnit, EssentialFacility
from app.models.rbac import User, Role


async def seed_triage_and_spatial_data():
    async with AsyncSessionLocal() as db:
        print("🌱 [Seeder] Đang kiểm tra và nạp dữ liệu mẫu STT 39 & 40...")

        # 1. Lấy hoặc tạo Admin user & Administrative units
        user_res = await db.execute(select(User).limit(1))
        admin_user = user_res.scalars().first()

        unit_res = await db.execute(select(AdministrativeUnit))
        units_list = unit_res.scalars().all()
        unit_map = {u.unit_code: u.unit_id for u in units_list}
        admin_unit = units_list[0] if units_list else None

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
            unit_map["79_01"] = admin_unit.unit_id

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
                "sla_warning_hours": 1,
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
            {
                "code": "DOMESTIC_WASTE",
                "name": "Rác thải sinh hoạt ứ đọng",
                "desc": "Bãi rác tự phát, túi ni lông bốc mùi",
                "default_severity": "MEDIUM",
                "sla_hours": 24,
                "color_hex": "#EAB308",
                "icon_name": "trash-2",
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
                    sla_warning_hours=c.get("sla_warning_hours", 4),
                    color_hex=c["color_hex"],
                    icon_name=c["icon_name"],
                    is_active=True,
                )
                db.add(cat)
                await db.flush()
            cat_map[c["code"]] = cat

        # 3. Tạo các cơ sở thiết yếu (Essential Facilities) phục vụ tra cứu phân tích vùng đệm GIS (STT 40)
        # Bao gồm:
        # - TP. Thủ Đức (quanh Võ Văn Ngân, ECO-HCM-002: 10.8512, 106.7625)
        # - Quận 1 (quanh Lê Lợi INC-2026-3901: 10.7725, 106.6980 và Bến Bạch Đằng ECO-HCM-001)
        # - Quận 7 (quanh Nguyễn Thị Thập ECO-HCM-003: 10.7380, 106.7215)
        # - Quận Bình Thạnh (quanh Cầu Điện Biên Phủ ECO-HCM-004: 10.7930, 106.6995)
        facilities_data = [
            # === KHU VỰC TP. THỦ ĐỨC (Quanh sự cố ECO-HCM-002: 245 Võ Văn Ngân) ===
            {
                "name": "Trường THCS Lê Quý Đôn (TP. Thủ Đức)",
                "type": "Trường học",
                "address": "234 Võ Văn Ngân, Phường Linh Chiểu, TP. Thủ Đức, TP.HCM",
                "lat": 10.8518,
                "lng": 106.7635,  # ~130m
                "unit_code": "769",
                "contact_phone": "028 3896 6843",
                "contact_person": "Cô Phạm Thị Thanh Vân (Hiệu trưởng)",
                "contact_email": "thcs.lequydon.thuduc@tphcm.edu.vn",
                "capacity": 1550,
                "vulnerability": "Mức dễ tổn thương: Cao - Trường trung học cơ sở hơn 1.500 học sinh",
            },
            {
                "name": "Trường Tiểu học Lương Thế Vinh",
                "type": "Trường học",
                "address": "18 Dân Chủ, Phường Bình Thọ, TP. Thủ Đức, TP.HCM",
                "lat": 10.8498,
                "lng": 106.7642,  # ~240m
                "unit_code": "769",
                "contact_phone": "028 3896 0345",
                "contact_person": "Thầy Đỗ Minh Hoàng (Hiệu trưởng)",
                "contact_email": "th.luongthevinh@tphcm.edu.vn",
                "capacity": 1120,
                "vulnerability": "Mức dễ tổn thương: Rất cao - Trường tiểu học có hơn 1.100 học sinh",
            },
            {
                "name": "Trường THPT Nguyễn Hữu Huân",
                "type": "Trường học",
                "address": "11 Đoàn Kết, Phường Bình Thọ, TP. Thủ Đức, TP.HCM",
                "lat": 10.8528,
                "lng": 106.7602,  # ~310m
                "unit_code": "769",
                "contact_phone": "028 3896 6855",
                "contact_person": "Thầy Nguyễn Hữu Hùng (Hiệu trưởng)",
                "contact_email": "thpt.nguyenhuuhuan@tphcm.edu.vn",
                "capacity": 1800,
                "vulnerability": "Mức dễ tổn thương: Cao - Trường THPT trọng điểm TP. Thủ Đức",
            },
            {
                "name": "Trường Đại học Sư phạm Kỹ thuật TP.HCM (HCMUTE)",
                "type": "Trường học",
                "address": "01 Võ Văn Ngân, Phường Linh Chiểu, TP. Thủ Đức, TP.HCM",
                "lat": 10.8507,
                "lng": 106.7719,  # ~1.0 km
                "unit_code": "769",
                "contact_phone": "028 3896 8641",
                "contact_person": "Phòng Hành chính - Quản trị",
                "contact_email": "vanphong@hcmute.edu.vn",
                "capacity": 25000,
                "vulnerability": "Mức dễ tổn thương: Trung bình - Trường Đại học quy mô lớn",
            },
            {
                "name": "Phòng khám Đa khoa Linh Chiểu (TTYT TP. Thủ Đức)",
                "type": "Bệnh viện",
                "address": "118 Võ Văn Ngân, Phường Bình Thọ, TP. Thủ Đức, TP.HCM",
                "lat": 10.8505,
                "lng": 106.7610,  # ~180m
                "unit_code": "769",
                "contact_phone": "028 3722 0054",
                "contact_person": "Bác sĩ CKI Hoàng Minh Tuấn (Phụ trách cơ sở)",
                "contact_email": "pkdk.linhchieu@tphcm.gov.vn",
                "capacity": 250,
                "vulnerability": "Mức dễ tổn thương: Rất cao - Cơ sở khám chữa bệnh đa khoa và sơ cấp cứu",
            },
            {
                "name": "Bệnh viện Thành phố Thủ Đức (Cơ sở 2)",
                "type": "Bệnh viện",
                "address": "64 Lê Văn Chí, Phường Linh Trung, TP. Thủ Đức, TP.HCM",
                "lat": 10.8555,
                "lng": 106.7680,  # ~820m
                "unit_code": "769",
                "contact_phone": "028 3896 6598",
                "contact_person": "Khoa Cấp cứu 115 Bệnh viện TP. Thủ Đức",
                "contact_email": "capcuu.bvtd@tphcm.gov.vn",
                "capacity": 650,
                "vulnerability": "Mức dễ tổn thương: Rất cao - Bệnh viện hạng I tiếp nhận cấp cứu 24/7",
            },
            {
                "name": "Trạm Y tế Phường Linh Chiểu",
                "type": "Trạm y tế",
                "address": "14 Tô Vĩnh Diện, Phường Linh Chiểu, TP. Thủ Đức, TP.HCM",
                "lat": 10.8525,
                "lng": 106.7615,  # ~170m
                "unit_code": "769",
                "contact_phone": "028 3896 0346",
                "contact_person": "Bác sĩ Trần Thị Bích (Trạm trưởng)",
                "contact_email": "tyt.linhchieu@tphcm.gov.vn",
                "capacity": 50,
                "vulnerability": "Mức dễ tổn thương: Trung bình - Điểm tiêm chủng và sơ cấp cứu ban đầu",
            },
            {
                "name": "Trạm Y tế Phường Bình Thọ",
                "type": "Trạm y tế",
                "address": "49 Thống Nhất, Phường Bình Thọ, TP. Thủ Đức, TP.HCM",
                "lat": 10.8480,
                "lng": 106.7650,  # ~470m
                "unit_code": "769",
                "contact_phone": "028 3896 4512",
                "contact_person": "Y sĩ Lê Văn Hùng",
                "contact_email": "tyt.binhtho@tphcm.gov.vn",
                "capacity": 40,
                "vulnerability": "Mức dễ tổn thương: Trung bình - Trạm y tế cơ sở phường Bình Thọ",
            },

            # === KHU VỰC QUẬN 1 (Quanh Lê Lợi INC-2026-3901 & Bến Bạch Đằng ECO-HCM-001) ===
            {
                "name": "Trường Tiểu học Lê Lợi",
                "type": "Trường học",
                "address": "120 Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM",
                "lat": 10.77265,
                "lng": 106.69835,  # ~45m
                "unit_code": "760",
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
                "unit_code": "760",
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
                "unit_code": "760",
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
                "unit_code": "760",
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
                "unit_code": "760",
                "contact_phone": "028 3836 1234",
                "contact_person": "Bác sĩ Vũ Mạnh Dũng",
                "contact_email": "tyt.caukho@tphcm.gov.vn",
                "capacity": 60,
                "vulnerability": "Mức dễ tổn thương: Trung bình",
            },
            {
                "name": "Bệnh viện Nhi Đồng 2",
                "type": "Bệnh viện",
                "address": "14 Lý Tự Trọng, Phường Bến Nghé, Quận 1, TP.HCM",
                "lat": 10.7800,
                "lng": 106.7020,  # ~800m
                "unit_code": "760",
                "contact_phone": "028 3829 5723",
                "contact_person": "Khoa Cấp cứu Nhi Đồng 2",
                "contact_email": "benhviennhidong2@tphcm.gov.vn",
                "capacity": 1400,
                "vulnerability": "Mức dễ tổn thương: Rất cao - Bệnh viện chuyên khoa Nhi lớn",
            },
            {
                "name": "Trường Tiểu học Hòa Bình",
                "type": "Trường học",
                "address": "1 Công xã Paris, Phường Bến Nghé, Quận 1, TP.HCM",
                "lat": 10.7795,
                "lng": 106.6990,  # ~900m
                "unit_code": "760",
                "contact_phone": "028 3822 5163",
                "contact_person": "Cô Trương Thị Kim Nga",
                "contact_email": "th.hoabinh@tphcm.edu.vn",
                "capacity": 1100,
                "vulnerability": "Mức dễ tổn thương: Rất cao",
            },

            # === KHU VỰC QUẬN 7 (Quanh Nguyễn Thị Thập ECO-HCM-003: 10.7380, 106.7215) ===
            {
                "name": "Bệnh viện FV (Pháp Việt)",
                "type": "Bệnh viện",
                "address": "6 Nguyễn Lương Bằng, Phường Tân Phú, Quận 7, TP.HCM",
                "lat": 10.7320,
                "lng": 106.7225,  # ~680m
                "unit_code": "778",
                "contact_phone": "028 5411 3333",
                "contact_person": "Khoa Cấp cứu FV",
                "contact_email": "emergency@fvhospital.com",
                "capacity": 220,
                "vulnerability": "Mức dễ tổn thương: Rất cao - Bệnh viện quốc tế",
            },
            {
                "name": "Trường THCS Huỳnh Tấn Phát",
                "type": "Trường học",
                "address": "488 Huỳnh Tấn Phát, Phường Bình Thuận, Quận 7, TP.HCM",
                "lat": 10.7410,
                "lng": 106.7250,  # ~500m
                "unit_code": "778",
                "contact_phone": "028 3873 0123",
                "contact_person": "Thầy Hoàng Văn Hải",
                "contact_email": "thcs.htpat@tphcm.edu.vn",
                "capacity": 1300,
                "vulnerability": "Mức dễ tổn thương: Cao",
            },
            {
                "name": "Trạm Y tế Phường Tân Phú (Quận 7)",
                "type": "Trạm y tế",
                "address": "24 Nguyễn Thị Thập, Phường Tân Phú, Quận 7, TP.HCM",
                "lat": 10.7370,
                "lng": 106.7230,  # ~200m
                "unit_code": "778",
                "contact_phone": "028 3771 0456",
                "contact_person": "Bác sĩ Lê Thị Mai",
                "contact_email": "tyt.tanphuq7@tphcm.gov.vn",
                "capacity": 45,
                "vulnerability": "Mức dễ tổn thương: Trung bình",
            },

            # === KHU VỰC QUẬN BÌNH THẠNH (Quanh Cầu Điện Biên Phủ ECO-HCM-004: 10.7930, 106.6995) ===
            {
                "name": "Trường THCS Điện Biên",
                "type": "Trường học",
                "address": "127 Đinh Tiên Hoàng, Phường 3, Quận Bình Thạnh, TP.HCM",
                "lat": 10.7960,
                "lng": 106.6980,  # ~370m
                "unit_code": "765",
                "contact_phone": "028 3841 2345",
                "contact_person": "Cô Vũ Thị Lan",
                "contact_email": "thcs.dienbien@tphcm.edu.vn",
                "capacity": 1200,
                "vulnerability": "Mức dễ tổn thương: Cao",
            },
            {
                "name": "Bệnh viện Quận Bình Thạnh",
                "type": "Bệnh viện",
                "address": "112 Đinh Tiên Hoàng, Phường 1, Quận Bình Thạnh, TP.HCM",
                "lat": 10.7980,
                "lng": 106.6970,  # ~600m
                "unit_code": "765",
                "contact_phone": "028 3841 7493",
                "contact_person": "Bác sĩ Trực Cấp cứu BV Bình Thạnh",
                "contact_email": "capcuu.bvbt@tphcm.gov.vn",
                "capacity": 550,
                "vulnerability": "Mức dễ tổn thương: Rất cao",
            },
            {
                "name": "Trạm Y tế Phường 15 (Bình Thạnh)",
                "type": "Trạm y tế",
                "address": "15 Điện Biên Phủ, Phường 15, Quận Bình Thạnh, TP.HCM",
                "lat": 10.7925,
                "lng": 106.7010,  # ~180m
                "unit_code": "765",
                "contact_phone": "028 3840 5678",
                "contact_person": "Y sĩ Nguyễn Văn Tâm",
                "contact_email": "tyt.p15bt@tphcm.gov.vn",
                "capacity": 50,
                "vulnerability": "Mức dễ tổn thương: Trung bình",
            },
        ]

        for f in facilities_data:
            stmt = select(EssentialFacility).where(EssentialFacility.facility_name == f["name"])
            res = await db.execute(stmt)
            facility = res.scalars().first()
            wkt = f"POINT({f['lng']} {f['lat']})"
            uid = unit_map.get(f.get("unit_code")) or (admin_unit.unit_id if admin_unit else None)
            if not facility:
                facility = EssentialFacility(
                    facility_name=f["name"],
                    facility_type=f["type"],
                    address=f["address"],
                    unit_id=uid,
                    location=WKTElement(wkt, srid=4326),
                    contact_phone=f["contact_phone"],
                    contact_person=f["contact_person"],
                    contact_email=f["contact_email"],
                    capacity_people=f["capacity"],
                    vulnerability_level=f["vulnerability"],
                )
                db.add(facility)
            else:
                facility.facility_type = f["type"]
                facility.address = f["address"]
                facility.contact_phone = f["contact_phone"]
                facility.contact_person = f["contact_person"]
                facility.contact_email = f["contact_email"]
                facility.capacity_people = f["capacity"]
                facility.vulnerability_level = f["vulnerability"]
                facility.location = WKTElement(wkt, srid=4326)
                if uid:
                    facility.unit_id = uid

        # 4. Tạo và cập nhật các sự cố mẫu phục vụ STT 39 và STT 40
        incidents_data = [
            # === SỰ CỐ ECO-HCM-002 TẠI THỦ ĐỨC (Màn hình thẩm định mặc định) ===
            {
                "code": "ECO-HCM-002",
                "title": "Bãi rác tự phát lấn chiếm vỉa hè đường Võ Văn Ngân",
                "description": "Túi rác sinh hoạt chất đống gần ngã 5 Chợ Thủ Đức, nước rỉ rác bốc mùi nồng nặc và cản trở người đi bộ, có nguy cơ phát tán dịch bệnh gần khu dân cư và các trường học lân cận.",
                "address": "Số 245 Võ Văn Ngân, Phường Linh Chiểu, TP. Thủ Đức",
                "lat": 10.8512,
                "lng": 106.7625,
                "cat_code": "DOMESTIC_OVERFLOW",
                "severity": "CRITICAL",
                "area_m2": 35.0,
                "ai_summary": "Bãi rác tự phát nghiêm trọng lấn chiếm vỉa hè đường Võ Văn Ngân gần ngã 5 Chợ Thủ Đức, cự ly gần Trường THCS Lê Quý Đôn (~130m) và Trạm Y tế Linh Chiểu (~170m). Cần ưu tiên cử xe ép rác 5 tấn thu dọn và phun khử trùng khẩn cấp.",
                "ai_triage_score": 91.5,
                "ai_suggested_priority": "Khẩn cấp",
                "ai_factors": {
                    "base_severity": 100,
                    "proximity_risk": 90,
                    "proximity_facility": "Trường THCS Lê Quý Đôn (cách ~130m), Trạm Y tế Linh Chiểu (cách ~170m)",
                    "scale_factor": 85,
                    "area_m2": 35.0,
                    "urgency_nlp": 90,
                    "keywords": ["chất đống", "bốc mùi nồng nặc", "lấn chiếm vỉa hè", "gần trường học"],
                    "risk_factors": [
                        "Mức độ nghiêm trọng: Rất khẩn cấp (CRITICAL)",
                        "Gần trường học và trạm y tế dưới 200m",
                        "Nước rỉ rác bốc mùi hôi thối nồng nặc",
                        "Cản trở giao thông và người đi bộ khu vực chợ"
                    ]
                },
                "media_url": "https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=800",
            },
            # === SỰ CỐ INC-2026-3901 (LÊ LỢI, QUẬN 1) ===
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
            # === SỰ CỐ INC-2026-3902 (HÓA CHẤT KÊNH TÀU HỦ) ===
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
            # === SỰ CỐ INC-2026-3903 (CÀNH CÂY KHÔ NGUYỄN DU) ===
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
            # === SỰ CỐ INC-2026-3904 (PASTEUR) ===
            {
                "code": "INC-2026-3904",
                "title": "Rác thải sinh hoạt lặt vặt",
                "description": "Rác bẩn",
                "address": "22 Pasteur, Quận 1, TP.HCM",
                "lat": 10.7730,
                "lng": 106.6990,
                "cat_code": "DOMESTIC_OVERFLOW",
                "severity": "LOW",
                "area_m2": 1.0,
                "ai_summary": None,
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
            # === SỰ CỐ ECO-HCM-001 (BẾN BẠCH ĐẰNG, QUẬN 1) ===
            {
                "code": "ECO-HCM-001",
                "title": "Rác thải trôi nổi và lục bình ứ đọng ven sông Sài Gòn",
                "description": "Túi nilon và chai nhựa dạt vào bến Bạch Đằng gây mất mỹ quan đô thị trung tâm và bốc mùi khi nước ròng.",
                "address": "Bến Bạch Đằng, Tôn Đức Thắng, Quận 1",
                "lat": 10.7725,
                "lng": 106.7065,
                "cat_code": "DOMESTIC_OVERFLOW",
                "severity": "HIGH",
                "area_m2": 40.0,
                "ai_summary": "Rác thải và lục bình dày đặc dạt vào bến Bạch Đằng gây ô nhiễm nguồn nước mặt và cảnh quan du lịch. Cần điều ca nô vớt rác chuyên dụng.",
                "ai_triage_score": 82.0,
                "ai_suggested_priority": "Cao",
                "ai_factors": {
                    "base_severity": 80,
                    "proximity_risk": 70,
                    "scale_factor": 80,
                    "urgency_nlp": 75,
                    "keywords": ["trôi nổi", "ô nhiễm sông", "mất mỹ quan"],
                    "risk_factors": ["Ô nhiễm trực tiếp nguồn nước sông Sài Gòn", "Khu vực du lịch trọng điểm"]
                },
                "media_url": None,
            },
            # === SỰ CỐ ECO-HCM-003 (NGUYỄN THỊ THẬP, QUẬN 7) ===
            {
                "code": "ECO-HCM-003",
                "title": "Cửa cống thoát nước bị rác bít kín gây ngập Kênh Tè",
                "description": "Miệng hố ga gom nước mưa bị bùn đất và lá cây chèn cứng gây ngập nước sâu sau các đợt mưa lớn.",
                "address": "Đường Nguyễn Thị Thập, Phường Tân Phú, Quận 7",
                "lat": 10.7380,
                "lng": 106.7215,
                "cat_code": "DRAIN_BLOCKAGE",
                "severity": "HIGH",
                "area_m2": 20.0,
                "ai_summary": "Miệng hố ga bị rác và bùn đất lấp kín gây nguy cơ ngập sâu khi triều cường. Cần điều đội nạo vét khơi thông miệng cống.",
                "ai_triage_score": 75.0,
                "ai_suggested_priority": "Cao",
                "ai_factors": {
                    "base_severity": 80,
                    "proximity_risk": 60,
                    "scale_factor": 70,
                    "urgency_nlp": 70,
                    "keywords": ["ngập nước", "bít cống", "mưa lớn"],
                    "risk_factors": ["Nguy cơ ngập sâu kết hợp triều cường", "Cản trở thoát nước đô thị"]
                },
                "media_url": None,
            },
            # === SỰ CỐ ECO-HCM-004 (ĐIỆN BIÊN PHỦ, BÌNH THẠNH) ===
            {
                "code": "ECO-HCM-004",
                "title": "Ô nhiễm kênh Nhiêu Lộc - Thị Nghè đoạn cầu Điện Biên Phủ",
                "description": "Xuất hiện váng dầu loang và mùi khét rác thải hữu cơ theo dòng chảy thủy triều qua địa bàn Bình Thạnh.",
                "address": "Chân cầu Điện Biên Phủ, Phường 15, Quận Bình Thạnh",
                "lat": 10.7930,
                "lng": 106.6995,
                "cat_code": "HAZARDOUS",
                "severity": "HIGH",
                "area_m2": 30.0,
                "ai_summary": "Váng dầu loang và rác thải hữu cơ bốc mùi nồng trên kênh Nhiêu Lộc đoạn cầu Điện Biên Phủ, gần trường THCS Điện Biên và trạm y tế P15.",
                "ai_triage_score": 78.0,
                "ai_suggested_priority": "Cao",
                "ai_factors": {
                    "base_severity": 80,
                    "proximity_risk": 75,
                    "scale_factor": 75,
                    "urgency_nlp": 75,
                    "keywords": ["váng dầu", "mùi khét", "ô nhiễm kênh"],
                    "risk_factors": ["Váng dầu loang trên mặt nước kênh", "Gần khu dân cư đông đúc"]
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
