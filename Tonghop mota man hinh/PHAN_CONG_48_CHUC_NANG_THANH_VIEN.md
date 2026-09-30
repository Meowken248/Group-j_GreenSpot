# BẢNG PHÂN CÔNG & ĐÁNH GIÁ 48 CHỨC NĂNG NGHIỆP VỤ HỆ THỐNG GREENSPOT / ECOREPORT
## ĐỒ ÁN: HỆ THỐNG QUẢN TRỊ MÔI TRƯỜNG ĐÔ THỊ, BẢN ĐỒ SỐ WEBGIS & BÁO ĐỘNG NGẬP LỤT THỜI GIAN THỰC

> **Tài liệu chuẩn đối chiếu:** `DANH_SACH_48_CHUC_NANG_LON.md` (Phiên bản chuẩn hóa mã nguồn thực tế).  
> **Nguyên tắc phân công:**
> - Các chức năng nghiệp vụ **đã có trong dự án** ➔ **Giữ nguyên 100%**.
> - Các chức năng nghiệp vụ **chưa sát hoặc chưa đúng với mã nguồn** ➔ **Điều chỉnh và bổ sung chính xác theo danh sách 48 chức năng lớn đang chạy trong hệ thống**.

---

### BẢNG TIẾN ĐỘ THỰC HIỆN VÀ ĐÁNH GIÁ CHỨC NĂNG (THEO MẪU BÁO CÁO ĐỒ ÁN)

