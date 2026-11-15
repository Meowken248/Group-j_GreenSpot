"""Seeder dữ liệu mẫu cho Chức năng 23: Mạng lưới Trạm Tái chế & Điểm Tiếp nhận (TP.HCM)

Tuân thủ:
- Bổ sung qr_code chuẩn format GREENSPOT-REC-{CODE}-{HASH} cho STT 34
- open_time và close_time hợp lệ (close_time > open_time)
- version = 1 cho Optimistic Locking (Quy tắc 6)
- is_active = True, is_deleted = False (Quy tắc 7)
"""

import asyncio
from datetime import datetime, timezone
from sqlalchemy import select, text
from app.database import AsyncSessionLocal
from app.models.spatial import RecyclingFacility, AdministrativeUnit


SAMPLE_FACILITIES = [
    {
        "name": "Trạm Thu gom Rác điện tử & Pin cũ Quận 1",
        "facility_code": "REC-Q1-01",
        "address": "128 Hai Bà Trưng, Phường Đa Kao, Quận 1",
        "unit_id": 3,
        "latitude": 10.7850,
        "longitude": 106.6960,
        "accepted_waste_types": ["PIN_CU", "THIET_BI_DIEN_TU", "BONG_DEN"],
        "open_time": "08:00",
        "close_time": "17:00",
        "operating_hours": "08:00 - 17:00 (T2 - T7)",
        "contact_phone": "028.3822.1122",
        "managing_org": "Sở TN&MT TP.HCM",
        "qr_code": "GREENSPOT-REC-Q1-01-A1B2C3",
        "is_active": True,
        "version": 1,
    },
    {
        "name": "Trạm Tái chế Vỏ hộp sữa & Nhựa Tetra Pak",
        "facility_code": "REC-TD-01",
        "address": "105 Võ Văn Ngân, Phường Linh Chiểu, TP. Thủ Đức",
        "unit_id": 2,
        "latitude": 10.8490,
        "longitude": 106.7550,
        "accepted_waste_types": ["VO_HOP_SUA", "NHUA_PET", "GIAY_BIA"],
        "open_time": "07:30",
        "close_time": "17:30",
        "operating_hours": "07:30 - 17:30 (Hàng ngày)",
        "contact_phone": "028.3722.9988",
        "managing_org": "PRO Vietnam & UBND TP. Thủ Đức",
        "qr_code": "GREENSPOT-REC-TD-01-D4E5F6",
        "is_active": True,
        "version": 1,
    },
    {
        "name": "Điểm Thu hồi Kim loại & Chai thủy tinh Xanh",
        "facility_code": "REC-Q7-01",
        "address": "Đường Nguyễn Lương Bằng, Phường Tân Phú, Quận 7",
        "unit_id": 4,
        "latitude": 10.7290,
        "longitude": 106.7260,
        "accepted_waste_types": ["THUY_TINH", "NHOM_KIM_LOAI", "NHUA_TAI_CHE"],
        "open_time": "08:00",
        "close_time": "18:00",
        "operating_hours": "08:00 - 18:00",
        "contact_phone": "028.5413.5566",
        "managing_org": "Công ty TNHH Môi trường Đô thị Q7",
        "qr_code": "GREENSPOT-REC-Q7-01-7890AB",
        "is_active": True,
        "version": 1,
    },
    {
        "name": "Trạm Phân loại Rác tại Nguồn Bình Thạnh",
        "facility_code": "REC-BT-01",
        "address": "Đường Nơ Trang Long, Phường 14, Quận Bình Thạnh",
        "unit_id": 5,
        "latitude": 10.8080,
        "longitude": 106.6965,
        "accepted_waste_types": ["RAC_HUU_CO", "NHUA_PET", "PIN_CU"],
        "open_time": "07:00",
        "close_time": "18:00",
        "operating_hours": "07:00 - 18:00",
        "contact_phone": "028.3841.2233",
        "managing_org": "Công ty Môi trường Đô thị TP.HCM",
        "qr_code": "GREENSPOT-REC-BT-01-CDEF12",
        "is_active": True,
        "version": 1,
    },
    {
        "name": "Trạm Thu hồi Đồ gia dụng cũ & E-waste",
        "facility_code": "REC-TD-02",
        "address": "Đường Song Hành Xa Lộ Hà Nội, An Phú, TP. Thủ Đức",
        "unit_id": 2,
        "latitude": 10.8030,
        "longitude": 106.7450,
        "accepted_waste_types": ["DO_DIEN_TU_LON", "MUC_IN", "PIN_CU"],
        "open_time": "08:00",
        "close_time": "17:00",
        "operating_hours": "08:00 - 17:00",
        "contact_phone": "028.3744.1100",
        "managing_org": "Vietnam Recycles",
        "qr_code": "GREENSPOT-REC-TD-02-345678",
        "is_active": True,
        "version": 1,
    },
    {
        "name": "Điểm Tiếp nhận Thu gom Rác nhựa ven biển Cần Giờ",
        "facility_code": "REC-CG-01",
        "address": "Đường Duyên Hải, Thị trấn Cần Thạnh, Huyện Cần Giờ",
        "unit_id": 6,
        "latitude": 10.4100,
        "longitude": 106.9550,
        "accepted_waste_types": ["NHUA_TAI_CHE", "PHAO_XOP", "LUOI_DANH_CA"],
        "open_time": "07:00",
        "close_time": "17:00",
        "operating_hours": "07:00 - 17:00 (Hàng ngày)",
        "contact_phone": "028.3874.0011",
        "managing_org": "UBND Huyện Cần Giờ & Ban Quản lý Rừng Sác",
        "qr_code": "GREENSPOT-REC-CG-01-9ABCDE",
        "is_active": True,
        "version": 1,
    },
]


