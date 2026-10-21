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
        return any(k in q_lower for k in self.ENVIRONMENTAL_KEYWORDS)

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
                "• *'Pin cũ, bóng đèn, dầu ăn thừa thì bỏ vào đâu?'*\n"
                "• *'Vứt rác bừa bãi vỉa hè bị phạt bao nhiêu tiền?'*\n"
                "• *'Tìm điểm thu gom rác tái chế gần nhất tại TP.HCM'*\n"
                "• *'Cách kiếm Điểm Xanh và đổi voucher quà tặng'* \n"
                "• *'Hướng dẫn gửi báo cáo ô nhiễm và chụp ảnh hiện trường'*"
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

        # 3. Câu hỏi về Rác hữu cơ, rác tái chế, rác thải sinh hoạt
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

        # 4. Câu hỏi về Trạm tái chế, điểm thu gom
        if any(w in q for w in ["trạm tái chế", "tram tai che", "điểm thu gom", "diem thu gom", "thu hồi", "thu hoi", "tìm trạm"]):
            return (
                "📍 **Mạng lưới Trạm Tái chế & Điểm tiếp nhận chất thải GreenSpot:**\n\n"
                "Hệ thống GreenSpot quản lý mạng lưới trạm tái chế phủ rộng khắp 22 quận/huyện TP.HCM:\n"
                "• **Loại rác tiếp nhận:** Pin cũ, rác điện tử, chai nhựa PET, lon nhôm, vỏ hộp giấy Tetra Pak.\n"
                "• **Giờ mở cửa thông thường:** Từ 08:00 đến 17:00 các ngày trong tuần (một số điểm mở cả thứ Bảy & Chủ Nhật).\n"
                "• **Quyền lợi công dân:** Mỗi lần mang rác tái chế đến trạm, bạn có thể dùng ứng dụng quét mã QR dán tại trạm để nhận **+20 đến +50 Điểm Xanh**!\n\n"
                "🔍 *Hãy mở mục **Trạm tái chế (STT 23)** trên bản đồ để xem điểm thu gom gần tọa độ của bạn nhất cùng lộ trình dẫn đường tối ưu.*"
            )

        # 5. Câu hỏi về Điểm xanh, tích điểm, đổi quà, cấp bậc Công dân Xanh
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

        # 6. Câu hỏi về Báo cáo sự cố, bản đồ AQI, tránh ngập, SOS
        if any(w in q for w in ["báo cáo sự cố", "bao cao su co", "gửi phản ánh", "gui phan anh", "chụp ảnh", "bản đồ", "aqi", "ngập", "sos"]):
            return (
                "📱 **Hướng dẫn sử dụng các tiện ích thông minh trên GreenSpot:**\n\n"
                "1. **Báo cáo điểm rác / ô nhiễm (STT 18):** Bấm nút Báo cáo -> Hệ thống tự bắt tọa độ GPS -> Chọn loại sự cố (Rác thải/Ngập úng/Ô nhiễm) -> Chụp ảnh có watermark thời gian -> Nhập mô tả (hoặc thu âm giọng nói) -> Gửi phản ánh.\n"
                "2. **Bản đồ nhiệt chất lượng không khí AQI (STT 33):** Xem bản đồ màu trực quan cảnh báo bụi mịn PM2.5 theo 6 mức (Xanh lá - Tốt đến Nâu - Nguy hại), tự động cập nhật mỗi 30 phút.\n"
                "3. **Tìm lộ trình an toàn tránh ngập (STT 41):** Nhập điểm đi và điểm đến -> Hệ thống tính toán đối chiếu cảm biến ngập IoT để đề xuất tuyến đường an toàn nhất.\n"
                "4. **Cứu hộ khẩn cấp Flood SOS (STT 46):** Trong tình huống ngập sâu nguy hiểm, phát tín hiệu SOS để kết nối trực tiếp với đội cứu hộ gần nhất trong bán kính 3km."
            )

        # 7. Mặc định nếu trong phạm vi môi trường nói chung
        return (
            "🌱 **Trợ lý AI Môi trường GreenSpot sẵn sàng hỗ trợ bạn:**\n\n"
            "Tôi có thể giải đáp chi tiết cho bạn về:\n"
            "• Hướng dẫn phân loại các loại rác sinh hoạt, rác tái chế, rác điện tử tại nhà.\n"
            "• Tra cứu mức phạt tiền và quy định bảo vệ môi trường theo Nghị định 45/2022/NĐ-CP.\n"
            "• Tìm vị trí trạm tái chế và điểm tiếp nhận rác nguy hại tại TP.HCM.\n"
            "• Cách tính Điểm Xanh, đổi voucher quà tặng và thăng hạng Công dân Xanh.\n"
            "• Hướng dẫn gửi báo cáo ô nhiễm, xem bản đồ AQI và cảnh báo ngập lụt.\n\n"
            "Hãy đặt câu hỏi cụ thể để tôi hỗ trợ bạn tốt nhất nhé!"
            + self.LEGAL_DISCLAIMER
        )

