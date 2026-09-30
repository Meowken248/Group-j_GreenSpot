// screens_tuan.js - Wireframe screens for Lê Anh Tuấn (Chức năng 37 - 48)

module.exports = [
  {
    id: "Anh_37_1",
    numBadge: "Ảnh 37.1",
    title: "Cơ chế tính điểm rủi ro Risk Score (0-100) cho từng sự cố",
    member: "Lê Anh Tuấn",
    role: "Chuyên gia GIS / Phân tích",
    activeNav: "Phân tích không gian",
    badges: [
      { text: "RISK SCORE 0-100", top: "-12px", right: "20px" },
      { text: "TRỌNG SỐ KHÔNG GIAN", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Mô Hình Tính Toán Điểm Rủi Ro Đô Thị (Urban Risk Score)</div>
          <div class="page-subtitle">Chức năng 37 (Ảnh 37.1) • Phụ trách: Lê Anh Tuấn</div>
        </div>
      </div>

      <div class="card-box">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div>
            <b>Sự cố #RPT-8921</b> tại 53 Võ Văn Ngân, Thủ Đức
            <div style="font-size: 11px; color: #6b7280;">Thuật toán tự động chấm điểm dựa trên 4 biến số môi trường</div>
          </div>
          <div style="background: #111; color: #fff; padding: 6px 14px; border-radius: 8px; font-weight: 900; font-size: 20px;">
            86 / 100
          </div>
        </div>

        <table class="wire-table">
          <tr><th>Thành phần đánh giá</th><th>Trọng số (Weight)</th><th>Giá trị thực tế</th><th>Điểm thành phần</th></tr>
          <tr><td>Khối lượng rác & Loại hình ô nhiễm</td><td>30%</td><td>Rác thải sinh hoạt bốc mùi > 3 tấn</td><td>85 / 100</td></tr>
          <tr><td>Khoảng cách đến Bệnh viện / Trường học</td><td>25%</td><td>Cách Trường THPT Thủ Đức 120m (< 200m)</td><td>95 / 100</td></tr>
          <tr><td>Dự báo thời tiết & Mưa lớn cục bộ</td><td>25%</td><td>RainViewer báo mưa 45mm/h trong 1h tới</td><td>90 / 100</td></tr>
          <tr><td>Lịch sử tái vi phạm tại tọa độ</td><td>20%</td><td>Đã bị phản ánh 4 lần trong 30 ngày qua</td><td>70 / 100</td></tr>
        </table>
      </div>
    `
  },
  {
    id: "Anh_38_1",
    numBadge: "Ảnh 38.1",
    title: "Tự động phân loại mức độ nguy hiểm: Thấp, Trung bình, Cao, Khẩn cấp",
    member: "Lê Anh Tuấn",
    role: "Chuyên gia GIS / Phân tích",
    activeNav: "Phân tích không gian",
    badges: [
      { text: "MA TRẬN NGUY HIỂM", top: "-12px", right: "20px" },
      { text: "4 CẤP ĐỘ", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Ma Trận Tự Động Phân Loại Mức Độ Nguy Hiểm Môi Trường</div>
          <div class="page-subtitle">Chức năng 38 (Ảnh 38.1) • Phụ trách: Lê Anh Tuấn</div>
        </div>
      </div>

      <div class="grid-4">
        <div class="card-box" style="border-top: 4px solid #16a34a; text-align: center;">
          <div style="font-weight: 800; font-size: 13px;">🟢 THẤP (LOW)</div>
          <div style="font-size: 18px; font-weight: 900; margin: 8px 0;">0 - 39 pts</div>
          <div style="font-size: 11px; color: #6b7280;">Ít ảnh hưởng, xử lý định kỳ theo tuyến xe</div>
        </div>
        <div class="card-box" style="border-top: 4px solid #ca8a04; text-align: center;">
          <div style="font-weight: 800; font-size: 13px;">🟡 TRUNG BÌNH (MED)</div>
          <div style="font-size: 18px; font-weight: 900; margin: 8px 0;">40 - 69 pts</div>
          <div style="font-size: 11px; color: #6b7280;">Bắt đầu bốc mùi, xử lý trong 24 giờ</div>
        </div>
        <div class="card-box" style="border-top: 4px solid #ea580c; text-align: center; background: #e5e7eb;">
          <div style="font-weight: 800; font-size: 13px;">🟠 CAO (HIGH)</div>
          <div style="font-size: 18px; font-weight: 900; margin: 8px 0;">70 - 89 pts</div>
          <div style="font-size: 11px; color: #111;">[ĐANG KÍCH HOẠT] Nghẽn cống, xử lý trong 12 giờ</div>
        </div>
        <div class="card-box" style="border-top: 4px solid #dc2626; text-align: center;">
          <div style="font-weight: 800; font-size: 13px; color: #dc2626;">🔴 KHẨN CẤP (CRITICAL)</div>
          <div style="font-size: 18px; font-weight: 900; color: #dc2626; margin: 8px 0;">90 - 100 pts</div>
          <div style="font-size: 11px; color: #dc2626;">Chất độc/ngập lụt nặng, xử lý trong 2 giờ</div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_39_1",
    numBadge: "Ảnh 39.1",
    title: "Phát hiện và gom cụm các báo cáo theo tọa độ (DBSCAN Clustered Markers)",
    member: "Lê Anh Tuấn",
    role: "Chuyên gia GIS / Phân tích",
    activeNav: "Phân tích không gian",
    badges: [
      { text: "THUẬT TOÁN DBSCAN", top: "-12px", right: "20px" },
      { text: "GOM CỤM ĐIỂM NÓNG", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Thuật Toán Gom Cụm Mật Độ Báo Cáo Không Gian (DBSCAN)</div>
          <div class="page-subtitle">Chức năng 39 (Ảnh 39.1) • Phụ trách: Lê Anh Tuấn</div>
        </div>
        <div style="font-size: 12px; font-weight: 700;">Tham số: Epsilon = 150m | MinPts = 4 điểm</div>
      </div>

      <div class="card-box">
        <div class="map-box" style="height: 260px; position: relative;">
          <svg style="width: 100%; height: 100%;">
            <path d="M 50 150 L 750 100" stroke="#cbd5e1" stroke-width="14" fill="none"/>
            <path d="M 300 20 L 300 240" stroke="#cbd5e1" stroke-width="12" fill="none"/>
          </svg>

          <!-- Cluster 1 -->
          <div style="position: absolute; top: 80px; left: 280px; width: 50px; height: 50px; border-radius: 50%; background: #111; color: #fff; border: 3px solid #fff; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 16px; box-shadow: 0 4px 10px rgba(0,0,0,0.3);">
            12
          </div>
          <div style="position: absolute; top: 140px; left: 270px; background: #fff; border: 1.5px solid #222; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;">
            Cụm nóng: Chợ Thủ Đức
          </div>

          <!-- Cluster 2 -->
          <div style="position: absolute; top: 70px; left: 560px; width: 40px; height: 40px; border-radius: 50%; background: #4b5563; color: #fff; border: 3px solid #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px;">
            5
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_40_1",
    numBadge: "Ảnh 40.1",
    title: "Phân tích không gian vùng đệm (Buffer 500m) tìm cơ sở thiết yếu",
    member: "Lê Anh Tuấn",
    role: "Chuyên gia GIS / Phân tích",
    activeNav: "Phân tích không gian",
    badges: [
      { text: "VÙNG ĐỆM BUFFER 500M", top: "-12px", right: "20px" },
      { text: "CƠ SỞ THIẾT YẾU", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Phân Tích Vùng Đệm (Buffer 500m) Cơ Sở Thiết Yếu Bị Ảnh Hưởng</div>
          <div class="page-subtitle">Chức năng 40 (Ảnh 40.1) • Phụ trách: Lê Anh Tuấn</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card-box" style="position: relative;">
          <div class="map-box" style="height: 240px; position: relative;">
            <svg style="width: 100%; height: 100%;">
              <!-- Buffer Circle -->
              <circle cx="200" cy="120" r="90" fill="rgba(239, 68, 68, 0.15)" stroke="#dc2626" stroke-width="2" stroke-dasharray="6 4"/>
              <!-- Incident Center -->
              <circle cx="200" cy="120" r="7" fill="#dc2626"/>
              <!-- Nearby Hospital -->
              <rect x="230" y="80" width="14" height="14" fill="#2563eb"/>
              <text x="250" y="92" font-size="10" font-weight="bold">BV Đa Khoa KV Thủ Đức</text>
              <!-- Nearby School -->
              <rect x="150" y="150" width="14" height="14" fill="#16a34a"/>
              <text x="170" y="162" font-size="10" font-weight="bold">Trường THPT Thủ Đức</text>
            </svg>
          </div>
        </div>

        <div class="card-box">
          <div class="card-title">Kết quả truy vấn PostGIS ST_DWithin:</div>
          <table class="wire-table">
            <tr><th>Cơ sở lân cận</th><th>Loại hình</th><th>Khoảng cách</th></tr>
            <tr><td>Bệnh viện Đa Khoa KV Thủ Đức</td><td>Y tế cấp cứu</td><td><b>140 mét</b></td></tr>
            <tr><td>Trường THPT Thủ Đức</td><td>Giáo dục học đường</td><td><b>210 mét</b></td></tr>
            <tr><td>Trường Mầm non Tuổi Hồng</td><td>Giáo dục trẻ em</td><td><b>380 mét</b></td></tr>
          </table>
          <div style="margin-top: 10px; font-size: 11px; color: #dc2626; font-weight: bold;">
            ⚠️ Báo động: Có 1 bệnh viện và 2 trường học nằm trong vùng phát tán ô nhiễm!
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_41_1",
    numBadge: "Ảnh 41.1",
    title: "Động cơ giải tích sóng triều bán nhật triều Harmonic Tide Engine",
    member: "Lê Anh Tuấn",
    role: "Chuyên gia Thủy văn",
    activeNav: "Bản đồ ngập lụt",
    badges: [
      { text: "HARMONIC TIDE ENGINE", top: "-12px", right: "20px" },
      { text: "PHÚ AN & NHÀ BÈ", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Động Cơ Giải Tích Triều Cường Bán Nhật Triều Sông Sài Gòn</div>
          <div class="page-subtitle">Chức năng 41 (Ảnh 41.1) • Phụ trách: Lê Anh Tuấn</div>
        </div>
      </div>

      <div class="card-box">
        <div class="map-box" style="height: 220px; background: #fafafa; position: relative;">
          <!-- SVG Tide Sine Wave Curve -->
          <svg style="width: 100%; height: 100%;">
            <!-- Axis lines -->
            <line x1="50" y1="180" x2="700" y2="180" stroke="#9ca3af" stroke-width="1"/>
            <!-- Alarm Level 3 (Báo động 3: 1.60m) -->
            <line x1="50" y1="60" x2="700" y2="60" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="4 2"/>
            <text x="55" y="55" font-size="10" font-weight="bold" fill="#dc2626">Báo động 3 (+1.60 m)</text>
            <!-- Tide Curve (Sine wave) -->
            <path d="M 50 140 Q 150 30 250 140 T 450 140 T 650 140" stroke="#111" stroke-width="3" fill="none"/>
            <!-- Peak Point -->
            <circle cx="150" cy="45" r="5" fill="#dc2626"/>
            <text x="160" y="45" font-size="11" font-weight="bold">Đỉnh triều: +1.68m (17:30)</text>
          </svg>
        </div>
        <div style="margin-top: 10px; font-size: 12px; display: flex; justify-content: space-between;">
          <span>Trạm quan trắc Phú An: <b>+1.68m (Vượt BĐ3 8cm)</b></span>
          <span>Trạm quan trắc Nhà Bè: <b>+1.65m (Vượt BĐ3 5cm)</b></span>
        </div>
      </div>
    `
  },
  {
    id: "Anh_42_1",
    numBadge: "Ảnh 42.1",
    title: "Dự báo đỉnh triều cực trị & Bản đồ vệt đường ngập 3 lớp",
    member: "Lê Anh Tuấn",
    role: "Chuyên gia Thủy văn",
    activeNav: "Bản đồ ngập lụt",
    badges: [
      { text: "ĐƯỜNG NGẬP 3 LỚP", top: "-12px", right: "20px" },
      { text: "DỰ BÁO ĐỈNH TRIỀU", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Bản Đồ Dự Báo Ngập Động Theo Tuyến Đường 3 Cấp Độ Sâu</div>
          <div class="page-subtitle">Chức năng 42 (Ảnh 42.1) • Phụ trách: Lê Anh Tuấn</div>
        </div>
      </div>

      <div class="card-box">
        <div class="map-box" style="height: 250px; background: #0f172a; position: relative;">
          <!-- SVG Glowing Road Flooding Layers -->
          <svg style="width: 100%; height: 100%;">
            <!-- Dry road -->
            <path d="M 50 80 L 250 80" stroke="#334155" stroke-width="10" fill="none"/>
            <!-- Level 1 (Yellow - Ngập mép vỉa hè 10-20cm) -->
            <path d="M 250 80 L 450 80" stroke="#eab308" stroke-width="12" fill="none"/>
            <!-- Level 2 (Orange - Ngập nửa bánh xe 20-35cm) -->
            <path d="M 450 80 L 600 120" stroke="#f97316" stroke-width="14" fill="none"/>
            <!-- Level 3 (Red - Ngập sâu > 40cm nguy hiểm) -->
            <path d="M 600 120 L 750 180" stroke="#ef4444" stroke-width="18" fill="none"/>
          </svg>
          <div style="position: absolute; bottom: 12px; left: 16px; background: rgba(0,0,0,0.85); color: #fff; padding: 6px 12px; border-radius: 6px; font-size: 11px;">
            Đang hiển thị 18 đoạn đường ngập: Võ Văn Ngân, Tô Ngọc Vân, Quốc Hương, Trần Não
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_43_1",
    numBadge: "Ảnh 43.1",
    title: "Tìm tuyến đường an toàn né khu vực ngập (PostGIS ST_DWithin)",
    member: "Lê Anh Tuấn",
    role: "Công dân / Lái xe",
    activeNav: "Tìm đường né ngập",
    badges: [
      { text: "NÉ NGẬP SAFEPATH", top: "-12px", right: "20px" },
      { text: "POSTGIS ST_DWITHIN", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Tìm Lộ Trình Di Chuyển An Toàn Né Khu Vực Đang Ngập</div>
          <div class="page-subtitle">Chức năng 43 (Ảnh 43.1) • Phụ trách: Lê Anh Tuấn</div>
        </div>
      </div>

      <div class="card-box">
        <div style="display: flex; gap: 10px; margin-bottom: 12px;">
          <input type="text" class="form-input" style="flex: 1;" value="Xuất phát: ĐH Sư Phạm Kỹ Thuật TP.HCM (HCMUTE)">
          <input type="text" class="form-input" style="flex: 1;" value="Đích đến: Chợ Thủ Đức">
          <button class="btn btn-black">Tìm đường an toàn</button>
        </div>

        <div class="map-box" style="height: 220px; position: relative;">
          <svg style="width: 100%; height: 100%;">
            <!-- Safe route in green -->
            <path d="M 100 180 Q 250 60 500 70 T 700 150" stroke="#16a34a" stroke-width="8" fill="none"/>
            <!-- Flooded area blocked in red -->
            <circle cx="350" cy="140" r="45" fill="rgba(239, 68, 68, 0.3)" stroke="#ef4444" stroke-width="2"/>
            <text x="350" y="145" font-size="10" font-weight="bold" text-anchor="middle" fill="#dc2626">KHU VỰC NGẬP 40CM</text>
          </svg>
        </div>
      </div>
    `
  },
  {
    id: "Anh_44_1",
    numBadge: "Ảnh 44.1",
    title: "So sánh tuyến đường nhanh nhất vs tuyến an toàn tránh thủy kích",
    member: "Lê Anh Tuấn",
    role: "Công dân / Lái xe",
    activeNav: "Tìm đường né ngập",
    badges: [
      { text: "SO SÁNH 2 TUYẾN", top: "-12px", right: "20px" },
      { text: "CHỐNG THỦY KÍCH", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">So Sánh Tuyến Nhanh Nhất vs Tuyến An Toàn Né Ngập</div>
          <div class="page-subtitle">Chức năng 44 (Ảnh 44.1) • Phụ trách: Lê Anh Tuấn</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card-box" style="border: 2px solid #ef4444;">
          <div style="display: flex; justify-content: space-between;">
            <b style="color: #dc2626;">( ) TUYẾN 1: NHANH NHẤT (NGẬP)</b>
            <span class="tag tag-dark" style="background: #dc2626;">RỦI RO CAO</span>
          </div>
          <div style="margin: 10px 0; font-size: 13px; line-height: 1.6;">
            <div>• Chiều dài: <b>4.2 km</b> | Thời gian: <b>14 phút</b></div>
            <div>• Nguy cơ: <b>Đi qua điểm ngập sâu 35cm trên đường Võ Văn Ngân</b></div>
            <div>• Cảnh báo: Nguy cơ chết máy xe máy & thủy kích động cơ ô tô con!</div>
          </div>
          <button class="btn btn-white btn-sm" style="width: 100%;">Xem chi tiết tuyến 1</button>
        </div>

        <div class="card-box" style="border: 2px solid #16a34a; background: #f0fdf4;">
          <div style="display: flex; justify-content: space-between;">
            <b style="color: #16a34a;">(•) TUYẾN 2: AN TOÀN NÉ NGẬP</b>
            <span class="tag tag-dark" style="background: #16a34a;">KHUYÊN DÙNG ✓</span>
          </div>
          <div style="margin: 10px 0; font-size: 13px; line-height: 1.6;">
            <div>• Chiều dài: <b>5.0 km (+800m)</b> | Thời gian: <b>18 phút (+4m)</b></div>
            <div>• Độ an toàn: <b>100% Khô ráo, không đi qua bất kỳ điểm ngập nào</b></div>
            <div>• Thích hợp: Tuyệt đối an toàn cho xe số, tay ga và ô tô gầm thấp</div>
          </div>
          <button class="btn btn-black btn-sm" style="width: 100%;">BẮT ĐẦU ĐI THEO TUYẾN 2</button>
        </div>
      </div>
    `
  },
  {
    id: "Anh_45_1",
    numBadge: "Ảnh 45.1",
    title: "Báo cáo điểm ngập lụt 1-chạm qua menu chuột phải trên bản đồ",
    member: "Lê Anh Tuấn",
    role: "Công dân (Citizen)",
    activeNav: "Bản đồ ngập lụt",
    badges: [
      { text: "CHUỘT PHẢI BẢN ĐỒ", top: "-12px", right: "20px" },
      { text: "CONTEXT MENU", top: "110px", left: "430px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Báo Cáo Điểm Ngập Lụt 1-Chạm Bằng Chuột Phải Bản Đồ</div>
          <div class="page-subtitle">Chức năng 45 (Ảnh 45.1) • Phụ trách: Lê Anh Tuấn</div>
        </div>
      </div>

      <div class="card-box">
        <div class="map-box" style="height: 270px; position: relative;">
          <!-- Context Menu overlay -->
          <div style="position: absolute; top: 70px; left: 320px; width: 230px; background: #fff; border: 2px solid #222; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.25); z-index: 30; overflow: hidden;">
            <div style="background: #e5e7eb; padding: 6px 10px; font-size: 11px; font-weight: bold; border-bottom: 1px solid #222;">
              TỌA ĐỘ: 10.8521, 106.7725
            </div>
            <div style="padding: 8px 12px; font-size: 12px; font-weight: 700; cursor: pointer; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; gap: 8px; background: #111; color: #fff;">
              🌊 Báo ngập lụt tại điểm này
            </div>
            <div style="padding: 8px 12px; font-size: 12px; cursor: pointer; border-bottom: 1px solid #e5e7eb;">
              🗑️ Báo bãi rác tự phát
            </div>
            <div style="padding: 8px 12px; font-size: 12px; cursor: pointer;">
              📍 Đặt làm điểm đến chỉ đường
            </div>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_45_2",
    numBadge: "Ảnh 45.2",
    title: "Modal nhập mực nước ngập lụt & Thuật toán bám đường OSRM",
    member: "Lê Anh Tuấn",
    role: "Công dân (Citizen)",
    activeNav: "Bản đồ ngập lụt",
    badges: [
      { text: "BÁM ĐƯỜNG OSRM", top: "-12px", right: "20px" },
      { text: "MODAL BÁO NGẬP", top: "70px", left: "420px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Nhập Thông Tin Điểm Ngập & Tự Động Bám Tim Đường (OSRM Match)</div>
          <div class="page-subtitle">Chức năng 45 (Ảnh 45.2) • Phụ trách: Lê Anh Tuấn</div>
        </div>
      </div>

      <div class="card-box" style="position: relative;">
        <div class="modal-overlay" style="width: 460px;">
          <div class="modal-title">BÁO CÁO ĐIỂM NGẬP TỨC THỜI</div>
          <div style="text-align: left; font-size: 12px;">
            <div class="form-group">
              <label class="form-label">Tuyến đường đã tự bám dính (OSRM Snap):</label>
              <input type="text" class="form-input" value="Đường Võ Văn Ngân, P. Linh Chiểu (Đoạn qua Nhà Thiếu Nhi)">
            </div>
            <div class="form-group">
              <label class="form-label">Ước tính mức độ ngập:</label>
              <div style="display: flex; gap: 6px;">
                <span class="tag">Mép vỉa hè (<15cm)</span>
                <span class="tag tag-dark">Nửa bánh xe (20-35cm)</span>
                <span class="tag">Ngập sâu (>40cm)</span>
              </div>
            </div>
            <div class="form-group" style="margin-top: 8px;">
              <label class="form-label">Tình trạng phương tiện:</label>
              <input type="text" class="form-input" value="Xe máy bắt đầu bị chết máy hàng loạt, xe cộ dắt bộ nhiều.">
            </div>
          </div>
          <div class="modal-actions" style="margin-top: 14px;">
            <button class="btn btn-black">Gửi cảnh báo ngập ngay</button>
            <button class="btn btn-white">Hủy</button>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_46_1",
    numBadge: "Ảnh 46.1",
    title: "Dự báo lũ lụt toàn cầu Copernicus GloFAS 7 ngày",
    member: "Lê Anh Tuấn",
    role: "Chuyên gia Thủy văn",
    activeNav: "Bản đồ ngập lụt",
    badges: [
      { text: "GLOFAS 7 DAYS", top: "-12px", right: "20px" },
      { text: "COPERNICUS HYDRO", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Dự Báo Lưu Lượng Thủy Văn & Nguy Cơ Lũ Sông Sài Gòn 7 Ngày</div>
          <div class="page-subtitle">Chức năng 46 (Ảnh 46.1) • Phụ trách: Lê Anh Tuấn</div>
        </div>
      </div>

      <div class="card-box">
        <div class="map-box" style="height: 230px; position: relative;">
          <!-- SVG River Basin Flow Chart -->
          <svg style="width: 100%; height: 100%;">
            <!-- River Flow Graph -->
            <path d="M 50 180 Q 200 160 350 110 T 650 90" stroke="#0284c7" stroke-width="4" fill="none"/>
            <!-- Discharge threshold lines -->
            <line x1="50" y1="100" x2="700" y2="100" stroke="#f97316" stroke-width="1.5" stroke-dasharray="4 2"/>
            <text x="55" y="95" font-size="10" font-weight="bold" fill="#f97316">Ngưỡng xả lũ Trị An (1,200 m³/s)</text>
          </svg>
          <div style="position: absolute; bottom: 10px; left: 16px; background: rgba(0,0,0,0.8); color: #fff; padding: 4px 10px; border-radius: 4px; font-size: 11px;">
            Dữ liệu vệ tinh Copernicus GloFAS: Đỉnh lũ thượng nguồn dự kiến về hạ lưu sau 36 giờ.
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_47_1",
    numBadge: "Ảnh 47.1",
    title: "Tích hợp đa nguồn dữ liệu ngập lụt đô thị & Mô phỏng thiên tai",
    member: "Lê Anh Tuấn",
    role: "Chuyên gia GIS / Phân tích",
    activeNav: "Bản đồ ngập lụt",
    badges: [
      { text: "HÒA TRỘN ĐA NGUỒN", top: "-12px", right: "20px" },
      { text: "MÔ PHỎNG THIÊN TAI", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Hòa Trộn Dữ Liệu Đa Nguồn & Mô Phỏng Kịch Bản Ngập Lụt Đô Thị</div>
          <div class="page-subtitle">Chức năng 47 (Ảnh 47.1) • Phụ trách: Lê Anh Tuấn</div>
        </div>
      </div>

      <div class="card-box">
        <div style="display: flex; gap: 8px; margin-bottom: 12px;">
          <span class="tag tag-dark">[✓] Báo cáo công dân (Crowdsourced - 38 điểm)</span>
          <span class="tag tag-dark">[✓] Trạm cảm biến viễn trắc IoT (12 trạm)</span>
          <span class="tag tag-dark">[✓] Mô hình thủy triều Phú An (+1.68m)</span>
          <span class="tag tag-dark">[✓] Dữ liệu radar mưa RainViewer</span>
        </div>

        <div class="map-box" style="height: 220px; background: #e5e7eb; position: relative;">
          <div style="display: flex; align-items: center; justify-content: center; height: 100%; font-weight: 700; color: #374151;">
            [Khung nhìn bản đồ tích hợp lớp ngập lụt đa tầng - Cập nhật đồng bộ mỗi 60 giây]
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_48_1",
    numBadge: "Ảnh 48.1",
    title: "Dashboard phân tích dữ liệu lớn AQI 34 tỉnh thành & Biểu đồ chuỗi giờ",
    member: "Lê Anh Tuấn",
    role: "Chuyên gia Môi trường",
    activeNav: "Chất lượng không khí",
    badges: [
      { text: "DASHBOARD AQI 34 TỈNH", top: "-12px", right: "20px" },
      { text: "BIG DATA ANALYTICS", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Dashboard Phân Tích Chất Lượng Không Khí & Khí Hậu 34 Tỉnh Thành</div>
          <div class="page-subtitle">Chức năng 48 (Ảnh 48.1) • Phụ trách: Lê Anh Tuấn</div>
        </div>
        <select class="form-select">
          <option>Khu vực: TP. Hồ Chí Minh</option>
          <option>Hà Nội</option>
          <option>Đà Nẵng</option>
        </select>
      </div>

      <div class="grid-2">
        <div class="card-box" style="text-align: center; border-radius: 12px; padding: 20px;">
          <div style="font-size: 11px; text-transform: uppercase; color: #6b7280;">Chỉ số AQI hiện tại</div>
          <div style="font-size: 48px; font-weight: 900; margin: 6px 0;">68</div>
          <span class="tag tag-dark">TRUNG BÌNH (MODERATE)</span>
          <div style="font-size: 11px; color: #4b5563; margin-top: 8px;">Nhóm người nhạy cảm nên hạn chế vận động mạnh ngoài trời</div>
        </div>

        <div class="card-box">
          <div class="card-title">Biến thiên AQI 24 giờ qua (Time Series)</div>
          <div class="map-box" style="height: 120px; background: #fff; border: none;">
            <svg style="width: 100%; height: 100%;">
              <path d="M 10 90 Q 80 40 180 80 T 360 30" stroke="#111" stroke-width="2.5" fill="none"/>
              <circle cx="360" cy="30" r="4" fill="#111"/>
              <text x="320" y="25" font-size="10" font-weight="bold">Đỉnh: 112 (08:00)</text>
            </svg>
          </div>
          <div style="font-size: 10px; color: #6b7280; display: flex; justify-content: space-between; border-top: 1px solid #e5e7eb; padding-top: 4px;">
            <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_48_2",
    numBadge: "Ảnh 48.2",
    title: "Ma trận nhiệt tương quan 6 chất ô nhiễm không khí (Correlation Heatmap)",
    member: "Lê Anh Tuấn",
    role: "Chuyên gia Môi trường",
    activeNav: "Chất lượng không khí",
    badges: [
      { text: "MA TRẬN TƯƠNG QUAN", top: "-12px", right: "20px" },
      { text: "6 CHẤT Ô NHIỄM", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Ma Trận Tương Quan Nhiệt 6 Chất Ô Nhiễm Không Khí</div>
          <div class="page-subtitle">Chức năng 48 (Ảnh 48.2) • Phụ trách: Lê Anh Tuấn</div>
        </div>
      </div>

      <div class="card-box">
        <div style="font-size: 12px; margin-bottom: 8px;">Ma trận hệ số tương quan Pearson giữa các chất ô nhiễm:</div>
        <table class="wire-table" style="text-align: center;">
          <tr><th>Chất</th><th>PM2.5</th><th>PM10</th><th>O3</th><th>NO2</th><th>SO2</th><th>CO</th></tr>
          <tr><td><b>PM2.5</b></td><td style="background: #111; color: #fff;">1.00</td><td style="background: #4b5563; color: #fff;">0.88</td><td>-0.12</td><td style="background: #9ca3af;">0.65</td><td>0.42</td><td style="background: #9ca3af;">0.71</td></tr>
          <tr><td><b>PM10</b></td><td style="background: #4b5563; color: #fff;">0.88</td><td style="background: #111; color: #fff;">1.00</td><td>-0.05</td><td style="background: #9ca3af;">0.61</td><td>0.39</td><td style="background: #9ca3af;">0.68</td></tr>
          <tr><td><b>O3</b></td><td>-0.12</td><td>-0.05</td><td style="background: #111; color: #fff;">1.00</td><td>-0.34</td><td>0.10</td><td>-0.18</td></tr>
          <tr><td><b>NO2</b></td><td style="background: #9ca3af;">0.65</td><td style="background: #9ca3af;">0.61</td><td>-0.34</td><td style="background: #111; color: #fff;">1.00</td><td style="background: #d1d5db;">0.52</td><td style="background: #4b5563; color: #fff;">0.82</td></tr>
        </table>
        <div style="margin-top: 8px; font-size: 11px; color: #4b5563;">
          * Ô màu càng tối tương quan dương càng mạnh (Ví dụ: Khói xe CO và NO2 tỷ lệ thuận cao với bụi mịn PM2.5).
        </div>
      </div>
    `
  }
];
