"""
Seed dữ liệu mẫu cho Chức năng 21:
Sự kiện và chiến dịch Chủ Nhật Xanh (Green Sunday Campaigns & Events)
- Tạo các sự kiện thực tế tại TP.HCM (Quận 1, Bình Thạnh, TP. Thủ Đức, Quận 7)
- Đầy đủ các trạng thái: Đang diễn ra (để test GPS Check-in), Sắp diễn ra, Đã kết thúc, Chờ duyệt
- Tự động liên kết người tạo là tài khoản demo hoặc admin
- Bổ sung người tham gia (event_participants), người quan tâm (event_interests) và check-in mẫu (+50 GP)
"""

import sys
from pathlib import Path
import asyncio
import uuid
from datetime import datetime, timezone, timedelta

backend_dir = Path(__file__).resolve().parent.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from sqlalchemy import select, func
from app.database import AsyncSessionLocal
from app.models.event import (
    Event,
    EventParticipant,
    EventInterest,
    EventCheckin,
    EventStatus,
)
from app.models.rbac import User


async def seed_events_data():
    print("=" * 60)
    print("🌿 [GreenSpot Seeder] Bắt đầu khởi tạo dữ liệu mẫu cho Chức năng 21 (Sự kiện Chủ Nhật Xanh)...")

    now = datetime.now(timezone.utc)

    async with AsyncSessionLocal() as session:
        # 1. Tìm tài khoản demo và các tài khoản user khác trong hệ thống
        u_res = await session.execute(
            select(User).where(User.deleted_at.is_(None)).order_by(User.created_at.asc())
        )
        users = u_res.scalars().all()
        if not users:
            print("⚠️ Chưa có người dùng trong CSDL để liên kết tạo sự kiện.")
            return

        admin_or_demo_user = users[0]
        for u in users:
            if u.email in ("admin@gmail.com", "citizen@ecoreport.gov.vn", "tu@ecoreport.gov.vn"):
                admin_or_demo_user = u
                break

        other_users = [u for u in users if u.user_id != admin_or_demo_user.user_id]
        if not other_users:
            other_users = [admin_or_demo_user]

        # 2. Danh sách các sự kiện mẫu phong phú tại TP.HCM
        sample_events = [
            {
                "title": "Chủ Nhật Xanh lần 152: Ra quân làm sạch dòng kênh Nhiêu Lộc - Thị Nghè",
                "description": (
                    "Hưởng ứng phong trào Chủ Nhật Xanh toàn thành phố, Đoàn Thanh niên phối hợp cùng "
                    "Chi cục Bảo vệ Môi trường tổ chức thu gom rác trôi nổi dọc tuyến kênh Nhiêu Lộc. "
                    "Các bạn tình nguyện viên vui lòng mang theo găng tay cao su, nón và bình nước cá nhân. "
                    "Ban tổ chức sẽ cung cấp áo xanh, ủng cao su, kẹp gắp rác và túi đựng rác tự hủy."
                ),
                "cover_image_url": "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=1200&auto=format&fit=crop",
                "start_time": now + timedelta(days=3, hours=2),
                "end_time": now + timedelta(days=3, hours=5),
                "latitude": 10.7932,
                "longitude": 106.7065,
                "address": "Cầu Thị Nghè, Phường 19, Quận Bình Thạnh, TP.HCM",
                "district": "Quận Bình Thạnh",
                "max_participants": 150,
                "status": EventStatus.APPROVED.value,
            },
            {
                "title": "Chiến dịch Trồng 1.000 cây xanh ven sông Sài Gòn - Chung tay vì TP.HCM xanh",
                "description": (
                    "Sự kiện đang diễn ra trong ngày hôm nay! Hãy đến hiện trường Công viên Bến Bạch Đằng để cùng "
                    "nhau ươm mầm các cây lim xẹt, lộc vừng ven bờ sông Sài Gòn. Người tham gia có mặt tại hiện trường "
                    "hãy mở ứng dụng và bấm nút Check-in GPS để nhận ngay 50 Điểm Xanh (GP) vào ví tích lũy."
                ),
                "cover_image_url": "https://images.unsplash.com/photo-1576086213369-97a306d36557?w=1200&auto=format&fit=crop",
                # Bắt đầu cách đây 30 phút -> ĐANG TRONG KHUNG GIỜ CHECK-IN ĐỂ TEST THỰC TẾ!
                "start_time": now - timedelta(minutes=30),
                "end_time": now + timedelta(hours=2, minutes=30),
                "latitude": 10.7735,
                "longitude": 106.7068,
                "address": "Công viên Bến Bạch Đằng, Tôn Đức Thắng, Phường Bến Nghé, Quận 1, TP.HCM",
                "district": "Quận 1",
                "max_participants": 200,
                "status": EventStatus.APPROVED.value,
            },
            {
                "title": "Ngày hội Đổi rác nguy hại & Pin cũ lấy Sen đá tại Làng Đại học",
                "description": (
                    "Đem pin đã qua sử dụng, bóng đèn huỳnh quang, bình xịt rỗng và thiết bị điện tử hỏng "
                    "đến trạm thu gom lưu động để nhận ngay chậu cây sen đá hoặc voucher mua sắm xanh. "
                    "Tất cả chất thải thu hồi sẽ được chuyển giao về trạm xử lý chất thải nguy hại thành phố."
                ),
                "cover_image_url": "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=1200&auto=format&fit=crop",
                "start_time": now + timedelta(days=5, hours=1),
                "end_time": now + timedelta(days=5, hours=4),
                "latitude": 10.8753,
                "longitude": 106.8005,
                "address": "Nhà Văn hóa Sinh viên ĐHQG TP.HCM, Phường Linh Trung, TP. Thủ Đức, TP.HCM",
                "district": "Thành phố Thủ Đức",
                "max_participants": 80,
                "status": EventStatus.APPROVED.value,
            },
            {
                "title": "Workshop hướng dẫn ủ phân compost từ rác thải hữu cơ gia đình tại Quận 7",
                "description": (
                    "Sự kiện đã kết thúc tốt đẹp vào tuần trước với hơn 50 hộ gia đình tham gia. "
                    "Bà con đã được phát thùng ủ compost chuyên dụng và men vi sinh bản địa."
                ),
                "cover_image_url": "https://images.unsplash.com/photo-1592417817098-8f3d6910985b?w=1200&auto=format&fit=crop",
                "start_time": now - timedelta(days=7),
                "end_time": now - timedelta(days=7, hours=-3),
                "latitude": 10.7346,
                "longitude": 106.7218,
                "address": "Nhà Thiếu nhi Quận 7, Đường Huỳnh Tấn Phát, Phường Tân Phú, Quận 7, TP.HCM",
                "district": "Quận 7",
                "max_participants": 60,
                "status": EventStatus.APPROVED.value,
            },
            {
                "title": "Ra quân cải tạo cảnh quan rác thải khu vực bờ kè Rạch Xuyên Tâm",
                "description": (
                    "Dự án sáng kiến cộng đồng thanh niên dọn dẹp điểm rác ùn ứ lâu năm. Sự kiện đang "
                    "chờ Ban quản lý kiểm duyệt nội dung và kế hoạch an toàn trước khi công khai."
                ),
                "cover_image_url": "https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?w=1200&auto=format&fit=crop",
                "start_time": now + timedelta(days=2),
                "end_time": now + timedelta(days=2, hours=3),
                "latitude": 10.8145,
                "longitude": 106.7032,
                "address": "Đường Chu Văn An, Phường 26, Quận Bình Thạnh, TP.HCM",
                "district": "Quận Bình Thạnh",
                "max_participants": 50,
                "status": EventStatus.PENDING.value,
            },
        ]

        inserted_count = 0
        for ev_data in sample_events:
            # Kiểm tra xem sự kiện đã tồn tại chưa (dựa theo tiêu đề)
            chk_res = await session.execute(
                select(Event).where(Event.title == ev_data["title"])
            )
            existing_ev = chk_res.scalar_one_or_none()
            if existing_ev:
                continue

            event_id = uuid.uuid4()
            new_event = Event(
                event_id=event_id,
                title=ev_data["title"],
                description=ev_data["description"],
                cover_image_url=ev_data["cover_image_url"],
                start_time=ev_data["start_time"],
                end_time=ev_data["end_time"],
                latitude=ev_data["latitude"],
                longitude=ev_data["longitude"],
                address=ev_data["address"],
                district=ev_data["district"],
                max_participants=ev_data["max_participants"],
                current_participants=1,
                interested_count=0,
                creator_id=admin_or_demo_user.user_id,
                status=ev_data["status"],
                checkin_radius_meters=100,
                version=1,
                is_deleted=False,
            )
            session.add(new_event)
            await session.flush()

            # 1. Thêm người tạo vào bảng event_participants (is_creator = True)
            creator_p = EventParticipant(
                id=uuid.uuid4(),
                event_id=event_id,
                user_id=admin_or_demo_user.user_id,
                is_creator=True,
                joined_at=now - timedelta(days=1),
            )
            session.add(creator_p)

            # 2. Thêm một số user khác tham gia để có số đếm thực tế
            participants_count = 1
            for p_user in other_users[:3]:
                if p_user.user_id != admin_or_demo_user.user_id:
                    session.add(EventParticipant(
                        id=uuid.uuid4(),
                        event_id=event_id,
                        user_id=p_user.user_id,
                        is_creator=False,
                        joined_at=now - timedelta(hours=5),
                    ))
                    participants_count += 1
            new_event.current_participants = participants_count

            # 3. Thêm một số user quan tâm (event_interests) - không tính người tạo
            interest_users = [u for u in users if u.user_id != admin_or_demo_user.user_id][:4]
            for idx, i_user in enumerate(interest_users):
                session.add(EventInterest(
                    id=uuid.uuid4(),
                    event_id=event_id,
                    user_id=i_user.user_id,
                    created_at=now - timedelta(hours=idx + 1),
                ))
            new_event.interested_count = len(interest_users)

            # 4. Nếu là sự kiện đang diễn ra hoặc đã kết thúc, thêm 1 check-in mẫu
            if "Bến Bạch Đằng" in ev_data["title"] or "ủ phân compost" in ev_data["title"]:
                session.add(EventCheckin(
                    id=uuid.uuid4(),
                    event_id=event_id,
                    user_id=admin_or_demo_user.user_id,
                    latitude=ev_data["latitude"] + 0.0001,
                    longitude=ev_data["longitude"] + 0.0001,
                    distance_meters=15.5,
                    accuracy_meters=12.0,
                    points_awarded=50,
                    checkin_time=ev_data["start_time"] + timedelta(minutes=10),
                    device_info="Chrome 130 on Windows 11",
                ))
                # Đồng bộ ví Điểm Xanh với sổ cái check-in (tránh lệch số liệu demo)
                admin_or_demo_user.total_green_points = (
                    admin_or_demo_user.total_green_points or 0
                ) + 50


            inserted_count += 1

        await session.commit()
        print(f"✅ Đã nạp thành công {inserted_count} sự kiện Chủ Nhật Xanh mẫu vào CSDL!")
        print("=" * 60)


if __name__ == "__main__":
    asyncio.run(seed_events_data())
