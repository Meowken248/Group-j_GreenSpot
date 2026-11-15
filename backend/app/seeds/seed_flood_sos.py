"""
GreenSpot Domain Seeder: Cứu hộ ngập cộng đồng (Flood SOS - STT 46)
Khởi tạo dữ liệu mẫu cho:
1. Đội tình nguyện viên cứu nạn & xuồng cứu trợ (Volunteer Profiles).
2. Các yêu cầu cứu hộ ngập lụt khẩn cấp (Flood SOS Requests).
3. Tin nhắn trao đổi khẩn cấp giữa người gặp nạn và đội cứu hộ.
Đảm bảo tính Idempotent (không tạo trùng nếu đã tồn tại).
"""

import sys
import uuid
import asyncio
from datetime import datetime, timezone
from pathlib import Path
from sqlalchemy import select, text

# Đảm bảo UTF-8 cho console
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

current_dir = Path(__file__).resolve().parent
backend_dir = current_dir.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.database import AsyncSessionLocal, engine
from app.models.rbac import User
from app.models.flood_sos.sos_request import FloodSosRequest, VolunteerProfile, FloodSosChatMessage


SAMPLE_VOLUNTEERS = [
    {
        "full_name": "Nguyễn Văn Hùng",
        "team_name": "Đội Xuồng cứu hộ Quận 8 (Đội 1)",
        "vehicle_type": "Ca nô composite 40HP",
        "phone_number": "0908123456",
        "latitude": 10.7325,
        "longitude": 106.6710,
        "is_available": True,
        "completed_missions_count": 18,
        "rating_average": 4.9,
    },
    {
        "full_name": "Trần Thanh Bình",
        "team_name": "CLB Thuyền hơi Cứu hộ Thanh Đa",
        "vehicle_type": "Xuồng phao cứu sinh 6 chỗ",
        "phone_number": "0912345678",
        "latitude": 10.8250,
        "longitude": 106.7215,
        "is_available": True,
        "completed_missions_count": 24,
        "rating_average": 5.0,
    },
    {
        "full_name": "Lê Quang Minh",
        "team_name": "Đội Phản ứng nhanh SOS Nhà Bè",
        "vehicle_type": "Ghe máy đuôi tôm địa phương",
        "phone_number": "0987654321",
        "latitude": 10.6920,
        "longitude": 106.7380,
        "is_available": True,
        "completed_missions_count": 9,
        "rating_average": 4.8,
    },
]

SAMPLE_SOS_REQUESTS = [
    {
        "sos_code": "SOS-20261026-0001",
        "victim_name": "Bà Nguyễn Thị Mai",
        "victim_phone": "0934112233",
        "total_victims": 4,
        "elderly_count": 1,
        "children_count": 2,
        "medical_urgent_count": 1,
        "description": "Nước ngập hơn 1m tràn vào nhà cấp 4, có bà cụ bị tai biến và 2 cháu nhỏ, điện đã cắt hoàn toàn, cần xuồng di tản gấp!",
        "latitude": 10.7340,
        "longitude": 106.6730,
        "address_text": "Số 42/5 Hẻm 120 Đường Bến Phú Định, Phường 16, Quận 8, TP.HCM",
        "district": "Quận 8",
        "ward": "Phường 16",
        "severity_level": "CRITICAL",
        "flood_depth_meters": 1.2,
        "status": "PENDING",
    },
    {
        "sos_code": "SOS-20261026-0002",
        "victim_name": "Anh Phạm Văn Tâm",
        "victim_phone": "0977889900",
        "total_victims": 2,
        "elderly_count": 0,
        "children_count": 0,
        "medical_urgent_count": 0,
        "description": "Xe bị chết máy tại điểm ngập sâu đường Lương Định Của, nước ngập lút bánh xe dâng nhanh, cần hỗ trợ dây kéo hoặc thuyền đẩy.",
        "latitude": 10.7910,
        "longitude": 106.7320,
        "address_text": "Khu vực giao lộ Lương Định Của - Mai Chí Thọ, TP. Thủ Đức, TP.HCM",
        "district": "Thành phố Thủ Đức",
        "ward": "An Phú",
        "severity_level": "URGENT",
        "flood_depth_meters": 0.8,
        "status": "PENDING",
    },
    {
        "sos_code": "SOS-20261026-0003",
        "victim_name": "Chị Hoàng Lan",
        "victim_phone": "0909556677",
        "total_victims": 3,
        "elderly_count": 1,
        "children_count": 1,
        "medical_urgent_count": 0,
        "description": "Nước ngập ngang ngực, cả nhà đang ở trên gác xép, đội cứu hộ đang trên đường đến.",
        "latitude": 10.8220,
        "longitude": 106.7190,
        "address_text": "Bán đảo Thanh Đa, Phường 27, Quận Bình Thạnh, TP.HCM",
        "district": "Quận Bình Thạnh",
        "ward": "Phường 27",
        "severity_level": "CRITICAL",
        "flood_depth_meters": 1.4,
        "status": "EN_ROUTE",
        "assigned_rescuer_name": "Trần Thanh Bình",
        "assigned_rescuer_phone": "0912345678",
        "assigned_team_name": "CLB Thuyền hơi Cứu hộ Thanh Đa",
        "assigned_vehicle_type": "Xuồng phao cứu sinh 6 chỗ",
        "rescuer_latitude": 10.8240,
        "rescuer_longitude": 106.7205,
        "rescuer_distance_meters": 350.0,
        "rescuer_eta_minutes": 4,
    },
]


