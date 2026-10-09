"""
GreenSpot Domain Seeder: Danh mục Quy định xử phạt môi trường (Feature STT 11)
Căn cứ: Nghị định số 45/2022/NĐ-CP của Chính phủ quy định về xử phạt vi phạm hành chính trong lĩnh vực bảo vệ môi trường.

Đảm bảo:
- Đầy đủ 4 nhóm hành vi nhanh Màn 1: Xả rác, Đốt rác, Nước thải, Tiếng ồn
- Đầy đủ 5 lĩnh vực chuyên đề Màn 2: Rác thải sinh hoạt, Rác công nghiệp/nguy hại, Nước thải, Khí thải, Tiếng ồn
- Mức phạt Tổ chức = 2 x Mức phạt Cá nhân
- Đầy đủ mô tả hành vi, tình tiết tăng nặng, biện pháp khắc phục, căn cứ điều luật
- Idempotent: Kiểm tra theo legal_basis và title, không tạo trùng lặp
"""

import sys
import asyncio
from datetime import date
from pathlib import Path
from sqlalchemy import select

# Đảm bảo UTF-8 cho console
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

current_dir = Path(__file__).resolve().parent
backend_dir = current_dir.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.database import AsyncSessionLocal
from app.models.penalty import PenaltyRegulation

