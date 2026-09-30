// screens_dat.js - Wireframe screens for Nguyễn Thành Đạt (Chức năng 1 - 12)

module.exports = [
  {
    id: "Anh_01_1",
    numBadge: "Ảnh 01.1",
    title: "Báo cáo điểm ô nhiễm - Định vị GPS tự động trên bản đồ",
    member: "Nguyễn Thành Đạt",
    role: "Công dân (Citizen)",
    activeNav: "Báo cáo rác",
    badges: [
      { text: "HEADER", top: "-12px", right: "180px" },
      { text: "NAVBAR", top: "50px", left: "-10px" },
      { text: "GPS AUTO", top: "-12px", left: "260px" },
      { text: "BẢN ĐỒ WEBGIS", top: "125px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Báo cáo điểm ô nhiễm - Định vị GPS tự động</div>
          <div class="page-subtitle">Chức năng 1 (Ảnh 01.1) • Phụ trách: Nguyễn Thành Đạt</div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-black"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M2 12h20"/></svg> Lấy lại GPS</button>
          <button class="btn btn-white">Khóa vị trí</button>
        </div>
      </div>

      <div class="card-box">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <div>
            <div><b>Tọa độ thu nhận:</b> 10.850500° N, 106.771900° E</div>
            <div style="font-size: 12px; color: #4b5563; margin-top: 2px;">• Bán kính sai số GPS: <b>5.2 mét</b> | Độ chính xác cao (High Accuracy)</div>
            <div style="font-size: 12px; color: #4b5563;">• Địa chỉ giải mã (Reverse Geocoding): <b>53 Võ Văn Ngân, P. Linh Chiểu, TP. Thủ Đức</b></div>
          </div>
          <span class="tag tag-dark">GPS SẴN SÀNG</span>
        </div>

        <div class="map-box">
          <svg style="width: 100%; height: 100%; position: absolute;">
            <path d="M-10 80 Q 220 90 450 40 T 780 70" stroke="#cbd5e1" stroke-width="16" fill="none"/>
            <path d="M 80 -10 Q 140 140 220 280" stroke="#cbd5e1" stroke-width="14" fill="none"/>
            <path d="M 320 -10 L 360 280" stroke="#cbd5e1" stroke-width="12" fill="none"/>
            <path d="M 120 210 Q 320 170 700 230" stroke="#cbd5e1" stroke-width="12" fill="none"/>
            <path d="M 520 -10 Q 480 140 560 280" stroke="#94a3b8" stroke-width="20" fill="none"/>
          </svg>
          <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center;">
            <div style="width: 80px; height: 80px; border-radius: 50%; background: rgba(59, 130, 246, 0.12); border: 2px dashed #2563eb; display: flex; align-items: center; justify-content: center;">
              <div style="width: 14px; height: 14px; border-radius: 50%; background: #2563eb; border: 3px solid #fff; box-shadow: 0 0 8px rgba(0,0,0,0.3);"></div>
            </div>
            <span style="font-size: 11px; font-weight: 700; background: #fff; border: 1.5px solid #222; padding: 1px 6px; border-radius: 4px; margin-top: 4px;">Vị trí của bạn (±5m)</span>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_01_2",
    numBadge: "Ảnh 01.2",
    title: "Báo cáo điểm ô nhiễm - Ghim vị trí thủ công & Modal xác nhận",
    member: "Nguyễn Thành Đạt",
    role: "Công dân (Citizen)",
    activeNav: "Báo cáo rác",
    badges: [
      { text: "GHIM THỦ CÔNG", top: "-12px", left: "260px" },
      { text: "MODAL XÁC NHẬN", top: "110px", left: "430px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Báo cáo điểm ô nhiễm - Ghim vị trí thủ công & Xác nhận</div>
          <div class="page-subtitle">Chức năng 1 (Ảnh 01.2) • Phụ trách: Nguyễn Thành Đạt</div>
        </div>
        <button class="btn btn-white">Hủy ghim</button>
      </div>

      <div class="card-box" style="position: relative;">
        <div style="margin-bottom: 8px; font-size: 13px;">
          📍 <b>Chế độ kéo thả marker:</b> Click vào bản đồ hoặc kéo marker đỏ để điều chỉnh vị trí chính xác của bãi rác.
        </div>

        <div class="map-box">
          <svg style="width: 100%; height: 100%; position: absolute;">
            <path d="M-10 80 Q 220 90 450 40 T 780 70" stroke="#cbd5e1" stroke-width="16" fill="none"/>
            <path d="M 80 -10 Q 140 140 220 280" stroke="#cbd5e1" stroke-width="14" fill="none"/>
            <path d="M 520 -10 Q 480 140 560 280" stroke="#94a3b8" stroke-width="20" fill="none"/>
          </svg>

          <!-- Marker -->
          <div style="position: absolute; top: 65%; left: 48%; transform: translate(-50%, -100%);">
            <svg width="34" height="42" viewBox="0 0 24 24" fill="#111" stroke="#fff" stroke-width="1.5">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
              <circle cx="12" cy="9" r="3" fill="#fff"/>
            </svg>
          </div>

          <!-- Modal Confirm -->
          <div class="modal-overlay">
            <div class="modal-title">Xác nhận vị trí phản ánh</div>
            <div class="modal-text">
              Bạn có chắc chắn muốn xác nhận vị trí bãi rác/điểm ô nhiễm này tại:<br>
              <b>120 Đường Lê Văn Chí, Linh Trung, TP. Thủ Đức</b><br>
              (Tọa độ: 10.869100° N, 106.774100° E)
            </div>
            <div class="modal-actions">
              <button class="btn btn-black">Xác nhận ghim</button>
              <button class="btn btn-white">Chọn lại</button>
            </div>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_02_1",
    numBadge: "Ảnh 02.1",
    title: "Thu thập & Nén ảnh/video hiện trường kèm đóng dấu thời gian",
    member: "Nguyễn Thành Đạt",
    role: "Công dân (Citizen)",
    activeNav: "Báo cáo rác",
    badges: [
      { text: "MEDIA UPLOAD", top: "-12px", left: "260px" },
      { text: "WATERMARK EXIF", top: "165px", right: "40px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Thu thập & Nén ảnh/video hiện trường kèm đóng dấu thời gian</div>
          <div class="page-subtitle">Chức năng 2 (Ảnh 02.1) • Phụ trách: Nguyễn Thành Đạt</div>
        </div>
        <span class="tag tag-dark">AUTO COMPRESSION</span>
      </div>

      <div class="grid-2">
        <div class="card-box" style="display: flex; flex-direction: column; align-items: center; justify-content: center; border-style: dashed; padding: 24px; text-align: center;">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#4b5563" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          <div style="font-weight: 700; margin-top: 10px; font-size: 13px;">Kéo thả ảnh hoặc video bằng chứng vào đây</div>
          <div style="font-size: 11px; color: #6b7280; margin: 4px 0 12px 0;">Hỗ trợ JPG, PNG, MP4 (Tối đa 5 file, nén tự động trước khi gửi)</div>
          <button class="btn btn-black btn-sm">Chọn tệp từ thiết bị</button>
        </div>

        <div class="card-box">
          <div class="card-title">Ảnh đã nén & Đóng dấu hiện trường</div>
          <div style="position: relative; border: 1.5px solid #222; border-radius: 6px; overflow: hidden; background: #e5e7eb; height: 160px; display: flex; align-items: center; justify-content: center;">
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.5"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            <!-- Watermark -->
            <div style="position: absolute; bottom: 8px; left: 8px; right: 8px; background: rgba(0,0,0,0.75); color: #fff; padding: 6px 8px; border-radius: 4px; font-size: 10px; font-family: monospace; line-height: 1.4;">
              <div>📍 10.8505° N, 106.7719° E • 53 Võ Văn Ngân, TP. Thủ Đức</div>
              <div>🕒 29/09/2026 10:15:32 GMT+7 • Cam: SM-G998B • EcoReport Verified</div>
            </div>
          </div>
          <div style="font-size: 11px; margin-top: 8px; color: #374151; display: flex; justify-content: space-between;">
            <span>Gốc: <b>4.8 MB</b> ➔ Nén: <b>380 KB (-92%)</b></span>
            <span style="font-weight: 700; color: #111;">[✓ ĐÃ ĐÓNG DẤU]</span>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_02_2",
    numBadge: "Ảnh 02.2",
    title: "Xem chi tiết ảnh phóng to & Trích xuất Metadata EXIF",
    member: "Nguyễn Thành Đạt",
    role: "Công dân (Citizen)",
    activeNav: "Báo cáo rác",
    badges: [
      { text: "EXIF INSPECTOR", top: "-12px", right: "20px" },
      { text: "METADATA VIEWER", top: "80px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Chi tiết bằng chứng hiện trường & Siêu dữ liệu EXIF</div>
          <div class="page-subtitle">Chức năng 2 (Ảnh 02.2) • Phụ trách: Nguyễn Thành Đạt</div>
        </div>
        <button class="btn btn-white btn-sm">Quay lại danh sách</button>
      </div>

      <div class="grid-2">
        <div class="card-box" style="height: 270px; display: flex; flex-direction: column; justify-content: center; align-items: center; background: #111827; border-radius: 8px; position: relative;">
          <div style="color: #9ca3af; font-size: 12px; margin-bottom: 8px;">[Preview Ảnh Gốc Phóng To 100%]</div>
          <div style="border: 2px dashed #4b5563; width: 85%; height: 75%; display: flex; align-items: center; justify-content: center; color: #fff;">
            Bãi rác tự phát lấn chiếm lòng lề đường
          </div>
        </div>

        <div class="card-box">
          <div class="card-title">Bảng phân tích siêu dữ liệu (EXIF Info)</div>
          <table class="wire-table">
            <tr><th>Thuộc tính</th><th>Giá trị trích xuất</th></tr>
            <tr><td>Tên tệp</td><td>IMG_20260929_101532.jpg</td></tr>
            <tr><td>Thiết bị chụp</td><td>Samsung Galaxy S24 Ultra</td></tr>
            <tr><td>Thời gian chụp gốc</td><td>29/09/2026 10:15:32 AM</td></tr>
            <tr><td>Thời gian nộp báo cáo</td><td>29/09/2026 10:22:10 AM (Đúng hạn)</td></tr>
            <tr><td>Tọa độ GPS nhúng</td><td>10.850512, 106.771945</td></tr>
            <tr><td>Chữ ký điện tử SHA-256</td><td>a8f4c2...9b12e (Khớp)</td></tr>
          </table>
        </div>
      </div>
    `
  },
  {
    id: "Anh_03_1",
    numBadge: "Ảnh 03.1",
    title: "Phân loại loại hình ô nhiễm đa danh mục",
    member: "Nguyễn Thành Đạt",
    role: "Công dân (Citizen)",
    activeNav: "Báo cáo rác",
    badges: [
      { text: "BỘ PHÂN LOẠI", top: "-12px", left: "260px" },
      { text: "DANH MỤC ĐA CẤP", top: "180px", right: "30px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Phân loại loại hình ô nhiễm đa danh mục</div>
          <div class="page-subtitle">Chức năng 3 (Ảnh 03.1) • Phụ trách: Nguyễn Thành Đạt</div>
        </div>
      </div>

      <div class="card-box">
        <div style="font-size: 13px; font-weight: 700; margin-bottom: 12px;">Chọn danh mục vi phạm môi trường phù hợp với hiện trường:</div>
        
        <div class="grid-3" style="margin-bottom: 14px;">
          <div style="border: 2px solid #111; padding: 12px; border-radius: 8px; background: #e5e7eb; cursor: pointer;">
            <div style="font-size: 18px;">🗑️</div>
            <div style="font-weight: 800; font-size: 13px; margin: 4px 0;">1. Rác sinh hoạt</div>
            <div style="font-size: 11px; color: #4b5563;">Túi ni lông, rác hữu cơ, bãi rác tự phát bốc mùi hôi</div>
          </div>
          <div style="border: 1.5px solid #222; padding: 12px; border-radius: 8px; cursor: pointer;">
            <div style="font-size: 18px;">🧱</div>
            <div style="font-weight: 700; font-size: 13px; margin: 4px 0;">2. Rác xây dựng</div>
            <div style="font-size: 11px; color: #4b5563;">Xà bần, bê tông vụn, gạch đá đổ trộm vỉa hè</div>
          </div>
          <div style="border: 1.5px solid #222; padding: 12px; border-radius: 8px; cursor: pointer;">
            <div style="font-size: 18px;">☣️</div>
            <div style="font-weight: 700; font-size: 13px; margin: 4px 0;">3. Chất thải nguy hại</div>
            <div style="font-size: 11px; color: #4b5563;">Pin cũ, bình ắc quy, hóa chất công nghiệp, kim tiêm</div>
          </div>
          <div style="border: 1.5px solid #222; padding: 12px; border-radius: 8px; cursor: pointer;">
            <div style="font-size: 18px;">💧</div>
            <div style="font-weight: 700; font-size: 13px; margin: 4px 0;">4. Nước thải đen ngòm</div>
            <div style="font-size: 11px; color: #4b5563;">Xả lén ra cống rãnh, kênh rạch chuyển màu đen</div>
          </div>
          <div style="border: 1.5px solid #222; padding: 12px; border-radius: 8px; cursor: pointer;">
            <div style="font-size: 18px;">💨</div>
            <div style="font-weight: 700; font-size: 13px; margin: 4px 0;">5. Khói bụi & Mùi độc</div>
            <div style="font-size: 11px; color: #4b5563;">Đốt rác lộ thiên, ống khói nhà máy xả khói đen</div>
          </div>
          <div style="border: 1.5px solid #222; padding: 12px; border-radius: 8px; cursor: pointer;">
            <div style="font-size: 18px;">🔊</div>
            <div style="font-weight: 700; font-size: 13px; margin: 4px 0;">6. Tiếng ồn vượt chuẩn</div>
            <div style="font-size: 11px; color: #4b5563;">Loa kéo công suất lớn, tiếng ồn công trường đêm</div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Ghi chú cụ thể thêm về hiện trường:</label>
          <input type="text" class="form-input" value="Bãi rác dài khoảng 5m dọc theo bờ tường, gây nghẹt miệng cống thoát nước.">
        </div>
      </div>
    `
  },
  {
    id: "Anh_04_1",
    numBadge: "Ảnh 04.1",
    title: "Thang điểm mức độ nghiêm trọng & Khẩn cấp",
    member: "Nguyễn Thành Đạt",
    role: "Công dân (Citizen)",
    activeNav: "Báo cáo rác",
    badges: [
      { text: "MỨC ĐỘ KHẨN CẤP", top: "-12px", left: "260px" },
      { text: "SLA QUY ĐỊNH", top: "140px", right: "30px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Thang điểm mức độ nghiêm trọng & Khẩn cấp</div>
          <div class="page-subtitle">Chức năng 4 (Ảnh 04.1) • Phụ trách: Nguyễn Thành Đạt</div>
        </div>
      </div>

      <div class="card-box">
        <div class="card-title">Lựa chọn cấp độ nghiêm trọng của sự cố:</div>

        <div style="display: flex; gap: 10px; margin-bottom: 16px;">
          <div style="flex: 1; border: 1.5px solid #222; padding: 10px; border-radius: 6px;">
            <div style="font-weight: 800; font-size: 12px;">CẤP 1: THẤP</div>
            <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">Rác vặt lác đác, không cản trở lối đi. SLA: 48 giờ.</div>
          </div>
          <div style="flex: 1; border: 1.5px solid #222; padding: 10px; border-radius: 6px;">
            <div style="font-weight: 800; font-size: 12px;">CẤP 2: TRUNG BÌNH</div>
            <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">Bãi rác nhỏ bắt đầu bốc mùi. SLA: 24 giờ.</div>
          </div>
          <div style="flex: 1; border: 2px solid #111; padding: 10px; border-radius: 6px; background: #e5e7eb;">
            <div style="font-weight: 800; font-size: 12px;">CẤP 3: CAO (ĐANG CHỌN)</div>
            <div style="font-size: 11px; color: #111; margin-top: 4px;">Gây nghẽn dòng chảy, bốc mùi nồng nặc. SLA: 12 giờ.</div>
          </div>
          <div style="flex: 1; border: 2px solid #dc2626; padding: 10px; border-radius: 6px; background: #fff;">
            <div style="font-weight: 800; font-size: 12px; color: #dc2626;">CẤP 4: KHẨN CẤP 🚨</div>
            <div style="font-size: 11px; color: #dc2626; margin-top: 4px;">Hóa chất độc hại cháy/rò rỉ. Xử lý trong 2 giờ.</div>
          </div>
        </div>

        <div style="border-top: 1px solid #e5e7eb; padding-top: 12px;">
          <div style="font-size: 12px; font-weight: 700; margin-bottom: 6px;">Cảnh báo tự động từ hệ thống:</div>
          <div style="background: #f9fafb; border: 1px solid #d1d5db; padding: 10px; border-radius: 6px; font-size: 12px; line-height: 1.5;">
            ⚠️ Mức <b>Cấp 3 - Cao</b> sẽ kích hoạt thông báo tức thì đến Tổ xử lý trật tự đô thị Phường Linh Chiểu và Tổ tuần tra môi trường số 2.
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_05_1",
    numBadge: "Ảnh 05.1",
    title: "Quản lý đa lớp bản đồ nền đô thị",
    member: "Nguyễn Thành Đạt",
    role: "Công dân / Quản trị viên",
    activeNav: "Bản đồ ô nhiễm",
    badges: [
      { text: "BASEMAP SWITCHER", top: "-12px", right: "20px" },
      { text: "6 LỚP BẢN ĐỒ", top: "140px", right: "30px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Quản lý đa lớp bản đồ nền đô thị</div>
          <div class="page-subtitle">Chức năng 5 (Ảnh 05.1) • Phụ trách: Nguyễn Thành Đạt</div>
        </div>
      </div>

      <div class="card-box">
        <div class="card-title">Bộ chuyển đổi kiểu bản đồ nền (Basemap Selector):</div>
        <div class="grid-3" style="margin-bottom: 14px;">
          <div style="border: 2px solid #111; padding: 10px; border-radius: 6px; background: #e5e7eb;">
            <div style="font-weight: 800; font-size: 13px;">🗺️ Google Maps Chuẩn</div>
            <div style="font-size: 11px; color: #4b5563;">[ĐANG DÙNG] Đường phố rõ ràng, tên ngõ hẻm chính xác</div>
          </div>
          <div style="border: 1.5px solid #222; padding: 10px; border-radius: 6px;">
            <div style="font-weight: 700; font-size: 13px;">🛰️ Google Vệ Tinh</div>
            <div style="font-size: 11px; color: #4b5563;">Ảnh chụp thực địa độ nét cao, dễ soi mái tôn và bãi đất</div>
          </div>
          <div style="border: 1.5px solid #222; padding: 10px; border-radius: 6px;">
            <div style="font-weight: 700; font-size: 13px;">🚦 Bản Đồ Giao Thông</div>
            <div style="font-size: 11px; color: #4b5563;">Cập nhật mật độ xe cộ và điểm kẹt đường thời gian thực</div>
          </div>
          <div style="border: 1.5px solid #222; padding: 10px; border-radius: 6px;">
            <div style="font-weight: 700; font-size: 13px;">🌐 OpenStreetMap</div>
            <div style="font-size: 11px; color: #4b5563;">Dữ liệu cộng đồng mở, hiển thị ranh giới tòa nhà chi tiết</div>
          </div>
          <div style="border: 1.5px solid #222; padding: 10px; border-radius: 6px;">
            <div style="font-weight: 700; font-size: 13px;">☀️ CartoDB Positron</div>
            <div style="font-size: 11px; color: #4b5563;">Bản đồ nền sáng tối giản, làm nổi bật điểm ô nhiễm màu</div>
          </div>
          <div style="border: 1.5px solid #222; padding: 10px; border-radius: 6px;">
            <div style="font-weight: 700; font-size: 13px;">🌙 Carto DarkMatter</div>
            <div style="font-size: 11px; color: #4b5563;">Bản đồ nền đen dạ quang, cực kỳ hợp hiển thị vệt ngập lụt</div>
          </div>
        </div>

        <div class="map-box" style="height: 150px; background: #e5e7eb;">
          <div style="display: flex; align-items: center; justify-content: center; height: 100%; font-weight: 700; color: #374151;">
            [Khung nhìn bản đồ lập tức đồng bộ theo lớp nền được chọn mà không mất dữ liệu điểm rác]
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_06_1",
    numBadge: "Ảnh 06.1",
    title: "Kết xuất kiến trúc tòa nhà 3D Extrusion đô thị",
    member: "Nguyễn Thành Đạt",
    role: "Công dân / Quản trị viên",
    activeNav: "Bản đồ ô nhiễm",
    badges: [
      { text: "3D BUILDINGS", top: "-12px", right: "20px" },
      { text: "TILT & BEARING", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Kết xuất kiến trúc tòa nhà 3D Extrusion đô thị</div>
          <div class="page-subtitle">Chức năng 6 (Ảnh 06.1) • Phụ trách: Nguyễn Thành Đạt</div>
        </div>
        <div style="display: flex; gap: 8px;">
          <span class="tag tag-dark">Góc nghiêng: 60°</span>
          <span class="tag tag-gray">Xoay: -17.6°</span>
        </div>
      </div>

      <div class="card-box">
        <div class="map-box" style="height: 280px; background: #1f2937; position: relative;">
          <!-- SVG 3D Isometric Buildings Wireframe -->
          <svg style="width: 100%; height: 100%;">
            <!-- Floor grid -->
            <path d="M 50 250 L 500 150 L 900 250" stroke="#374151" stroke-width="1" fill="none"/>
            <!-- Building 1 (Tall) -->
            <polygon points="200,200 240,180 240,80 200,100" fill="#4b5563" stroke="#fff" stroke-width="1.5"/>
            <polygon points="240,180 300,200 300,100 240,80" fill="#374151" stroke="#fff" stroke-width="1.5"/>
            <polygon points="200,100 240,80 300,100 260,120" fill="#6b7280" stroke="#fff" stroke-width="1.5"/>
            <!-- Building 2 -->
            <polygon points="360,220 400,200 400,130 360,150" fill="#4b5563" stroke="#fff" stroke-width="1.5"/>
            <polygon points="400,200 450,220 450,150 400,130" fill="#374151" stroke="#fff" stroke-width="1.5"/>
            <polygon points="360,150 400,130 450,150 410,170" fill="#6b7280" stroke="#fff" stroke-width="1.5"/>
            <!-- Marker on roof -->
            <circle cx="250" cy="90" r="6" fill="#ef4444" stroke="#fff" stroke-width="2"/>
          </svg>
          <div style="position: absolute; bottom: 12px; left: 16px; background: rgba(0,0,0,0.7); color: #fff; padding: 6px 12px; border-radius: 6px; font-size: 11px;">
            Đang hiển thị 1,420 khối tòa nhà 3D (Độ cao trích xuất từ dữ liệu OpenStreetMap Building Tag)
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_06_2",
    numBadge: "Ảnh 06.2",
    title: "Bộ chọn chủ đề màu sắc tòa nhà 3D (Color Palettes)",
    member: "Nguyễn Thành Đạt",
    role: "Công dân / Quản trị viên",
    activeNav: "Bản đồ ô nhiễm",
    badges: [
      { text: "PALETTE SELECTOR", top: "-12px", right: "20px" },
      { text: "THEME SWITCHER", top: "110px", right: "30px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Bộ chọn chủ đề màu sắc tòa nhà 3D</div>
          <div class="page-subtitle">Chức năng 6 (Ảnh 06.2) • Phụ trách: Nguyễn Thành Đạt</div>
        </div>
      </div>

      <div class="card-box">
        <div class="card-title">Tùy biến phong cách hiển thị tòa nhà 3D:</div>
        <div class="grid-2">
          <div style="border: 2px solid #111; padding: 12px; border-radius: 6px; background: #e5e7eb;">
            <div style="display: flex; justify-content: space-between;">
              <b>(•) 🌈 Rainbow (Cầu vồng độ cao)</b>
              <span class="tag tag-dark">Mặc định</span>
            </div>
            <div style="font-size: 11px; color: #4b5563; margin-top: 4px;">Đổi màu linh hoạt theo số tầng: Tầng thấp màu xanh ngọc, cao ốc chuyển tím cam.</div>
          </div>
          <div style="border: 1.5px solid #222; padding: 12px; border-radius: 6px;">
            <b>( ) ⚡ Cyberpunk Neon</b>
            <div style="font-size: 11px; color: #4b5563; margin-top: 4px;">Viền tòa nhà màu xanh Cyan và tím Neon rực rỡ trong đêm.</div>
          </div>
          <div style="border: 1.5px solid #222; padding: 12px; border-radius: 6px;">
            <b>( ) 🌿 Emerald Green</b>
            <div style="font-size: 11px; color: #4b5563; margin-top: 4px;">Sắc xanh ngọc lục bảo sinh thái, biểu trưng cho đô thị xanh.</div>
          </div>
          <div style="border: 1.5px solid #222; padding: 12px; border-radius: 6px;">
            <b>( ) 🏛️ Slate Minimalist</b>
            <div style="font-size: 11px; color: #4b5563; margin-top: 4px;">Tối giản sắc xám kim loại sang trọng cho văn phòng điều hành.</div>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_07_1",
    numBadge: "Ảnh 07.1",
    title: "Tùy chọn gửi ẩn danh & Bảo vệ riêng tư (Spatial Jitter 50m)",
    member: "Nguyễn Thành Đạt",
    role: "Công dân (Citizen)",
    activeNav: "Báo cáo rác",
    badges: [
      { text: "BẢO MẬT RIÊNG TƯ", top: "-12px", left: "260px" },
      { text: "SPATIAL JITTER 50M", top: "140px", right: "30px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Tùy chọn gửi ẩn danh & Bảo vệ riêng tư tọa độ</div>
          <div class="page-subtitle">Chức năng 7 (Ảnh 07.1) • Phụ trách: Nguyễn Thành Đạt</div>
        </div>
      </div>

      <div class="card-box">
        <div style="display: flex; gap: 12px; align-items: flex-start; margin-bottom: 14px;">
          <input type="checkbox" checked style="width: 20px; height: 20px; margin-top: 2px;">
          <div>
            <div style="font-weight: 800; font-size: 14px;">Bật chế độ gửi báo cáo ẩn danh (Anonymous Mode)</div>
            <div style="font-size: 12px; color: #4b5563; margin-top: 2px;">
              Hệ thống sẽ xóa toàn bộ họ tên, email, số điện thoại và thông tin nhận dạng cá nhân khỏi hồ sơ báo cáo công khai.
            </div>
          </div>
        </div>

        <div style="border: 1.5px solid #222; border-radius: 6px; padding: 12px; background: #fafafa;">
          <div style="font-weight: 700; font-size: 13px; margin-bottom: 6px;">Thuật toán làm mờ tọa độ (Spatial Jitter Algorithm - 50m):</div>
          <div style="font-size: 12px; color: #374151; line-height: 1.5;">
            Khi bạn phản ánh từ nhà riêng, hệ thống tự động dịch chuyển ngẫu nhiên tọa độ thực tế trong bán kính <b>50 mét</b> để bảo vệ địa chỉ sinh sống cá nhân khỏi việc bị phát hiện, đồng thời vẫn đảm bảo công nhân tìm đúng khu vực rác.
          </div>
          <div style="margin-top: 10px; font-size: 12px; font-family: monospace; background: #e5e7eb; padding: 6px 10px; border-radius: 4px;">
            Lat_mới = Lat_gốc + δ_lat (random ±0.00045) | Lon_mới = Lon_gốc + δ_lon (random ±0.00045)
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_08_1",
    numBadge: "Ảnh 08.1",
    title: "Hiển thị lớp ranh giới hành chính 22 quận/huyện TP.HCM",
    member: "Nguyễn Thành Đạt",
    role: "Quản trị viên / Công dân",
    activeNav: "Bản đồ ô nhiễm",
    badges: [
      { text: "RANH GIỚI QUẬN HUYỆN", top: "-12px", right: "20px" },
      { text: "GEOJSON VECTOR", top: "150px", right: "30px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Ranh giới hành chính 22 quận/huyện TP.HCM</div>
          <div class="page-subtitle">Chức năng 8 (Ảnh 08.1) • Phụ trách: Nguyễn Thành Đạt</div>
        </div>
        <select class="form-select">
          <option>Chọn quận để highlight: TP. Thủ Đức</option>
          <option>Quận 1</option>
          <option>Quận Bình Thạnh</option>
        </select>
      </div>

      <div class="card-box">
        <div class="map-box" style="height: 280px; position: relative;">
          <!-- SVG Map Boundaries -->
          <svg style="width: 100%; height: 100%;">
            <!-- District boundaries -->
            <polygon points="120,40 260,20 300,90 200,120 140,80" fill="#f3f4f6" stroke="#4b5563" stroke-width="1.5"/>
            <polygon points="260,20 450,30 420,130 300,90" fill="#f3f4f6" stroke="#4b5563" stroke-width="1.5"/>
            <!-- Highlighted District (Thu Duc) -->
            <polygon points="450,30 750,50 780,200 560,220 420,130" fill="rgba(37, 99, 235, 0.15)" stroke="#111" stroke-width="2.5"/>
            <text x="560" y="130" font-size="13" font-weight="bold" fill="#111">TP. THỦ ĐỨC (ĐANG CHỌN)</text>
          </svg>
          <div style="position: absolute; bottom: 10px; left: 10px; background: #fff; border: 1.5px solid #222; padding: 6px 12px; border-radius: 6px; font-size: 11px;">
            Số điểm rác tại TP. Thủ Đức: <b>38 điểm</b> • Tỷ lệ xử lý xong: <b>84.2%</b>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_09_1",
    numBadge: "Ảnh 09.1",
    title: "Mạng lưới điểm xanh & Trạm tái chế rác công cộng",
    member: "Nguyễn Thành Đạt",
    role: "Công dân (Citizen)",
    activeNav: "Điểm xanh",
    badges: [
      { text: "BẢN ĐỒ ĐIỂM XANH", top: "-12px", left: "260px" },
      { text: "BỘ LỌC VẬT LIỆU", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Mạng lưới điểm xanh & Trạm tái chế rác công cộng</div>
          <div class="page-subtitle">Chức năng 9 (Ảnh 09.1) • Phụ trách: Nguyễn Thành Đạt</div>
        </div>
        <div style="display: flex; gap: 6px;">
          <span class="tag tag-dark">Tất cả (45)</span>
          <span class="tag">🔋 Pin cũ (18)</span>
          <span class="tag">🥤 Nhựa tái chế (28)</span>
          <span class="tag">📦 Giấy carton (22)</span>
        </div>
      </div>

      <div class="card-box">
        <div class="map-box" style="height: 280px; position: relative;">
          <svg style="width: 100%; height: 100%;">
            <path d="M 0 100 Q 300 120 700 80" stroke="#cbd5e1" stroke-width="12" fill="none"/>
            <path d="M 250 0 L 250 280" stroke="#cbd5e1" stroke-width="10" fill="none"/>
            <path d="M 500 0 L 500 280" stroke="#cbd5e1" stroke-width="10" fill="none"/>
          </svg>
          <!-- Green point markers -->
          <div style="position: absolute; top: 90px; left: 240px; background: #111; color: #fff; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 14px;">♻️</div>
          <div style="position: absolute; top: 180px; left: 490px; background: #111; color: #fff; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 14px;">♻️</div>
          <div style="position: absolute; top: 50px; left: 620px; background: #111; color: #fff; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 14px;">♻️</div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_09_2",
    numBadge: "Ảnh 09.2",
    title: "Popup chi tiết thông tin trạm tái chế & Tiếp nhận vật liệu",
    member: "Nguyễn Thành Đạt",
    role: "Công dân (Citizen)",
    activeNav: "Điểm xanh",
    badges: [
      { text: "POPUP ĐIỂM XANH", top: "-12px", right: "20px" },
      { text: "CHỈ ĐƯỜNG OSRM", top: "150px", right: "30px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Thông tin trạm thu gom tái chế rác</div>
          <div class="page-subtitle">Chức năng 9 (Ảnh 09.2) • Phụ trách: Nguyễn Thành Đạt</div>
        </div>
      </div>

      <div class="card-box" style="width: 500px; margin: 0 auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #222; padding-bottom: 8px; margin-bottom: 12px;">
          <div style="font-weight: 800; font-size: 15px;">♻️ Trạm Tái Chế GreenHub Thủ Đức</div>
          <span class="tag tag-dark">MỞ CỬA</span>
        </div>
        <div style="font-size: 13px; line-height: 1.6; color: #374151;">
          <div>📍 <b>Địa chỉ:</b> 12 Đường Hàn Thuyên, P. Bình Thọ, TP. Thủ Đức</div>
          <div>🕒 <b>Giờ hoạt động:</b> 07:30 - 17:30 (Thứ 2 đến Thứ 7)</div>
          <div>📞 <b>Hotline:</b> 028.3896.1234</div>
        </div>
        <div style="margin: 12px 0;">
          <div style="font-size: 12px; font-weight: 700; margin-bottom: 6px;">Vật liệu tiếp nhận & Tỷ lệ đổi điểm:</div>
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <span class="tag">🔋 Pin cũ (+20 điểm/viên)</span>
            <span class="tag">🥤 Chai nhựa PET (+15 điểm/kg)</span>
            <span class="tag">📦 Bìa Carton (+10 điểm/kg)</span>
            <span class="tag">💻 Rác điện tử (+50 điểm/món)</span>
          </div>
        </div>
        <div style="display: flex; gap: 8px; margin-top: 14px;">
          <button class="btn btn-black" style="flex: 1;">🧭 Chỉ đường đến trạm</button>
          <button class="btn btn-white">Đóng</button>
        </div>
      </div>
    `
  },
  {
    id: "Anh_10_1",
    numBadge: "Ảnh 10.1",
    title: "Hỗ trợ dịch đa ngôn ngữ tự động (Song ngữ Việt - Anh)",
    member: "Nguyễn Thành Đạt",
    role: "Mọi người dùng",
    activeNav: "Dashboard",
    badges: [
      { text: "LANGUAGE SWITCH", top: "-12px", right: "20px" },
      { text: "VIETNAMESE / ENGLISH", top: "70px", right: "30px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Hỗ trợ dịch đa ngôn ngữ tự động (Vietnamese / English)</div>
          <div class="page-subtitle">Chức năng 10 (Ảnh 10.1) • Phụ trách: Nguyễn Thành Đạt</div>
        </div>
        <div style="border: 2px solid #222; border-radius: 6px; display: flex; overflow: hidden;">
          <button style="padding: 6px 12px; background: #111; color: #fff; font-weight: 700; border: none; cursor: pointer;">🇻🇳 Tiếng Việt</button>
          <button style="padding: 6px 12px; background: #fff; color: #111; font-weight: 700; border: none; cursor: pointer;">🇬🇧 English</button>
        </div>
      </div>

      <div class="grid-2">
        <div class="card-box">
          <div class="card-title">Phiên bản Tiếng Việt:</div>
          <div style="font-size: 13px; line-height: 1.6;">
            <div>• Tiêu đề: <b>Hệ thống Báo cáo & Theo dõi Điểm rác thải / Ô nhiễm</b></div>
            <div>• Nút bấm: <b>Gửi báo cáo hiện trường</b></div>
            <div>• Trạng thái: <b>Đang chờ tiếp nhận • Đang xử lý • Đã dọn sạch</b></div>
          </div>
        </div>
        <div class="card-box">
          <div class="card-title">English Version (Real-time i18n):</div>
          <div style="font-size: 13px; line-height: 1.6;">
            <div>• Title: <b>Urban Waste & Flood Early Warning WebGIS</b></div>
            <div>• Action: <b>Submit Environmental Report</b></div>
            <div>• Status: <b>Pending • In Progress • Cleaned & Verified</b></div>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_11_1",
    numBadge: "Ảnh 11.1",
    title: "Tra cứu quy định pháp lý & Khung mức phạt (Nghị định 45/2022/NĐ-CP)",
    member: "Nguyễn Thành Đạt",
    role: "Công dân (Citizen)",
    activeNav: "Dashboard",
    badges: [
      { text: "TRA CỨU LUẬT", top: "-12px", left: "260px" },
      { text: "NĐ 45/2022/NĐ-CP", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Tra cứu quy định xử phạt vi phạm môi trường</div>
          <div class="page-subtitle">Chức năng 11 (Ảnh 11.1) • Phụ trách: Nguyễn Thành Đạt</div>
        </div>
      </div>

      <div class="card-box">
        <div style="display: flex; gap: 10px; margin-bottom: 12px;">
          <input type="text" class="form-input" style="flex: 1;" value="vứt tàn thuốc lá hoặc vứt rác nơi công cộng">
          <button class="btn btn-black">Tìm kiếm điều luật</button>
        </div>

        <table class="wire-table">
          <tr><th>Hành vi vi phạm</th><th>Căn cứ pháp lý</th><th>Khung phạt tiền</th></tr>
          <tr>
            <td>Vứt, thải, bỏ đầu, mẩu thuốc lá không đúng nơi quy định tại khu chung cư, thương mại</td>
            <td>Khoản 1 Điều 25 NĐ 45/2022/NĐ-CP</td>
            <td><b>100.000đ - 150.000đ</b></td>
          </tr>
          <tr>
            <td>Vứt rác sinh hoạt trên vỉa hè, lòng đường, hệ thống thoát nước đô thị</td>
            <td>Khoản 2 Điều 25 NĐ 45/2022/NĐ-CP</td>
            <td><b>1.000.000đ - 2.000.000đ</b></td>
          </tr>
          <tr>
            <td>Đổ trộm phế thải xây dựng (xà bần, gạch vụn) nơi công cộng</td>
            <td>Khoản 3 Điều 26 NĐ 45/2022/NĐ-CP</td>
            <td><b>3.000.000đ - 5.000.000đ</b></td>
          </tr>
        </table>
      </div>
    `
  },
  {
    id: "Anh_12_1",
    numBadge: "Ảnh 12.1",
    title: "Chế độ giao diện đơn giản cho người cao tuổi (Accessible UI)",
    member: "Nguyễn Thành Đạt",
    role: "Người cao tuổi / Công dân",
    activeNav: "Báo cáo rác",
    badges: [
      { text: "CHẾ ĐỘ CAO TUỔI", top: "-12px", right: "20px" },
      { text: "FONT SIZE 150%", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title" style="font-size: 20px;">BÁO CÁO RÁC - CHẾ ĐỘ DỄ DÙNG (CHỮ TO)</div>
          <div class="page-subtitle">Chức năng 12 (Ảnh 12.1) • Phụ trách: Nguyễn Thành Đạt</div>
        </div>
        <button class="btn btn-black" style="padding: 10px 20px; font-size: 14px;">BẬT LOA ĐỌC</button>
      </div>

      <div class="card-box" style="padding: 24px;">
        <div style="font-size: 18px; font-weight: 800; margin-bottom: 16px;">Bác muốn làm gì hôm nay?</div>
        <div class="grid-2">
          <div style="border: 3px solid #111; padding: 24px; border-radius: 12px; text-align: center; cursor: pointer; background: #e5e7eb;">
            <div style="font-size: 40px; margin-bottom: 8px;">📷</div>
            <div style="font-size: 18px; font-weight: 800;">1. CHỤP HÌNH BÃI RÁC</div>
            <div style="font-size: 14px; color: #4b5563; margin-top: 4px;">Máy sẽ tự lấy vị trí của bác</div>
          </div>
          <div style="border: 3px solid #111; padding: 24px; border-radius: 12px; text-align: center; cursor: pointer;">
            <div style="font-size: 40px; margin-bottom: 8px;">📞</div>
            <div style="font-size: 18px; font-weight: 800;">2. GỌI TỔ TRƯỞNG KHU PHỐ</div>
            <div style="font-size: 14px; color: #4b5563; margin-top: 4px;">Bấm để gọi điện trực tiếp</div>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_12_2",
    numBadge: "Ảnh 12.2",
    title: "Hướng dẫn sử dụng tương tác Quick Tour 3D",
    member: "Nguyễn Thành Đạt",
    role: "Người dùng mới",
    activeNav: "Dashboard",
    badges: [
      { text: "QUICK TOUR 3D", top: "-12px", right: "20px" },
      { text: "STEP 2 OF 5", top: "120px", left: "380px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Hướng dẫn tương tác tính năng bản đồ số WebGIS</div>
          <div class="page-subtitle">Chức năng 12 (Ảnh 12.2) • Phụ trách: Nguyễn Thành Đạt</div>
        </div>
      </div>

      <div class="card-box" style="position: relative;">
        <div class="map-box" style="height: 280px; background: #e5e7eb;">
          <!-- Tour Tooltip Overlay -->
          <div style="position: absolute; top: 60px; left: 300px; width: 320px; background: #fff; border: 2px solid #222; border-radius: 8px; padding: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.25);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span class="tag tag-dark">BƯỚC 2/5</span>
              <span style="font-size: 12px; color: #6b7280; font-weight: 700;">Quick Tour</span>
            </div>
            <div style="font-weight: 800; font-size: 13px; margin-bottom: 6px;">🧭 Kéo bản đồ & Xem điểm ngập lụt</div>
            <div style="font-size: 12px; color: #4b5563; line-height: 1.5; margin-bottom: 12px;">
              Bạn có thể phóng to / thu nhỏ bằng con lăn chuột hoặc bấm chuột phải vào bất kỳ vệt đường nào để báo ngập nhanh.
            </div>
            <div style="display: flex; justify-content: space-between;">
              <button class="btn btn-white btn-sm">Bỏ qua tour</button>
              <button class="btn btn-black btn-sm">Tiếp tục (3/5) ➔</button>
            </div>
          </div>
        </div>
      </div>
    `
  }
];