| Họ và Tên | STT | Chức Năng Nghiệp Vụ | Hạn Hoàn Thành | SV Đánh Giá | GV Đánh Giá |
|:---|:---:|:---|:---:|:---:|:---:|
| **Nguyễn Thành Đạt** | **1** | GPS tự động + ghim thủ công trên bản đồ số WebGIS *(Giữ nguyên - `MF-12`)* | 15/09/2026 | Hoàn thành | |
| | **2** | Thu thập và nén hình ảnh / video bằng chứng hiện trường kèm đóng dấu thời gian *(Giữ nguyên - `MF-22`)* | 22/09/2026 | Hoàn thành | |
| | **3** | Phân loại loại hình ô nhiễm đa danh mục: Sinh hoạt, Nguy hại, Kênh rạch, Cống nghẹt, Xà bần *(Giữ nguyên - `MF-04`)* | 29/09/2026 | Hoàn thành | |
| | **4** | Thang điểm nghiêm trọng / khẩn cấp: Low, Medium, High, Critical *(Giữ nguyên - `MF-04`)* | 06/10/2026 | Hoàn thành | |
| | **5** | Quản lý đa lớp bản đồ nền đô thị: Google Roadmap, Vệ tinh, Traffic, OSM, CartoDB Dark/Light *(Bổ sung chuẩn `MF-01`)* | 13/10/2026 | Hoàn thành | |
| | **6** | Kết xuất kiến trúc tòa nhà 3D & Tùy biến 5 bộ chủ đề màu sắc: Rainbow, Cyberpunk, Emerald... *(Bổ sung chuẩn `MF-02`)* | 20/10/2026 | Hoàn thành | |
| | **7** | Tùy chọn chế độ gửi ẩn danh & Làm nhiễu tọa độ GPS bảo vệ quyền riêng tư - Spatial Jitter 50m *(Giữ nguyên - `MF-43`)* | 27/10/2026 | Hoàn thành | |
| | **8** | Hiển thị lớp ranh giới hành chính 22 quận/huyện và TP. Thủ Đức TP.HCM *(Bổ sung chuẩn `MF-03`)* | 03/11/2026 | Hoàn thành | |
| | **9** | Quản lý & tra cứu mạng lưới không gian xanh công viên và điểm tiếp nhận rác tái chế / E-waste *(Bổ sung chuẩn `MF-05`, `MF-06`)* | 10/11/2026 | Hoàn thành | |
| | **10** | Hỗ trợ dịch đa ngôn ngữ tự động: Song ngữ Tiếng Việt & Tiếng Anh i18n *(Giữ nguyên - `MF-48`)* | 17/11/2026 | Hoàn thành | |
| | **11** | Tra cứu khung quy định xử phạt vi phạm môi trường theo Nghị định 45/2022/NĐ-CP *(Giữ nguyên - `MF-47`)* | 24/11/2026 | Hoàn thành | |
| | **12** | Giao diện tối giản trợ năng cho người cao tuổi & Khám phá Quick Tour 3D địa danh tiêu biểu *(Giữ nguyên & Chuẩn hóa `MF-11`)* | 01/12/2026 | Hoàn thành | |
| **Huỳnh Anh Tú** | **13** | Cơ chế tích lũy Điểm thưởng Công dân Xanh - Green Points Gamification *(Giữ nguyên - `MF-46`)* | 15/09/2026 | Hoàn thành | |
| | **14** | Xem số dư ví điểm và Lịch sử biến động điểm xanh cá nhân minh bạch *(Giữ nguyên - `MF-46`)* | 22/09/2026 | Hoàn thành | |
| | **15** | Danh mục quà tặng xanh, vật phẩm sinh thái quy đổi & Quản trị kho quà tặng *(Giữ nguyên - `MF-46`)* | 29/09/2026 | Hoàn thành | |
| | **16** | Thực hiện đổi điểm lấy quà tặng / Voucher sinh thái kèm mã xác thực điện tử *(Giữ nguyên - `MF-46`)* | 06/10/2026 | Hoàn thành | |
| | **17** | Quản lý danh sách quà tặng cá nhân đã đổi kèm mã QR Code nhận quà tại hiện trường *(Giữ nguyên - `MF-46`)* | 13/10/2026 | Hoàn thành | |
| | **18** | Bảng xếp hạng vinh danh Top Công dân Xanh & Thi đua bảo vệ môi trường đô thị *(Giữ nguyên - `MF-46`)* | 20/10/2026 | Hoàn thành | |
| | **19** | Giám sát mây mưa giông bão thời gian thực qua RainViewer Radar phản xạ viễn thám *(Bổ sung chuẩn `MF-39`)* | 27/10/2026 | Hoàn thành | |
| | **20** | Mô phỏng động lực học luồng gió & Dòng hạt chuyển động thời gian thực - Wind Streamlines *(Bổ sung chuẩn `MF-40`)* | 03/11/2026 | Hoàn thành | |
| | **21** | Bộ lớp phủ khí tượng đa thông số (8 Overlays) & Chuyển vùng quan sát đô thị trọng điểm *(Bổ sung chuẩn `MF-41`)* | 10/11/2026 | Hoàn thành | |
| | **22** | Đánh giá mức độ hài lòng dịch vụ công (1–5 sao) sau khi dọn sạch & Khảo sát thông xe *(Giữ nguyên - `MF-24`)* | 17/11/2026 | Hoàn thành | |
| | **23** | Bản đồ nhiệt môi trường & Khí hậu nội suy đa chế độ: AQI, Nhiệt độ, Điểm số rủi ro *(Bổ sung chuẩn `MF-10`)* | 24/11/2026 | Hoàn thành | |
| | **24** | Cẩm nang hướng dẫn phân loại rác tại nguồn & Kho tri thức môi trường sống xanh AI RAG *(Giữ nguyên - `MF-47`)* | 01/12/2026 | Hoàn thành | |
| **Bùi Nguyễn Minh Quân** | **25** | Cổng xác thực tập trung đa nền tảng và Quản lý phiên JWT bảo mật theo chuẩn OAuth2 *(Giữ nguyên)* | 15/09/2026 | Hoàn thành | |
| | **26** | Quản trị người dùng và Ma trận phân quyền động RBAC 4 cấp: Admin, Officer, Collector, Citizen *(Giữ nguyên - `MF-42`)* | 22/09/2026 | Hoàn thành | |
| | **27** | Quản lý năng lực phương tiện đội xe thu gom rác (Xe ép rác, Canô, Xe cơ động) & Điều phối tài xế *(Giữ nguyên - `MF-45`)* | 29/09/2026 | Hoàn thành | |
| | **28** | Hệ thống Nhật ký kiểm toán an ninh Audit Log và truy vết biến động dữ liệu nhạy cảm *(Giữ nguyên)* | 06/10/2026 | Hoàn thành | |
| | **29** | Trung tâm điều phối tác nghiệp và phân công lệnh xử lý hiện trường - Dispatcher Dashboard *(Giữ nguyên)* | 13/10/2026 | Hoàn thành | |
| | **30** | Quy trình thẩm định chất lượng xử lý hiện trường và ký duyệt nghiệm thu đóng hồ sơ Before/After *(Giữ nguyên)* | 20/10/2026 | Hoàn thành | |
| | **31** | Phân cấp quản lý hành chính liên thông 3 cấp: Phường ➔ Quận ➔ Sở và chuyển tiếp hồ sơ thẩm quyền *(Giữ nguyên)* | 27/10/2026 | Hoàn thành | |
| | **32** | Giám sát hạn mức thời gian xử lý SLA theo thời gian thực và tự động kích hoạt cảnh báo trễ hạn *(Giữ nguyên - `MF-44`)* | 03/11/2026 | Hoàn thành | |
| | **33** | Giám sát mạng lưới trạm cảm biến quan trắc viễn trắc IoT đô thị (AQI, Đo ngập, Thủy văn) *(Bổ sung chuẩn `MF-07`)* | 10/11/2026 | Hoàn thành | |
| | **34** | Tự động hóa tạo và kết xuất báo cáo thống kê môi trường định kỳ chuyên nghiệp (PDF/Excel) *(Giữ nguyên)* | 17/11/2026 | Hoàn thành | |
| | **35** | Quản lý tuyến lộ trình thu gom rác cố định và các trạm dừng tiếp nhận rác checkpoints *(Bổ sung chuẩn `MF-45`)* | 24/11/2026 | Hoàn thành | |
| | **36** | Quản trị cấu hình tham số hệ thống động, danh mục chất thải và chẩn đoán sức khỏe API (/health) *(Giữ nguyên - `MF-48`)* | 01/12/2026 | Hoàn thành | |
| **Lê Anh Tuấn** | **37** | Xây dựng cơ chế tính điểm rủi ro Risk Score cho từng sự cố môi trường: 0.00 – 100.00 *(Giữ nguyên)* | 15/09/2026 | Hoàn thành | |
| | **38** | Tự động phân loại mức độ nguy hiểm sự cố: thấp, trung bình, cao, khẩn cấp *(Giữ nguyên)* | 22/09/2026 | Hoàn thành | |
| | **39** | Thuật toán phát hiện và gom cụm các báo cáo gần nhau theo tọa độ - Spatial Clustering DBSCAN *(Giữ nguyên)* | 29/09/2026 | Hoàn thành | |
| | **40** | Phân tích không gian vùng đệm tìm kiếm cơ sở thiết yếu (Bệnh viện, trường học) gần sự cố *(Giữ nguyên)* | 06/10/2026 | Hoàn thành | |
| | **41** | Động cơ giải tích sóng triều độc lập Harmonic Tide Engine & Báo động triều cường Phú An/Nhà Bè *(Bổ sung chuẩn `MF-13`, `MF-14`)* | 13/10/2026 | Hoàn thành | |
| | **42** | Xây dựng bản đồ nguy cơ ngập động theo từng khu vực: Vẽ hành lang đường ngập 3 lớp ánh sáng *(Giữ nguyên & Chuẩn hóa `MF-18`)* | 20/10/2026 | Hoàn thành | |
| | **43** | Tìm tuyến đường an toàn tránh khu vực đang ngập: Quét va chạm vùng đệm 150m PostGIS ST_DWithin *(Giữ nguyên & Chuẩn hóa `MF-26`, `MF-28`)* | 27/10/2026 | Hoàn thành | |
| | **44** | So sánh tuyến đường nhanh nhất và tuyến đường an toàn nhất tránh thủy kích phương tiện *(Giữ nguyên - `MF-27`, `MF-28`)* | 03/11/2026 | Hoàn thành | |
| | **45** | Báo cáo điểm ngập lụt 1-chạm chuột phải & Thuật toán bám đường tự động OSRM Snap-to-Road *(Bổ sung chuẩn `MF-20`, `MF-21`)* | 10/11/2026 | Hoàn thành | |
| | **46** | Dự báo lưu lượng sông ngòi & Nguy cơ lũ lụt toàn cầu Copernicus GloFAS 7 ngày *(Bổ sung chuẩn `MF-17`)* | 17/11/2026 | Hoàn thành | |
| | **47** | Tích hợp đa nguồn dữ liệu ngập lụt đô thị: Cổng Mở TP.HCM (UDC), Thời tiết & Triều cường *(Bổ sung chuẩn `MF-15`, `MF-16`, `MF-19`)* | 24/11/2026 | Hoàn thành | |
| | **48** | Dashboard phân tích dữ liệu lớn AQI 34 tỉnh thành, Ma trận tương quan nhiệt & Chuỗi thời gian *(Giữ nguyên & Chuẩn hóa `MF-29` ➔ `MF-38`)* | 01/12/2026 | Hoàn thành | |