REGULATION_SEEDS = [
    # -------------------------------------------------------------------------
    # NHÓM 1: XẢ RÁC & RÁC THẢI SINH HOẠT
    # -------------------------------------------------------------------------
    {
        "title": "Vứt, thải rác thải sinh hoạt trên vỉa hè, lòng đường hoặc cống rãnh đô thị",
        "domain": "Rác thải sinh hoạt",
        "quick_category": "Xả rác",
        "min_fine_individual": 1000000,
        "max_fine_individual": 2000000,
        "avg_fine_individual": 1500000,
        "min_fine_organization": 2000000,
        "max_fine_organization": 4000000,
        "avg_fine_organization": 3000000,
        "description": "Hành vi vứt, thải, bỏ rác thải sinh hoạt, xác súc vật, đất cát, phế thải xây dựng không đúng nơi quy định tại khu chung cư, thương mại, dịch vụ hoặc nơi công cộng; vứt rác thải sinh hoạt trên vỉa hè, lòng đường, hoặc vào hệ thống thoát nước thải đô thị, cống rãnh thoát nước.",
        "aggravating_circumstances": "Tái phạm nhiều lần hoặc xả thải với khối lượng trên 1m³ làm tắc nghẽn dòng chảy thoát nước đô thị.",
        "supplementary_measures": "Buộc khôi phục lại tình trạng môi trường ban đầu; buộc thu gom, vận chuyển toàn bộ rác thải đến nơi xử lý theo quy định.",
        "legal_basis": "Khoản 2 Điều 25 Nghị định 45/2022/NĐ-CP",
        "effective_date": date(2022, 8, 25),
        "amendment_warning": None,
        "keywords": "vứt rác vỉa hè, đổ rác lòng đường, xả rác bừa bãi, rác sinh hoạt, bao ni lông, cống rãnh, tắc cống",
    },
    {
        "title": "Vứt tàn, mẩu thuốc lá không đúng nơi quy định",
        "domain": "Rác thải sinh hoạt",
        "quick_category": "Xả rác",
        "min_fine_individual": 100000,
        "max_fine_individual": 150000,
        "avg_fine_individual": 125000,
        "min_fine_organization": 200000,
        "max_fine_organization": 300000,
        "avg_fine_organization": 250000,
        "description": "Hành vi vứt, thải, bỏ đầu mẩu, tàn thuốc lá không đúng nơi quy định tại khu chung cư, thương mại, dịch vụ hoặc nơi công cộng, công viên, trạm chờ xe buýt.",
        "aggravating_circumstances": "Vứt tàn thuốc gần khu vực có nguy cơ cháy nổ cao (trạm xăng dầu, rừng phòng hộ, kho chứa hóa chất).",
        "supplementary_measures": "Buộc dọn dẹp, thu gom mẩu thuốc lá và khôi phục hiện trạng ban đầu.",
        "legal_basis": "Khoản 1 Điều 25 Nghị định 45/2022/NĐ-CP",
        "effective_date": date(2022, 8, 25),
        "amendment_warning": None,
        "keywords": "tàn thuốc, mẩu thuốc lá, hút thuốc vứt tàn, nơi công cộng, xả rác, công viên",
    },
    {
        "title": "Không phân loại chất thải rắn sinh hoạt tại nguồn theo quy định",
        "domain": "Rác thải sinh hoạt",
        "quick_category": "Xả rác",
        "min_fine_individual": 500000,
        "max_fine_individual": 1000000,
        "avg_fine_individual": 750000,
        "min_fine_organization": 1000000,
        "max_fine_organization": 2000000,
        "avg_fine_organization": 1500000,
        "description": "Cá nhân, hộ gia đình không thực hiện phân loại chất thải rắn sinh hoạt theo quy định thành 3 nhóm (chất thải tái chế, chất thải thực phẩm và chất thải rắn sinh hoạt khác); không sử dụng bao bì chứa chất thải đúng chuẩn quy định của địa phương.",
        "aggravating_circumstances": "Đã được đơn vị thu gom nhắc nhở nhiều lần bằng biên bản nhưng vẫn cố tình không thực hiện.",
        "supplementary_measures": "Đơn vị thu gom có quyền từ chối thu gom rác thải; buộc thực hiện phân loại rác đúng quy định.",
        "legal_basis": "Khoản 1 Điều 26 Nghị định 45/2022/NĐ-CP",
        "effective_date": date(2022, 8, 25),
        "amendment_warning": "Quy định này có lộ trình áp dụng bắt buộc toàn quốc trước ngày 31/12/2024.",
        "keywords": "phân loại rác, rác tái chế, rác hữu cơ, rác sinh hoạt, túi chứa rác, phân loại tại nguồn",
    },

    # -------------------------------------------------------------------------
    # NHÓM 2: ĐỐT RÁC & KHÍ THẢI
    # -------------------------------------------------------------------------
    {
        "title": "Đốt chất thải rắn sinh hoạt, phụ phẩm nông nghiệp lộ thiên gây ô nhiễm",
        "domain": "Khí thải",
        "quick_category": "Đốt rác",
        "min_fine_individual": 2000000,
        "max_fine_individual": 3000000,
        "avg_fine_individual": 2500000,
        "min_fine_organization": 4000000,
        "max_fine_organization": 6000000,
        "avg_fine_organization": 5000000,
        "description": "Hành vi đốt rác thải sinh hoạt lộ thiên tại khu vực dân cư, ven đường giao thông; đốt rơm rạ, phụ phẩm cây trồng nông nghiệp ngoài đồng ruộng phát sinh khói bụi mù mịt gây ô nhiễm không khí và mất an toàn giao thông.",
        "aggravating_circumstances": "Đốt rác vào ban đêm hoặc trong khu vực có chỉ số ô nhiễm không khí AQI ở mức cảnh báo xấu/nguy hại.",
        "supplementary_measures": "Buộc dập tắt ngay đám cháy; buộc thu gom tàn tro xử lý đúng quy trình.",
        "legal_basis": "Khoản 3 Điều 26 Nghị định 45/2022/NĐ-CP",
        "effective_date": date(2022, 8, 25),
        "amendment_warning": None,
        "keywords": "đốt rác, đốt rơm rạ, khói bụi, đốt lộ thiên, ô nhiễm không khí, cháy rác",
    },
    {
        "title": "Đốt chất thải công nghiệp thông thường ngoài cơ sở xử lý được cấp phép",
        "domain": "Rác công nghiệp/nguy hại",
        "quick_category": "Đốt rác",
        "min_fine_individual": 10000000,
        "max_fine_individual": 20000000,
        "avg_fine_individual": 15000000,
        "min_fine_organization": 20000000,
        "max_fine_organization": 40000000,
        "avg_fine_organization": 30000000,
        "description": "Hành vi tự ý đốt bao bì công nghiệp, pallet gỗ vụn, cao su, vải vụn phế liệu công nghiệp ngoài trời hoặc trong các lò đốt thủ công không có hệ thống xử lý khí thải đạt quy chuẩn kỹ thuật môi trường.",
        "aggravating_circumstances": "Khối lượng chất thải công nghiệp đốt từ 500kg trở lên hoặc gây ảnh hưởng sức khỏe diện rộng.",
        "supplementary_measures": "Đình chỉ hoạt động đốt trái phép; buộc khắc phục hậu quả ô nhiễm và xử lý tồn dư chất thải.",
        "legal_basis": "Khoản 2 Điều 29 Nghị định 45/2022/NĐ-CP",
        "effective_date": date(2022, 8, 25),
        "amendment_warning": None,
        "keywords": "đốt rác công nghiệp, đốt vải vụn, đốt lốp xe, lò đốt thủ công, khói đen, mùi khét",
    },

    # -------------------------------------------------------------------------
    # NHÓM 3: NƯỚC THẢI
    # -------------------------------------------------------------------------
    {
        "title": "Xả nước thải sinh hoạt trực tiếp vào hệ thống thoát nước mưa",
        "domain": "Nước thải",
        "quick_category": "Nước thải",
        "min_fine_individual": 1000000,
        "max_fine_individual": 3000000,
        "avg_fine_individual": 2000000,
        "min_fine_organization": 2000000,
        "max_fine_organization": 6000000,
        "avg_fine_organization": 4000000,
        "description": "Hành vi đấu nối đường ống, xả nước thải sinh hoạt, nước giặt tẩy, nước tắm rửa vệ sinh trực tiếp vào rãnh thu nước mưa đường phố mà không qua bể tự hoại hoặc hệ thống thu gom nước thải chuyên dụng.",
        "aggravating_circumstances": "Xả nước thải kèm dầu mỡ thức ăn thừa gây đóng cặn nghẹt đường cống công cộng.",
        "supplementary_measures": "Buộc tháo dỡ đường ống xả trộm; buộc nạo vét đoạn cống bị ảnh hưởng và đấu nối đúng quy hoạch.",
        "legal_basis": "Khoản 1 Điều 18 Nghị định 45/2022/NĐ-CP",
        "effective_date": date(2022, 8, 25),
        "amendment_warning": None,
        "keywords": "xả nước thải, cống nước mưa, nước bẩn vỉa hè, dầu mỡ thức ăn, nghẹt cống",
    },
    {
        "title": "Xả trộm nước thải chưa qua xử lý ra kênh rạch, sông suối",
        "domain": "Nước thải",
        "quick_category": "Nước thải",
        "min_fine_individual": 30000000,
        "max_fine_individual": 50000000,
        "avg_fine_individual": 40000000,
        "min_fine_organization": 60000000,
        "max_fine_organization": 100000000,
        "avg_fine_organization": 80000000,
        "description": "Hành vi lén lút xả nước thải sản xuất, chế biến thực phẩm, chăn nuôi, giặt tẩy công nghiệp chứa thông số môi trường nguy hại vượt quy chuẩn kỹ thuật ra sông, ngòi, kênh, rạch, hồ chứa nước tự nhiên.",
        "aggravating_circumstances": "Lắp đặt đường ống ngầm xả trộm tinh vi hoặc xả thải vào ban đêm, khi trời mưa lớn để tẩu tán.",
        "supplementary_measures": "Buộc phá dỡ công trình xả trộm; buộc thực hiện các biện pháp xử lý nước thải đạt quy chuẩn và bồi thường thiệt hại sinh thái.",
        "legal_basis": "Khoản 4 Điều 18 Nghị định 45/2022/NĐ-CP",
        "effective_date": date(2022, 8, 25),
        "amendment_warning": None,
        "keywords": "xả trộm nước thải, ống ngầm, ô nhiễm sông ngòi, nước đen hôi thối, hóa chất xả sông",
    },

    # -------------------------------------------------------------------------
    # NHÓM 4: TIẾNG ỒN
    # -------------------------------------------------------------------------
    {
        "title": "Gây tiếng ồn vượt quy chuẩn kỹ thuật từ 2 dBA đến dưới 5 dBA (Karaoke, âm thanh sinh hoạt)",
        "domain": "Tiếng ồn",
        "quick_category": "Tiếng ồn",
        "min_fine_individual": 1000000,
        "max_fine_individual": 5000000,
        "avg_fine_individual": 3000000,
        "min_fine_organization": 2000000,
        "max_fine_organization": 10000000,
        "avg_fine_organization": 6000000,
        "description": "Hành vi sử dụng loa phát thanh, loa kéo di động, dàn karaoke, thiết bị âm thanh công suất lớn tại gia đình, quán nhậu, cơ sở kinh doanh gây tiếng ồn vượt quy chuẩn kỹ thuật về tiếng ồn từ 2 dBA đến dưới 5 dBA trong khu dân cư sau 22 giờ đêm.",
        "aggravating_circumstances": "Vi phạm sau 22 giờ đêm hoặc tiếp tục mở loa khi cơ quan chức năng hoặc hàng xóm đã nhắc nhở.",
        "supplementary_measures": "Tịch thu hoặc tạm giữ phương tiện phát âm thanh vi phạm; buộc áp dụng biện pháp cách âm.",
        "legal_basis": "Khoản 1 Điều 22 Nghị định 45/2022/NĐ-CP",
        "effective_date": date(2022, 8, 25),
        "amendment_warning": None,
        "keywords": "karaoke loa kéo, tiếng ồn đêm, mở nhạc to, âm thanh quá mức, loa phát thanh, quán nhậu ồn",
    },
    {
        "title": "Gây tiếng ồn nghiêm trọng vượt quy chuẩn từ 20 dBA đến dưới 25 dBA",
        "domain": "Tiếng ồn",
        "quick_category": "Tiếng ồn",
        "min_fine_individual": 20000000,
        "max_fine_individual": 40000000,
        "avg_fine_individual": 30000000,
        "min_fine_organization": 40000000,
        "max_fine_organization": 80000000,
        "avg_fine_organization": 60000000,
        "description": "Hành vi vận hành máy móc công nghiệp, xưởng cơ khí, búa tạ đóng cọc, thiết bị khoan cắt thi công xây dựng gây tiếng ồn cực lớn vượt quy chuẩn kỹ thuật từ 20 dBA đến dưới 25 dBA ảnh hưởng nghiêm trọng đến đời sống, sức khỏe người dân xung quanh.",
        "aggravating_circumstances": "Thi công gây ồn liên tục không che chắn gần trường học, bệnh viện, viện dưỡng lão.",
        "supplementary_measures": "Đình chỉ hoạt động của nguồn phát sinh tiếng ồn từ 3 tháng đến 6 tháng; buộc thực hiện biện pháp giảm thiểu tiếng ồn đạt chuẩn.",
        "legal_basis": "Khoản 5 Điều 22 Nghị định 45/2022/NĐ-CP",
        "effective_date": date(2022, 8, 25),
        "amendment_warning": None,
        "keywords": "tiếng ồn công trường, máy công nghiệp, xưởng mộc ồn, búa đóng cọc, tiếng ồn nặng",
    },

    # -------------------------------------------------------------------------
    # CHUYÊN ĐỀ MỞ RỘNG: RÁC THẢI NGUY HẠI & KHÍ THẢI CÔNG NGHIỆP
    # -------------------------------------------------------------------------
    {
        "title": "Chôn, lấp, đổ chất thải nguy hại trái quy định về bảo vệ môi trường",
        "domain": "Rác công nghiệp/nguy hại",
        "quick_category": None,
        "min_fine_individual": 100000000,
        "max_fine_individual": 250000000,
        "avg_fine_individual": 175000000,
        "min_fine_organization": 200000000,
        "max_fine_organization": 500000000,
        "avg_fine_organization": 350000000,
        "description": "Hành vi chôn, lấp, đổ chất thải nguy hại (pin ắc quy hỏng, dầu nhớt thải, bùn thải xi mạ, hóa chất độc hại) không đúng nơi quy định hoặc giao cho cá nhân, tổ chức không có giấy phép xử lý chất thải nguy hại tiếp nhận.",
        "aggravating_circumstances": "Khối lượng chất thải nguy hại chôn lấp từ 1.000 kg trở lên hoặc có dấu hiệu phạm tội hình sự theo Điều 235 Bộ luật Hình sự.",
        "supplementary_measures": "Tịch thu phương tiện vi phạm; buộc bốc xúc toàn bộ chất thải đem đi xử lý tiêu hủy đạt chuẩn và bồi thường thiệt hại đất đai/nguồn nước.",
        "legal_basis": "Khoản 7 Điều 29 Nghị định 45/2022/NĐ-CP",
        "effective_date": date(2022, 8, 25),
        "amendment_warning": None,
        "keywords": "chất thải nguy hại, chôn trộm hóa chất, pin ắc quy thải, dầu nhớt thải, bùn thải độc, đổ bậy chất thải",
    },
    {
        "title": "Thải khí thải có chứa thông số môi trường nguy hại vượt quy chuẩn kỹ thuật",
        "domain": "Khí thải",
        "quick_category": None,
        "min_fine_individual": 50000000,
        "max_fine_individual": 80000000,
        "avg_fine_individual": 65000000,
        "min_fine_organization": 100000000,
        "max_fine_organization": 160000000,
        "avg_fine_organization": 130000000,
        "description": "Cơ sở sản xuất, chế biến, nhiệt điện xả khí thải có chứa các chất độc hại (Dioxin/Furan, khí SO2, CO, NOx, bụi kim loại nặng) vượt quy chuẩn kỹ thuật quốc gia về khí thải công nghiệp từ 3 lần trở lên.",
        "aggravating_circumstances": "Không vận hành hệ thống lọc bụi tĩnh điện/hấp thụ khí thải để tiết kiệm chi phí nhiên liệu.",
        "supplementary_measures": "Tước quyền sử dụng giấy phép môi trường từ 3 đến 6 tháng; buộc nâng cấp lắp đặt hệ thống lọc khí đạt chuẩn.",
        "legal_basis": "Khoản 3 Điều 20 Nghị định 45/2022/NĐ-CP",
        "effective_date": date(2022, 8, 25),
        "amendment_warning": None,
        "keywords": "khí thải độc hại, ống khói nhà máy, bụi kim loại, mùi hóa chất, ô nhiễm không khí công nghiệp",
    },
]