async def seed_flood_sos_data():
    print("🌊 Bắt đầu seed dữ liệu Cứu hộ ngập cộng đồng (Flood SOS - STT 46)...")
    async with AsyncSessionLocal() as session:
        # 1. Tìm hoặc tạo user cho tình nguyện viên
        users_res = await session.execute(select(User))
        all_users = users_res.scalars().all()
        admin_or_any = all_users[0] if all_users else None
        
        # 2. Seed Volunteers
        vol_created = 0
        for vol_data in SAMPLE_VOLUNTEERS:
            # Check exist by phone
            existing = await session.execute(
                select(VolunteerProfile).where(
                    VolunteerProfile.phone_number == vol_data["phone_number"],
                    VolunteerProfile.deleted_at.is_(None)
                )
            )
            if existing.scalar_one_or_none():
                continue
            
            # Tạo user ảo nếu cần
            vol_user_id = uuid.uuid4()
            dummy_user = User(
                user_id=vol_user_id,
                email=f"volunteer_{vol_data['phone_number']}@greenspot.vn",
                full_name=vol_data["full_name"],
                password_hash="fakehash",
                role_id=2,
            )
            session.add(dummy_user)
            await session.flush()

            vol = VolunteerProfile(
                volunteer_id=uuid.uuid4(),
                user_id=vol_user_id,
                full_name=vol_data["full_name"],
                team_name=vol_data["team_name"],
                vehicle_type=vol_data["vehicle_type"],
                phone_number=vol_data["phone_number"],
                is_available=vol_data["is_available"],
                current_latitude=vol_data["latitude"],
                current_longitude=vol_data["longitude"],
                location=f"SRID=4326;POINT({vol_data['longitude']} {vol_data['latitude']})",
                completed_missions_count=vol_data["completed_missions_count"],
                rating_average=vol_data["rating_average"],
            )
            session.add(vol)
            vol_created += 1

        # 3. Seed Flood SOS Requests
        sos_created = 0
        for req_data in SAMPLE_SOS_REQUESTS:
            existing_sos = await session.execute(
                select(FloodSosRequest).where(
                    FloodSosRequest.sos_code == req_data["sos_code"],
                    FloodSosRequest.deleted_at.is_(None)
                )
            )
            if existing_sos.scalar_one_or_none():
                continue

            sos = FloodSosRequest(
                request_id=uuid.uuid4(),
                sos_code=req_data["sos_code"],
                victim_id=admin_or_any.user_id if admin_or_any else None,
                victim_name=req_data["victim_name"],
                victim_phone=req_data["victim_phone"],
                total_victims=req_data["total_victims"],
                elderly_count=req_data["elderly_count"],
                children_count=req_data["children_count"],
                medical_urgent_count=req_data["medical_urgent_count"],
                description=req_data["description"],
                latitude=req_data["latitude"],
                longitude=req_data["longitude"],
                location=f"SRID=4326;POINT({req_data['longitude']} {req_data['latitude']})",
                address_text=req_data["address_text"],
                district=req_data["district"],
                ward=req_data["ward"],
                severity_level=req_data["severity_level"],
                flood_depth_meters=req_data["flood_depth_meters"],
                status=req_data["status"],
                assigned_rescuer_name=req_data.get("assigned_rescuer_name"),
                assigned_rescuer_phone=req_data.get("assigned_rescuer_phone"),
                assigned_team_name=req_data.get("assigned_team_name"),
                assigned_vehicle_type=req_data.get("assigned_vehicle_type"),
                rescuer_latitude=req_data.get("rescuer_latitude"),
                rescuer_longitude=req_data.get("rescuer_longitude"),
                rescuer_distance_meters=req_data.get("rescuer_distance_meters"),
                rescuer_eta_minutes=req_data.get("rescuer_eta_minutes"),
            )
            session.add(sos)
            await session.flush()

            # Thêm tin nhắn mẫu cho ca EN_ROUTE
            if req_data["status"] == "EN_ROUTE":
                msg1 = FloodSosChatMessage(
                    message_id=uuid.uuid4(),
                    request_id=sos.request_id,
                    sender_type="VICTIM",
                    sender_name=req_data["victim_name"],
                    content="Tôi đang mặc áo mưa màu vàng trên mái hiên, nước đang chảy xiết lắm anh ơi!",
                )
                msg2 = FloodSosChatMessage(
                    message_id=uuid.uuid4(),
                    request_id=sos.request_id,
                    sender_type="RESCUER",
                    sender_name=req_data["assigned_rescuer_name"],
                    content="Đội cứu hộ đã nhìn thấy cột mốc hẻm, ca nô đang vòng vào tránh đoạn xoáy ngập. Chị giữ bình tĩnh!",
                )
                session.add_all([msg1, msg2])

            sos_created += 1

        await session.commit()
        print(f"✅ Hoàn tất seed Flood SOS: Đã tạo {vol_created} Tình nguyện viên, {sos_created} Ca cứu hộ SOS mẫu.")


if __name__ == "__main__":
    asyncio.run(seed_flood_sos_data())
