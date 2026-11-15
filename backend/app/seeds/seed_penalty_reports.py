"""
Seeder: Danh mục Báo cáo / Phản ánh vi phạm môi trường (Penalty Reports)
Tạo dữ liệu mẫu cho Trang quản trị phản ánh vi phạm môi trường
"""

import asyncio
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.penalty import PenaltyReport, PenaltyRegulation
from app.models.rbac import User


SAMPLE_REPORTS = [
    {
        "tracking_code": "INC-20261012-TR78A",
        "violation_title": "Vứt, thải rác sinh hoạt trên vỉa hè, lòng đường",
        "legal_basis": "Khoản 2 Điều 25 Nghị định 45/2022/NĐ-CP",
        "fine_range": "1.000.000đ - 2.000.000đ",
        "address_text": "Trước số nhà 45 Đường Nguyễn Huệ, Phường Bến Nghé, Quận 1",
        "description": "Hộ kinh doanh tập kết nhiều bao rác thải sinh hoạt, thức ăn thừa bừa bãi ra vỉa hè vào ban ngày gây bốc mùi hôi thối và cản trở người đi bộ.",
        "is_anonymous": True,
        "reporter_name": "Ẩn danh",
        "status": "PENDING",
        "officer_note": None,
        "hours_ago": 2,
    },
    {
        "tracking_code": "INC-20261012-WK91B",
        "violation_title": "Xả nước thải chưa qua xử lý ra môi trường tiếp nhận",
        "legal_basis": "Điều 18 Nghị định 45/2022/NĐ-CP",
        "fine_range": "10.000.000đ - 30.000.000đ",
        "address_text": "Khu vực kênh Nhiêu Lộc, cầu số 4, Phường 7, Quận Phú Nhuận",
        "description": "Cơ sở rửa xe ô tô xả trực tiếp nước bọt xà phòng và dầu mỡ đen ngòm ra hố ga thoát nước mưa, không qua bể lắng lọc cặn.",
        "is_anonymous": False,
        "reporter_name": "Nguyễn Thành Đạt",
        "status": "VERIFIED",
        "officer_note": "Cán bộ địa bàn đã xuống kiểm tra hiện trường, lập biên bản ghi nhận hành vi và gửi giấy mời làm việc.",
        "hours_ago": 6,
    },
    {
        "tracking_code": "INC-20261011-XP44C",
        "violation_title": "Đốt chất thải rắn sinh hoạt bừa bãi tại khu dân cư",
        "legal_basis": "Khoản 1 Điều 26 Nghị định 45/2022/NĐ-CP",
        "fine_range": "2.000.000đ - 5.000.000đ",
        "address_text": "Bãi đất trống hẻm 120 đường Nguyễn Thị Thập, Phường Bình Thuận, Quận 7",
        "description": "Nhóm người gom cành cây khô kèm túi nilon và thùng xốp đem đốt khói đen mù mịt cả khu phố vào lúc 19h tối.",
        "is_anonymous": False,
        "reporter_name": "Lê Hoàng Yến",
        "status": "RESOLVED",
        "officer_note": "Tổ trật tự đô thị phường phối hợp công an đã dập tắt lửa, xử phạt hành chính 2.000.000đ theo biên bản số 12/BB-VPHC.",
        "hours_ago": 26,
    },
    {
        "tracking_code": "INC-20261010-KL22D",
        "violation_title": "Vứt rác sinh hoạt bừa bãi tại nơi công cộng",
        "legal_basis": "Khoản 1 Điều 25 Nghị định 45/2022/NĐ-CP",
        "fine_range": "500.000đ - 1.000.000đ",
        "address_text": "Công viên 23 Tháng 9, Quận 1",
        "description": "Người đi xe máy quăng túi rác xuống gốc cây rồi phóng đi mất.",
        "is_anonymous": True,
        "reporter_name": "Ẩn danh",
        "status": "REJECTED",
        "officer_note": "Thông tin mô tả không cung cấp biển số xe hoặc hình ảnh bằng chứng đối tượng vi phạm, không đủ căn cứ xử lý nguội.",
        "hours_ago": 48,
    },
    {
        "tracking_code": "INC-20261012-MN55E",
        "violation_title": "Không phân loại rác thải tại nguồn",
        "legal_basis": "Khoản 1 Điều 26 Nghị định 45/2022/NĐ-CP",
        "fine_range": "500.000đ - 1.000.000đ",
        "address_text": "Chung cư E-Home, Phường Phước Long B, TP Thủ Đức",
        "description": "Nhiều hộ dân để lẫn rác nguy hại (pin, bóng đèn hỏng) chung vào túi rác hữu cơ sinh hoạt bỏ vào thùng rác tầng.",
        "is_anonymous": False,
        "reporter_name": "Trần Văn Bình",
        "status": "PENDING",
        "officer_note": None,
        "hours_ago": 1,
    },
]


async def seed_penalty_reports():
    print("📢 Bắt đầu nạp dữ liệu Seeder: Danh sách Phản ánh Vi phạm Môi trường...")
    async with AsyncSessionLocal() as session:
        created = 0
        for item in SAMPLE_REPORTS:
            stmt = select(PenaltyReport).where(PenaltyReport.tracking_code == item["tracking_code"])
            existing = (await session.execute(stmt)).scalars().first()
            if not existing:
                created_at = datetime.now(timezone.utc) - timedelta(hours=item["hours_ago"])
                rep = PenaltyReport(
                    tracking_code=item["tracking_code"],
                    violation_title=item["violation_title"],
                    legal_basis=item["legal_basis"],
                    fine_range=item["fine_range"],
                    address_text=item["address_text"],
                    description=item["description"],
                    is_anonymous=item["is_anonymous"],
                    reporter_name=item["reporter_name"],
                    status=item["status"],
                    officer_note=item["officer_note"],
                    created_at=created_at,
                    updated_at=created_at,
                    version=1,
                )
                session.add(rep)
                created += 1

        await session.commit()
        print(f"✅ Đã nạp thành công {created} phản ánh vi phạm mẫu vào cơ sở dữ liệu.")


if __name__ == "__main__":
    asyncio.run(seed_penalty_reports())