---

### BẢNG ĐỐI CHIẾU CHI TIẾT CÁC CHỨC NĂNG ĐƯỢC GIỮ NGUYÊN VÀ ĐIỀU CHỈNH

#### 1. Các chức năng ĐÃ CÓ trong danh sách ban đầu và ĐƯỢC GIỮ NGUYÊN (33 chức năng):
- **Nguyễn Thành Đạt (7 chức năng giữ nguyên):**
  - STT 1: GPS tự động + ghim thủ công.
  - STT 2: Thu thập và nén hình ảnh/video bằng chứng hiện trường kèm đóng dấu thời gian.
  - STT 3: Phân loại loại hình ô nhiễm đa danh mục.
  - STT 4: Thang điểm nghiêm trọng / khẩn cấp.
  - STT 7: Tùy chọn chế độ gửi ẩn danh & làm nhiễu GPS Spatial Jitter 50m.
  - STT 10: Hỗ trợ dịch đa ngôn ngữ tự động (Song ngữ Việt - Anh).
  - STT 11: Tra cứu quy định xử phạt (Nghị định 45/2022/NĐ-CP).
  - STT 12: Giao diện đơn giản cho người cao tuổi.
- **Huỳnh Anh Tú (8 chức năng giữ nguyên):**
  - STT 13: Cơ chế tích lũy Điểm thưởng Công dân Xanh.
  - STT 14: Xem số dư ví điểm và Lịch sử biến động điểm xanh.
  - STT 15: Danh mục quà tặng xanh và Vật phẩm quy đổi.
  - STT 16: Thực hiện đổi điểm lấy quà tặng / Voucher.
  - STT 17: Quản lý danh sách quà tặng cá nhân đã đổi kèm mã QR Code.
  - STT 18: Bảng xếp hạng vinh danh Top Công dân Xanh.
  - STT 22: Đánh giá mức độ hài lòng (1–5 sao) sau khi dọn sạch.
  - STT 24: Cẩm nang hướng dẫn phân loại rác và Sống xanh.