async def seed_penalty_regulations():
    print("⚖️ Bắt đầu nạp dữ liệu Seeder: Danh mục Quy định xử phạt môi trường (Nghị định 45/2022/NĐ-CP)...")
    async with AsyncSessionLocal() as session:
        created_count = 0
        updated_count = 0

        for item in REGULATION_SEEDS:
            stmt = select(PenaltyRegulation).where(
                PenaltyRegulation.legal_basis == item["legal_basis"],
                PenaltyRegulation.title == item["title"],
                PenaltyRegulation.deleted_at.is_(None)
            )
            result = await session.execute(stmt)
            existing = result.scalars().first()

            if not existing:
                reg = PenaltyRegulation(
                    title=item["title"],
                    domain=item["domain"],
                    quick_category=item["quick_category"],
                    min_fine_individual=item["min_fine_individual"],
                    max_fine_individual=item["max_fine_individual"],
                    avg_fine_individual=item["avg_fine_individual"],
                    min_fine_organization=item["min_fine_organization"],
                    max_fine_organization=item["max_fine_organization"],
                    avg_fine_organization=item["avg_fine_organization"],
                    description=item["description"],
                    aggravating_circumstances=item["aggravating_circumstances"],
                    supplementary_measures=item["supplementary_measures"],
                    legal_basis=item["legal_basis"],
                    effective_date=item["effective_date"],
                    amendment_warning=item["amendment_warning"],
                    keywords=item["keywords"],
                    version=1,
                )
                session.add(reg)
                created_count += 1
            else:
                # Cập nhật thông tin nếu có điều chỉnh
                existing.domain = item["domain"]
                existing.quick_category = item["quick_category"]
                existing.min_fine_individual = item["min_fine_individual"]
                existing.max_fine_individual = item["max_fine_individual"]
                existing.avg_fine_individual = item["avg_fine_individual"]
                existing.min_fine_organization = item["min_fine_organization"]
                existing.max_fine_organization = item["max_fine_organization"]
                existing.avg_fine_organization = item["avg_fine_organization"]
                existing.description = item["description"]
                existing.aggravating_circumstances = item["aggravating_circumstances"]
                existing.supplementary_measures = item["supplementary_measures"]
                existing.effective_date = item["effective_date"]
                existing.amendment_warning = item["amendment_warning"]
                existing.keywords = item["keywords"]
                updated_count += 1

        await session.commit()
        print(f"✅ Đã nạp thành công: {created_count} quy định mới, {updated_count} quy định được đồng bộ.")


if __name__ == "__main__":
    asyncio.run(seed_penalty_regulations())
