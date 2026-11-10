"""Seeder dữ liệu thực tế cho Chức năng 20: Gây quỹ cộng đồng (Fundraiser)

Tuân thủ:
- Báo cáo đồ án Mục 4.2.20 (trang 160 - 168)
- 6 chiến dịch mẫu đại diện cho các trạng thái: approved (đang gây quỹ), completed (đạt mục tiêu), closed (đã kết thúc), pending (chờ duyệt), rejected (từ chối)
- Dữ liệu quyên góp (donation) và báo cáo khoản chi (expense) minh bạch
"""

import asyncio
import uuid
from datetime import date, datetime, timedelta, timezone
from sqlalchemy import select, text
from app.database import AsyncSessionLocal
from app.models.fundraiser import (
    FundraiserCampaign,
    FundraiserDonation,
    FundraiserExpense,
    FundraiserStatus,
)
from app.models.rbac import User


async def seed_fundraisers():
    async with AsyncSessionLocal() as session:
        # 1. Tìm hoặc lấy người dùng mẫu làm người tạo
        res = await session.execute(
            select(User).order_by(User.created_at.asc()).limit(3)
        )
        users = res.scalars().all()
        if not users:
            print("[WARN] Chưa có người dùng trong DB để gán người tạo chiến dịch!")
            return

        creator_user = users[0]
        donor_user = users[1] if len(users) > 1 else users[0]

        today = date.today()

        campaigns_data = [
            {
                "title": "Chung tay làm sạch và hồi sinh kênh Nhiêu Lộc - Thị Nghè",
                "description": "Chiến dịch gây quỹ mua sắm 50 bộ vợt rác chuyên dụng, ủng cao su, phao cứu sinh và túi vải bảo hộ cho đội tình nguyện viên dọn dẹp rác trôi nổi dọc tuyến kênh Nhiêu Lộc - Thị Nghè đi qua Quận 1, Quận 3 và Bình Thạnh. Hãy chung tay trả lại dòng kênh xanh cho thành phố!",
                "cover_image_url": "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=1200&q=80",
                "target_amount": 50000000,
                "total_donated": 32500000,
                "donation_count": 3,
                "total_spent": 5000000,
                "district": "Quận 1",
                "end_date": today + timedelta(days=25),
                "bank_account_name": "CLB MOI TRUONG XANH SAI GON",
                "bank_account_number": "19038291038472",
                "bank_name": "Ngân hàng TMCP Kỹ Thương Việt Nam (Techcombank)",
                "status": FundraiserStatus.APPROVED.value,
                "rejection_reason": None,
                "donations": [
                    {
                        "donor_name": "Nguyễn Thành Đạt",
                        "amount": 20000000,
                        "message": "Ủng hộ các bạn trẻ vì một môi trường xanh sạch đẹp!",
                        "is_anonymous": False,
                        "donor_id": donor_user.user_id,
                    },
                    {
                        "donor_name": "Mạnh thường quân ẩn danh",
                        "amount": 10000000,
                        "message": "Góp chút sức mọn cho tuyến kênh xanh.",
                        "is_anonymous": True,
                        "donor_id": None,
                    },
                    {
                        "donor_name": "Huỳnh Anh Tú",
                        "amount": 2500000,
                        "message": "Cố lên cả đội tình nguyện nhé!",
                        "is_anonymous": False,
                        "donor_id": creator_user.user_id,
                    },
                ],
                "expenses": [
                    {
                        "content": "Mua 50 đôi ủng cao su bảo hộ và 50 vợt vớt rác lưới cước",
                        "amount": 5000000,
                        "expense_date": today - timedelta(days=2),
                        "proof_image_url": "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80",
                    }
                ],
            },
            {
                "title": "Trồng 500 cây bần và dừa nước chắn sóng ven sông Sài Gòn",
                "description": "Dự án phục hồi vành đai thực vật ven sông tại phường Linh Đông, TP. Thủ Đức. Cây bần và dừa nước giúp chống xói lở bờ sông tự nhiên, tạo cảnh quan sinh thái và nơi trú ngụ cho các loài thủy sinh bản địa.",
                "cover_image_url": "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80",
                "target_amount": 30000000,
                "total_donated": 30000000,
                "donation_count": 2,
                "total_spent": 20000000,
                "district": "Thành phố Thủ Đức",
                "end_date": today + timedelta(days=12),
                "status": FundraiserStatus.COMPLETED.value,
                "bank_account_name": "HOI SINH THAI RUNG NGAP MAN",
                "bank_account_number": "0071001122334",
                "bank_name": "Ngân hàng Ngoại thương Việt Nam (Vietcombank)",
                "rejection_reason": None,
                "donations": [
                    {
                        "donor_name": "Công ty TNHH Giải Pháp Xanh",
                        "amount": 20000000,
                        "message": "Đồng hành cùng dự án vành đai xanh.",
                        "is_anonymous": False,
                        "donor_id": None,
                    },
                    {
                        "donor_name": "Trần Thị Bình",
                        "amount": 10000000,
                        "message": "Vì một Thủ Đức rợp bóng mát bờ sông.",
                        "is_anonymous": False,
                        "donor_id": donor_user.user_id,
                    },
                ],
                "expenses": [
                    {
                        "content": "Mua 500 cây bần giống đạt chuẩn lâm nghiệp từ vườn ươm Cần Giờ",
                        "amount": 12000000,
                        "expense_date": today - timedelta(days=5),
                        "proof_image_url": "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80",
                    },
                    {
                        "content": "Thuê xuồng máy vận chuyển cây giống và cọc tre cố định bờ sông",
                        "amount": 8000000,
                        "expense_date": today - timedelta(days=3),
                        "proof_image_url": "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80",
                    },
                ],
            },
            {
                "title": "Lắp đặt 20 thùng rác phân loại 3 ngăn tại các trường tiểu học",
                "description": "Trang bị thùng rác thông minh có dán hướng dẫn phân loại rác tái chế, rác hữu cơ và rác vô cơ tại 5 trường tiểu học trên địa bàn quận Bình Thạnh nhằm giáo dục ý thức bảo vệ môi trường cho học sinh từ nhỏ.",
                "cover_image_url": "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=1200&q=80",
                "target_amount": 25000000,
                "total_donated": 8500000,
                "donation_count": 2,
                "total_spent": 0,
                "district": "Quận Bình Thạnh",
                "end_date": today + timedelta(days=45),
                "status": FundraiserStatus.APPROVED.value,
                "bank_account_name": "DU AN GD MOI TRUONG MAM XANH",
                "bank_account_number": "101928374655",
                "bank_name": "Ngân hàng Quân đội (MBBank)",
                "rejection_reason": None,
                "donations": [
                    {
                        "donor_name": "Nhóm Cựu Học Sinh Trường Chu Văn An",
                        "amount": 5000000,
                        "message": "Ủng hộ thế hệ tương lai.",
                        "is_anonymous": False,
                        "donor_id": None,
                    },
                    {
                        "donor_name": "Mạnh thường quân ẩn danh",
                        "amount": 3500000,
                        "message": "Chúc dự án sớm thành công!",
                        "is_anonymous": True,
                        "donor_id": None,
                    },
                ],
                "expenses": [],
            },
            {
                "title": "Thu gom và xử lý pin cũ, rác thải điện tử cộng đồng Cần Giờ",
                "description": "Chiến dịch thu gom pin cúc áo, ắc quy hỏng và bo mạch điện tử đã kết thúc thành công với hơn 300kg chất thải nguy hại được chuyển giao cho nhà máy xử lý chất thải công nghiệp theo quy chuẩn.",
                "cover_image_url": "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=1200&q=80",
                "target_amount": 15000000,
                "total_donated": 15000000,
                "donation_count": 1,
                "total_spent": 14500000,
                "district": "Huyện Cần Giờ",
                "end_date": today - timedelta(days=10),
                "status": FundraiserStatus.CLOSED.value,
                "bank_account_name": "QUY MOI TRUONG BIEN CAN GIO",
                "bank_account_number": "060129384756",
                "bank_name": "Ngân hàng Sài Gòn Thương Tín (Sacombank)",
                "rejection_reason": None,
                "donations": [
                    {
                        "donor_name": "CLB Sống Xanh TP.HCM",
                        "amount": 15000000,
                        "message": "Hoàn tất mục tiêu xử lý pin an toàn.",
                        "is_anonymous": False,
                        "donor_id": creator_user.user_id,
                    }
                ],
                "expenses": [
                    {
                        "content": "Hợp đồng vận chuyển và chi phí xử lý lò đốt nhiệt độ cao rác nguy hại",
                        "amount": 14500000,
                        "expense_date": today - timedelta(days=8),
                        "proof_image_url": "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80",
                    }
                ],
            },
            {
                "title": "Trồng 1.000 cây thông ba lá phục hồi rừng phòng hộ Langbiang",
                "description": "Chiến dịch phủ xanh 2 hecta đồi trọc tại huyện Lạc Dương và chân núi Langbiang, tỉnh Lâm Đồng. Cây thông ba lá bản địa giúp giữ nước đầu nguồn, chống sạt lở đất trong mùa mưa bão và bảo tồn hệ sinh thái cao nguyên.",
                "cover_image_url": "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1200&q=80",
                "target_amount": 40000000,
                "total_donated": 28000000,
                "donation_count": 3,
                "total_spent": 15000000,
                "district": "Lâm Đồng",
                "end_date": today + timedelta(days=35),
                "bank_account_name": "QUY BAO TON RUNG DA LAT",
                "bank_account_number": "21510001889988",
                "bank_name": "Ngân hàng Đầu tư và Phát triển Việt Nam (BIDV)",
                "status": FundraiserStatus.APPROVED.value,
                "rejection_reason": None,
                "donations": [
                    {
                        "donor_name": "Nhóm Yêu Rừng Tây Nguyên",
                        "amount": 15000000,
                        "message": "Góp mầm xanh cho đại ngàn!",
                        "is_anonymous": False,
                        "donor_id": None,
                    },
                    {
                        "donor_name": "Trần Văn Nam",
                        "amount": 10000000,
                        "message": "Vì màu xanh của cao nguyên ngàn hoa.",
                        "is_anonymous": False,
                        "donor_id": donor_user.user_id,
                    },
                    {
                        "donor_name": "Mạnh thường quân giấu tên",
                        "amount": 3000000,
                        "message": "Ủng hộ dự án rừng Langbiang.",
                        "is_anonymous": True,
                        "donor_id": None,
                    },
                ],
                "expenses": [
                    {
                        "content": "Mua 1.000 cây thông ba lá giống 2 năm tuổi từ Viện Nghiên cứu Lâm nghiệp Tây Nguyên",
                        "amount": 15000000,
                        "expense_date": today - timedelta(days=4),
                        "proof_image_url": "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80",
                    }
                ],
            },
            {
                "title": "Chiến dịch làm sạch rác biển Sơn Trà & Bảo vệ rạn san hô",
                "description": "Huy động 120 tình nguyện viên lặn biển vớt rác lưới ma, túi nylon và dọn sạch 3km bờ đá bán đảo Sơn Trà, TP. Đà Nẵng, bảo vệ các bãi rùa đẻ và rạn san hô tự nhiên.",
                "cover_image_url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
                "target_amount": 35000000,
                "total_donated": 18500000,
                "donation_count": 2,
                "total_spent": 6000000,
                "district": "Đà Nẵng",
                "end_date": today + timedelta(days=20),
                "bank_account_name": "CLB LAN BIEN BAO VE SAN HO DA NANG",
                "bank_account_number": "0041000345678",
                "bank_name": "Ngân hàng Ngoại thương Việt Nam (Vietcombank)",
                "status": FundraiserStatus.APPROVED.value,
                "rejection_reason": None,
                "donations": [
                    {
                        "donor_name": "Hiệp hội Du lịch Sinh thái Đà Nẵng",
                        "amount": 12000000,
                        "message": "Chung tay bảo vệ báu vật Sơn Trà.",
                        "is_anonymous": False,
                        "donor_id": None,
                    },
                    {
                        "donor_name": "Huỳnh Anh Tú",
                        "amount": 6500000,
                        "message": "Bảo vệ biển quê hương miền Trung!",
                        "is_anonymous": False,
                        "donor_id": creator_user.user_id,
                    },
                ],
                "expenses": [
                    {
                        "content": "Thuê 6 thuyền cứu hộ, bình khí lặn chuyên dụng và bao tải đựng rác đáy biển",
                        "amount": 6000000,
                        "expense_date": today - timedelta(days=1),
                        "proof_image_url": "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80",
                    }
                ],
            },
            {
                "title": "Phục hồi dải xanh sinh thái bãi bồi sông Hồng",
                "description": "Dự án cải tạo 1.500m bờ bãi ven cầu Long Biên, Hà Nội thành công viên sinh thái cộng đồng, trồng tre ngà và cỏ vetiver lọc nước ngầm tự nhiên.",
                "cover_image_url": "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=1200&q=80",
                "target_amount": 60000000,
                "total_donated": 0,
                "donation_count": 0,
                "total_spent": 0,
                "district": "Hà Nội",
                "end_date": today + timedelta(days=75),
                "status": FundraiserStatus.PENDING.value,
                "bank_account_name": "HOI KIEN TRUC CANH QUAN HA NOI",
                "bank_account_number": "118002699888",
                "bank_name": "Ngân hàng Công Thương Việt Nam (VietinBank)",
                "rejection_reason": None,
                "donations": [],
                "expenses": [],
            },
            {
                "title": "Mô hình vườn rau hữu cơ từ rác thải nhà bếp tái chế",
                "description": "Xây dựng 10 cụm ủ rác hữu cơ nuôi trùn quế và trồng rau sạch tại các khu phố thuộc Quận 7. Dự án đang chờ duyệt kế hoạch phân bổ điểm ủ rác từ chính quyền.",
                "cover_image_url": "https://images.unsplash.com/photo-1592417817098-8f3d6910985b?auto=format&fit=crop&w=1200&q=80",
                "target_amount": 20000000,
                "total_donated": 0,
                "donation_count": 0,
                "total_spent": 0,
                "district": "Quận 7",
                "end_date": today + timedelta(days=60),
                "status": FundraiserStatus.PENDING.value,
                "bank_account_name": "NGUYEN THANH DAT",
                "bank_account_number": "1234567890",
                "bank_name": "Ngân hàng TMCP Á Châu (ACB)",
                "rejection_reason": None,
                "donations": [],
                "expenses": [],
            },
            {
                "title": "Chiến dịch môi trường không rõ nguồn gốc gây quỹ tự phát",
                "description": "Chiến dịch tự phát chưa có kế hoạch dự toán tài chính chi tiết và địa điểm tập kết rõ ràng.",
                "cover_image_url": "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1200&q=80",
                "target_amount": 100000000,
                "total_donated": 0,
                "donation_count": 0,
                "total_spent": 0,
                "district": "Quận 3",
                "end_date": today + timedelta(days=30),
                "status": FundraiserStatus.REJECTED.value,
                "bank_account_name": "VO DANH",
                "bank_account_number": "9999999999",
                "bank_name": "Ngân hàng VPBank",
                "rejection_reason": "Hồ sơ thiếu kế hoạch dự toán tài chính chi tiết và chưa được chính quyền địa phương chấp thuận tổ chức.",
                "donations": [],
                "expenses": [],
            },
        ]

        added_count = 0
        for item in campaigns_data:
            existing_camp = await session.execute(
                select(FundraiserCampaign).where(FundraiserCampaign.title == item["title"])
            )
            if existing_camp.scalars().first():
                continue

            donations_list = item.pop("donations")
            expenses_list = item.pop("expenses")

            campaign = FundraiserCampaign(
                creator_id=creator_user.user_id,
                **item,
            )
            session.add(campaign)
            await session.flush()

            for don in donations_list:
                donation_obj = FundraiserDonation(
                    campaign_id=campaign.campaign_id,
                    transaction_code=f"TXN-{uuid.uuid4().hex[:8].upper()}",
                    payment_status="completed",
                    **don,
                )
                session.add(donation_obj)

            for exp in expenses_list:
                expense_obj = FundraiserExpense(
                    campaign_id=campaign.campaign_id,
                    created_by=creator_user.user_id,
                    **exp,
                )
                session.add(expense_obj)
            added_count += 1

        await session.commit()
        print(f"[SUCCESS] Đã nạp thêm {added_count} chiến dịch gây quỹ mới vào hệ thống!")


if __name__ == "__main__":
    asyncio.run(seed_fundraisers())