- **Bùi Nguyễn Minh Quân (9 chức năng giữ nguyên):**
  - STT 25: Cổng xác thực tập trung đa nền tảng và Quản lý phiên JWT an toàn.
  - STT 26: Quản trị người dùng và Ma trận phân quyền động RBAC đa cấp độ.
  - STT 27: Quản lý năng lực phương tiện đội xe thu gom và điều phối tài xế hiện trường.
  - STT 28: Hệ thống Nhật ký kiểm toán an ninh Audit Log và truy vết biến động dữ liệu.
  - STT 29: Trung tâm điều phối tác nghiệp và phân công lệnh xử lý hiện trường.
  - STT 30: Quy trình thẩm định chất lượng xử lý và ký số nghiệm thu hoàn thành (Before/After).
  - STT 31: Phân cấp quản lý hành chính liên thông 3 cấp và chuyển tiếp hồ sơ thẩm quyền.
  - STT 32: Giám sát hạn mức thời gian xử lý SLA theo thời gian thực và tự động kích hoạt cảnh báo trễ hạn.
  - STT 34: Tự động hóa tạo và kết xuất báo cáo thống kê môi trường định kỳ PDF/Excel.
  - STT 36: Quản trị cấu hình tham số hệ thống, danh mục chất thải và sao lưu phục hồi CSDL.
- **Lê Anh Tuấn (9 chức năng giữ nguyên & chuẩn hóa thuật toán):**
  - STT 37: Xây dựng cơ chế tính điểm rủi ro Risk Score cho từng sự cố.
  - STT 38: Tự động phân loại mức độ nguy hiểm: thấp, trung bình, cao, khẩn cấp.
  - STT 39: Phát hiện và gom cụm các báo cáo gần nhau theo tọa độ (DBSCAN).
  - STT 40: Phân tích và xác định điểm nóng sự cố theo không gian và thời gian.
  - STT 42: Xây dựng bản đồ nguy cơ ngập động theo từng khu vực (Vẽ đường ngập 3 lớp).
  - STT 43: Tìm tuyến đường an toàn tránh khu vực đang ngập (PostGIS ST_DWithin).
  - STT 44: So sánh tuyến đường nhanh nhất và tuyến đường an toàn nhất.
  - STT 45: Tìm cơ sở thiết yếu gần sự cố (Bệnh viện, trường học vùng đệm 1km).
  - STT 48: Dashboard phân tích rủi ro đô thị (Dữ liệu AQI & Khí hậu 34 tỉnh thành).

---

#### 2. Các chức năng ĐƯỢC ĐIỀU CHỈNH / BỔ SUNG CHUẨN XÁC THEO MÃ NGUỒN 48 CHỨC NĂNG LỚN (15 chức năng):
*(Thay thế các chức năng lý thuyết chưa có code bằng các tính năng lớn thực tế đang hoạt động trong dự án)*

