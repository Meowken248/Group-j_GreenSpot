// screens_tuan.cjs - Wireframe screens for Lê Anh Tuấn (STT 37 - STT 48)
// Phân hệ: Phân Tích Thông Minh, Tuyến Đường An Toàn & Big Data Analytics Dashboard

module.exports = [
  {
    id: "Anh_37_1",
    numBadge: "Ảnh 37.1",
    title: "Cơ chế tính điểm rủi ro Risk Score (0-100) cho từng sự cố",
    member: "Lê Anh Tuấn",
    role: "Chuyên gia GIS / Phân tích dữ liệu",
    activeNav: "Phân tích rủi ro",
    badges: [
      { text: "STT 37: RISK SCORE 0-100", top: "-12px", right: "20px" },
      { text: "4 BIẾN SỐ ĐÁNH GIÁ", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Mô Hình Tính Toán Điểm Rủi Ro Đô Thị (Urban Risk Score Engine)</div>
          <div class="page-subtitle">STT 37 (Ảnh 37.1) • Phân hệ: Phân tích Sự cố • Phụ trách: Lê Anh Tuấn</div>
        </div>
      </div>

      <div class="card-box" style="margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #222; padding-bottom: 10px; margin-bottom: 12px;">
          <div>
            <div style="font-size: 15px; font-weight: 800;">Sự cố #INC-2026-0891 tại 53 Võ Văn Ngân, Thủ Đức</div>
            <div style="font-size: 11px; color: #6b7280;">Thuật toán tự động chấm điểm theo công thức chuẩn hóa Risk Engine</div>
          </div>
          <div style="background: #111; color: #fff; padding: 8px 16px; border-radius: 8px; font-weight: 900; font-size: 22px;">
            86 / 100
          </div>
        </div>

        <table class="wire-table">
          <tr><th>Thành phần đánh giá (Biến số)</th><th>Công thức / Trọng số</th><th>Giá trị đo lường thực tế</th><th>Điểm thành phần</th></tr>
          <tr><td><b>1. Loại hình & Độc tính chất thải (W_type)</b></td><td>Trọng số 30%</td><td>Hóa chất rò rỉ + Bãi rác sinh hoạt bốc mùi</td><td>90 / 100 (27.0 đ)</td></tr>
          <tr><td><b>2. Thể tích & Quy mô ước tính (Vol_score)</b></td><td>Trọng số 20%</td><td>Quy mô lớn (~ 3.5 m³ tràn lòng đường)</td><td>85 / 100 (17.0 đ)</td></tr>
          <tr><td><b>3. Xác nhận cộng đồng (Upvotes)</b></td><td>Hệ số x2 (Tối đa 20đ)</td><td>38 lượt người dân bấm xác nhận có thật</td><td>20 / 20 (20.0 đ)</td></tr>
          <tr><td><b>4. Thời gian chờ xử lý (Hours_pending)</b></td><td>Hệ số x1.5 (Tối đa 30đ)</td><td>Tồn đọng 14 giờ chưa dọn sạch</td><td>22 / 30 (22.0 đ)</td></tr>
          <tr style="background: #f3f4f6; font-weight: bold;"><td>TỔNG ĐIỂM RỦI RO TỔNG HỢP</td><td>100%</td><td>Risk Score = 27 + 17 + 20 + 22</td><td>86 / 100</td></tr>
        </table>
      </div>
    `
  },
  {
    id: "Anh_38_1",
    numBadge: "Ảnh 38.1",
    title: "Tự động phân loại mức độ nguy hiểm: thấp, trung bình, cao, khẩn cấp",
    member: "Lê Anh Tuấn",
    role: "Chuyên gia GIS / Phân tích dữ liệu",
    activeNav: "Phân tích rủi ro",
    badges: [
      { text: "STT 38: PHÂN CẤP NGUY HIỂM", top: "-12px", right: "20px" },
      { text: "LEO THANG SLA THEO GIỜ", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Ma Trận Tự Động Phân Loại Mức Độ Nguy Hiểm & Cam Kết Xử Lý SLA</div>
          <div class="page-subtitle">STT 38 (Ảnh 38.1) • Phân hệ: Phân tích Sự cố • Phụ trách: Lê Anh Tuấn</div>
        </div>
      </div>

      <div class="grid-4" style="margin-bottom: 14px;">
        <div class="card-box" style="text-align: center; border-top: 4px solid #16a34a;">
          <div style="font-weight: 800; font-size: 13px;">🟢 THẤP (LOW)</div>
          <div style="font-size: 20px; font-weight: 900; margin: 6px 0;">0 - 39 đ</div>
          <div style="font-size: 11px; font-weight: bold; color: #166534;">SLA: 48 Giờ</div>
          <div style="font-size: 10px; color: #6b7280; margin-top: 4px;">Thu dọn định kỳ theo tuyến xe</div>
        </div>

        <div class="card-box" style="text-align: center; border-top: 4px solid #ca8a04;">
          <div style="font-weight: 800; font-size: 13px;">🟡 TRUNG BÌNH (MED)</div>
          <div style="font-size: 20px; font-weight: 900; margin: 6px 0;">40 - 59 đ</div>
          <div style="font-size: 11px; font-weight: bold; color: #854d0e;">SLA: 24 Giờ</div>
          <div style="font-size: 10px; color: #6b7280; margin-top: 4px;">Xử lý trong ngày hành chính</div>
        </div>

        <div class="card-box" style="text-align: center; border-top: 4px solid #ea580c; background: #f3f4f6;">
          <div style="font-weight: 800; font-size: 13px;">🟠 CAO (HIGH)</div>
          <div style="font-size: 20px; font-weight: 900; margin: 6px 0;">60 - 84 đ</div>
          <div style="font-size: 11px; font-weight: bold; color: #9a3412;">SLA: 8 Giờ</div>
          <div style="font-size: 10px; color: #111; margin-top: 4px;">Ưu tiên điều xe ca gần nhất</div>
        </div>

        <div class="card-box" style="text-align: center; border-top: 4px solid #dc2626; background: #fef2f2;">
          <div style="font-weight: 800; font-size: 13px; color: #dc2626;">🔴 KHẨN CẤP (CRITICAL)</div>
          <div style="font-size: 20px; font-weight: 900; color: #dc2626; margin: 6px 0;">85 - 100 đ</div>
          <div style="font-size: 11px; font-weight: bold; color: #dc2626;">SLA: 2 Giờ</div>
          <div style="font-size: 10px; color: #dc2626; margin-top: 4px;">Báo động đội phản ứng nhanh</div>
        </div>
      </div>

      <div class="card-box">
        <div class="card-title">Cơ chế tự động leo thang cảnh báo (SLA Escalation Worker):</div>
        <div style="font-size: 11px; line-height: 1.6; color: #374151;">
          Nếu sự cố ở mức <b>CAO</b> tồn đọng quá 6 giờ mà chưa có tài xế nhận lệnh, Worker nền sẽ tự động cộng thêm điểm tồn đọng (+1.5 đ/giờ) và tự động kích hoạt đẩy mức cảnh báo lên <b>KHẨN CẤP</b> để chuyển tiếp hồ sơ lên Cán bộ quản lý quận.
        </div>
      </div>
    `
  },
  {
    id: "Anh_39_1",
    numBadge: "Ảnh 39.1",
    title: "Phát hiện và gom cụm các báo cáo gần nhau theo tọa độ (DBSCAN)",
    member: "Lê Anh Tuấn",
    role: "Chuyên gia GIS / Phân tích dữ liệu",
    activeNav: "Phân tích rủi ro",
    badges: [
      { text: "STT 39: THUẬT TOÁN DBSCAN", top: "-12px", right: "20px" },
      { text: "EPS=50M, MIN_SAMPLES=2", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Giải Thuật Tự Động Gom Cụm Điểm Báo Cáo Không Gian (DBSCAN)</div>
          <div class="page-subtitle">STT 39 (Ảnh 39.1) • Phân hệ: Không gian Thông minh • Phụ trách: Lê Anh Tuấn</div>
        </div>
        <div style="font-size: 12px; font-weight: 700; background: #e5e7eb; border: 1.5px solid #222; padding: 4px 10px; border-radius: 6px;">
          Tham số: Epsilon = 50 mét | MinSamples = 2 báo cáo
        </div>
      </div>

      <div class="card-box">
        <div class="map-box" style="height: 310px; position: relative;">
          <svg style="width: 100%; height: 100%;">
            <path d="M 60 140 L 740 100" stroke="#cbd5e1" stroke-width="16" fill="none"/>
            <path d="M 320 20 L 320 280" stroke="#cbd5e1" stroke-width="14" fill="none"/>
          </svg>

          <!-- Clustered Master Incident Marker -->
          <div style="position: absolute; top: 75px; left: 300px; width: 54px; height: 54px; border-radius: 50%; background: #111; color: #fff; border: 3px solid #fff; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 17px; box-shadow: 0 4px 14px rgba(0,0,0,0.35);">
            12
          </div>
          <div style="position: absolute; top: 140px; left: 270px; background: #fff; border: 2px solid #222; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: bold; width: 220px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
            <div><b>Cụm Master:</b> Bãi rác Chợ Thủ Đức</div>
            <div style="font-size: 10px; color: #6b7280;">Gom từ 12 báo cáo người dân (bán kính 50m)</div>
          </div>

          <!-- Noise Point -->
          <div style="position: absolute; top: 80px; left: 580px; width: 28px; height: 28px; border-radius: 50%; background: #6b7280; color: #fff; border: 2px solid #fff; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold;">
            1
          </div>
          <div style="position: absolute; top: 115px; left: 560px; background: #fff; border: 1.5px solid #222; padding: 2px 6px; border-radius: 4px; font-size: 10px;">
            Điểm đơn lẻ (Noise)
          </div>

          <div style="position: absolute; bottom: 12px; right: 12px; background: #fff; border: 1.5px solid #222; padding: 6px 12px; border-radius: 6px; font-size: 11px;">
            Tránh tình trạng điều nhiều xe tới cùng 1 bãi rác bị người dân chụp nhiều góc
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_40_1",
    numBadge: "Ảnh 40.1",
    title: "Phân tích và xác định điểm nóng sự cố theo không gian và thời gian",
    member: "Lê Anh Tuấn",
    role: "Chuyên gia GIS / Phân tích dữ liệu",
    activeNav: "Phân tích rủi ro",
    badges: [
      { text: "STT 40: SPATIO-TEMPORAL HOTSPOTS", top: "-12px", right: "20px" },
      { text: "DÒ ĐIỂM NÓNG TÁI PHÁT", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Phân Tích Điểm Nóng Sự Cố Không Gian - Thời Gian (Spatio-Temporal)</div>
          <div class="page-subtitle">STT 40 (Ảnh 40.1) • Phân hệ: Không gian Thông minh • Phụ trách: Lê Anh Tuấn</div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-black btn-sm">Theo tuần</button>
          <button class="btn btn-white btn-sm">Theo tháng</button>
          <button class="btn btn-white btn-sm">Theo quý</button>
        </div>
      </div>

      <div class="card-box">
        <div class="map-box" style="height: 310px; position: relative;">
          <!-- Spatio-temporal heatmap kernel density -->
          <div style="position: absolute; top: 70px; left: 260px; width: 180px; height: 180px; border-radius: 50%; background: radial-gradient(circle, rgba(220, 38, 38, 0.6) 0%, rgba(234, 88, 12, 0.35) 50%, transparent 80%);"></div>

          <div style="position: absolute; top: 120px; left: 460px; width: 140px; height: 140px; border-radius: 50%; background: radial-gradient(circle, rgba(245, 158, 11, 0.45) 0%, transparent 75%);"></div>

          <div style="position: absolute; top: 20px; left: 20px; background: #fff; border: 2px solid #222; border-radius: 8px; padding: 10px 14px; width: 300px;">
            <div style="font-weight: 800; font-size: 12px; color: #dc2626;">🔥 ĐIỂM NÓNG TÁI VI PHẠM CAO NHẤT:</div>
            <div style="font-size: 11px; margin-top: 4px;">
              <b>Ngã ba Linh Đông - Kha Vạn Cân (Thủ Đức)</b>
              <div style="color: #4b5563;">• Số vụ đổ trộm: <b>18 lần trong 60 ngày</b></div>
              <div style="color: #4b5563;">• Khung giờ xuất hiện nhiều nhất: <b>22:00 - 03:00 sáng</b></div>
              <div style="color: #dc2626; font-weight: bold;">• Khuyến nghị: Lắp camera phạt nguội đô thị</div>
            </div>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_41_1",
    numBadge: "Ảnh 41.1",
    title: "Báo cáo điểm ngập lụt cộng đồng 1 chạm qua menu chuột phải",
    member: "Lê Anh Tuấn",
    role: "Toàn bộ người dùng",
    activeNav: "Bản đồ ngập lụt",
    badges: [
      { text: "STT 41: BÁO NGẬP 1 CHẠM", top: "-12px", right: "20px" },
      { text: "CONTEXT MENU BẢN ĐỒ", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Báo Cáo Điểm Ngập Lụt Đô Thị 1 Chạm (Context Menu Chuột Phải)</div>
          <div class="page-subtitle">STT 41 (Ảnh 41.1) • Phân hệ: Giám sát Ngập lụt • Phụ trách: Lê Anh Tuấn</div>
        </div>
      </div>

      <div class="card-box">
        <div class="map-box" style="height: 320px; position: relative;">
          <!-- Right Click Context Menu Mockup -->
          <div style="position: absolute; top: 90px; left: 320px; width: 260px; background: #fff; border: 2px solid #222; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.2); z-index: 50; overflow: hidden;">
            <div style="padding: 10px 14px; border-bottom: 1.5px solid #222; background: #f3f4f6; font-weight: 800; font-size: 12px;">
              📍 TỌA ĐỘ: 10.7912°N, 106.7145°E
            </div>
            <div style="padding: 10px 14px; border-bottom: 1px solid #e5e7eb; font-size: 12px; font-weight: bold; cursor: pointer; background: #e5e7eb; display: flex; align-items: center; gap: 8px;">
              <span>🌊</span>
              <span>BÁO CÁO ĐIỂM NGẬP TẠI ĐÂY</span>
            </div>
            <div style="padding: 8px 14px; border-bottom: 1px solid #e5e7eb; font-size: 11px; color: #4b5563; cursor: pointer;">
              🗑️ Báo cáo bãi rác bừa bãi
            </div>
            <div style="padding: 8px 14px; font-size: 11px; color: #4b5563; cursor: pointer;">
              🧭 Đặt làm điểm đến dẫn đường
            </div>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_41_2",
    numBadge: "Ảnh 41.2",
    title: "Modal nhập mực nước ngập lụt & Thuật toán bám đường OSRM",
    member: "Lê Anh Tuấn",
    role: "Toàn bộ người dùng",
    activeNav: "Bản đồ ngập lụt",
    badges: [
      { text: "STT 41: SNAP-TO-ROAD OSRM", top: "-12px", right: "20px" },
      { text: "BÁM TIM ĐƯỜNG CHUẨN", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Gửi Báo Cáo Ngập & Thuật Toán Tự Bám Tim Đường (Snap-To-Road)</div>
          <div class="page-subtitle">STT 41 (Ảnh 41.2) • Phân hệ: Giám sát Ngập lụt • Phụ trách: Lê Anh Tuấn</div>
        </div>
      </div>

      <div class="card-box" style="position: relative; height: 380px;">
        <div class="modal-overlay" style="width: 500px;">
          <div class="modal-title">🌊 BÁO CÁO ĐIỂM NGẬP NƯỚC HIỆN TRƯỜNG</div>
          
          <div class="form-group" style="text-align: left;">
            <label class="form-label">Tuyến đường ghi nhận (Tự động Snap-to-Road bằng OSRM):</label>
            <input type="text" class="form-input" value="Đường Nguyễn Hữu Cảnh, Phường 22, Quận Bình Thạnh" readonly>
            <div style="font-size: 10px; color: #166534; font-weight: bold; margin-top: 2px;">
              ✓ Đã tự động chiếu tọa độ GPS vào tim đường LineString cách 4.2m
            </div>
          </div>

          <div class="grid-2" style="text-align: left;">
            <div class="form-group">
              <label class="form-label">Độ sâu ngập ước tính:</label>
              <select class="form-select">
                <option>Ngập mắt cá chân (~ 15 cm)</option>
                <option selected>Ngập nửa bánh xe (~ 35 cm)</option>
                <option>Ngập lút bánh xe máy (~ 50 cm)</option>
                <option>Ngập sâu nguy hiểm (> 70 cm)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Tình trạng thông xe:</label>
              <select class="form-select">
                <option selected>Xe máy chết máy la liệt</option>
                <option>Xe gầm cao qua được</option>
                <option>Tê liệt hoàn toàn</option>
              </select>
            </div>
          </div>

          <div class="modal-actions" style="margin-top: 14px;">
            <button class="btn btn-black" style="padding: 9px 20px;">GỬI CẢNH BÁO CHO CỘNG ĐỒNG</button>
            <button class="btn btn-white">Hủy</button>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_42_1",
    numBadge: "Ảnh 42.1",
    title: "Xây dựng bản đồ nguy cơ ngập động theo từng khu vực (Vẽ đường 3 lớp)",
    member: "Lê Anh Tuấn",
    role: "Toàn bộ người dùng",
    activeNav: "Bản đồ ngập lụt",
    badges: [
      { text: "STT 42: BẢN ĐỒ NGẬP 3 LỚP", top: "-12px", right: "20px" },
      { text: "DYNAMIC FLOOD CORRIDOR", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Hành Lang Tuyến Đường Ngập Động 3 Lớp Vector (3-Layer Flood Rendering)</div>
          <div class="page-subtitle">STT 42 (Ảnh 42.1) • Phân hệ: Giám sát Ngập lụt • Phụ trách: Lê Anh Tuấn</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card-box">
          <div class="card-title">Cấu trúc 3 lớp hiển thị trên MapLibre GL:</div>
          <div style="display: flex; flex-direction: column; gap: 10px; font-size: 11px;">
            <div style="border: 1.5px solid #222; padding: 10px; border-radius: 6px; background: #f3f4f6;">
              <b>LỚP 1: LỚP NỀN ĐƯỜNG (BASE OSRM)</b>
              <div style="color: #6b7280; margin-top: 2px;">LineString độ rộng 14px màu xám đậm định hình tim đường.</div>
            </div>
            <div style="border: 1.5px solid #222; padding: 10px; border-radius: 6px; background: #fef3c7;">
              <b>LỚP 2: LỚP VIỀN PHÁT SÁNG NGUY CƠ (GLOW PULSE)</b>
              <div style="color: #6b7280; margin-top: 2px;">Độ rộng 20px nhấp nháy phát sáng cảnh báo theo cấp độ rủi ro (Vàng/Cam/Đỏ).</div>
            </div>
            <div style="border: 1.5px solid #222; padding: 10px; border-radius: 6px; background: #e0f2fe;">
              <b>LỚP 3: LỚP LÕI CHIỀU SÂU MỰC NƯỚC (WATER DEPTH CORE)</b>
              <div style="color: #6b7280; margin-top: 2px;">LineString lõi 6px màu xanh nước biển thể hiện chiều sâu nước ngập (cm).</div>
            </div>
          </div>
        </div>

        <div class="card-box">
          <div class="map-box" style="height: 290px; position: relative;">
            <svg style="width: 100%; height: 100%;">
              <!-- Layer 2: Glow warning -->
              <path d="M 40,160 Q 180,80 340,160 T 640,150" stroke="#f59e0b" stroke-width="22" stroke-opacity="0.5" fill="none"/>
              <!-- Layer 1: Road Base -->
              <path d="M 40,160 Q 180,80 340,160 T 640,150" stroke="#334155" stroke-width="14" fill="none"/>
              <!-- Layer 3: Water Core -->
              <path d="M 40,160 Q 180,80 340,160 T 640,150" stroke="#38bdf8" stroke-width="6" fill="none"/>
            </svg>
            <div style="position: absolute; top: 70px; left: 180px; background: #111; color: #fff; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: bold;">
              Đường Quốc Hương (Thảo Điền): Ngập 42cm
            </div>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_43_1",
    numBadge: "Ảnh 43.1",
    title: "Tìm tuyến đường an toàn tránh khu vực đang ngập (PostGIS ST_DWithin)",
    member: "Lê Anh Tuấn",
    role: "Toàn bộ người dùng",
    activeNav: "Tìm đường né ngập",
    badges: [
      { text: "STT 43: TÌM ĐƯỜNG AN TOÀN", top: "-12px", right: "20px" },
      { text: "ST_DWithin 150M BUFFER", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Thuật Toán Quét An Toàn Tuyến Đường Tránh Vùng Ngập (Safe Routing)</div>
          <div class="page-subtitle">STT 43 (Ảnh 43.1) • Phân hệ: Giám sát Ngập lụt • Phụ trách: Lê Anh Tuấn</div>
        </div>
      </div>

      <div class="card-box" style="margin-bottom: 12px;">
        <div class="card-title">Nguyên lý truy vấn không gian PostGIS ST_DWithin:</div>
        <div style="font-size: 12px; background: #f3f4f6; border: 1.5px solid #222; padding: 10px; border-radius: 6px; font-family: monospace;">
          SELECT hotspot_id, water_depth_cm FROM flood_hotspots<br>
          WHERE ST_DWithin(flood_hotspots.geom::geography, ST_GeomFromGeoJSON(:route_polyline)::geography, 150.0);
        </div>
        <div style="font-size: 11px; color: #4b5563; margin-top: 6px;">
          Tự động thiết lập vành đai đệm 150m dọc suốt tuyến đường để phát hiện trước các vùng ngập cắt ngang.
        </div>
      </div>

      <div class="card-box">
        <div class="map-box" style="height: 220px; position: relative;">
          <svg style="width: 100%; height: 100%;">
            <!-- Route buffer polygon -->
            <path d="M 60,140 Q 220,60 380,140 T 700,120" stroke="#22c55e" stroke-width="30" stroke-opacity="0.2" fill="none"/>
            <!-- Safe route line -->
            <path d="M 60,140 Q 220,60 380,140 T 700,120" stroke="#16a34a" stroke-width="5" fill="none"/>
          </svg>
          <div style="position: absolute; bottom: 12px; left: 14px; background: #fff; border: 1.5px solid #222; padding: 6px 12px; border-radius: 6px; font-size: 11px;">
            🟢 Tuyến đường đã quét an toàn: <b>Không có điểm ngập nào nằm trong hành lang 150m</b>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_44_1",
    numBadge: "Ảnh 44.1",
    title: "So sánh tuyến đường nhanh nhất và tuyến đường an toàn nhất",
    member: "Lê Anh Tuấn",
    role: "Toàn bộ người dùng",
    activeNav: "Tìm đường né ngập",
    badges: [
      { text: "STT 44: SO SÁNH 2 TUYẾN ĐƯỜNG", top: "-12px", right: "20px" },
      { text: "NHANH NHẤT VS AN TOÀN", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">So Sánh Trực Quan Lộ Trình: Tuyến Nhanh Nhất vs Tuyến Né Ngập An Toàn</div>
          <div class="page-subtitle">STT 44 (Ảnh 44.1) • Phân hệ: Giám sát Ngập lụt • Phụ trách: Lê Anh Tuấn</div>
        </div>
      </div>

      <div class="card-box" style="margin-bottom: 12px;">
        <div class="map-box" style="height: 240px; position: relative;">
          <svg style="width: 100%; height: 100%;">
            <!-- Red line: Fastest but flooded -->
            <path d="M 80,180 L 360,70 L 640,160" stroke="#dc2626" stroke-width="6" fill="none"/>
            <circle cx="360" cy="70" r="14" fill="#dc2626"/>
            <text x="354" y="75" font-size="12" font-weight="900" fill="#fff">X</text>
            <text x="310" y="45" font-size="10" font-weight="bold" fill="#dc2626">Nguyễn Hữu Cảnh (Ngập 38cm)</text>

            <!-- Green line: Safest Detour -->
            <path d="M 80,180 Q 200,220 380,210 T 640,160" stroke="#16a34a" stroke-width="6" stroke-dasharray="8 4" fill="none"/>
          </svg>

          <!-- Origin & Destination labels -->
          <div style="position: absolute; top: 165px; left: 30px; background: #111; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: bold;">(A) Điểm xuất phát</div>
          <div style="position: absolute; top: 145px; right: 20px; background: #111; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: bold;">(B) Đích đến</div>
        </div>
      </div>

      <!-- Comparison Panel from Section IV of Report -->
      <div class="grid-2">
        <div class="card-box" style="border: 2px solid #dc2626; background: #fef2f2;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <b style="color: #dc2626;">🔴 TUYẾN NHANH NHẤT (FASTEST)</b>
            <span class="tag tag-gray" style="color: #dc2626; border-color: #dc2626;">5.2 km - 14 phút</span>
          </div>
          <div style="font-size: 11px; line-height: 1.5; color: #7f1d1d;">
            • CẢNH BÁO: Đi qua 2 điểm ngập (Đoạn Nguyễn Hữu Cảnh ngập sâu 38cm).<br>
            • Nguy cơ chết máy xe máy: <b>RẤT CAO [Không khuyến nghị]</b>
          </div>
        </div>

        <div class="card-box" style="border: 2px solid #16a34a; background: #f0fdf4;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <b style="color: #166534;">🟢 TUYẾN AN TOÀN (SAFEST DETOUR)</b>
            <span class="tag tag-gray" style="color: #166534; border-color: #166534;">6.1 km - 17 phút (+3p)</span>
          </div>
          <div style="font-size: 11px; line-height: 1.5; color: #14532d; margin-bottom: 8px;">
            • ĐÁNH GIÁ: Tuyến đường khô ráo, né hoàn toàn các vùng ngập sâu.<br>
            • Khả năng lưu thông: <b>100% An toàn tuyệt đối</b>
          </div>
          <button class="btn btn-black btn-sm" style="width: 100%;">CHỌN TUYẾN AN TOÀN NÀY (BẮT ĐẦU ĐI) ➔</button>
        </div>
      </div>
    `
  },
  {
    id: "Anh_45_1",
    numBadge: "Ảnh 45.1",
    title: "Tìm cơ sở thiết yếu gần sự cố (Bệnh viện, trường học vùng đệm 1km)",
    member: "Lê Anh Tuấn",
    role: "Chuyên gia GIS / Cán bộ môi trường",
    activeNav: "Phân tích rủi ro",
    badges: [
      { text: "STT 45: QUÉT VÙNG ĐỆM 1KM", top: "-12px", right: "20px" },
      { text: "CƠ SỞ THIẾT YẾU", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Công Cụ Quét Vùng Đệm Bán Kính 1km (Buffer 1000m) Cơ Sở Thiết Yếu</div>
          <div class="page-subtitle">STT 45 (Ảnh 45.1) • Phân hệ: Không gian Thông minh • Phụ trách: Lê Anh Tuấn</div>
        </div>
      </div>

      <div class="card-box">
        <div class="map-box" style="height: 310px; position: relative;">
          <svg style="width: 100%; height: 100%;">
            <!-- 1km Buffer Circle -->
            <circle cx="360" cy="150" r="120" fill="rgba(239, 68, 68, 0.12)" stroke="#dc2626" stroke-width="2" stroke-dasharray="6 4"/>
            <!-- Incident Center -->
            <circle cx="360" cy="150" r="8" fill="#dc2626"/>
            <text x="375" y="155" font-size="11" font-weight="900">Sự cố #INC-0891</text>

            <!-- Essential Facilities nearby -->
            <rect x="420" y="90" width="16" height="16" fill="#2563eb"/>
            <text x="442" y="103" font-size="10" font-weight="bold">BV Đa Khoa KV Thủ Đức (420m)</text>

            <rect x="300" y="210" width="16" height="16" fill="#16a34a"/>
            <text x="322" y="223" font-size="10" font-weight="bold">Trường THPT Thủ Đức (380m)</text>

            <rect x="270" y="80" width="16" height="16" fill="#16a34a"/>
            <text x="170" y="93" font-size="10" font-weight="bold">Mầm Non Tuổi Thơ (650m)</text>
          </svg>

          <!-- Drawer trigger button on Incident Card -->
          <div style="position: absolute; bottom: 14px; left: 14px; background: #fff; border: 2px solid #222; border-radius: 8px; padding: 10px 14px; width: 320px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
            <div style="font-weight: 800; font-size: 12px; margin-bottom: 4px;">TÙY CHỌN PHÂN TÍCH TÁC ĐỘNG:</div>
            <button class="btn btn-black btn-sm" style="width: 100%;">
              🔍 Xem danh sách cơ sở thiết yếu (Vùng đệm 1km)
            </button>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_45_2",
    numBadge: "Ảnh 45.2",
    title: "Drawer danh sách cơ sở thiết yếu bị ảnh hưởng trong bán kính 1km",
    member: "Lê Anh Tuấn",
    role: "Cán bộ môi trường / Ứng phó",
    activeNav: "Phân tích rủi ro",
    badges: [
      { text: "STT 45: DANH SÁCH 1KM", top: "-12px", right: "20px" },
      { text: "KHOẢNG CÁCH CHÍNH XÁC", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Bảng Thống Kê Cơ Sở Y Tế & Trường Học Trong Bán Kính 1km (ST_DWithin)</div>
          <div class="page-subtitle">STT 45 (Ảnh 45.2) • Phân hệ: Không gian Thông minh • Phụ trách: Lê Anh Tuấn</div>
        </div>
        <button class="btn btn-black">Xuất báo cáo ứng phó</button>
      </div>

      <div class="card-box">
        <div style="font-weight: 800; font-size: 13px; margin-bottom: 8px;">
          Phát hiện <b>5 cơ sở thiết yếu</b> nằm trong vùng phát tán ô nhiễm / ngập lụt:
        </div>
        <table class="wire-table">
          <tr><th>Tên Cơ Sở Thiết Yếu</th><th>Phân Loại</th><th>Địa Chỉ</th><th>Khoảng Cách Thực Tế</th><th>Mức Độ Cảnh Báo</th></tr>
          <tr><td><b>Bệnh viện Đa Khoa KV Thủ Đức</b></td><td>Y tế cấp cứu</td><td>29 Khu phố 4, Linh Chiểu</td><td><b>380 mét</b></td><td><span class="tag tag-gray" style="color:#dc2626;border-color:#dc2626;font-weight:bold;">NGUY CƠ CAO</span></td></tr>
          <tr><td><b>Trường THPT Thủ Đức</b></td><td>Giáo dục phổ thông</td><td>166/24 Đặng Văn Bi</td><td><b>420 mét</b></td><td><span class="tag tag-gray" style="color:#dc2626;border-color:#dc2626;font-weight:bold;">NGUY CƠ CAO</span></td></tr>
          <tr><td><b>Trường Mầm Non Tuổi Thơ</b></td><td>Giáo dục mầm non</td><td>Số 8 Đường số 9</td><td><b>650 mét</b></td><td><span class="tag tag-gray" style="color:#ea580c;border-color:#ea580c;font-weight:bold;">TRUNG BÌNH</span></td></tr>
          <tr><td><b>Trạm Y Tế Phường Linh Chiểu</b></td><td>Y tế cơ sở</td><td>12 Đường số 6</td><td><b>780 mét</b></td><td><span class="tag tag-gray">THEO DÕI</span></td></tr>
          <tr><td><b>Trường Tiểu Học Lương Thế Vinh</b></td><td>Giáo dục tiểu học</td><td>Đường Hàn Thuyên</td><td><b>910 mét</b></td><td><span class="tag tag-gray">THEO DÕI</span></td></tr>
        </table>
      </div>
    `
  },
  {
    id: "Anh_46_1",
    numBadge: "Ảnh 46.1",
    title: "Hệ thống đa ngôn ngữ tập trung Python Backend (python-i18n)",
    member: "Lê Anh Tuấn",
    role: "Toàn bộ người dùng",
    activeNav: "Quản trị hệ thống",
    badges: [
      { text: "STT 46: ĐA NGÔN NGỮ i18n", top: "-12px", right: "20px" },
      { text: "PYTHON-i18n BACKEND", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Hệ Thống Đa Ngôn Ngữ Tập Trung Backend (python-i18n Locale Manager)</div>
          <div class="page-subtitle">STT 46 (Ảnh 46.1) • Phân hệ: Đa Ngôn Ngữ • Phụ trách: Lê Anh Tuấn</div>
        </div>
        <div style="display: flex; gap: 6px;">
          <button class="btn btn-black btn-sm">🇻🇳 Tiếng Việt</button>
          <button class="btn btn-white btn-sm">🇬🇧 English</button>
        </div>
      </div>

      <div class="grid-2">
        <div class="card-box">
          <div class="card-title">Cơ chế đồng bộ qua HTTP Header Accept-Language:</div>
          <div style="font-size: 11px; background: #fafafa; border: 1.5px solid #222; border-radius: 6px; padding: 10px; font-family: monospace; line-height: 1.6;">
            GET /api/v1/eco-locations/summary<br>
            Accept-Language: vi-VN,vi;q=0.9,en-US;q=0.8<br>
            ➔ Backend tự động trả về nhãn thông điệp tiếng Việt.<br><br>
            GET /api/v1/eco-locations/summary<br>
            Accept-Language: en-US,en;q=0.9<br>
            ➔ Backend tự động trả về nhãn thông điệp tiếng Anh.
          </div>
        </div>

        <div class="card-box">
          <div class="card-title">Bộ từ điển JSON tập trung (vi.json vs en.json):</div>
          <table class="wire-table">
            <tr><th>Khóa từ điển (Key)</th><th>Tiếng Việt (vi.json)</th><th>English (en.json)</th></tr>
            <tr><td><code>status_pending</code></td><td>Chờ đội phản ứng nhanh</td><td>Pending Dispatch</td></tr>
            <tr><td><code>status_in_progress</code></td><td>Đang xử lý tại hiện trường</td><td>In Progress</td></tr>
            <tr><td><code>status_resolved</code></td><td>Đã nghiệm thu xử lý</td><td>Resolved</td></tr>
            <tr><td><code>alert_flood_critical</code></td><td>Ngập lụt nghiêm trọng</td><td>Critical Flooding</td></tr>
          </table>
        </div>
      </div>
    `
  },
  {
    id: "Anh_47_1",
    numBadge: "Ảnh 47.1",
    title: "Bộ điều hợp đồng bộ dữ liệu thời gian thực Live Runtime Synchronizer",
    member: "Lê Anh Tuấn",
    role: "Kỹ sư hệ thống / Backend",
    activeNav: "Quản trị hệ thống",
    badges: [
      { text: "STT 47: LIVE SYNCHRONIZER", top: "-12px", right: "20px" },
      { text: "CACHE TTL 300 SECONDS", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Bộ Điều Hợp Đồng Bộ Dữ Liệu Thời Gian Thực (Live Runtime Synchronizer)</div>
          <div class="page-subtitle">STT 47 (Ảnh 47.1) • Phân hệ: AI & Big Data • Phụ trách: Lê Anh Tuấn</div>
        </div>
        <button class="btn btn-black">Đồng bộ thủ công ngay</button>
      </div>

      <div class="grid-3" style="margin-bottom: 12px;">
        <div class="card-box" style="text-align: center;">
          <div style="font-size: 22px; font-weight: 900; color: #166534;">🟢 RUNNING</div>
          <div style="font-size: 11px; color: #6b7280;">Chu kỳ quét Worker: <b>Mỗi 5 phút</b></div>
        </div>
        <div class="card-box" style="text-align: center;">
          <div style="font-size: 22px; font-weight: 900;">300 Giây</div>
          <div style="font-size: 11px; color: #6b7280;">Thời gian lưu đệm In-Memory Cache TTL</div>
        </div>
        <div class="card-box" style="text-align: center;">
          <div style="font-size: 22px; font-weight: 900; color: #2563eb;">94.2%</div>
          <div style="font-size: 11px; color: #6b7280;">Tỷ lệ Cache Hit (Tiết kiệm gọi API ngoài)</div>
        </div>
      </div>

      <div class="card-box">
        <div class="card-title">Trạng thái các nguồn cấp dữ liệu vi khí hậu & thủy văn:</div>
        <table class="wire-table">
          <tr><th>Kênh dữ liệu viễn trắc</th><th>Dịch vụ cung cấp</th><th>Thời điểm đồng bộ cuối</th><th>Bản ghi nhận</th><th>Trạng thái</th></tr>
          <tr><td><b>Open-Meteo ECMWF</b></td><td>Nhiệt độ, Độ ẩm, Tốc độ gió 34 tỉnh</td><td>Vừa xong (12:00:04)</td><td>34 records</td><td><span class="tag tag-dark">HOÀN TẤT</span></td></tr>
          <tr><td><b>CAMS Atmosphere</b></td><td>Chỉ số 7 chất ô nhiễm AQI realtime</td><td>Vừa xong (12:00:05)</td><td>238 metrics</td><td><span class="tag tag-dark">HOÀN TẤT</span></td></tr>
          <tr><td><b>Copernicus GloFAS</b></td><td>Dự báo dòng chảy sông 7 ngày</td><td>10 phút trước</td><td>14 coordinates</td><td><span class="tag tag-dark">HOÀN TẤT</span></td></tr>
        </table>
      </div>
    `
  },
  {
    id: "Anh_48_1",
    numBadge: "Ảnh 48.1",
    title: "Dashboard phân tích rủi ro đô thị (AQI & Khí hậu 34 tỉnh thành) - 5 Tabs",
    member: "Lê Anh Tuấn",
    role: "Chuyên gia dữ liệu lớn (Big Data)",
    activeNav: "Dashboard",
    badges: [
      { text: "STT 48: 7.1 TRIỆU BẢN GHI", top: "-12px", right: "20px" },
      { text: "34 TỈNH THÀNH • TAB 1-3", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Dashboard Phân Tích Rủi Ro Đô Thị (AQI & Khí Hậu 34 Tỉnh Thành)</div>
          <div class="page-subtitle">STT 48 (Ảnh 48.1) • Phân hệ: AI & Big Data • Phụ trách: Lê Anh Tuấn</div>
        </div>
        <div style="font-size: 12px; font-weight: 800; background: #111; color: #fff; padding: 4px 12px; border-radius: 6px;">
          Big Data Engine: 7.1 Triệu Bản Ghi Parquet (2025 - 2026)
        </div>
      </div>

      <!-- 5-Tab Navigation Bar -->
      <div style="display: flex; gap: 8px; border-bottom: 2px solid #222; padding-bottom: 6px; margin-bottom: 12px;">
        <button class="btn btn-black btn-sm">Tab 1: Tổng Quan AQI</button>
        <button class="btn btn-white btn-sm">Tab 2: Chuỗi Giờ 7 Chất</button>
        <button class="btn btn-white btn-sm">Tab 3: Khí Tượng Học</button>
        <button class="btn btn-white btn-sm">Tab 4: Ma Trận Pearson</button>
        <button class="btn btn-white btn-sm">Tab 5: Bảng Dữ Liệu & CSV</button>
      </div>

      <!-- Tab 1 & Tab 2 Content Mockup -->
      <div class="grid-3" style="margin-bottom: 12px;">
        <div class="card-box" style="text-align: center; border: 2px solid #16a34a; background: #f0fdf4;">
          <div style="font-size: 11px; font-weight: 800; color: #166534;">HERO METRIC AQI HIỆN TẠI</div>
          <div style="font-size: 38px; font-weight: 900; color: #166534; margin: 4px 0;">42</div>
          <div style="font-weight: 800; font-size: 13px; color: #166534;">CHẤT LƯỢNG: TỐT (GOOD)</div>
          <div style="font-size: 10px; color: #166534; margin-top: 4px;">Khuyến nghị: Thích hợp cho mọi hoạt động ngoài trời</div>
        </div>

        <div class="card-box">
          <div class="card-title">Top 3 Tỉnh/Thành Trong Lành Nhất:</div>
          <div style="font-size: 11px; display: flex; flex-direction: column; gap: 4px;">
            <div>🥇 <b>Đà Lạt (Lâm Đồng):</b> AQI 18 (Rất trong lành)</div>
            <div>🥈 <b>Côn Đảo (Bà Rịa - VT):</b> AQI 22</div>
            <div>🥉 <b>Phú Quốc (Kiên Giang):</b> AQI 26</div>
          </div>
        </div>

        <div class="card-box">
          <div class="card-title">Top 3 Tỉnh/Thành Cần Cảnh Báo:</div>
          <div style="font-size: 11px; display: flex; flex-direction: column; gap: 4px;">
            <div>⚠️ <b>Hà Nội:</b> AQI 142 (Kém nhạy cảm)</div>
            <div>⚠️ <b>Bắc Ninh:</b> AQI 135 (Kém)</div>
            <div>⚠️ <b>Thái Nguyên:</b> AQI 122 (Kém)</div>
          </div>
        </div>
      </div>

      <div class="card-box">
        <div class="card-title">Diễn biến chuỗi thời gian 7 chất ô nhiễm (24 giờ qua tại TP.HCM):</div>
        <div style="height: 140px; position: relative;">
          <svg style="width: 100%; height: 100%;">
            <path d="M 30,110 Q 110,60 210,95 T 380,50 T 540,80 T 700,70" stroke="#111" stroke-width="2.5" fill="none"/>
            <path d="M 30,130 Q 110,100 210,120 T 380,85 T 540,110 T 700,100" stroke="#6b7280" stroke-width="1.5" stroke-dasharray="4 2" fill="none"/>
          </svg>
          <div style="position: absolute; bottom: 4px; right: 10px; font-size: 10px; color: #4b5563;">
            Đường nét liền: PM2.5 (µg/m³) | Đường nét đứt: PM10 (µg/m³)
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_48_2",
    numBadge: "Ảnh 48.2",
    title: "Ma trận nhiệt tương quan Pearson giữa 6 chất ô nhiễm và khí hậu (Tab 4 & 5)",
    member: "Lê Anh Tuấn",
    role: "Chuyên gia dữ liệu lớn (Big Data)",
    activeNav: "Dashboard",
    badges: [
      { text: "STT 48: MA TRẬN TƯƠNG QUAN", top: "-12px", right: "20px" },
      { text: "PEARSON HEATMAP & CSV", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Ma Trận Nhiệt Tương Quan Pearson 6 Chất Ô Nhiễm & Xuất CSV (Tab 4 - 5)</div>
          <div class="page-subtitle">STT 48 (Ảnh 48.2) • Phân hệ: AI & Big Data • Phụ trách: Lê Anh Tuấn</div>
        </div>
        <button class="btn btn-black">📥 Xuất Báo Cáo CSV (UTF-8)</button>
      </div>

      <div class="grid-2">
        <div class="card-box">
          <div class="card-title">Ma trận tương quan nhiệt Pearson (r) giữa 6 chất:</div>
          <table class="wire-table" style="text-align: center;">
            <tr><th>Chất</th><th>PM2.5</th><th>PM10</th><th>NO2</th><th>SO2</th><th>CO</th><th>O3</th></tr>
            <tr><td><b>PM2.5</b></td><td style="background:#111;color:#fff;">1.00</td><td style="background:#e5e7eb;">0.89</td><td style="background:#e5e7eb;">0.74</td><td>0.52</td><td>0.68</td><td>-0.24</td></tr>
            <tr><td><b>PM10</b></td><td style="background:#e5e7eb;">0.89</td><td style="background:#111;color:#fff;">1.00</td><td>0.71</td><td>0.48</td><td>0.62</td><td>-0.18</td></tr>
            <tr><td><b>NO2</b></td><td>0.74</td><td>0.71</td><td style="background:#111;color:#fff;">1.00</td><td>0.65</td><td>0.78</td><td>-0.42</td></tr>
            <tr><td><b>SO2</b></td><td>0.52</td><td>0.48</td><td>0.65</td><td style="background:#111;color:#fff;">1.00</td><td>0.58</td><td>-0.15</td></tr>
            <tr><td><b>CO</b></td><td>0.68</td><td>0.62</td><td>0.78</td><td>0.58</td><td style="background:#111;color:#fff;">1.00</td><td>-0.35</td></tr>
            <tr><td><b>O3</b></td><td>-0.24</td><td>-0.18</td><td>-0.42</td><td>-0.15</td><td>-0.35</td><td style="background:#111;color:#fff;">1.00</td></tr>
          </table>
        </div>

        <div class="card-box">
          <div class="card-title">Quy luật Tự làm sạch Khí quyển (Atmospheric Self-Cleaning):</div>
          <div style="font-size: 11px; display: flex; flex-direction: column; gap: 8px;">
            <div style="border: 1.5px solid #222; padding: 8px; border-radius: 6px; background: #fafafa;">
              <b>Đồng hồ Pearson Gió (r = -0.58):</b>
              <div style="color: #4b5563;">Vận tốc gió tăng > 18 km/h giúp phân tán và làm giảm nồng độ PM2.5 xuống 42%.</div>
            </div>
            <div style="border: 1.5px solid #222; padding: 8px; border-radius: 6px; background: #fafafa;">
              <b>Đồng hồ Pearson Mưa (r = -0.72):</b>
              <div style="color: #4b5563;">Mưa rào lưu lượng > 25mm/h rửa trôi bụi mịn PM10 và các oxit nito nhanh chóng.</div>
            </div>
            <div style="border: 1.5px solid #222; padding: 8px; border-radius: 6px; background: #f0fdf4;">
              <b style="color: #166534;">Xếp hạng năng lực tự làm sạch TP.HCM:</b>
              <div style="color: #166534;">Đạt mức <b>TỐT (Cấp 2/5)</b> nhờ gió biển Đông Nam duy trì liên tục.</div>
            </div>
          </div>
        </div>
      </div>
    `
  }
];
