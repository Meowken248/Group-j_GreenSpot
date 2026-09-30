// screens_quan.cjs - Wireframe screens for Bùi Nguyễn Minh Quân (STT 25 - STT 36)
// Phân hệ: Trạm Quan Trắc IoT Viễn Trắc, Bản Đồ Nhiệt Đa Dải & Giám Sát Ngập Lụt Thủy Văn

module.exports = [
  {
    id: "Anh_25_1",
    numBadge: "Ảnh 25.1",
    title: "Quản lý mạng lưới trạm cảm biến viễn trắc IoT môi trường",
    member: "Bùi Nguyễn Minh Quân",
    role: "Kỹ sư IoT / Quản trị viên",
    activeNav: "Mạng lưới IoT",
    badges: [
      { text: "STT 25: TRẠM CẢM BIẾN IoT", top: "-12px", right: "20px" },
      { text: "TELEMETRY STATIONS", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Quản Lý Danh Sách & Bản Đồ Mạng Lưới Trạm Viễn Trắc IoT</div>
          <div class="page-subtitle">STT 25 (Ảnh 25.1) • Phân hệ: Trạm Quan trắc IoT • Phụ trách: Bùi Nguyễn Minh Quân</div>
        </div>
        <button class="btn btn-black">+ Đăng ký trạm IoT mới</button>
      </div>

      <div class="grid-3" style="margin-bottom: 12px;">
        <div class="card-box" style="text-align: center;">
          <div style="font-size: 24px; font-weight: 900;">28 Trạm</div>
          <div style="font-size: 11px; color: #6b7280;">Trạm Không Khí AQI (Online: 27/28)</div>
        </div>
        <div class="card-box" style="text-align: center;">
          <div style="font-size: 24px; font-weight: 900;">14 Cảm biến</div>
          <div style="font-size: 11px; color: #6b7280;">Cảm biến đo ngập siêu âm lòng đường</div>
        </div>
        <div class="card-box" style="text-align: center;">
          <div style="font-size: 24px; font-weight: 900;">2 Trạm</div>
          <div style="font-size: 11px; color: #6b7280;">Trạm Thủy Văn Tự Động (Phú An, Nhà Bè)</div>
        </div>
      </div>

      <div class="card-box">
        <table class="wire-table">
          <tr><th>Mã Trạm</th><th>Tên Trạm Quan Trắc</th><th>Loại Thiết Bị</th><th>Tọa độ GPS</th><th>Mức Pin</th><th>Chu kỳ gửi</th><th>Trạng thái</th></tr>
          <tr><td><b>IOT-AQI-01</b></td><td>Trạm Công Viên Tao Đàn, Q.1</td><td>Sensor CAMS/AQI đa chỉ số</td><td>10.7745, 106.6923</td><td>98%</td><td>15 phút</td><td><span class="tag tag-dark">HOẠT ĐỘNG</span></td></tr>
          <tr><td><b>IOT-AQI-04</b></td><td>Trạm ĐH Bách Khoa, Q.10</td><td>Sensor PM2.5 / PM10 laser</td><td>10.7721, 106.6578</td><td>92%</td><td>15 phút</td><td><span class="tag tag-dark">HOẠT ĐỘNG</span></td></tr>
          <tr><td><b>IOT-FLD-02</b></td><td>Cảm biến ngập Nguyễn Hữu Cảnh</td><td>Cảm biến sóng siêu âm đo mức nước</td><td>10.7912, 106.7145</td><td>85%</td><td>5 phút</td><td><span class="tag tag-dark">HOẠT ĐỘNG</span></td></tr>
          <tr><td><b>IOT-THV-01</b></td><td>Trạm Thủy Văn Phú An (Sông Sài Gòn)</td><td>Thước đo triều tự động áp suất</td><td>10.7936, 106.7198</td><td>Nguồn điện lưới</td><td>Realtime</td><td><span class="tag tag-dark">HOẠT ĐỘNG</span></td></tr>
        </table>
      </div>
    `
  },
  {
    id: "Anh_26_1",
    numBadge: "Ảnh 26.1",
    title: "Nhật ký lưu trữ chuỗi thời gian số liệu quan trắc viễn trắc",
    member: "Bùi Nguyễn Minh Quân",
    role: "Chuyên viên phân tích số liệu",
    activeNav: "Mạng lưới IoT",
    badges: [
      { text: "STT 26: TIME-SERIES LOGS", top: "-12px", right: "20px" },
      { text: "CHỈ SỐ THEO GIỜ", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Nhật Ký Dữ Liệu Viễn Trắc Chuỗi Thời Gian (Time-Series Records)</div>
          <div class="page-subtitle">STT 26 (Ảnh 26.1) • Phân hệ: Trạm Quan trắc IoT • Phụ trách: Bùi Nguyễn Minh Quân</div>
        </div>
        <div style="display: flex; gap: 8px;">
          <select class="form-select" style="width: 200px;">
            <option>Trạm IOT-AQI-01 (Tao Đàn)</option>
            <option>Trạm IOT-AQI-04 (Bách Khoa)</option>
          </select>
          <button class="btn btn-black">Xuất file CSV</button>
        </div>
      </div>

      <div class="card-box">
        <div class="card-title">Chuỗi bản ghi 24 giờ gần nhất của Trạm IOT-AQI-01:</div>
        <table class="wire-table">
          <tr><th>Mốc thời gian</th><th>AQI</th><th>PM2.5 (µg/m³)</th><th>PM10 (µg/m³)</th><th>NO2 (µg/m³)</th><th>O3 (µg/m³)</th><th>Nhiệt độ</th><th>Độ ẩm</th></tr>
          <tr><td>28/09/2026 - 12:00</td><td><b>42</b></td><td>10.4</td><td>22.1</td><td>18.5</td><td>45.2</td><td>32.5 °C</td><td>76%</td></tr>
          <tr><td>28/09/2026 - 11:00</td><td><b>45</b></td><td>11.2</td><td>24.3</td><td>20.1</td><td>48.0</td><td>32.0 °C</td><td>78%</td></tr>
          <tr><td>28/09/2026 - 10:00</td><td><b>58</b></td><td>15.8</td><td>32.0</td><td>25.4</td><td>52.3</td><td>31.0 °C</td><td>80%</td></tr>
          <tr><td>28/09/2026 - 09:00</td><td><b>68</b></td><td>20.5</td><td>41.2</td><td>32.0</td><td>40.1</td><td>29.5 °C</td><td>83%</td></tr>
          <tr><td>28/09/2026 - 08:00</td><td><b>78</b></td><td>25.6</td><td>52.8</td><td>42.5</td><td>30.5</td><td>28.2 °C</td><td>87%</td></tr>
          <tr><td>28/09/2026 - 07:00</td><td><b>85</b></td><td>29.4</td><td>58.9</td><td>48.2</td><td>22.1</td><td>27.0 °C</td><td>90%</td></tr>
        </table>
      </div>
    `
  },
  {
    id: "Anh_27_1",
    numBadge: "Ảnh 27.1",
    title: "Bản đồ nhiệt nhiệt độ khí quyển (°C) toàn quốc",
    member: "Bùi Nguyễn Minh Quân",
    role: "Toàn bộ người dùng",
    activeNav: "Bản đồ ô nhiễm",
    badges: [
      { text: "STT 27: HEATMAP NHIỆT ĐỘ", top: "-12px", right: "20px" },
      { text: "28 TRẠM KHÍ TƯỢNG", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Bản Đồ Nhiệt Nội Suy Nhiệt Độ Khí Quyển (°C) Toàn Quốc</div>
          <div class="page-subtitle">STT 27 (Ảnh 27.1) • Phân hệ: Bản đồ Nhiệt Đa dải • Phụ trách: Bùi Nguyễn Minh Quân</div>
        </div>
      </div>

      <div class="card-box">
        <div class="map-box" style="height: 320px; position: relative;">
          <!-- Heatmap gradient zones mockup -->
          <div style="position: absolute; top: 30px; left: 180px; width: 220px; height: 160px; border-radius: 50%; background: radial-gradient(circle, rgba(239, 68, 68, 0.4) 0%, rgba(245, 158, 11, 0.25) 50%, transparent 80%);"></div>
          <div style="position: absolute; top: 110px; left: 340px; width: 260px; height: 180px; border-radius: 50%; background: radial-gradient(circle, rgba(220, 38, 38, 0.5) 0%, rgba(234, 88, 12, 0.3) 60%, transparent 85%);"></div>

          <!-- Weather Station Points -->
          <div style="position: absolute; top: 90px; left: 240px; background: #fff; border: 1.5px solid #222; border-radius: 4px; padding: 2px 6px; font-size: 10px; font-weight: bold;">
            Hà Nội: 30.5 °C
          </div>
          <div style="position: absolute; top: 160px; left: 310px; background: #fff; border: 1.5px solid #222; border-radius: 4px; padding: 2px 6px; font-size: 10px; font-weight: bold;">
            Đà Nẵng: 31.8 °C
          </div>
          <div style="position: absolute; top: 220px; left: 420px; background: #fff; border: 1.5px solid #222; border-radius: 4px; padding: 2px 6px; font-size: 10px; font-weight: bold;">
            TP.HCM: 34.2 °C (Nắng nóng)
          </div>

          <!-- Color Scale Legend -->
          <div style="position: absolute; bottom: 14px; left: 14px; background: #fff; border: 2px solid #222; border-radius: 6px; padding: 8px 12px; width: 280px;">
            <div style="font-size: 10px; font-weight: 800; margin-bottom: 4px;">THANG NHIỆT ĐỘ KHÍ QUYỂN (°C):</div>
            <div style="height: 12px; background: linear-gradient(to right, #3b82f6, #10b981, #f59e0b, #ef4444, #7f1d1d); border-radius: 3px; border: 1px solid #222;"></div>
            <div style="display: flex; justify-content: space-between; font-size: 9px; font-weight: bold; margin-top: 2px;">
              <span>18°C (Mát)</span><span>25°C</span><span>30°C</span><span>35°C (Gắt)</span>
            </div>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_28_1",
    numBadge: "Ảnh 28.1",
    title: "Bản đồ nhiệt chất lượng không khí (AQI Heatmap Layer)",
    member: "Bùi Nguyễn Minh Quân",
    role: "Toàn bộ người dùng",
    activeNav: "Bản đồ ô nhiễm",
    badges: [
      { text: "STT 28: AQI HEATMAP", top: "-12px", right: "20px" },
      { text: "CHUẨN US EPA / QCVN", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Bản Đồ Nhiệt Chỉ Số Chất Lượng Không Khí AQI (US EPA Standards)</div>
          <div class="page-subtitle">STT 28 (Ảnh 28.1) • Phân hệ: Bản đồ Nhiệt Đa dải • Phụ trách: Bùi Nguyễn Minh Quân</div>
        </div>
      </div>

      <div class="card-box">
        <div class="map-box" style="height: 320px; position: relative;">
          <!-- AQI Legend Bar -->
          <div style="position: absolute; top: 12px; right: 12px; background: #fff; border: 2px solid #222; border-radius: 8px; padding: 8px 12px; width: 220px; z-index: 30;">
            <div style="font-size: 11px; font-weight: 800; margin-bottom: 6px;">DẢI PHÂN LOẠI US EPA:</div>
            <div style="font-size: 10px; display: flex; flex-direction: column; gap: 3px;">
              <div>🟢 <b>0 - 50:</b> Tốt (Good)</div>
              <div>🟡 <b>51 - 100:</b> Trung bình (Moderate)</div>
              <div>🟠 <b>101 - 150:</b> Kém nhạy cảm (Unhealthy for Sensitive)</div>
              <div>🔴 <b>151 - 200:</b> Xấu (Unhealthy)</div>
              <div>🟣 <b>201 - 300:</b> Rất xấu (Very Unhealthy)</div>
              <div>🟤 <b>> 300:</b> Nguy hại (Hazardous)</div>
            </div>
          </div>

          <!-- Heatmap Blobs -->
          <div style="position: absolute; top: 80px; left: 160px; width: 180px; height: 140px; border-radius: 50%; background: radial-gradient(circle, rgba(34, 197, 94, 0.4) 0%, transparent 70%);"></div>
          <div style="position: absolute; top: 120px; left: 320px; width: 220px; height: 160px; border-radius: 50%; background: radial-gradient(circle, rgba(249, 115, 22, 0.5) 0%, rgba(234, 179, 8, 0.3) 50%, transparent 80%);"></div>

          <div style="position: absolute; bottom: 14px; left: 14px; background: #fff; border: 1.5px solid #222; padding: 6px 12px; border-radius: 6px; font-size: 11px;">
            WebGL Shader nội suy không gian thời gian thực từ 28 trạm quan trắc
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_29_1",
    numBadge: "Ảnh 29.1",
    title: "Bản đồ nhiệt mật độ rủi ro ô nhiễm đô thị",
    member: "Bùi Nguyễn Minh Quân",
    role: "Toàn bộ người dùng",
    activeNav: "Bản đồ ô nhiễm",
    badges: [
      { text: "STT 29: RỦI RO Ô NHIỄM", top: "-12px", right: "20px" },
      { text: "TRỌNG SỐ SỰ CỐ THỰC TẾ", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Bản Đồ Nhiệt Mật Độ Rủi Ro Ô Nhiễm Đô Thị (Pollution Density)</div>
          <div class="page-subtitle">STT 29 (Ảnh 29.1) • Phân hệ: Bản đồ Nhiệt Đa dải • Phụ trách: Bùi Nguyễn Minh Quân</div>
        </div>
      </div>

      <div class="card-box">
        <div class="map-box" style="height: 320px; position: relative;">
          <!-- Dense risk spots -->
          <div style="position: absolute; top: 60px; left: 280px; width: 160px; height: 160px; border-radius: 50%; background: radial-gradient(circle, rgba(17, 17, 17, 0.6) 0%, rgba(75, 85, 99, 0.3) 60%, transparent 80%);"></div>
          <div style="position: absolute; top: 120px; left: 260px; background: #111; color: #fff; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 800;">
            🔥 Điểm nóng rác: Chợ Thủ Đức
          </div>

          <div style="position: absolute; bottom: 14px; left: 14px; background: #fff; border: 2px solid #222; padding: 8px 12px; border-radius: 6px; width: 320px;">
            <div style="font-weight: 800; font-size: 11px;">CƠ CHẾ NỘI SUY TRỌNG SỐ RỦI RO:</div>
            <div style="font-size: 10px; color: #4b5563; margin-top: 2px;">
              Mỗi điểm sự cố mang trọng số rủi ro (Risk Score) kết hợp thời gian tồn đọng chưa dọn dẹp để tạo vùng nhiệt cảnh báo chính quyền đô thị.
            </div>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_30_1",
    numBadge: "Ảnh 30.1",
    title: "Live Weather Radar Map: 8 lớp phủ khí quyển động học",
    member: "Bùi Nguyễn Minh Quân",
    role: "Toàn bộ người dùng",
    activeNav: "Bản đồ ô nhiễm",
    badges: [
      { text: "STT 30: LIVE WEATHER RADAR", top: "-12px", right: "20px" },
      { text: "WIND PARTICLES & RAIN", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Live Weather Radar: 8 Lớp Phủ Khí Quyển Động Lực Học (RainViewer & Wind)</div>
          <div class="page-subtitle">STT 30 (Ảnh 30.1) • Phân hệ: Bản đồ Nhiệt Đa dải • Phụ trách: Bùi Nguyễn Minh Quân</div>
        </div>
        <div style="display: flex; gap: 6px;">
          <button class="btn btn-black btn-sm">▶ Phát chuyển động (Play)</button>
          <button class="btn btn-white btn-sm">Lớp Gió</button>
          <button class="btn btn-white btn-sm">Lớp Mưa</button>
        </div>
      </div>

      <div class="card-box">
        <div class="map-box" style="height: 320px; position: relative;">
          <!-- Wind streamlines dynamic particles simulation -->
          <svg style="width: 100%; height: 100%;">
            <path d="M 50,80 Q 150,60 250,90 T 450,80 T 650,110" stroke="#0284c7" stroke-width="2" stroke-dasharray="8 6" fill="none"/>
            <path d="M 80,140 Q 200,120 320,150 T 520,140 T 720,160" stroke="#0284c7" stroke-width="2" stroke-dasharray="10 8" fill="none"/>
            <path d="M 40,210 Q 160,190 280,220 T 480,210 T 680,230" stroke="#0284c7" stroke-width="2.5" stroke-dasharray="12 6" fill="none"/>
          </svg>

          <!-- Radar Cloud Patch -->
          <div style="position: absolute; top: 60px; right: 140px; width: 180px; height: 130px; background: rgba(59, 130, 246, 0.25); border-radius: 40px; filter: blur(8px);"></div>
          <div style="position: absolute; top: 100px; right: 180px; font-size: 11px; font-weight: 800; color: #1e3a8a;">
            ⛈️ Mây đối lưu gây mưa rào (35mm/h)
          </div>

          <!-- Bottom Time Player -->
          <div style="position: absolute; bottom: 12px; left: 20px; right: 20px; background: #fff; border: 2px solid #222; border-radius: 8px; padding: 8px 14px; display: flex; align-items: center; gap: 14px;">
            <button class="btn btn-black btn-sm">⏸ Tạm dừng</button>
            <div style="flex: 1; height: 6px; background: #e5e7eb; border-radius: 3px; position: relative;">
              <div style="width: 65%; height: 100%; background: #111; border-radius: 3px;"></div>
              <div style="position: absolute; top: -5px; left: 65%; width: 16px; height: 16px; border-radius: 50%; background: #111; border: 2px solid #fff;"></div>
            </div>
            <span style="font-size: 11px; font-weight: 800;">11:45 (+45 phút trước)</span>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_31_1",
    numBadge: "Ảnh 31.1",
    title: "Động cơ giải tích sóng thủy triều thuần Python (Harmonic Tide)",
    member: "Bùi Nguyễn Minh Quân",
    role: "Chuyên gia Thủy văn",
    activeNav: "Bản đồ ngập lụt",
    badges: [
      { text: "STT 31: HARMONIC TIDE", top: "-12px", right: "20px" },
      { text: "M2, S2, K1, O1", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Động Cơ Giải Tích Điều Hòa Sóng Triều (Harmonic Tide Engine)</div>
          <div class="page-subtitle">STT 31 (Ảnh 31.1) • Phân hệ: Giám sát Ngập lụt • Phụ trách: Bùi Nguyễn Minh Quân</div>
        </div>
      </div>

      <div class="card-box" style="margin-bottom: 12px;">
        <div class="card-title">Phương trình điều hòa 4 thành phần sóng thiên văn:</div>
        <div style="font-size: 14px; font-weight: 800; background: #f3f4f6; border: 1.5px solid #222; padding: 10px; border-radius: 6px; text-align: center;">
          H(t) = H₀ + A_M2·cos(ω_M2·t - g_M2) + A_S2·cos(ω_S2·t - g_S2) + A_K1·cos(ω_K1·t - g_K1) + A_O1·cos(ω_O1·t - g_O1)
        </div>
        <div style="font-size: 11px; color: #6b7280; margin-top: 6px; text-align: center;">
          Tính toán thuần Python không phụ thuộc thư viện ngoài, tốc độ xử lý vi giây, chạy offline 100%.
        </div>
      </div>

      <div class="card-box">
        <div class="card-title">Đường cong mô phỏng dao động bán nhật triều Sông Sài Gòn (48 giờ):</div>
        <div style="height: 180px; position: relative;">
          <svg style="width: 100%; height: 100%;">
            <!-- Grid lines -->
            <line x1="40" y1="30" x2="720" y2="30" stroke="#e5e7eb" stroke-width="1"/>
            <line x1="40" y1="80" x2="720" y2="80" stroke="#fca5a5" stroke-width="1.5" stroke-dasharray="4 4"/>
            <line x1="40" y1="130" x2="720" y2="130" stroke="#e5e7eb" stroke-width="1"/>

            <!-- Warning line label -->
            <text x="45" y="75" font-size="10" font-weight="bold" fill="#dc2626">BÁO ĐỘNG III (1.60m)</text>

            <!-- Sine curve -->
            <path d="M 40,110 Q 120,20 210,105 T 380,100 T 550,110 T 720,95" stroke="#111" stroke-width="3" fill="none"/>

            <!-- High tide marker -->
            <circle cx="120" cy="35" r="5" fill="#dc2626"/>
            <text x="130" y="32" font-size="10" font-weight="bold">Đỉnh triều: 1.68m (17:30)</text>
          </svg>
        </div>
      </div>
    `
  },
  {
    id: "Anh_32_1",
    numBadge: "Ảnh 32.1",
    title: "Quan trắc & dự báo mực nước triều trạm Phú An và Nhà Bè",
    member: "Bùi Nguyễn Minh Quân",
    role: "Toàn bộ người dùng",
    activeNav: "Bản đồ ngập lụt",
    badges: [
      { text: "STT 32: TRẠM PHÚ AN & NHÀ BÈ", top: "-12px", right: "20px" },
      { text: "MỰC NƯỚC SÔNG SÀI GÒN", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Mực Nước Triều Thực Tế & Dự Báo 2 Trạm Phú An và Nhà Bè</div>
          <div class="page-subtitle">STT 32 (Ảnh 32.1) • Phân hệ: Giám sát Ngập lụt • Phụ trách: Bùi Nguyễn Minh Quân</div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card-box" style="border: 2px solid #222;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #222; padding-bottom: 8px; margin-bottom: 10px;">
            <div style="font-weight: 800; font-size: 15px;">TRẠM PHÚ AN (SÔNG SÀI GÒN)</div>
            <span class="tag tag-dark">CẢNH BÁO CAO</span>
          </div>
          <div style="font-size: 32px; font-weight: 900; color: #dc2626;">+ 1.68 mét</div>
          <div style="font-size: 12px; color: #4b5563; margin: 4px 0 10px 0;">• Xu hướng: <b>Đang dâng nhanh (+6 cm/giờ)</b></div>
          <div style="font-size: 11px; line-height: 1.5;">
            <div>• Ngưỡng Báo Động I: <b>1.40 m</b> (Đã vượt)</div>
            <div>• Ngưỡng Báo Động II: <b>1.50 m</b> (Đã vượt)</div>
            <div>• Ngưỡng Báo Động III: <b>1.60 m</b> (<span style="color:#dc2626;font-weight:bold;">VƯỢT +0.08m</span>)</div>
          </div>
        </div>

        <div class="card-box" style="border: 2px solid #222;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #222; padding-bottom: 8px; margin-bottom: 10px;">
            <div style="font-weight: 800; font-size: 15px;">TRẠM NHÀ BÈ (SÔNG ĐỒNG ĐIỀN)</div>
            <span class="tag tag-dark">BÁO ĐỘNG III</span>
          </div>
          <div style="font-size: 32px; font-weight: 900; color: #ea580c;">+ 1.64 mét</div>
          <div style="font-size: 12px; color: #4b5563; margin: 4px 0 10px 0;">• Xu hướng: <b>Đạt đỉnh trong 30 phút tới</b></div>
          <div style="font-size: 11px; line-height: 1.5;">
            <div>• Ngưỡng Báo Động I: <b>1.35 m</b> (Đã vượt)</div>
            <div>• Ngưỡng Báo Động II: <b>1.45 m</b> (Đã vượt)</div>
            <div>• Ngưỡng Báo Động III: <b>1.55 m</b> (<span style="color:#ea580c;font-weight:bold;">VƯỢT +0.09m</span>)</div>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_33_1",
    numBadge: "Ảnh 33.1",
    title: "Tự động dò đỉnh triều (High Tide), chân triều và báo động BĐ3",
    member: "Bùi Nguyễn Minh Quân",
    role: "Chuyên viên khí tượng thủy văn",
    activeNav: "Bản đồ ngập lụt",
    badges: [
      { text: "STT 33: DÒ ĐỈNH TRIỀU CỰC TRỊ", top: "-12px", right: "20px" },
      { text: "ĐẠO HÀM dH/dt = 0", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Tự Động Dò Cực Trị Thủy Triều & Báo Động Vượt Cấp BĐ3</div>
          <div class="page-subtitle">STT 33 (Ảnh 33.1) • Phân hệ: Giám sát Ngập lụt • Phụ trách: Bùi Nguyễn Minh Quân</div>
        </div>
      </div>

      <div class="card-box" style="border: 2px solid #dc2626; background: #fef2f2; margin-bottom: 12px;">
        <div style="display: flex; gap: 12px; align-items: center;">
          <div style="font-size: 28px;">🚨</div>
          <div>
            <div style="font-weight: 800; font-size: 14px; color: #dc2626;">CẢNH BÁO THỦY TRIỀU VƯỢT MỨC BÁO ĐỘNG III</div>
            <div style="font-size: 12px; color: #991b1b;">
              Thuật toán đạo hàm dH/dt xác định đỉnh triều sẽ xuất hiện lúc <b>17:45 chiều nay</b> với mực nước dự kiến <b>1.72m</b>. Nguy cơ ngập sâu các tuyến đường ven sông!
            </div>
          </div>
        </div>
      </div>

      <div class="card-box">
        <div class="card-title">Bảng phân tích các mốc cực trị trong 24 giờ tới:</div>
        <table class="wire-table">
          <tr><th>Mốc sự kiện cực trị</th><th>Thời điểm dự báo</th><th>Mực nước (m)</th><th>Vận tốc biến thiên dH/dt</th><th>Mức độ cảnh báo</th></tr>
          <tr><td><b>ĐỈNH TRIỀU 1 (High Tide)</b></td><td>17:45 (Hôm nay)</td><td><b>+ 1.72 m</b></td><td>0.00 cm/h (Đạt đỉnh)</td><td><span class="tag tag-gray" style="color:#dc2626;border-color:#dc2626;font-weight:bold;">NGUY HIỂM > BĐ3</span></td></tr>
          <tr><td><b>CHÂN TRIỀU 1 (Low Tide)</b></td><td>23:15 (Hôm nay)</td><td><b>- 0.45 m</b></td><td>0.00 cm/h (Nước cạn)</td><td><span class="tag tag-dark">BÌNH THƯỜNG</span></td></tr>
          <tr><td><b>ĐỈNH TRIỀU 2 (High Tide)</b></td><td>06:20 (Sáng mai)</td><td><b>+ 1.58 m</b></td><td>0.00 cm/h (Đạt đỉnh)</td><td><span class="tag tag-gray">BÁO ĐỘNG II</span></td></tr>
        </table>
      </div>
    `
  },
  {
    id: "Anh_34_1",
    numBadge: "Ảnh 34.1",
    title: "Động cơ phân tích rủi ro ngập lụt đa nhân tố (Flood Risk Engine)",
    member: "Bùi Nguyễn Minh Quân",
    role: "Chuyên gia GIS / Phân tích",
    activeNav: "Bản đồ ngập lụt",
    badges: [
      { text: "STT 34: FLOOD RISK ENGINE", top: "-12px", right: "20px" },
      { text: "ĐA NHÂN TỐ KẾT HỢP", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Động Cơ Phân Tích Rủi Ro Ngập Lụt Đa Nhân Tố (Multi-Factor Engine)</div>
          <div class="page-subtitle">STT 34 (Ảnh 34.1) • Phân hệ: Giám sát Ngập lụt • Phụ trách: Bùi Nguyễn Minh Quân</div>
        </div>
      </div>

      <div class="card-box" style="margin-bottom: 12px;">
        <div class="card-title">Mô hình tính toán chiều sâu ngập mặt đường thực tế:</div>
        <table class="wire-table">
          <tr><th>Nhân tố đầu vào</th><th>Nguồn dữ liệu</th><th>Giá trị đo lường</th><th>Hệ số tác động</th></tr>
          <tr><td><b>1. Mực nước triều cường</b></td><td>Harmonic Tide Model</td><td>1.68m (Vượt BĐ3)</td><td>Trọng số 40%</td></tr>
          <tr><td><b>2. Cường độ mưa lớn</b></td><td>RainViewer Radar API</td><td>55 mm/giờ</td><td>Trọng số 35%</td></tr>
          <tr><td><b>3. Cao độ địa hình & Cống</b></td><td>DEM & Hạ tầng thoát nước</td><td>Vùng trũng 0.8m, cống nghẹt 30%</td><td>Trọng số 25%</td></tr>
        </table>
      </div>

      <div class="grid-2">
        <div class="card-box" style="text-align: center;">
          <div style="font-size: 11px; color: #6b7280; font-weight: 700;">ĐỘ SÂU NGẬP ƯỚC TÍNH</div>
          <div style="font-size: 34px; font-weight: 900; margin: 4px 0; color: #dc2626;">38 cm</div>
          <div style="font-size: 12px; font-weight: bold;">(Ngập nửa bánh xe máy)</div>
        </div>

        <div class="card-box" style="text-align: center;">
          <div style="font-size: 11px; color: #6b7280; font-weight: 700;">PHÂN CẤP KHẢ NĂNG THÔNG XE</div>
          <div style="font-size: 24px; font-weight: 900; margin: 8px 0; color: #dc2626;">SEVERE (NGHIÊM TRỌNG)</div>
          <div style="font-size: 11px; color: #dc2626;">Xe máy nguy cơ chết máy cao. Ô tô gầm thấp không thể qua!</div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_35_1",
    numBadge: "Ảnh 35.1",
    title: "Thanh trượt mô phỏng kịch bản ngập lụt tương tác (0 - 100 mm/h)",
    member: "Bùi Nguyễn Minh Quân",
    role: "Toàn bộ người dùng",
    activeNav: "Bản đồ ngập lụt",
    badges: [
      { text: "STT 35: RAIN SLIDER SIMULATION", top: "-12px", right: "20px" },
      { text: "0 - 100 MM/H TƯƠNG TÁC", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Thanh Trượt Mô Phỏng Kịch Bản Mưa Lớn & Rủi Ro Ngập Lụt</div>
          <div class="page-subtitle">STT 35 (Ảnh 35.1) • Phân hệ: Giám sát Ngập lụt • Phụ trách: Bùi Nguyễn Minh Quân</div>
        </div>
      </div>

      <div class="card-box" style="margin-bottom: 12px; background: #fafafa;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div>
            <b>Kịch bản giả định lượng mưa:</b>
            <span style="font-size: 18px; font-weight: 900; margin-left: 8px;">65 mm/giờ</span> (Mưa rất to)
          </div>
          <span class="tag tag-dark">CẬP NHẬT TỨC THỜI</span>
        </div>

        <!-- Rain Intensity Interactive Slider Mockup -->
        <div style="position: relative; padding: 10px 0;">
          <div style="height: 10px; background: #e5e7eb; border-radius: 5px; border: 1.5px solid #222;">
            <div style="width: 65%; height: 100%; background: #2563eb; border-radius: 4px;"></div>
          </div>
          <div style="position: absolute; top: 3px; left: 65%; width: 22px; height: 22px; border-radius: 50%; background: #111; border: 3px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.3); transform: translateX(-50%);"></div>
          <div style="display: flex; justify-content: space-between; font-size: 10px; font-weight: bold; margin-top: 8px; color: #4b5563;">
            <span>0 mm/h (Tạnh ráo)</span>
            <span>25 mm/h (Mưa vừa)</span>
            <span>50 mm/h (Mưa to)</span>
            <span>75 mm/h (Mưa rất to)</span>
            <span>100 mm/h (Mưa lịch sử)</span>
          </div>
        </div>
      </div>

      <div class="card-box">
        <div class="map-box" style="height: 230px; position: relative;">
          <!-- Flooded Roads Highlighted -->
          <svg style="width: 100%; height: 100%;">
            <line x1="80" y1="120" x2="680" y2="120" stroke="#dc2626" stroke-width="12"/>
            <line x1="340" y1="30" x2="340" y2="200" stroke="#f59e0b" stroke-width="8"/>
          </svg>
          <div style="position: absolute; top: 95px; left: 240px; background: #dc2626; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 900;">
            Đường Nguyễn Hữu Cảnh: Ngập 45cm
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_36_1",
    numBadge: "Ảnh 36.1",
    title: "Tích hợp dự báo nguy cơ lũ lụt Copernicus GloFAS toàn cầu 7 ngày",
    member: "Bùi Nguyễn Minh Quân",
    role: "Toàn bộ người dùng",
    activeNav: "Bản đồ ngập lụt",
    badges: [
      { text: "STT 36: COPERNICUS GloFAS", top: "-12px", right: "20px" },
      { text: "DỰ BÁO LƯU LƯỢNG 7 NGÀY", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Dự Báo Lưu Lượng Dòng Chảy Sông Ngòi 7 Ngày (Copernicus GloFAS)</div>
          <div class="page-subtitle">STT 36 (Ảnh 36.1) • Phân hệ: Giám sát Ngập lụt • Phụ trách: Bùi Nguyễn Minh Quân</div>
        </div>
      </div>

      <div class="card-box" style="position: relative; height: 380px;">
        <div class="modal-overlay" style="width: 580px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #222; padding-bottom: 8px; margin-bottom: 12px;">
            <div style="font-weight: 800; font-size: 14px;">🌊 DỰ BÁO LŨ LỤT SÔNG SÀI GÒN (GloFAS ECMWF)</div>
            <span class="tag tag-dark">7 NGÀY TỚI</span>
          </div>

          <div style="font-size: 11px; text-align: left; margin-bottom: 10px;">
            Tọa độ quan sát: <b>10.7936° N, 106.7198° E</b> • Lưu vực: <b>Hạ lưu Sông Sài Gòn</b>
          </div>

          <!-- GloFAS Discharge Chart Mockup -->
          <div style="height: 180px; border: 1.5px solid #222; background: #fafafa; border-radius: 6px; padding: 10px; position: relative;">
            <svg style="width: 100%; height: 100%;">
              <!-- Return period thresholds -->
              <line x1="30" y1="40" x2="520" y2="40" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="4 2"/>
              <text x="35" y="35" font-size="9" fill="#dc2626" font-weight="bold">Ngưỡng lũ chu kỳ 5 năm (820 m³/s)</text>

              <line x1="30" y1="80" x2="520" y2="80" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="4 2"/>
              <text x="35" y="75" font-size="9" fill="#d97706" font-weight="bold">Ngưỡng lũ chu kỳ 2 năm (650 m³/s)</text>

              <!-- Forecast Discharge Curve -->
              <path d="M 30,140 Q 110,120 180,95 T 320,60 T 450,110 T 520,130" stroke="#2563eb" stroke-width="3" fill="none"/>
              <circle cx="320" cy="60" r="5" fill="#dc2626"/>
            </svg>
            <div style="position: absolute; top: 46px; left: 330px; font-size: 10px; font-weight: bold; background: #fff; border: 1px solid #222; padding: 1px 4px; border-radius: 3px;">
              Đỉnh lũ: 760 m³/s (Ngày 3)
            </div>
          </div>

          <div class="modal-actions" style="margin-top: 14px;">
            <button class="btn btn-black btn-sm">Tải dữ liệu GeoJSON</button>
            <button class="btn btn-white btn-sm">Đóng cửa sổ</button>
          </div>
        </div>
      </div>
    `
  }
];