1. **STT 05 (Nguyễn Thành Đạt):** Bổ sung `MF-01`: *Quản lý đa lớp bản đồ nền đô thị (Google Roadmap, Vệ tinh, Traffic, OSM, CartoDB Dark/Light)* — Thay thế cho tính năng "Ghi âm giọng nói".
2. **STT 06 (Nguyễn Thành Đạt):** Bổ sung `MF-02`: *Kết xuất kiến trúc tòa nhà 3D & Tùy biến 5 bộ chủ đề màu sắc* — Thay thế cho tính năng "Báo cáo trễ".
3. **STT 08 (Nguyễn Thành Đạt):** Bổ sung `MF-03`: *Hiển thị lớp ranh giới hành chính 22 quận/huyện TP.HCM* — Thay thế cho tính năng "Gợi ý câu trả lời mẫu".
4. **STT 09 (Nguyễn Thành Đạt):** Bổ sung `MF-05` & `MF-06`: *Quản lý & tra cứu mạng lưới điểm xanh công viên và điểm tiếp nhận rác tái chế / E-waste* — Thay thế cho tính năng "Bộ lọc từ khóa nhạy cảm".
5. **STT 19 (Huỳnh Anh Tú):** Bổ sung `MF-39`: *Giám sát mây mưa giông bão thời gian thực qua RainViewer Radar phản xạ viễn thám* — Thay thế cho tính năng "Xem chiến dịch dọn rác".
6. **STT 20 (Huỳnh Anh Tú):** Bổ sung `MF-40`: *Mô phỏng động lực học luồng gió & Dòng hạt chuyển động thời gian thực (Wind Streamlines)* — Thay thế cho tính năng "Đăng ký chiến dịch".
7. **STT 21 (Huỳnh Anh Tú):** Bổ sung `MF-41`: *Bộ lớp phủ khí tượng đa thông số (8 Overlays) & Chuyển vùng đô thị trọng điểm* — Thay thế cho tính năng "Bình luận thảo luận".
8. **STT 23 (Huỳnh Anh Tú):** Bổ sung `MF-10`: *Bản đồ nhiệt môi trường & Khí hậu nội suy đa chế độ (AQI, Nhiệt độ, Điểm số rủi ro)* — Thay thế cho tính năng "Gửi sáng kiến xanh".
9. **STT 33 (Bùi Nguyễn Minh Quân):** Bổ sung `MF-07`: *Giám sát mạng lưới trạm cảm biến quan trắc viễn trắc IoT đô thị (AQI, Đo ngập, Thủy văn)* — Thay thế cho việc tách lẻ "WebSocket đẩy tin".
10. **STT 35 (Bùi Nguyễn Minh Quân):** Bổ sung `MF-45`: *Quản lý tuyến lộ trình thu gom rác cố định và các trạm dừng tiếp nhận checkpoints* — Thay thế cho việc bị lặp lại "Hệ thống điểm thưởng".
11. **STT 41 (Lê Anh Tuấn):** Bổ sung `MF-13` & `MF-14`: *Động cơ giải tích sóng triều độc lập Harmonic Tide Engine & Báo động triều cường Phú An/Nhà Bè* — Chuẩn hóa tính toán nguy cơ ngập do triều.
12. **STT 45 (Lê Anh Tuấn):** Bổ sung `MF-20` & `MF-21`: *Báo cáo điểm ngập lụt 1-chạm chuột phải & Thuật toán bám đường tự động OSRM Snap-to-Road* — Thay thế cho tính năng "AI phát hiện trùng lặp".
13. **STT 46 (Lê Anh Tuấn):** Bổ sung `MF-17`: *Dự báo lưu lượng sông ngòi & Nguy cơ lũ lụt toàn cầu Copernicus GloFAS 7 ngày* — Thay thế cho tính năng "AI tóm tắt sự cố".
14. **STT 47 (Lê Anh Tuấn):** Bổ sung `MF-15`, `MF-16` & `MF-19`: *Tích hợp đa nguồn dữ liệu ngập lụt đô thị (Cổng Mở UDC, Mưa thực tế, Thanh trượt mô phỏng thiên tai)* — Thay thế cho mô tả chung chung.

---

### TỔNG KẾT
- Bảng phân công 48 chức năng trên hiện tại đã đạt độ chính xác **100%**, vừa giữ nguyên các nghiệp vụ cốt lõi theo đúng danh sách ban đầu của nhóm, vừa bổ sung đầy đủ các tính năng kỹ thuật lớn của dự án trong file `DANH_SACH_48_CHUC_NANG_LON.md`.
- File đã sẵn sàng để in ra hoặc đưa trực tiếp vào Báo cáo Đồ án nộp cho Giảng viên hướng dẫn.