async def seed_recycling_facilities_data():
    """Tạo hoặc cập nhật dữ liệu mẫu trạm tái chế với đầy đủ QR code và version."""
    async with AsyncSessionLocal() as db:
        print("   ↳ Bắt đầu đồng bộ danh sách Trạm Tái chế & Điểm Tiếp nhận (STT 23)...")
        updated_count = 0
        inserted_count = 0

        for item in SAMPLE_FACILITIES:
            stmt = select(RecyclingFacility).where(
                RecyclingFacility.facility_code == item["facility_code"]
            )
            res = await db.execute(stmt)
            existing = res.scalar_one_or_none()

            loc_wkt = f"SRID=4326;POINT({item['longitude']} {item['latitude']})"

            if existing:
                existing.name = item["name"]
                existing.address = item["address"]
                existing.unit_id = item["unit_id"]
                existing.location = loc_wkt
                existing.accepted_waste_types = item["accepted_waste_types"]
                existing.open_time = item["open_time"]
                existing.close_time = item["close_time"]
                existing.operating_hours = item["operating_hours"]
                existing.contact_phone = item["contact_phone"]
                existing.managing_org = item["managing_org"]
                if not existing.qr_code:
                    existing.qr_code = item["qr_code"]
                existing.is_active = item["is_active"]
                existing.is_deleted = False
                existing.version = 1
                updated_count += 1
            else:
                new_fac = RecyclingFacility(
                    name=item["name"],
                    facility_code=item["facility_code"],
                    address=item["address"],
                    unit_id=item["unit_id"],
                    location=loc_wkt,
                    accepted_waste_types=item["accepted_waste_types"],
                    open_time=item["open_time"],
                    close_time=item["close_time"],
                    operating_hours=item["operating_hours"],
                    contact_phone=item["contact_phone"],
                    managing_org=item["managing_org"],
                    qr_code=item["qr_code"],
                    is_active=item["is_active"],
                    is_deleted=False,
                    version=1,
                )
                db.add(new_fac)
                inserted_count += 1

        await db.commit()
        print(f"   ↳ Hoàn thành: Đã cập nhật {updated_count} trạm, thêm mới {inserted_count} trạm. Đầy đủ QR code & version!")


if __name__ == "__main__":
    asyncio.run(seed_recycling_facilities_data())

