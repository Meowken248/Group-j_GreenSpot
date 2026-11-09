"""
Động cơ Tri thức Môi trường & Bộ lọc Ràng buộc Chuyên môn (Environmental Knowledge Engine)
Chức năng 24: AI chat box (EcoReport / GreenSpot)
Cung cấp khả năng thẩm định phạm vi câu hỏi (Guardrails), phân loại rác, tra cứu luật và
hoạt động như Fallback Engine hoàn chỉnh khi dịch vụ LLM bên ngoài bị gián đoạn hoặc hết hạn mức.
"""

import re
from typing import Dict, List, Optional, Tuple


class EnvironmentalKnowledgeEngine:
    """
    Động cơ tri thức môi trường đô thị & hướng dẫn nền tảng GreenSpot.
    Đảm bảo 100% tính sẵn sàng (High Availability) theo chuẩn Doanh nghiệp.
    """

    STANDARD_OUT_OF_SCOPE_REFUSAL = (
        "Tôi chỉ hỗ trợ các vấn đề về môi trường và hệ thống Xanh. "
        "Bạn thử hỏi về phân loại rác nhé"
    )

    LEGAL_DISCLAIMER = "\n\n*Câu trả lời của AI mang tính tham khảo, không thay thế văn bản pháp luật chính thức.*"

    # Tập từ khóa nhận diện các chủ đề trong phạm vi (In-domain keywords)
    ENVIRONMENTAL_KEYWORDS = [
        # Rác thải & phân loại
        "rác", "rac", "phân loại", "phan loai", "vứt", "vut", "xả thải", "xa thai",
        "pin", "ắc quy", "ac quy", "nhựa", "nhua", "hộp xốp", "hop xop", "túi nilon", "tui nilon",
        "thủy tinh", "thuy tinh", "kim loại", "kim loai", "giấy", "giay", "carton",
        "hữu cơ", "huu co", "vô cơ", "vo co", "nguy hại", "nguy hai", "tái chế", "tai che",
        "chai lọ", "chai lo", "bóng đèn", "bong den", "dầu ăn thừa", "dau an thua", "thuốc lá",
        # Luật & xử phạt
        "phạt", "phat", "nghị định 45", "nghi dinh 45", "luật", "luat", "vi phạm", "vi pham",
        "tiền phạt", "tien phat", "tố giác", "to giac", "xử lý", "xu ly", "điều khoản", "dieu khoan",
        # Trạm thu gom & hạ tầng
        "trạm", "tram", "điểm thu gom", "diem thu gom", "thu hồi", "thu hoi", "ve chai", "ve chai xanh",
        "thùng rác", "thung rac", "ubnd", "siêu thị", "sieu thi",
        # Điểm xanh & Gamification
        "điểm xanh", "diem xanh", "tích điểm", "tich diem", "ví điểm", "vi diem",
        "đổi quà", "doi qua", "voucher", "thăng hạng", "thang hang", "công dân xanh", "cong dan xanh",
        "hạng đồng", "hạng bạc", "hạng vàng", "kim cương", "huy hiệu", "huy hieu", "vòng quay", "vong quay",
        # Tính năng nền tảng GreenSpot
        "greenspot", "báo cáo", "bao cao", "sự cố", "su co", "gps", "chụp ảnh", "chup anh",
        "bản đồ", "ban do", "aqi", "không khí", "khong khi", "ngập", "ngap", "triều cường", "trieu cuong",
        "tuyến đường", "tuyen duong", "cứu hộ", "cuu ho", "flood sos", "sos",
        "nhóm", "nhom", "kết bạn", "ket ban", "sinh nhật", "sinh nhat", "thiệp xanh", "thiep xanh",
        "chiến dịch", "chien dich", "chủ nhật xanh", "chu nhat xanh", "gây quỹ", "gay quy"
    ]

    # Các từ khóa rõ ràng ngoài phạm vi (Out-of-scope triggers)
    OUT_OF_SCOPE_PATTERNS = [
        r"\b(thơ|bài thơ|thơ tình|lam tho)\b",
        r"\b(toán|phương trình|tích phân|đạo hàm|giải toán)\b",
        r"\b(chứng khoán|crypto|bitcoin|cổ phiếu|giá vàng|lô đề|xổ số)\b",
        r"\b(viết code|lập trình|react native|python script|javascript code|html|css)\b",
        r"\b(chính trị|bầu cử|chiến tranh|quân sự)\b",
        r"\b(tình yêu|tỏ tình|người yêu|hẹn hò|tâm sự tuổi hồng)\b",
    ]

    # Chủ đề mở rộng được hỗ trợ: thời tiết – khí hậu – hệ sinh thái – Trái Đất.
    # So khớp theo RANH GIỚI TỪ (word boundary) để tránh dương tính giả với từ ngắn
    # (ví dụ "mưa" không được khớp bừa vào "mua sắm").
    EXTENDED_SCOPE_PATTERNS = [
        # --- Thời tiết & Khí hậu ---
        r"\bthời tiết\b", r"\bthoi tiet\b", r"\bnhiệt độ\b", r"\bnhiet do\b",
        r"\bdự báo\b", r"\bdu bao\b", r"\bthời tiết hôm nay\b",
        r"\bmưa\b", r"\bcơn mưa\b", r"\bmưa lớn\b", r"\bmưa axit\b", r"\bmùa mưa\b",
        r"\bnắng\b", r"\bnắng nóng\b", r"\bnóng\b", r"\blạnh\b",
        r"\bbão\b", r"\báp thấp\b", r"\blũ\b", r"\blụt\b", r"\btriều cường\b",
        r"\bgió\b", r"\bđộ ẩm\b", r"\bdo am\b", r"\bsương mù\b", r"\bsấm chớp\b", r"\bsét\b",
        r"\bkhí hậu\b", r"\bkhi hau\b", r"\bbiến đổi khí hậu\b", r"\bbien doi khi hau\b",
        r"\bhiệu ứng nhà kính\b", r"\bhieu ung nha kinh\b", r"\bnóng lên toàn cầu\b",
        r"\btia uv\b", r"\bchỉ số uv\b", r"\bmùa khô\b", r"\bthời vụ\b",
        # --- Hệ sinh thái, động thực vật & Trái Đất ---
        r"\bhệ sinh thái\b", r"\bhe sinh thai\b", r"\bsinh thái\b", r"\bsinh thai\b",
        r"\bđộng vật\b", r"\bdong vat\b", r"\bthực vật\b", r"\bthuc vat\b", r"\bđộng thực vật\b",
        r"\brừng\b", r"\brung\b", r"\brừng ngập mặn\b", r"\bcây xanh\b", r"\bcay xanh\b",
        r"\bbiển\b", r"\bbiển đông\b", r"\bđại dương\b", r"\bdai duong\b",
        r"\bsan hô\b", r"\bsan ho\b", r"\bcá voi\b", r"\brùa biển\b", r"\bcôn trùng\b",
        r"\bchim\b", r"\bđa dạng sinh học\b", r"\bda dang sinh hoc\b",
        r"\btuyệt chủng\b", r"\btuyet chung\b", r"\bbảo tồn\b", r"\bbao ton\b",
        r"\btrái đất\b", r"\btrai dat\b", r"\bhành tinh\b", r"\bhanh tinh\b",
        r"\btầng ozone\b", r"\bozone\b", r"\bphát thải\b", r"\bphat thai\b",
        r"\bcarbon\b", r"\bco2\b", r"\bnăng lượng tái tạo\b", r"\bnang luong tai tao\b",
        r"\bnăng lượng mặt trời\b", r"\bđiện mặt trời\b", r"\bđiện gió\b",
        r"\bô nhiễm\b", r"\bo nhiem\b", r"\bô nhiễm không khí\b", r"\bô nhiễm nước\b",
        r"\bnước sạch\b", r"\bnuoc sach\b", r"\bnguồn nước\b", r"\bnguon nuoc\b",
        r"\bhạn hán\b", r"\bhan han\b", r"\bxói mòn\b", r"\bxoi mon\b",
        r"\bsa mạc\b", r"\bsa mac\b", r"\bsông\b", r"\bkênh rạch\b", r"\bkenh rach\b",
        r"\bbăng tan\b", r"\bnước biển dâng\b",
    ]

    def is_query_in_scope(self, query: str) -> bool:
        """Kiểm tra xem câu hỏi có thuộc phạm vi hỗ trợ hay không"""
        q_lower = query.lower().strip()

        # Kiểm tra nếu khớp với các mẫu từ chối rõ ràng
        for pattern in self.OUT_OF_SCOPE_PATTERNS:
            if re.search(pattern, q_lower):
                # Ngoại trừ trường hợp có kết hợp rõ ràng với từ khóa môi trường
                if not any(k in q_lower for k in ["rác", "môi trường", "ngập", "xanh", "greenspot"]):
                    return False

        # Kiểm tra sự xuất hiện của từ khóa môi trường hoặc nền tảng
        if any(k in q_lower for k in self.ENVIRONMENTAL_KEYWORDS):
            return True

        # Chủ đề mở rộng: thời tiết – khí hậu – hệ sinh thái – Trái Đất
        return any(re.search(pattern, q_lower) for pattern in self.EXTENDED_SCOPE_PATTERNS)

    def check_scope_and_answer(self, query: str) -> Tuple[bool, str]:
        """
        Kiểm tra phạm vi và sinh câu trả lời tương ứng.
        Trả về: (is_in_scope: bool, response_content: str)
        """
        q_lower = query.lower().strip()

        if not self.is_query_in_scope(query):
            refusal = (
                f"{self.STANDARD_OUT_OF_SCOPE_REFUSAL}\n\n"
                "💡 **Gợi ý các chủ đề bạn có thể hỏi tôi:**\n"
                "• 'Pin cũ, bóng đèn, dầu ăn thừa thì bỏ vào đâu?'\n"
                "• 'Vứt rác bừa bãi vỉa hè bị phạt bao nhiêu tiền?'\n"
                "• 'Hôm nay thời tiết TP.HCM thế nào, có mưa không?'\n"
                "• 'Biến đổi khí hậu ảnh hưởng tới hệ sinh thái Trái Đất ra sao?'\n"
                "• 'Tìm điểm thu gom rác tái chế gần nhất tại TP.HCM'\n"
                "• 'Cách kiếm Điểm Xanh và đổi voucher quà tặng'\n"
                "• 'Hướng dẫn gửi báo cáo ô nhiễm và chụp ảnh hiện trường'"
            )
            return False, refusal

        # Trong phạm vi -> Sinh câu trả lời chuyên môn chuẩn mực
        answer = self._generate_environmental_answer(q_lower)
        return True, answer

    def _generate_environmental_answer(self, q: str) -> str:
        """Sinh câu trả lời chuyên môn sâu dựa trên cơ sở tri thức môi trường chuẩn"""

        # 1. Câu hỏi về Pin cũ, bình ắc quy, rác điện tử, rác nguy hại
        if any(w in q for w in ["pin", "ac quy", "ắc quy", "điện tử", "dien tu", "bóng đèn", "bong den", "nguy hại", "nguy hai"]):
            return (
                "🔋 **Hướng dẫn phân loại & xử lý Pin cũ và Chất thải nguy hại:**\n\n"
                "Pin cũ, ắc quy, bóng đèn huỳnh quang và thiết bị điện tử hỏng thuộc danh mục **Chất thải nguy hại sinh hoạt**. "
                "Tuyệt đối **không vứt chung với rác sinh hoạt** hoặc đốt, vì kim loại nặng (Chì, Thủy ngân, Cadmium) sẽ ngấm vào nguồn nước ngầm và gây ung thư.\n\n"
                "📋 **Các bước xử lý đúng quy chuẩn:**\n"
                "1. **Bọc cách điện:** Dán băng keo vào hai đầu cực của pin để chống đoản mạch gây cháy nổ.\n"
                "2. **Bảo quản:** Cho vào chai/lọ nhựa đậy kín, để xa tầm tay trẻ em.\n"
                "3. **Điểm tiếp nhận:** Mang đến các **Trạm Tái chế & Điểm thu gom pin** tại UBND Phường, chuỗi cửa hàng tiện lợi hoặc siêu thị Co.opmart có thùng rác pin chuyên dụng.\n"
                "4. **Tích lũy Điểm Xanh:** Khi gửi pin tại trạm và quét mã QR trên hệ thống GreenSpot, bạn sẽ nhận được **+20 Điểm Xanh** vào ví!"
                + self.LEGAL_DISCLAIMER
            )

        # 2. Câu hỏi về Mức phạt, tiền phạt theo Nghị định 45/2022/NĐ-CP
        if any(w in q for w in ["phạt", "phat", "tiền phạt", "tien phat", "nghị định 45", "nghi dinh 45", "luật", "luat", "vi phạm", "vi pham"]):
            if any(w in q for w in ["vỉa hè", "via he", "đường", "duong", "sinh hoạt", "bừa bãi", "bua bai"]):
                return (
                    "⚖️ **Quy định xử phạt hành vi xả rác bừa bãi vỉa hè, lòng đường:**\n\n"
                    "Căn cứ **Khoản 2 Điều 25 Nghị định số 45/2022/NĐ-CP** quy định về xử phạt vi phạm hành chính trong lĩnh vực bảo vệ môi trường:\n\n"
                    "• **Mức phạt tiền:** Từ **1.000.000 đồng đến 2.000.000 đồng** đối với hành vi vứt, thải, bỏ rác thải sinh hoạt, đổ nước thải không đúng nơi quy định tại khu chung cư, thương mại, dịch vụ hoặc nơi công cộng (vỉa hè, lòng đường, công viên, hệ thống thoát nước đô thị).\n"
                    "• **Đối với tổ chức vi phạm:** Mức phạt tiền bằng **2 lần** mức phạt đối với cá nhân (từ **2.000.000 đồng đến 4.000.000 đồng**).\n"
                    "• **Biện pháp khắc phục hậu quả:** Buộc khôi phục lại tình trạng môi trường ban đầu; nếu không thực hiện sẽ bị cưỡng chế dọn dẹp và chịu toàn bộ chi phí.\n\n"
                    "📢 *Bạn có thể chụp ảnh và gửi phản ánh qua chức năng **Báo cáo sự cố (STT 18)** trên GreenSpot để cơ quan chức năng kiểm tra và xử lý tại chỗ.*"
                    + self.LEGAL_DISCLAIMER
                )
            elif any(w in q for w in ["đốt", "dot", "khói", "khoi"]):
                return (
                    "🔥 **Quy định xử phạt hành vi đốt chất thải, đốt rác lộ thiên:**\n\n"
                    "Căn cứ **Điều 26 Nghị định số 45/2022/NĐ-CP**:\n"
                    "• Hành vi đốt chất thải rắn sinh hoạt, phụ phẩm nông nghiệp hoặc rác thải công nghiệp gây khói bụi, ô nhiễm không khí trong khu dân cư bị phạt tiền từ **2.000.000 đồng đến 5.000.000 đồng**.\n"
                    "• Trường hợp đốt chất thải nguy hại hoặc đốt rác công nghiệp khối lượng lớn có thể bị xử phạt lên tới **50.000.000 đồng** hoặc truy cứu trách nhiệm hình sự.\n\n"
                    "🌱 *Hãy giữ gìn bầu không khí trong lành cho cộng đồng bằng cách phân loại và giao rác cho đơn vị thu gom định kỳ.*"
                    + self.LEGAL_DISCLAIMER
                )
            else:
                return (
                    "⚖️ **Cơ sở dữ liệu pháp điển xử phạt môi trường (Nghị định 45/2022/NĐ-CP):**\n\n"
                    "Hệ thống GreenSpot tích hợp đầy đủ bộ khung chế tài xử phạt hành chính đối với 4 nhóm vi phạm đô thị:\n"
                    "1. **Vứt rác sinh hoạt nơi công cộng:** Phạt từ **1.000.000đ – 2.000.000đ** (Khoản 2 Điều 25).\n"
                    "2. **Đổ rác thải công nghiệp, phế thải xây dựng (xà bần):** Phạt từ **10.000.000đ – 50.000.000đ** (Khoản 4 Điều 26).\n"
                    "3. **Xả nước thải bẩn vào cống thoát nước mưa, kênh rạch:** Phạt từ **3.000.000đ – 10.000.000đ**.\n"
                    "4. **Gây tiếng ồn vượt quy chuẩn kỹ thuật:** Phạt từ **1.000.000đ – 160.000.000đ** tùy theo mức dBA vượt ngưỡng.\n\n"
                    "💡 *Bạn có thể tra cứu chi tiết tại menu **Tra cứu quy định xử phạt (STT 11)** trên thanh điều hướng.*"
                    + self.LEGAL_DISCLAIMER
                )

        # 3. Câu hỏi về Thời tiết, khí hậu, tia UV, biến đổi khí hậu
        if any(w in q for w in [
            "thời tiết", "thoi tiet", "nhiệt độ", "nhiet do", "dự báo", "du bao",
            "mưa", "nắng", "nóng", "lạnh", "bão", "lũ", "lụt", "triều cường",
            "khí hậu", "khi hau", "biến đổi khí hậu", "uv", "độ ẩm", "do am", "gió",
            "không khí", "khong khi", "chất lượng không khí", "bụi mịn", "bui min", "pm2.5",
        ]):
            return (
                "🌦️ **Thời tiết – Khí hậu: cách tra cứu và ứng phó an toàn**\n\n"
                "**1. Xem số liệu thời tiết cập nhật ngay trên GreenSpot:**\n"
                "• Mở tab **Thời tiết & Chất lượng không khí (AQI)** để xem nhiệt độ, độ ẩm, chỉ số UV và bụi mịn PM2.5 theo từng khung giờ trong ngày.\n"
                "• TP.HCM có 2 mùa rõ rệt: **mùa mưa (khoảng tháng 5 – 11)** và **mùa khô (khoảng tháng 12 – 4)**, nhiệt độ trung bình 26–34°C, độ ẩm cao 75–85%.\n\n"
                "**2. Khuyến cáo sức khỏe & an toàn theo thời tiết:**\n"
                "• **Nắng nóng trên 35°C hoặc chỉ số UV từ 8 trở lên:** hạn chế ra đường 11h–15h, uống đủ nước, đội mũ rộng vành và dùng kem chống nắng SPF 30+.\n"
                "• **Mưa lớn, dông sét:** không trú dưới tán cây lớn hay cột điện; theo dõi **bản đồ ngập** để chọn tuyến đường an toàn.\n"
                "• **Không khí ô nhiễm (AQI trên 100):** đeo khẩu trang N95 khi ra ngoài, hạn chế tập thể dục ngoài trời, đóng cửa sổ vào giờ cao điểm.\n\n"
                "**3. Liên hệ với biến đổi khí hậu:** Nhiệt độ trung bình toàn cầu tăng chủ yếu do phát thải CO₂ và các khí nhà kính. TP.HCM thuộc nhóm đô thị chịu tác động mạnh của **nước biển dâng và triều cường**, nên giảm rác nhựa, phân loại rác tại nguồn và tiết kiệm điện chính là hành động giảm phát thải thiết thực.\n\n"
                "💡 *Khi mưa lớn kéo dài, bạn có thể dùng **Tìm lộ trình an toàn tránh ngập (STT 41)** và **Flood SOS (STT 46)** trên GreenSpot.*"
                + self.LEGAL_DISCLAIMER
            )

        # 4. Câu hỏi về Hệ sinh thái, động – thực vật, Trái Đất
        if any(w in q for w in [
            "hệ sinh thái", "he sinh thai", "sinh thái", "sinh thai", "động vật", "dong vat",
            "thực vật", "thuc vat", "rừng", "rung", "biển", "bien", "đại dương", "dai duong",
            "san hô", "san ho", "côn trùng", "con trung", "đa dạng sinh học", "da dang sinh hoc",
            "tuyệt chủng", "tuyet chung", "trái đất", "trai dat", "ozone", "carbon", "co2",
            "phát thải", "phat thai", "năng lượng tái tạo", "nang luong tai tao",
        ]):
            return (
                "🌍 **Hệ sinh thái & Trái Đất: vì sao mỗi hành động nhỏ đều quan trọng**\n\n"
                "**1. Hệ sinh thái là gì?** Là cộng đồng sinh vật (động vật, thực vật, vi sinh vật) cùng môi trường sống, liên kết với nhau qua chuỗi thức ăn và vòng tuần hoàn vật chất. Một mắt xích bị phá vỡ sẽ ảnh hưởng toàn hệ.\n\n"
                "**2. Hệ sinh thái tiêu biểu gần bạn:**\n"
                "• **Rừng ngập mặn Cần Giờ** – Khu dự trữ sinh quyển thế giới (UNESCO 2000): lá phổi xanh, bức tường chắn sóng, bãi ươm tôm cá và hấp thụ carbon rất tốt.\n"
                "• **Rạn san hô và thảm cỏ biển ven biển** – nơi sinh sản của hàng trăm loài hải sản, rất nhạy cảm với rác nhựa và nước thải.\n"
                "• **Mảng xanh đô thị, công viên, kênh rạch** – giảm nhiệt độ, giữ nước mưa và là nơi trú ngụ của chim, côn trùng thụ phấn.\n\n"
                "**3. Mối đe dọa chính:** rác nhựa và vi nhựa, phá rừng, khai thác quá mức, ô nhiễm nguồn nước, cùng biến đổi khí hậu (nhiệt độ tăng, nước biển dâng làm mất nơi cư trú và gây tẩy trắng san hô).\n\n"
                "**4. Bạn có thể làm ngay:**\n"
                "• Phân loại rác tại nguồn, nói không với túi nilon dùng một lần và hộp xốp.\n"
                "• Gửi báo cáo ô nhiễm kèm ảnh + GPS qua GreenSpot để cơ quan chức năng xử lý.\n"
                "• Tham gia chiến dịch **Chủ Nhật Xanh**, nhặt rác kênh rạch, trồng và chăm sóc cây xanh.\n"
                "• Tiết kiệm điện – nước, ưu tiên năng lượng tái tạo để giảm phát thải CO₂.\n\n"
                "🌱 *Mỗi lượt phân loại rác đúng cách được ghi nhận **Điểm Xanh**, góp phần bảo vệ chính hệ sinh thái bạn đang sống.*"
                + self.LEGAL_DISCLAIMER
            )



        # 5. Câu hỏi về Rác hữu cơ, rác tái chế, rác thải sinh hoạt
        if any(w in q for w in ["hữu cơ", "huu co", "tái chế", "tai che", "nhựa", "nhua", "hộp xốp", "hop xop", "chai lọ", "chai lo", "lá cây", "thực phẩm"]):
            return (
                "♻️ **Cẩm nang phân loại chất thải rắn sinh hoạt tại nguồn (theo Luật BVMT 2020):**\n\n"
                "Chất thải sinh hoạt đô thị được phân chia thành **3 nhóm chính**:\n\n"
                "1. **Rác thực phẩm / Hữu cơ (Thùng Xanh Lá):**\n"
                "   - Gồm: Thức ăn thừa, rau củ quả hư, vỏ trứng, bã trà, cà phê, lá cây vườn...\n"
                "   - Xử lý: Dùng làm phân bón hữu cơ (compost) hoặc ủ vi sinh.\n\n"
                "2. **Rác tái chế (Thùng Xanh Dương / Trắng):**\n"
                "   - Gồm: Giấy báo, thùng carton, vỏ lon nhôm, chai nhựa PET trong suốt, kim loại...\n"
                "   - Xử lý: Súc sạch nước đọng, ép bẹp để tiết kiệm diện tích và đem đến Trạm Tái chế.\n\n"
                "3. **Rác sinh hoạt khác / Vô cơ (Thùng Xám / Vàng):**\n"
                "   - Gồm: Hộp xốp đựng thức ăn, túi nilon dùng 1 lần, tã bỉm, băng vệ sinh, gốm sứ vỡ...\n"
                "   - Xử lý: Đóng bao kín giao cho đơn vị thu gom rác chôn lấp hợp vệ sinh."
                + self.LEGAL_DISCLAIMER
            )

        # 6. Câu hỏi về Trạm tái chế, điểm thu gom
        if any(w in q for w in ["trạm tái chế", "tram tai che", "điểm thu gom", "diem thu gom", "thu hồi", "thu hoi", "tìm trạm"]):
            return (
                "📍 **Mạng lưới Trạm Tái chế & Điểm tiếp nhận chất thải GreenSpot:**\n\n"
                "Hệ thống GreenSpot quản lý mạng lưới trạm tái chế phủ rộng khắp 22 quận/huyện TP.HCM:\n"
                "• **Loại rác tiếp nhận:** Pin cũ, rác điện tử, chai nhựa PET, lon nhôm, vỏ hộp giấy Tetra Pak.\n"
                "• **Giờ mở cửa thông thường:** Từ 08:00 đến 17:00 các ngày trong tuần (một số điểm mở cả thứ Bảy & Chủ Nhật).\n"
                "• **Quyền lợi công dân:** Mỗi lần mang rác tái chế đến trạm, bạn có thể dùng ứng dụng quét mã QR dán tại trạm để nhận **+20 đến +50 Điểm Xanh**!\n\n"
                "🔍 *Hãy mở mục **Trạm tái chế (STT 23)** trên bản đồ để xem điểm thu gom gần tọa độ của bạn nhất cùng lộ trình dẫn đường tối ưu.*"
            )

        # 7. Câu hỏi về Điểm xanh, tích điểm, đổi quà, cấp bậc Công dân Xanh
        if any(w in q for w in ["điểm xanh", "diem xanh", "tích điểm", "tich diem", "đổi quà", "doi qua", "thăng hạng", "thang hang", "công dân xanh", "voucher"]):
            return (
                "🌟 **Cơ chế tích lũy Điểm thưởng Công dân Xanh (Green Point Policy):**\n\n"
                "**1. Bảng điểm thưởng hành động xanh:**\n"
                "• **Báo cáo sự cố môi trường:** +50 điểm khi gửi phản ánh GPS; +100 điểm khi sự cố được dọn sạch.\n"
                "• **Check-in chiến dịch Chủ Nhật Xanh:** +50 điểm có mặt tại hiện trường.\n"
                "• **Quét mã QR tại trạm tái chế:** +20 điểm/lần phân loại rác.\n"
                "• **Thả cảm xúc sinh thái (Eco-Reactions):** +2 điểm/lượt tương tác (tối đa 20 điểm/ngày).\n"
                "• **Hoàn thành thử thách tuần:** +30 điểm/nhiệm vụ; +100 điểm combo tuần.\n\n"
                "**2. Hệ thống cấp bậc danh hiệu:**\n"
                "• 🥉 **Cấp 1 - Hạng Đồng (0 - 499 điểm):** Cấp khởi đầu công dân mới.\n"
                "• 🥈 **Cấp 2 - Hạng Bạc (500 - 999 điểm):** Mở khóa kho voucher mua sắm giảm giá.\n"
                "• 🥇 **Cấp 3 - Hạng Vàng (1.000 - 1.999 điểm):** Huy hiệu vinh danh, ưu tiên xử lý phản ánh.\n"
                "• 💎 **Cấp 4 - Hạng Kim Cương (Từ 2.000 điểm):** Danh hiệu Đại sứ Môi trường đô thị!\n\n"
                "🎁 *Bạn có thể vào mục **Ví điểm (STT 29)** để xem chi tiết sao kê và đổi quà tặng sinh thái.*"
            )

        # 8. Câu hỏi về Báo cáo sự cố, bản đồ AQI, tránh ngập, SOS
        if any(w in q for w in ["báo cáo sự cố", "bao cao su co", "gửi phản ánh", "gui phan anh", "chụp ảnh", "bản đồ", "aqi", "ngập", "sos"]):
            return (
                "📱 **Hướng dẫn sử dụng các tiện ích thông minh trên GreenSpot:**\n\n"
                "1. **Báo cáo điểm rác / ô nhiễm (STT 18):** Bấm nút Báo cáo -> Hệ thống tự bắt tọa độ GPS -> Chọn loại sự cố (Rác thải/Ngập úng/Ô nhiễm) -> Chụp ảnh có watermark thời gian -> Nhập mô tả (hoặc thu âm giọng nói) -> Gửi phản ánh.\n"
                "2. **Bản đồ nhiệt chất lượng không khí AQI (STT 33):** Xem bản đồ màu trực quan cảnh báo bụi mịn PM2.5 theo 6 mức (Xanh lá - Tốt đến Nâu - Nguy hại), tự động cập nhật mỗi 30 phút.\n"
                "3. **Tìm lộ trình an toàn tránh ngập (STT 41):** Nhập điểm đi và điểm đến -> Hệ thống tính toán đối chiếu cảm biến ngập IoT để đề xuất tuyến đường an toàn nhất.\n"
                "4. **Cứu hộ khẩn cấp Flood SOS (STT 46):** Trong tình huống ngập sâu nguy hiểm, phát tín hiệu SOS để kết nối trực tiếp với đội cứu hộ gần nhất trong bán kính 3km."
            )

        # 9. Mặc định nếu trong phạm vi môi trường nói chung
        return (
            "🌱 **Trợ lý AI Môi trường GreenSpot sẵn sàng hỗ trợ bạn:**\n\n"
            "Tôi có thể giải đáp chi tiết cho bạn về:\n"
            "• Hướng dẫn phân loại các loại rác sinh hoạt, rác tái chế, rác điện tử tại nhà.\n"
            "• Tra cứu mức phạt tiền và quy định bảo vệ môi trường theo Nghị định 45/2022/NĐ-CP.\n"
            "• Tìm vị trí trạm tái chế và điểm tiếp nhận rác nguy hại tại TP.HCM.\n"
            "• Cách tính Điểm Xanh, đổi voucher quà tặng và thăng hạng Công dân Xanh.\n"
            "• Hướng dẫn gửi báo cáo ô nhiễm, xem bản đồ AQI và cảnh báo ngập lụt.\n"
            "• Thời tiết, nhiệt độ, tia UV, mưa bão và biến đổi khí hậu.\n"
            "• Hệ sinh thái, động – thực vật, rừng ngập mặn, biển và các vấn đề toàn cầu của Trái Đất.\n\n"
            "Hãy đặt câu hỏi cụ thể để tôi hỗ trợ bạn tốt nhất nhé!"
            + self.LEGAL_DISCLAIMER
        )

