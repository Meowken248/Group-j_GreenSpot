// screens_tu.cjs - Wireframe screens for Huỳnh Anh Tú (STT 13 - STT 24)
// Phân hệ: Điều Phối Tác Nghiệp & Nền Tảng Bản Đồ WebGIS

module.exports = [
  {
    id: "Anh_13_1",
    numBadge: "Ảnh 13.1",
    title: "Phân công điều phối đội phản ứng nhanh theo địa bàn quận",
    member: "Huỳnh Anh Tú",
    role: "Cán bộ điều phối (District Manager)",
    activeNav: "Điều phối tác nghiệp",
    badges: [
      { text: "STT 13: ĐIỀU PHỐI ĐỊA BÀN", top: "-12px", right: "20px" },
      { text: "ADMINISTRATIVE UNIT", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Trung Tâm Điều Phối Lực Lượng Xử Lý Sự Cố Theo Quận/Huyện</div>
          <div class="page-subtitle">STT 13 (Ảnh 13.1) • Phân hệ: Xử lý Sự cố • Phụ trách: Huỳnh Anh Tú</div>
        </div>
        <button class="btn btn-black">+ Lệnh điều xe khẩn cấp</button>
      </div>

      <div class="grid-2" style="margin-bottom: 12px;">
        <div class="card-box">
          <div class="card-title">Chi tiết sự cố chờ phân công:</div>
          <div style="font-size: 12px; line-height: 1.6;">
            <div><b>Mã sự cố:</b> INC-2026-0891 (Mức độ: CAO)</div>
            <div><b>Vị trí:</b> 53 Võ Văn Ngân, P. Linh Chiểu</div>
            <div><b>Ánh xạ hành chính:</b> TP. Thủ Đức (Đơn vị #UNIT-09)</div>
            <div><b>Khối lượng ước tính:</b> ~ 3.2 tấn rác sinh hoạt</div>
          </div>
        </div>

        <div class="card-box">
          <div class="card-title">Chỉ định đội công ích tiếp nhận:</div>
          <div class="form-group">
            <label class="form-label">Đội phản ứng nhanh phụ trách:</label>
            <select class="form-select">
              <option selected>Đội Vệ Sinh Môi Trường Đô Thị Thủ Đức (Xe #04 - Đang rảnh)</option>
              <option>Đội Phản Ứng Nhanh Khu Công Nghệ Cao (Xe #02)</option>
              <option>Công Ty Dịch Vụ Công Ích Quận 9 (Xe #07)</option>
            </select>
          </div>
          <div style="display: flex; gap: 8px; margin-top: 8px;">
            <button class="btn btn-black" style="flex: 1;">XÁC NHẬN GIAO LỆNH</button>
            <button class="btn btn-white">Hủy bỏ</button>
          </div>
        </div>
      </div>

      <div class="card-box">
        <div class="card-title">Danh sách xe chuyên dụng đang hoạt động tại địa bàn:</div>
        <table class="wire-table">
          <tr><th>Mã Xe</th><th>Tài xế / Đội trưởng</th><th>Trọng tải</th><th>Vị trí GPS hiện tại</th><th>Trạng thái</th></tr>
          <tr><td><b>TRK-04</b></td><td>Nguyễn Văn Hùng</td><td>5 Tấn</td><td>Ngã tư Thủ Đức (cách 1.2 km)</td><td><span class="tag tag-dark">SẴN SÀNG</span></td></tr>
          <tr><td><b>TRK-02</b></td><td>Lê Quốc Bảo</td><td>8 Tấn</td><td>Xa Lộ Hà Nội, P. Hiệp Phú</td><td><span class="tag tag-gray">ĐANG THU GOM</span></td></tr>
          <tr><td><b>TRK-07</b></td><td>Phạm Văn Long</td><td>3.5 Tấn</td><td>Trạm trung chuyển Linh Trung</td><td><span class="tag tag-gray">ĐANG NẠP RÁC</span></td></tr>
        </table>
      </div>
    `
  },
  {
    id: "Anh_14_1",
    numBadge: "Ảnh 14.1",
    title: "Báo cáo tóm tắt tổng lượng sự cố môi trường toàn thành phố",
    member: "Huỳnh Anh Tú",
    role: "Toàn bộ người dùng",
    activeNav: "Bản đồ ô nhiễm",
    badges: [
      { text: "STT 14: THỐNG KÊ TỔNG LƯỢNG", top: "-12px", right: "20px" },
      { text: "CHỈ SỐ REALTIME", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Bộ Đếm Thống Kê Tổng Lượng Sự Cố Đô Thị (Summary Badges)</div>
          <div class="page-subtitle">STT 14 (Ảnh 14.1) • Phân hệ: Xử lý Sự cố • Phụ trách: Huỳnh Anh Tú</div>
        </div>
      </div>

      <div class="card-box" style="margin-bottom: 14px; background: #fafafa;">
        <div style="font-size: 12px; font-weight: 700; margin-bottom: 8px;">Dãy Badges trạng thái thời gian thực trên thanh Toolbar EcoMap:</div>
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
          <div style="border: 2px solid #222; background: #fff; padding: 8px 14px; border-radius: 8px; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px;">⏳</span>
            <div><div style="font-size: 10px; color: #6b7280; font-weight: 700;">CHỜ TIẾP NHẬN</div><b style="font-size: 16px;">14 sự cố</b></div>
          </div>
          <div style="border: 2px solid #222; background: #fff; padding: 8px 14px; border-radius: 8px; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px;">🚚</span>
            <div><div style="font-size: 10px; color: #6b7280; font-weight: 700;">ĐANG XỬ LÝ</div><b style="font-size: 16px;">8 sự cố</b></div>
          </div>
          <div style="border: 2px solid #222; background: #fff; padding: 8px 14px; border-radius: 8px; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px;">✅</span>
            <div><div style="font-size: 10px; color: #6b7280; font-weight: 700;">ĐÃ HOÀN THÀNH</div><b style="font-size: 16px;">142 sự cố</b></div>
          </div>
          <div style="border: 2px solid #222; background: #111; color: #fff; padding: 8px 14px; border-radius: 8px; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px;">📊</span>
            <div><div style="font-size: 10px; color: #9ca3af; font-weight: 700;">TỶ LỆ GIẢI QUYẾT</div><b style="font-size: 16px;">94.6%</b></div>
          </div>
        </div>
      </div>

      <div class="map-box" style="height: 250px; position: relative;">
        <div style="position: absolute; bottom: 16px; left: 16px; background: #fff; border: 1.5px solid #222; padding: 8px 14px; border-radius: 6px; font-size: 11px;">
          📍 Đang lọc xem: <b>Tất cả 22 quận/huyện • 164 sự cố ghi nhận trong 30 ngày</b>
        </div>
      </div>
    `
  },
  {
    id: "Anh_15_1",
    numBadge: "Ảnh 15.1",
    title: "Chuyển đổi 7 chế độ bản đồ nền (Google Maps Cluster, OSM, Dark)",
    member: "Huỳnh Anh Tú",
    role: "Toàn bộ người dùng",
    activeNav: "Bản đồ ô nhiễm",
    badges: [
      { text: "STT 15: 7 BASEMAPS", top: "-12px", right: "20px" },
      { text: "GOOGLE & OSM & DARK", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Trình Quản Lý & Chuyển Đổi 7 Chế Độ Bản Đồ Nền (Multi-Basemap)</div>
          <div class="page-subtitle">STT 15 (Ảnh 15.1) • Phân hệ: Bản đồ WebGIS • Phụ trách: Huỳnh Anh Tú</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="map-box" style="height: 340px; position: relative;">
          <div style="position: absolute; top: 12px; left: 12px; background: #fff; border: 2px solid #222; padding: 6px 12px; border-radius: 6px; font-weight: 800; font-size: 12px;">
            Đang hiển thị: Google Maps Roadmap Cluster (mt0-mt3)
          </div>
        </div>

        <div class="card-box">
          <div class="card-title">Chọn giao diện bản đồ nền:</div>
          <div style="display: flex; flex-direction: column; gap: 8px; font-size: 12px;">
            <label style="border: 2px solid #111; padding: 8px 12px; border-radius: 6px; background: #f3f4f6; display: flex; justify-content: space-between; align-items: center; font-weight: bold;">
              <span>🌐 1. Google Maps Roadmap (Đường bộ chi tiết)</span>
              <input type="radio" name="basemap" checked>
            </label>
            <label style="border: 1.5px solid #222; padding: 8px 12px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
              <span>🛰️ 2. Google Maps Vệ tinh Hybrid (Ảnh chụp vũ trụ)</span>
              <input type="radio" name="basemap">
            </label>
            <label style="border: 1.5px solid #222; padding: 8px 12px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
              <span>🚗 3. Google Live Traffic (Mật độ giao thông kẹt xe)</span>
              <input type="radio" name="basemap">
            </label>
            <label style="border: 1.5px solid #222; padding: 8px 12px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
              <span>🗺️ 4. OpenStreetMap (OSM Tiêu chuẩn cộng đồng)</span>
              <input type="radio" name="basemap">
            </label>
            <label style="border: 1.5px solid #222; padding: 8px 12px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
              <span>⛰️ 5. OpenTopoMap (Đường đồng mức địa hình cao độ)</span>
              <input type="radio" name="basemap">
            </label>
            <label style="border: 1.5px solid #222; padding: 8px 12px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
              <span>☀️ 6. Carto Positron (Nền sáng tối giản thanh lịch)</span>
              <input type="radio" name="basemap">
            </label>
            <label style="border: 1.5px solid #222; padding: 8px 12px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
              <span>🌙 7. Carto Dark Matter (Nền đêm tối tương phản cao)</span>
              <input type="radio" name="basemap">
            </label>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_16_1",
    numBadge: "Ảnh 16.1",
    title: "Góc nhìn không gian 3D đùn khối công trình đô thị",
    member: "Huỳnh Anh Tú",
    role: "Toàn bộ người dùng",
    activeNav: "Bản đồ ô nhiễm",
    badges: [
      { text: "STT 16: 3D EXTRUSION", top: "-12px", right: "20px" },
      { text: "GÓC NGHIÊNG 60°", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Góc Nhìn Không Gian 3D Đùn Khối Tòa Nhà (3D Building Extrusions)</div>
          <div class="page-subtitle">STT 16 (Ảnh 16.1) • Phân hệ: Bản đồ WebGIS • Phụ trách: Huỳnh Anh Tú</div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-black">3D BẬT (Pitch 60°)</button>
          <button class="btn btn-white">Chuyển về 2D phẳng</button>
        </div>
      </div>

      <div class="card-box">
        <div class="map-box" style="height: 320px; position: relative;">
          <svg style="width: 100%; height: 100%;">
            <!-- 3D Buildings projection mockup -->
            <polygon points="120,240 180,210 240,240 180,270" fill="#e2e8f0" stroke="#475569" stroke-width="1.5"/>
            <polygon points="120,240 180,210 180,90 120,120" fill="#cbd5e1" stroke="#475569" stroke-width="1.5"/>
            <polygon points="180,210 240,240 240,120 180,90" fill="#94a3b8" stroke="#475569" stroke-width="1.5"/>
            <text x="155" y="75" font-size="10" font-weight="bold">Landmark 81 (461m)</text>

            <polygon points="320,260 360,240 400,260 360,280" fill="#e2e8f0" stroke="#475569" stroke-width="1.5"/>
            <polygon points="320,260 360,240 360,160 320,180" fill="#cbd5e1" stroke="#475569" stroke-width="1.5"/>
            <polygon points="360,240 400,260 400,180 360,160" fill="#94a3b8" stroke="#475569" stroke-width="1.5"/>
            <text x="330" y="150" font-size="10" font-weight="bold">Bitexco (262m)</text>

            <polygon points="500,250 530,235 560,250 530,265" fill="#e2e8f0" stroke="#475569" stroke-width="1"/>
            <polygon points="500,250 530,235 530,195 500,210" fill="#cbd5e1" stroke="#475569" stroke-width="1"/>
            <polygon points="530,235 560,250 560,210 530,195" fill="#94a3b8" stroke="#475569" stroke-width="1"/>
          </svg>

          <div style="position: absolute; bottom: 14px; right: 14px; background: #fff; border: 1.5px solid #222; padding: 6px 12px; border-radius: 6px; font-size: 11px;">
            Chiều cao kết xuất thực tế từ dữ liệu OSM <code>render_height</code>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_16_2",
    numBadge: "Ảnh 16.2",
    title: "Bộ chọn 5 chủ đề màu sắc tòa nhà 3D (Building Color Palettes)",
    member: "Huỳnh Anh Tú",
    role: "Toàn bộ người dùng",
    activeNav: "Bản đồ ô nhiễm",
    badges: [
      { text: "STT 16: BẢNG MÀU 3D", top: "-12px", right: "20px" },
      { text: "5 THEMES ĐÔ THỊ", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Bộ Tùy Biến 5 Chủ Đề Màu Sắc Tòa Nhà 3D (Color Themes)</div>
          <div class="page-subtitle">STT 16 (Ảnh 16.2) • Phân hệ: Bản đồ WebGIS • Phụ trách: Huỳnh Anh Tú</div>
        </div>
      </div>

      <div class="grid-3" style="margin-bottom: 12px;">
        <div class="card-box" style="border: 2px solid #111;">
          <div style="font-weight: 800; font-size: 13px; margin-bottom: 6px;">🌈 1. CẦU VỒNG ĐÔ THỊ (RAINBOW)</div>
          <div style="height: 16px; background: linear-gradient(to right, #ef4444, #f59e0b, #10b981, #3b82f6, #8b5cf6); border-radius: 4px; margin-bottom: 8px;"></div>
          <div style="font-size: 11px; color: #6b7280;">Đổi màu theo dải chiều cao: Tòa nhà thấp xanh lá, cao chọc trời màu đỏ tím.</div>
        </div>

        <div class="card-box" style="border: 2px solid #111;">
          <div style="font-weight: 800; font-size: 13px; margin-bottom: 6px;">🌱 2. SINH THÁI (EMERALD GREEN)</div>
          <div style="height: 16px; background: linear-gradient(to right, #dcfce7, #86efac, #22c55e, #15803d); border-radius: 4px; margin-bottom: 8px;"></div>
          <div style="font-size: 11px; color: #6b7280;">Dải màu ngọc lục bảo biểu trưng cho mảng xanh và kiến trúc bền vững.</div>
        </div>

        <div class="card-box" style="border: 2px solid #111;">
          <div style="font-weight: 800; font-size: 13px; margin-bottom: 6px;">🌅 3. HOÀNG HÔN (SUNSET AMBER)</div>
          <div style="height: 16px; background: linear-gradient(to right, #fef3c7, #fcd34d, #f59e0b, #b45309); border-radius: 4px; margin-bottom: 8px;"></div>
          <div style="font-size: 11px; color: #6b7280;">Tông màu vàng cam ấm áp ban chiều phản chiếu ánh nắng hoàng hôn.</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card-box" style="border: 2px solid #111; background: #0f172a; color: #fff;">
          <div style="font-weight: 800; font-size: 13px; margin-bottom: 6px; color: #38bdf8;">⚡ 4. CYBER NEON (NEON GLOW)</div>
          <div style="height: 16px; background: linear-gradient(to right, #06b6d4, #3b82f6, #d946ef); border-radius: 4px; margin-bottom: 8px;"></div>
          <div style="font-size: 11px; color: #94a3b8;">Hiệu ứng ánh sáng Neon phát sáng rực rỡ trong chế độ Carto Dark Matter.</div>
        </div>

        <div class="card-box" style="border: 2px solid #111;">
          <div style="font-weight: 800; font-size: 13px; margin-bottom: 6px;">💎 5. TINH THỂ PHA LÊ (SLATE MONO)</div>
          <div style="height: 16px; background: linear-gradient(to right, #f8fafc, #cbd5e1, #64748b, #334155); border-radius: 4px; margin-bottom: 8px;"></div>
          <div style="font-size: 11px; color: #6b7280;">Phong cách kiến trúc đơn sắc tinh giản (Black & White Wireframe chuẩn mực).</div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_17_1",
    numBadge: "Ảnh 17.1",
    title: "Phân vùng ranh giới 22 quận/huyện TP.HCM & TP. Thủ Đức kèm FlyTo",
    member: "Huỳnh Anh Tú",
    role: "Toàn bộ người dùng",
    activeNav: "Bản đồ ô nhiễm",
    badges: [
      { text: "STT 17: 22 QUẬN/HUYỆN", top: "-12px", right: "20px" },
      { text: "POSTGIS MULTIPOLYGON", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Ranh Giới Hành Chính 22 Quận/Huyện & Điều Hướng Nhanh (FlyTo)</div>
          <div class="page-subtitle">STT 17 (Ảnh 17.1) • Phân hệ: Bản đồ WebGIS • Phụ trách: Huỳnh Anh Tú</div>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <span style="font-size: 12px; font-weight: 700;">Bay nhanh tới:</span>
          <select class="form-select" style="width: 180px;">
            <option selected>📍 TP. Thủ Đức</option>
            <option>Quận 1</option>
            <option>Quận 7</option>
            <option>Bình Thạnh</option>
            <option>Huyện Cần Giờ</option>
          </select>
        </div>
      </div>

      <div class="card-box">
        <div class="map-box" style="height: 270px; position: relative;">
          <svg style="width: 100%; height: 100%;">
            <!-- District Polygon Mockup -->
            <polygon points="280,40 480,30 520,160 380,240 260,180" fill="rgba(37, 99, 235, 0.08)" stroke="#2563eb" stroke-width="2.5" stroke-dasharray="6 3"/>
            <circle cx="380" cy="130" r="4" fill="#2563eb"/>
            <text x="350" y="120" font-size="12" font-weight="900" fill="#1e3a8a">TP. THỦ ĐỨC</text>
          </svg>

          <!-- FlyTo Info Drawer -->
          <div style="position: absolute; bottom: 12px; left: 12px; width: 280px; background: #fff; border: 2px solid #222; border-radius: 8px; padding: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <div style="font-weight: 800; font-size: 13px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 6px;">THÔNG SỐ TP. THỦ ĐỨC</div>
            <div style="font-size: 11px; display: flex; flex-direction: column; gap: 4px;">
              <div>• Diện tích tự nhiên: <b>211.56 km²</b></div>
              <div>• Dân số đô thị: <b>1,013,795 người</b></div>
              <div>• Tỷ lệ che phủ mảng xanh: <b>18.4%</b></div>
              <div>• Sự cố đang chờ xử lý: <b>4 điểm</b></div>
            </div>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_18_1",
    numBadge: "Ảnh 18.1",
    title: "Tra cứu công viên sinh thái, mảng xanh đô thị (Green Spots)",
    member: "Huỳnh Anh Tú",
    role: "Toàn bộ người dùng",
    activeNav: "Điểm xanh",
    badges: [
      { text: "STT 18: MẢNG XANH ĐÔ THỊ", top: "-12px", right: "20px" },
      { text: "CÔNG VIÊN & KHÔNG GIAN XANH", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Mạng Lưới Công Viên Sinh Thái & Không Gian Xanh (Green Spots)</div>
          <div class="page-subtitle">STT 18 (Ảnh 18.1) • Phân hệ: Bản đồ WebGIS • Phụ trách: Huỳnh Anh Tú</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="map-box" style="height: 330px; position: relative;">
          <!-- Green Spot Markers -->
          <div style="position: absolute; top: 80px; left: 140px; background: #166534; color: #fff; border: 2px solid #fff; border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; font-size: 14px;">🌳</div>
          <div style="position: absolute; top: 180px; left: 260px; background: #166534; color: #fff; border: 2px solid #fff; border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; font-size: 14px;">🌳</div>
        </div>

        <div class="card-box">
          <div class="card-title">Chi tiết điểm xanh tiêu biểu:</div>
          <div style="border: 1.5px solid #222; border-radius: 8px; padding: 12px; margin-bottom: 12px; background: #f0fdf4;">
            <div style="font-weight: 800; font-size: 14px; color: #166534;">Công viên Tao Đàn (Quận 1)</div>
            <div style="font-size: 11px; color: #4b5563; margin: 4px 0 8px 0;">Đường Nguyễn Thị Minh Khai, P. Bến Thành, Q.1</div>
            <div style="font-size: 12px; display: flex; flex-direction: column; gap: 4px;">
              <div>• Quy mô: <b>10.2 Hecta</b> (> 1,000 cây cổ thụ)</div>
              <div>• Chỉ số chất lượng không khí (AQI): <b style="color: #166534;">32 (Rất tốt)</b></div>
              <div>• Tiện ích: Đường chạy bộ, máy tập thể thao, bãi đỗ xe</div>
              <div>• Đánh giá cộng đồng: <b>⭐ 4.8 / 5.0 (1,240 đánh giá)</b></div>
            </div>
            <div style="margin-top: 10px;">
              <button class="btn btn-black btn-sm">Dẫn đường tới đây ➔</button>
            </div>
          </div>

          <div style="font-size: 11px; color: #6b7280;">
            Các điểm xanh khác: Thảo Cầm Viên Sài Gòn, Công viên Gia Định, Khu dự trữ sinh quyển Rừng Sác Cần Giờ.
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_19_1",
    numBadge: "Ảnh 19.1",
    title: "Tra cứu mạng lưới trạm thu gom rác tái chế & pin cũ (Recycling)",
    member: "Huỳnh Anh Tú",
    role: "Toàn bộ người dùng",
    activeNav: "Điểm xanh",
    badges: [
      { text: "STT 19: TRẠM TÁI CHẾ", top: "-12px", right: "20px" },
      { text: "PIN CŨ & E-WASTE", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Mạng Lưới Điểm Tiếp Nhận Rác Tái Chế & Thu Gom Pin Cũ</div>
          <div class="page-subtitle">STT 19 (Ảnh 19.1) • Phân hệ: Bản đồ WebGIS • Phụ trách: Huỳnh Anh Tú</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="map-box" style="height: 330px; position: relative;">
          <div style="position: absolute; top: 120px; left: 180px; background: #2563eb; color: #fff; border: 2px solid #fff; border-radius: 50%; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; font-size: 14px;">♻️</div>
        </div>

        <div class="card-box">
          <div class="card-title">Thông tin trạm thu gom tái chế:</div>
          <div style="border: 1.5px solid #222; border-radius: 8px; padding: 12px; background: #fafafa;">
            <div style="font-weight: 800; font-size: 14px;">Trạm Thu Gom Xanh - UBND P. Linh Chiểu</div>
            <div style="font-size: 11px; color: #4b5563; margin: 4px 0 8px 0;">Số 10 Đường số 8, P. Linh Chiểu, TP. Thủ Đức</div>

            <div class="card-title" style="font-size: 12px; margin-top: 10px;">Vật liệu được tiếp nhận:</div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px;">
              <span class="tag tag-gray">🔋 Pin cũ / Ắc-quy</span>
              <span class="tag tag-gray">💻 Rác điện tử E-waste</span>
              <span class="tag tag-gray">🍾 Vỏ chai nhựa PET</span>
              <span class="tag tag-gray">📦 Bìa các-tông / Giấy vụn</span>
            </div>

            <div style="font-size: 11px; line-height: 1.6;">
              <div>• Giờ mở cửa: <b>08:00 - 17:00 (Thứ 2 - Thứ 7)</b></div>
              <div>• Hotline tiếp nhận: <b>(028) 3896 0123</b></div>
              <div>• Đơn vị vận hành: <b>UBND Phường & GreenHub</b></div>
            </div>

            <div style="margin-top: 12px;">
              <button class="btn btn-black btn-sm">Chỉ đường tới điểm thu gom ➔</button>
            </div>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_20_1",
    numBadge: "Ảnh 20.1",
    title: "Tự động tải tiện ích xung quanh theo mức zoom (LOD POIs)",
    member: "Huỳnh Anh Tú",
    role: "Toàn bộ người dùng",
    activeNav: "Bản đồ ô nhiễm",
    badges: [
      { text: "STT 20: LOD DYNAMIC POIs", top: "-12px", right: "20px" },
      { text: "ZOOM >= 15 & CACHE 5M", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Cơ Chế Tải Động Tiện Ích Đô Thị Phân Tầng Theo Mức Zoom (LOD)</div>
          <div class="page-subtitle">STT 20 (Ảnh 20.1) • Phân hệ: Bản đồ WebGIS • Phụ trách: Huỳnh Anh Tú</div>
        </div>
        <div style="font-size: 12px; font-weight: 800; background: #e5e7eb; border: 1.5px solid #222; padding: 4px 10px; border-radius: 6px;">
          Mức Zoom hiện tại: Zoom 16.5 (Hiển thị chi tiết lớp ngõ ngách)
        </div>
      </div>

      <div class="card-box">
        <div class="map-box" style="height: 310px; position: relative;">
          <svg style="width: 100%; height: 100%;">
            <line x1="50" y1="160" x2="750" y2="160" stroke="#cbd5e1" stroke-width="24"/>
            <line x1="300" y1="20" x2="300" y2="280" stroke="#cbd5e1" stroke-width="18"/>
            <line x1="550" y1="20" x2="550" y2="280" stroke="#cbd5e1" stroke-width="14"/>
          </svg>

          <!-- LOD POIs dynamically appeared at high zoom -->
          <div style="position: absolute; top: 90px; left: 180px; background: #fff; border: 1.5px solid #222; border-radius: 6px; padding: 4px 8px; font-size: 11px; font-weight: bold; display: flex; align-items: center; gap: 4px;">
            <span>☕ Highlands Coffee</span>
          </div>
          <div style="position: absolute; top: 190px; left: 220px; background: #fff; border: 1.5px solid #222; border-radius: 6px; padding: 4px 8px; font-size: 11px; font-weight: bold; display: flex; align-items: center; gap: 4px;">
            <span>💊 Hiệu thuốc Pharmacity</span>
          </div>
          <div style="position: absolute; top: 80px; left: 420px; background: #fff; border: 1.5px solid #222; border-radius: 6px; padding: 4px 8px; font-size: 11px; font-weight: bold; display: flex; align-items: center; gap: 4px;">
            <span>🏪 Circle K Võ Văn Ngân</span>
          </div>
          <div style="position: absolute; top: 200px; left: 460px; background: #fff; border: 1.5px solid #222; border-radius: 6px; padding: 4px 8px; font-size: 11px; font-weight: bold; display: flex; align-items: center; gap: 4px;">
            <span>🏧 Cây ATM Vietcombank</span>
          </div>

          <div style="position: absolute; bottom: 12px; right: 12px; background: #111; color: #fff; padding: 6px 12px; border-radius: 6px; font-size: 11px;">
            ⚡ Bộ đệm In-Memory Cache TTL 5 phút chống lag trình duyệt
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_21_1",
    numBadge: "Ảnh 21.1",
    title: "Ô tìm kiếm thông minh địa điểm, số nhà, ngõ hẻm toàn thành phố",
    member: "Huỳnh Anh Tú",
    role: "Toàn bộ người dùng",
    activeNav: "Bản đồ ô nhiễm",
    badges: [
      { text: "STT 21: SEARCH AUTOCOMPLETE", top: "-12px", right: "20px" },
      { text: "DEBOUNCE 350MS", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Ô Tìm Kiếm Thông Minh Tự Động Gợi Ý (Debounce Geocoding Search)</div>
          <div class="page-subtitle">STT 21 (Ảnh 21.1) • Phân hệ: Bản đồ WebGIS • Phụ trách: Huỳnh Anh Tú</div>
        </div>
      </div>

      <div class="card-box" style="position: relative; height: 350px;">
        <!-- Search Input Bar -->
        <div style="width: 520px; margin: 0 auto; position: relative;">
          <div style="display: flex; gap: 6px;">
            <input type="text" class="form-input" style="flex: 1; font-size: 14px; padding: 10px 14px;" value="Võ Văn Ngân">
            <button class="btn btn-black">Tìm kiếm</button>
          </div>

          <!-- Autocomplete Dropdown -->
          <div style="position: absolute; top: 48px; left: 0; width: 100%; background: #fff; border: 2px solid #222; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.15); z-index: 50; overflow: hidden;">
            <div style="padding: 10px 14px; border-bottom: 1px solid #e5e7eb; cursor: pointer; background: #f3f4f6;">
              <div style="font-weight: 800; font-size: 13px;">📍 53 Võ Văn Ngân, P. Linh Chiểu, TP. Thủ Đức</div>
              <div style="font-size: 11px; color: #6b7280;">Gần ĐH Sư Phạm Kỹ Thuật • Cách tâm bản đồ 180m</div>
            </div>
            <div style="padding: 10px 14px; border-bottom: 1px solid #e5e7eb; cursor: pointer;">
              <div style="font-weight: 800; font-size: 13px;">📍 1 Võ Văn Ngân, P. Trường Thọ, TP. Thủ Đức</div>
              <div style="font-size: 11px; color: #6b7280;">Ngã tư Thủ Đức • Cách tâm bản đồ 1.4km</div>
            </div>
            <div style="padding: 10px 14px; cursor: pointer;">
              <div style="font-weight: 800; font-size: 13px;">📍 Chợ Thủ Đức, Đường Võ Văn Ngân</div>
              <div style="font-size: 11px; color: #6b7280;">Chợ truyền thống • Cách tâm bản đồ 950m</div>
            </div>
          </div>
        </div>

        <div style="position: absolute; bottom: 20px; left: 24px; font-size: 11px; color: #6b7280;">
          Thuật toán Photon OSM API ưu tiên kết quả theo tọa độ tâm bản đồ hiện tại (Bias Coordinates).
        </div>
      </div>
    `
  },
  {
    id: "Anh_22_1",
    numBadge: "Ảnh 22.1",
    title: "Định vị GPS vệ tinh siêu tốc & Vòng tròn bán kính sai số",
    member: "Huỳnh Anh Tú",
    role: "Toàn bộ người dùng",
    activeNav: "Bản đồ ô nhiễm",
    badges: [
      { text: "STT 22: FAST GPS & ACCURACY", top: "-12px", right: "20px" },
      { text: "RADAR PULSE ANIMATION", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Định Vị GPS Vệ Tinh Độ Trễ Thấp & Vòng Tròn Bán Kính Sai Số</div>
          <div class="page-subtitle">STT 22 (Ảnh 22.1) • Phân hệ: Bản đồ WebGIS • Phụ trách: Huỳnh Anh Tú</div>
        </div>
        <button class="btn btn-black">🎯 Kích hoạt GPS</button>
      </div>

      <div class="card-box">
        <div class="map-box" style="height: 310px; position: relative;">
          <!-- GPS Radar Mockup -->
          <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center;">
            <!-- Outer accuracy circle -->
            <div style="width: 140px; height: 140px; border-radius: 50%; background: rgba(37, 99, 235, 0.1); border: 2px dashed #2563eb; display: flex; align-items: center; justify-content: center; position: relative;">
              <!-- Inner pulse -->
              <div style="width: 20px; height: 20px; border-radius: 50%; background: #2563eb; border: 3px solid #fff; box-shadow: 0 0 12px rgba(37,99,235,0.6);"></div>
            </div>
            <div style="background: #111; color: #fff; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; margin-top: 8px;">
              Vị trí của bạn (Bán kính sai số: ± 4.2 mét)
            </div>
          </div>

          <div style="position: absolute; bottom: 14px; left: 14px; background: #fff; border: 1.5px solid #222; padding: 8px 12px; border-radius: 6px; font-size: 11px;">
            <div>• Tốc độ bắt sóng: <b>120 ms (Fast Geolocation Hook)</b></div>
            <div>• Cơ chế dự phòng: <b>IP Location Fallback khi mất GPS vệ tinh</b></div>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_23_1",
    numBadge: "Ảnh 23.1",
    title: "Thả ghim giải mã tọa độ ngược thành số nhà (OSM Reverse Geocoding)",
    member: "Huỳnh Anh Tú",
    role: "Toàn bộ người dùng",
    activeNav: "Bản đồ ô nhiễm",
    badges: [
      { text: "STT 23: DROP PIN GEOCODE", top: "-12px", right: "20px" },
      { text: "GIẢI MÃ TỌA ĐỘ NGƯỢC", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Thao Tác Thả Ghim & Giải Mã Tọa Độ Ngược (Reverse Geocoding)</div>
          <div class="page-subtitle">STT 23 (Ảnh 23.1) • Phân hệ: Bản đồ WebGIS • Phụ trách: Huỳnh Anh Tú</div>
        </div>
      </div>

      <div class="card-box">
        <div class="map-box" style="height: 320px; position: relative;">
          <!-- Dropped Pin -->
          <div style="position: absolute; top: 110px; left: 340px; transform: translate(-50%, -100%);">
            <svg width="36" height="46" viewBox="0 0 24 32" fill="#dc2626"><path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 20 12 20s12-11 12-20c0-6.63-5.37-12-12-12zm0 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/></svg>
          </div>

          <!-- Geocoded Popup Box -->
          <div style="position: absolute; top: 120px; left: 340px; transform: translate(-50%, 0); width: 310px; background: #fff; border: 2px solid #222; border-radius: 8px; padding: 12px; box-shadow: 0 6px 20px rgba(0,0,0,0.18); z-index: 40;">
            <div style="font-weight: 800; font-size: 13px; margin-bottom: 4px;">📍 ĐỊA ĐIỂM ĐÃ CHỌN</div>
            <div style="font-size: 12px; font-weight: 700;">53 Võ Văn Ngân, P. Linh Chiểu, TP. Thủ Đức</div>
            <div style="font-size: 11px; color: #6b7280; margin: 4px 0 10px 0;">Tọa độ: 10.850500, 106.771900</div>
            <div style="display: flex; gap: 6px;">
              <button class="btn btn-black btn-sm" style="flex: 1;">Báo cáo ô nhiễm tại đây</button>
              <button class="btn btn-white btn-sm">Dẫn đường</button>
            </div>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_24_1",
    numBadge: "Ảnh 24.1",
    title: "Quick Tour 3D khám phá danh thắng tiêu biểu Việt Nam",
    member: "Huỳnh Anh Tú",
    role: "Toàn bộ người dùng",
    activeNav: "Bản đồ ô nhiễm",
    badges: [
      { text: "STT 24: QUICK TOUR 3D", top: "-12px", right: "20px" },
      { text: "DANH THẮNG VIỆT NAM", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Thanh Điều Hướng Quick Tour 3D Khám Phá Danh Thắng Việt Nam</div>
          <div class="page-subtitle">STT 24 (Ảnh 24.1) • Phân hệ: Bản đồ WebGIS • Phụ trách: Huỳnh Anh Tú</div>
        </div>
      </div>

      <div class="card-box" style="margin-bottom: 12px;">
        <div class="card-title">Chọn địa danh tiêu biểu để bay 3D với góc máy điện ảnh:</div>
        <div style="display: flex; gap: 10px; overflow-x: auto; padding-bottom: 6px;">
          <div style="border: 2px solid #111; border-radius: 8px; padding: 10px; min-width: 150px; background: #f3f4f6; text-align: center; cursor: pointer;">
            <div style="font-weight: 800; font-size: 12px;">🏙️ Landmark 81</div>
            <div style="font-size: 10px; color: #6b7280;">Bình Thạnh, TP.HCM</div>
            <button class="btn btn-black btn-sm" style="margin-top: 6px;">Bay đến 3D</button>
          </div>
          <div style="border: 1.5px solid #222; border-radius: 8px; padding: 10px; min-width: 150px; text-align: center; cursor: pointer;">
            <div style="font-weight: 800; font-size: 12px;">🏛️ Dinh Độc Lập</div>
            <div style="font-size: 10px; color: #6b7280;">Quận 1, TP.HCM</div>
            <button class="btn btn-white btn-sm" style="margin-top: 6px;">Bay đến 3D</button>
          </div>
          <div style="border: 1.5px solid #222; border-radius: 8px; padding: 10px; min-width: 150px; text-align: center; cursor: pointer;">
            <div style="font-weight: 800; font-size: 12px;">🌊 Cầu Rồng</div>
            <div style="font-size: 10px; color: #6b7280;">Đà Nẵng</div>
            <button class="btn btn-white btn-sm" style="margin-top: 6px;">Bay đến 3D</button>
          </div>
          <div style="border: 1.5px solid #222; border-radius: 8px; padding: 10px; min-width: 150px; text-align: center; cursor: pointer;">
            <div style="font-weight: 800; font-size: 12px;">⛩️ Cố Đô Huế</div>
            <div style="font-size: 10px; color: #6b7280;">Thừa Thiên Huế</div>
            <button class="btn btn-white btn-sm" style="margin-top: 6px;">Bay đến 3D</button>
          </div>
          <div style="border: 1.5px solid #222; border-radius: 8px; padding: 10px; min-width: 150px; text-align: center; cursor: pointer;">
            <div style="font-weight: 800; font-size: 12px;">🐢 Hồ Hoàn Kiếm</div>
            <div style="font-size: 10px; color: #6b7280;">Hà Nội</div>
            <button class="btn btn-white btn-sm" style="margin-top: 6px;">Bay đến 3D</button>
          </div>
        </div>
      </div>

      <div class="map-box" style="height: 220px; position: relative;">
        <div style="position: absolute; bottom: 12px; left: 12px; background: #fff; border: 1.5px solid #222; padding: 6px 12px; border-radius: 6px; font-size: 11px;">
          Tự động điều chỉnh: <code>center, zoom: 17.2, pitch: 65°, bearing: -45°</code>
        </div>
      </div>
    `
  }
];
