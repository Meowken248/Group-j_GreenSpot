// screens_tu.js - Wireframe screens for Huỳnh Anh Tú (Chức năng 13 - 24)

module.exports = [
  {
    id: "Anh_13_1",
    numBadge: "Ảnh 13.1",
    title: "Cơ chế tích lũy Điểm thưởng Công dân Xanh (EcoPoints)",
    member: "Huỳnh Anh Tú",
    role: "Công dân (Citizen)",
    activeNav: "Dashboard",
    badges: [
      { text: "CỘNG ĐIỂM THƯỞNG", top: "-12px", right: "20px" },
      { text: "+50 ECOPOINTS", top: "110px", left: "430px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Thông báo tích lũy điểm thưởng xanh</div>
          <div class="page-subtitle">Chức năng 13 (Ảnh 13.1) • Phụ trách: Huỳnh Anh Tú</div>
        </div>
      </div>

      <div class="card-box" style="position: relative;">
        <div class="modal-overlay">
          <div style="font-size: 36px; margin-bottom: 8px;">🎉🌱</div>
          <div class="modal-title">CHÚC MỪNG BẠN ĐÃ ĐƯỢC CỘNG ĐIỂM!</div>
          <div class="modal-text">
            Báo cáo phản ánh bãi rác tại <b>53 Võ Văn Ngân</b> của bạn đã được Đội vệ sinh đô thị nghiệm thu dọn sạch thành công!
            <div style="margin: 12px 0; font-size: 20px; font-weight: 800; color: #111;">+50 ECOPOINTS</div>
            Số dư ví điểm hiện tại: <b>350 Điểm</b>
          </div>
          <div class="modal-actions">
            <button class="btn btn-black">Đến ví điểm của tôi</button>
            <button class="btn btn-white">Đóng</button>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_14_1",
    numBadge: "Ảnh 14.1",
    title: "Quản lý ví điểm thưởng cá nhân & Thẻ EcoPoints",
    member: "Huỳnh Anh Tú",
    role: "Công dân (Citizen)",
    activeNav: "Dashboard",
    badges: [
      { text: "VÍ ĐIỂM CÁ NHÂN", top: "-12px", left: "260px" },
      { text: "HẠNG THÀNH VIÊN", top: "70px", right: "30px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Ví Điểm Thưởng Công Dân Xanh</div>
          <div class="page-subtitle">Chức năng 14 (Ảnh 14.1) • Phụ trách: Huỳnh Anh Tú</div>
        </div>
        <button class="btn btn-black">Đổi quà ngay ➔</button>
      </div>

      <div class="grid-2">
        <div class="card-box" style="background: #111827; color: #fff; border-radius: 12px; padding: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af;">Thẻ thành viên sinh thái</div>
              <div style="font-size: 16px; font-weight: 800; margin-top: 4px;">NGUYỄN VĂN A</div>
            </div>
            <span class="tag" style="background: #fff; color: #111;">HẠNG VÀNG 🥇</span>
          </div>

          <div style="margin: 24px 0 10px 0;">
            <div style="font-size: 12px; color: #9ca3af;">Số dư điểm khả dụng:</div>
            <div style="font-size: 32px; font-weight: 900; letter-spacing: 1px;">350 <span style="font-size: 16px; font-weight: 500;">EcoPoints</span></div>
          </div>

          <div style="font-size: 11px; color: #9ca3af; border-top: 1px solid #374151; padding-top: 10px;">
            Mã định danh ví: <b>ECO-8892-HCM</b> • Đã đóng góp 7 báo cáo sạch
          </div>
        </div>

        <div class="card-box">
          <div class="card-title">Thống kê tích lũy cá nhân</div>
          <div style="font-size: 13px; line-height: 1.8;">
            <div>• Tổng điểm đã kiếm được: <b>550 Điểm</b></div>
            <div>• Điểm đã sử dụng đổi quà: <b>200 Điểm</b></div>
            <div>• Cần thêm: <b>150 Điểm</b> để thăng hạng <b>Bạch Kim</b></div>
            <div>• Tỷ lệ quy đổi: <b>1 EcoPoint = 1.000 VNĐ</b> ưu đãi</div>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_14_2",
    numBadge: "Ảnh 14.2",
    title: "Lịch sử biến động điểm xanh (Point Transactions Log)",
    member: "Huỳnh Anh Tú",
    role: "Công dân (Citizen)",
    activeNav: "Dashboard",
    badges: [
      { text: "LỊCH SỬ GIAO DỊCH", top: "-12px", right: "20px" },
      { text: "TRANSACTION LOG", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Lịch sử biến động điểm xanh</div>
          <div class="page-subtitle">Chức năng 14 (Ảnh 14.2) • Phụ trách: Huỳnh Anh Tú</div>
        </div>
      </div>

      <div class="card-box">
        <table class="wire-table">
          <tr><th>Thời gian</th><th>Loại hoạt động</th><th>Nội dung chi tiết</th><th>Biến động</th><th>Số dư cuối</th></tr>
          <tr>
            <td>29/09/2026 10:30</td>
            <td><span class="tag tag-dark">Cộng điểm</span></td>
            <td>Nghiệm thu dọn sạch bãi rác 53 Võ Văn Ngân</td>
            <td><b>+50</b></td>
            <td>350 Điểm</td>
          </tr>
          <tr>
            <td>25/09/2026 14:15</td>
            <td><span class="tag tag-gray">Đổi quà</span></td>
            <td>Đổi Voucher Highlands Coffee 30K (Mã: HL30K-99)</td>
            <td><b>-100</b></td>
            <td>300 Điểm</td>
          </tr>
          <tr>
            <td>20/09/2026 09:00</td>
            <td><span class="tag tag-dark">Cộng điểm</span></td>
            <td>Đem 10 viên pin cũ đến Trạm Tái Chế GreenHub</td>
            <td><b>+100</b></td>
            <td>400 Điểm</td>
          </tr>
        </table>
      </div>
    `
  },
  {
    id: "Anh_15_1",
    numBadge: "Ảnh 15.1",
    title: "Danh mục quà tặng xanh & Vật phẩm quy đổi (Gian hàng)",
    member: "Huỳnh Anh Tú",
    role: "Công dân (Citizen)",
    activeNav: "Dashboard",
    badges: [
      { text: "GIAN HÀNG QUÀ", top: "-12px", left: "260px" },
      { text: "GREEN REWARDS", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Gian Hàng Quà Tặng & Vật Phẩm Sinh Thái</div>
          <div class="page-subtitle">Chức năng 15 (Ảnh 15.1) • Phụ trách: Huỳnh Anh Tú</div>
        </div>
        <div style="font-weight: 700; font-size: 13px;">Ví của bạn: <b>350 Điểm</b></div>
      </div>

      <div class="grid-3">
        <div class="card-box" style="text-align: center;">
          <div style="font-size: 40px; margin-bottom: 6px;">🪴</div>
          <div style="font-weight: 800; font-size: 13px;">Cây sen đá để bàn</div>
          <div style="font-size: 11px; color: #6b7280; margin: 4px 0;">Cây cảnh mini thanh lọc không khí trong phòng</div>
          <div style="font-weight: 900; font-size: 14px; margin: 8px 0;">80 EcoPoints</div>
          <button class="btn btn-black btn-sm" style="width: 100%;">Đổi vật phẩm</button>
        </div>

        <div class="card-box" style="text-align: center;">
          <div style="font-size: 40px; margin-bottom: 6px;">🧴</div>
          <div style="font-weight: 800; font-size: 13px;">Bình nước giữ nhiệt Inox</div>
          <div style="font-size: 11px; color: #6b7280; margin: 4px 0;">Dung tích 500ml, giảm thiểu rác thải chai nhựa 1 lần</div>
          <div style="font-weight: 900; font-size: 14px; margin: 8px 0;">150 EcoPoints</div>
          <button class="btn btn-black btn-sm" style="width: 100%;">Đổi vật phẩm</button>
        </div>

        <div class="card-box" style="text-align: center;">
          <div style="font-size: 40px; margin-bottom: 6px;">☕</div>
          <div style="font-weight: 800; font-size: 13px;">Voucher Giảm 50.000đ</div>
          <div style="font-size: 11px; color: #6b7280; margin: 4px 0;">Áp dụng chuỗi cà phê xanh mang bình cá nhân</div>
          <div style="font-weight: 900; font-size: 14px; margin: 8px 0;">100 EcoPoints</div>
          <button class="btn btn-black btn-sm" style="width: 100%;">Đổi voucher</button>
        </div>
      </div>
    `
  },
  {
    id: "Anh_16_1",
    numBadge: "Ảnh 16.1",
    title: "Thực hiện đổi điểm lấy quà tặng / Voucher (Modal xác nhận)",
    member: "Huỳnh Anh Tú",
    role: "Công dân (Citizen)",
    activeNav: "Dashboard",
    badges: [
      { text: "XÁC NHẬN ĐỔI QUÀ", top: "-12px", right: "20px" },
      { text: "MODAL DIALOG", top: "90px", left: "420px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Xác nhận giao dịch đổi điểm thưởng</div>
          <div class="page-subtitle">Chức năng 16 (Ảnh 16.1) • Phụ trách: Huỳnh Anh Tú</div>
        </div>
      </div>

      <div class="card-box" style="position: relative;">
        <div class="modal-overlay">
          <div class="modal-title">Xác nhận đổi điểm</div>
          <div class="modal-text">
            Bạn có chắc chắn muốn dùng <b>100 EcoPoints</b> để đổi vật phẩm:<br>
            <b>[Voucher Giảm 50.000đ - Chuỗi Cà Phê Xanh]</b>?<br><br>
            Số dư ví sau khi đổi: <b>250 EcoPoints</b>
          </div>
          <div class="modal-actions">
            <button class="btn btn-black">Đồng ý đổi</button>
            <button class="btn btn-white">Hủy bỏ</button>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_16_2",
    numBadge: "Ảnh 16.2",
    title: "Thẻ mã QR Voucher ưu đãi được cấp để sử dụng tại quầy",
    member: "Huỳnh Anh Tú",
    role: "Công dân (Citizen)",
    activeNav: "Dashboard",
    badges: [
      { text: "QR VOUCHER PASS", top: "-12px", right: "20px" },
      { text: "SỬ DỤNG TẠI QUẦY", top: "70px", right: "30px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Mã Voucher Ưu Đãi Của Bạn</div>
          <div class="page-subtitle">Chức năng 16 (Ảnh 16.2) • Phụ trách: Huỳnh Anh Tú</div>
        </div>
      </div>

      <div class="card-box" style="width: 420px; margin: 0 auto; text-align: center; border-radius: 12px;">
        <span class="tag tag-dark">ĐỔI THÀNH CÔNG</span>
        <div style="font-weight: 800; font-size: 16px; margin: 10px 0 4px 0;">VOUCHER GIẢM 50.000 VNĐ</div>
        <div style="font-size: 12px; color: #4b5563;">Áp dụng tại 120 chi nhánh Cà Phê Xanh TP.HCM</div>

        <!-- QR Code Placeholder -->
        <div style="margin: 16px auto; width: 140px; height: 140px; border: 2px solid #222; padding: 8px; background: #fff; display: flex; flex-direction: column; justify-content: center; align-items: center;">
          <div style="font-family: monospace; font-size: 10px; font-weight: bold;">[QR CODE SCAN]</div>
          <div style="font-size: 18px; margin-top: 4px;">🏁🏁🏁</div>
        </div>

        <div style="font-size: 14px; font-weight: 800; letter-spacing: 2px; background: #e5e7eb; padding: 6px 12px; border-radius: 6px; display: inline-block;">
          ECO-50K-88992X
        </div>

        <div style="font-size: 11px; color: #6b7280; margin-top: 10px;">
          Hạn sử dụng: <b>31/12/2026</b> • Đưa mã này cho thu ngân khi thanh toán
        </div>
      </div>
    `
  },
  {
    id: "Anh_17_1",
    numBadge: "Ảnh 17.1",
    title: "Kho quản lý quà tặng & Voucher cá nhân đã đổi",
    member: "Huỳnh Anh Tú",
    role: "Công dân (Citizen)",
    activeNav: "Dashboard",
    badges: [
      { text: "KHO QUÀ CỦA TÔI", top: "-12px", left: "260px" },
      { text: "TRẠNG THÁI VOUCHER", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Kho Quà Tặng & Voucher Của Tôi</div>
          <div class="page-subtitle">Chức năng 17 (Ảnh 17.1) • Phụ trách: Huỳnh Anh Tú</div>
        </div>
        <div style="display: flex; gap: 6px;">
          <span class="tag tag-dark">Chưa sử dụng (2)</span>
          <span class="tag">Đã sử dụng (3)</span>
          <span class="tag">Hết hạn (0)</span>
        </div>
      </div>

      <div class="grid-2">
        <div class="card-box">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div style="font-weight: 800; font-size: 14px;">☕ Voucher Giảm 50.000đ Cà Phê Xanh</div>
            <span class="tag tag-dark">SẴN SÀNG</span>
          </div>
          <div style="font-size: 12px; color: #4b5563; margin: 6px 0;">Mã: <b>ECO-50K-88992X</b> • Hạn dùng: 31/12/2026</div>
          <button class="btn btn-black btn-sm">Mở mã QR dùng ngay</button>
        </div>

        <div class="card-box">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div style="font-weight: 800; font-size: 14px;">🪴 Cây sen đá để bàn</div>
            <span class="tag tag-gray">CHỜ NHẬN TRẠM</span>
          </div>
          <div style="font-size: 12px; color: #4b5563; margin: 6px 0;">Địa điểm nhận: Trạm GreenHub Thủ Đức (Hạn: 15/10/2026)</div>
          <button class="btn btn-white btn-sm">Xem phiếu nhận quà</button>
        </div>
      </div>
    `
  },
  {
    id: "Anh_18_1",
    numBadge: "Ảnh 18.1",
    title: "Bảng xếp hạng vinh danh Top Công dân Xanh (Leaderboard)",
    member: "Huỳnh Anh Tú",
    role: "Toàn bộ công dân",
    activeNav: "Dashboard",
    badges: [
      { text: "VINH DANH TOP 10", top: "-12px", right: "20px" },
      { text: "PODIUM RANKING", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Bảng Xếp Hạng Vinh Danh Công Dân Xanh (Tháng 09/2026)</div>
          <div class="page-subtitle">Chức năng 18 (Ảnh 18.1) • Phụ trách: Huỳnh Anh Tú</div>
        </div>
      </div>

      <!-- Podium Top 3 -->
      <div style="display: flex; justify-content: center; align-items: flex-end; gap: 16px; margin-bottom: 16px;">
        <!-- Top 2 -->
        <div style="width: 140px; text-align: center;">
          <div style="font-weight: 700; font-size: 12px;">Trần Thị B</div>
          <div style="font-size: 11px; color: #4b5563;">720 pts</div>
          <div style="height: 70px; background: #e5e7eb; border: 2px solid #222; border-radius: 6px 6px 0 0; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 20px;">2 🥈</div>
        </div>
        <!-- Top 1 -->
        <div style="width: 150px; text-align: center;">
          <div style="font-size: 20px;">👑</div>
          <div style="font-weight: 800; font-size: 13px;">Lê Văn C</div>
          <div style="font-size: 11px; color: #4b5563;">1,050 pts</div>
          <div style="height: 100px; background: #111; color: #fff; border: 2px solid #000; border-radius: 6px 6px 0 0; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 24px;">1 🥇</div>
        </div>
        <!-- Top 3 -->
        <div style="width: 140px; text-align: center;">
          <div style="font-weight: 700; font-size: 12px;">Nguyễn Văn A (Bạn)</div>
          <div style="font-size: 11px; color: #4b5563;">550 pts</div>
          <div style="height: 50px; background: #f3f4f6; border: 2px solid #222; border-radius: 6px 6px 0 0; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 18px;">3 🥉</div>
        </div>
      </div>

      <div class="card-box">
        <table class="wire-table">
          <tr><th>Hạng</th><th>Tên công dân</th><th>Số báo cáo đã xử lý</th><th>Tổng điểm EcoPoints</th><th>Huy hiệu</th></tr>
          <tr><td>4</td><td>Phạm Hoàng D</td><td>12 báo cáo</td><td>490 pts</td><td>Tích cực 🌟</td></tr>
          <tr><td>5</td><td>Vũ Thị E</td><td>9 báo cáo</td><td>380 pts</td><td>Tích cực 🌟</td></tr>
        </table>
      </div>
    `
  },
  {
    id: "Anh_19_1",
    numBadge: "Ảnh 19.1",
    title: "Giám sát mây mưa RainViewer Radar & Thanh phát lại thời gian thực",
    member: "Huỳnh Anh Tú",
    role: "Công dân / Điều hành",
    activeNav: "Bản đồ ô nhiễm",
    badges: [
      { text: "RAINVIEWER RADAR", top: "-12px", right: "20px" },
      { text: "TIME SCRUBBER", top: "240px", left: "260px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Radar thời tiết RainViewer thời gian thực</div>
          <div class="page-subtitle">Chức năng 19 (Ảnh 19.1) • Phụ trách: Huỳnh Anh Tú</div>
        </div>
      </div>

      <div class="card-box">
        <div class="map-box" style="height: 250px; position: relative;">
          <!-- Weather Radar Clouds -->
          <svg style="width: 100%; height: 100%;">
            <path d="M 150 120 Q 250 80 400 130 T 650 110" stroke="#cbd5e1" stroke-width="14" fill="none"/>
            <!-- Rain Radar Blobs -->
            <circle cx="280" cy="110" r="50" fill="rgba(34, 197, 94, 0.3)" stroke="#22c55e" stroke-width="1"/>
            <circle cx="320" cy="120" r="35" fill="rgba(234, 179, 8, 0.4)" stroke="#eab308" stroke-width="1"/>
            <circle cx="330" cy="125" r="18" fill="rgba(239, 68, 68, 0.6)" stroke="#ef4444" stroke-width="1.5"/>
          </svg>
          <div style="position: absolute; top: 12px; left: 16px; background: rgba(0,0,0,0.75); color: #fff; padding: 4px 10px; border-radius: 4px; font-size: 11px;">
            Vùng mưa lớn: Cường độ 45 mm/h tại Quận 2 và TP. Thủ Đức
          </div>
        </div>

        <!-- Time scrubber bar -->
        <div style="margin-top: 12px; display: flex; align-items: center; gap: 12px; border: 1.5px solid #222; border-radius: 6px; padding: 8px 14px;">
          <button class="btn btn-black btn-sm">▶ Play</button>
          <span style="font-size: 12px; font-weight: 700;">-60m</span>
          <input type="range" style="flex: 1; accent-color: #111;" value="75">
          <span style="font-size: 12px; font-weight: 700;">HIỆN TẠI (12:30)</span>
          <span style="font-size: 12px; color: #6b7280;">+30m (Dự báo)</span>
        </div>
      </div>
    `
  },
  {
    id: "Anh_20_1",
    numBadge: "Ảnh 20.1",
    title: "Mô phỏng động lực học luồng gió (Wind Streamlines)",
    member: "Huỳnh Anh Tú",
    role: "Chuyên gia / Quản lý",
    activeNav: "Bản đồ ô nhiễm",
    badges: [
      { text: "WIND STREAMLINES", top: "-12px", right: "20px" },
      { text: "BEAUFORT SCALE", top: "70px", right: "30px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Mô phỏng động lực học dòng gió & Phát tán mùi ô nhiễm</div>
          <div class="page-subtitle">Chức năng 20 (Ảnh 20.1) • Phụ trách: Huỳnh Anh Tú</div>
        </div>
      </div>

      <div class="card-box">
        <div class="map-box" style="height: 250px; background: #111827; position: relative;">
          <!-- SVG Wind Streamlines -->
          <svg style="width: 100%; height: 100%;">
            <path d="M 50 80 Q 200 60 400 120 T 800 90" stroke="#60a5fa" stroke-width="2" stroke-dasharray="8 6" fill="none"/>
            <path d="M 80 130 Q 230 110 430 170 T 830 140" stroke="#93c5fd" stroke-width="2" stroke-dasharray="10 6" fill="none"/>
            <path d="M 60 190 Q 210 170 410 230 T 810 200" stroke="#60a5fa" stroke-width="2" stroke-dasharray="6 4" fill="none"/>
          </svg>
          <div style="position: absolute; bottom: 12px; left: 16px; background: rgba(0,0,0,0.85); color: #fff; padding: 6px 12px; border-radius: 6px; font-size: 11px;">
            Hướng gió: <b>Tây Nam (220°)</b> • Vận tốc: <b>14.5 km/h</b> (Cấp 3 Beaufort - Gió nhẹ)
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_21_1",
    numBadge: "Ảnh 21.1",
    title: "Bộ lớp phủ khí tượng đa thông số (8 lớp phủ chuyên sâu)",
    member: "Huỳnh Anh Tú",
    role: "Chuyên gia / Điều hành",
    activeNav: "Bản đồ ô nhiễm",
    badges: [
      { text: "8 LỚP KHÍ TƯỢNG", top: "-12px", right: "20px" },
      { text: "OPENWEATHER RADAR", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Bộ lớp phủ khí tượng đa thông số chuyên sâu</div>
          <div class="page-subtitle">Chức năng 21 (Ảnh 21.1) • Phụ trách: Huỳnh Anh Tú</div>
        </div>
      </div>

      <div class="card-box">
        <div class="grid-4" style="margin-bottom: 12px;">
          <div style="border: 2px solid #111; padding: 10px; border-radius: 6px; background: #e5e7eb;">
            <b>[✓] 🌧️ Lượng mưa</b>
            <div style="font-size: 10px; color: #4b5563;">Radar mưa thời gian thực</div>
          </div>
          <div style="border: 1.5px solid #222; padding: 10px; border-radius: 6px;">
            <b>[ ] ☁️ Mây che phủ</b>
            <div style="font-size: 10px; color: #4b5563;">Mật độ mây vệ tinh</div>
          </div>
          <div style="border: 1.5px solid #222; padding: 10px; border-radius: 6px;">
            <b>[ ] 🌡️ Nhiệt độ bề mặt</b>
            <div style="font-size: 10px; color: #4b5563;">Đảo nhiệt đô thị 32°C</div>
          </div>
          <div style="border: 1.5px solid #222; padding: 10px; border-radius: 6px;">
            <b>[ ] 💨 Vận tốc gió</b>
            <div style="font-size: 10px; color: #4b5563;">Trường vector gió</div>
          </div>
          <div style="border: 1.5px solid #222; padding: 10px; border-radius: 6px;">
            <b>[ ] 🌀 Áp suất khí quyển</b>
            <div style="font-size: 10px; color: #4b5563;">Isobar khí áp 1012 hPa</div>
          </div>
          <div style="border: 1.5px solid #222; padding: 10px; border-radius: 6px;">
            <b>[ ] ⚡ Giông sét & Bão</b>
            <div style="font-size: 10px; color: #4b5563;">Cảnh báo sét đánh</div>
          </div>
          <div style="border: 1.5px solid #222; padding: 10px; border-radius: 6px;">
            <b>[ ] 🌫️ Bụi mịn PM2.5</b>
            <div style="font-size: 10px; color: #4b5563;">Nồng độ 42 µg/m³</div>
          </div>
          <div style="border: 1.5px solid #222; padding: 10px; border-radius: 6px;">
            <b>[ ] ☀️ Chỉ số tia UV</b>
            <div style="font-size: 10px; color: #4b5563;">UV Index = 8 (Rất cao)</div>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_22_1",
    numBadge: "Ảnh 22.1",
    title: "Đánh giá mức độ hài lòng (1-5 sao) sau khi dọn sạch",
    member: "Huỳnh Anh Tú",
    role: "Công dân (Citizen)",
    activeNav: "Dashboard",
    badges: [
      { text: "KHẢO SÁT HÀI LÒNG", top: "-12px", right: "20px" },
      { text: "CHẤM SAO 1-5 ⭐", top: "110px", left: "430px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Khảo sát & Đánh giá kết quả xử lý hiện trường</div>
          <div class="page-subtitle">Chức năng 22 (Ảnh 22.1) • Phụ trách: Huỳnh Anh Tú</div>
        </div>
      </div>

      <div class="card-box" style="position: relative;">
        <div class="modal-overlay">
          <div class="modal-title">ĐÁNH GIÁ CHẤT LƯỢNG XỬ LÝ</div>
          <div class="modal-text">
            Khu vực bãi rác phản ánh tại <b>53 Võ Văn Ngân</b> đã được dọn xong.<br>
            Bạn có hài lòng với tốc độ và độ sạch sẽ không?
            <div style="font-size: 28px; margin: 12px 0;">⭐⭐⭐⭐⭐</div>
            <textarea class="form-input" style="width: 100%; height: 60px;" placeholder="Nhập thêm nhận xét (ví dụ: Đội dọn rất nhanh, đã xịt nước khử mùi sạch sẽ)..."></textarea>
          </div>
          <div class="modal-actions">
            <button class="btn btn-black">Gửi đánh giá (+10 điểm)</button>
            <button class="btn btn-white">Bỏ qua</button>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_23_1",
    numBadge: "Ảnh 23.1",
    title: "Bản đồ nhiệt môi trường nội suy không gian (Heatmap)",
    member: "Huỳnh Anh Tú",
    role: "Quản trị / Công dân",
    activeNav: "Bản đồ ô nhiễm",
    badges: [
      { text: "BẢN ĐỒ NHIỆT", top: "-12px", right: "20px" },
      { text: "HEATMAP INTERPOLATION", top: "60px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Bản đồ nhiệt mật độ ô nhiễm môi trường nội suy</div>
          <div class="page-subtitle">Chức năng 23 (Ảnh 23.1) • Phụ trách: Huỳnh Anh Tú</div>
        </div>
      </div>

      <div class="card-box">
        <div class="map-box" style="height: 260px; position: relative;">
          <!-- SVG Heatmap Gradients -->
          <svg style="width: 100%; height: 100%;">
            <circle cx="300" cy="120" r="80" fill="rgba(239, 68, 68, 0.45)"/>
            <circle cx="300" cy="120" r="40" fill="rgba(239, 68, 68, 0.75)"/>
            <circle cx="500" cy="180" r="70" fill="rgba(249, 115, 22, 0.4)"/>
            <circle cx="650" cy="100" r="60" fill="rgba(234, 179, 8, 0.4)"/>
          </svg>
          <div style="position: absolute; bottom: 12px; left: 16px; background: rgba(255,255,255,0.9); border: 1.5px solid #222; padding: 6px 12px; border-radius: 6px; font-size: 11px;">
            Thang mật độ: [Thưa thớt: Vàng] ➔ [Dày đặc: Đỏ đậm] • Điểm nóng nhất: Ngã tư Thủ Đức
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_24_1",
    numBadge: "Ảnh 24.1",
    title: "Cẩm nang hướng dẫn phân loại rác thải tại nguồn",
    member: "Huỳnh Anh Tú",
    role: "Công dân (Citizen)",
    activeNav: "Dashboard",
    badges: [
      { text: "CẨM NANG PHÂN LOẠI", top: "-12px", left: "260px" },
      { text: "HƯỚNG DẪN 3 THÙNG", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Cẩm Nang Hướng Dẫn Phân Loại Rác Tại Nguồn</div>
          <div class="page-subtitle">Chức năng 24 (Ảnh 24.1) • Phụ trách: Huỳnh Anh Tú</div>
        </div>
      </div>

      <div class="grid-3">
        <div class="card-box" style="border-top: 4px solid #16a34a;">
          <div style="font-weight: 800; font-size: 14px;">🟢 1. Rác Hữu Cơ</div>
          <div style="font-size: 12px; color: #4b5563; margin: 8px 0; line-height: 1.5;">
            Thức ăn thừa, rau củ quả, vỏ trái cây, bã trà, lá cây rụng.<br>
            ➔ Đựng thùng màu xanh lá, dùng làm phân compost.
          </div>
        </div>
        <div class="card-box" style="border-top: 4px solid #2563eb;">
          <div style="font-weight: 800; font-size: 14px;">🔵 2. Rác Tái Chế</div>
          <div style="font-size: 12px; color: #4b5563; margin: 8px 0; line-height: 1.5;">
            Vỏ lon nhôm, chai nhựa PET, thùng bìa carton, giấy báo cũ.<br>
            ➔ Đựng thùng màu xanh dương, rửa sạch trước khi bỏ.
          </div>
        </div>
        <div class="card-box" style="border-top: 4px solid #6b7280;">
          <div style="font-weight: 800; font-size: 14px;">⚪ 3. Rác Còn Lại</div>
          <div style="font-size: 12px; color: #4b5563; margin: 8px 0; line-height: 1.5;">
            Túi bóng bẩn, hộp xốp dính dầu, tã lót, gốm sứ vỡ.<br>
            ➔ Đựng thùng màu xám/đen để mang đi chôn lấp/đốt phát điện.
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_24_2",
    numBadge: "Ảnh 24.2",
    title: "Trợ lý AI RAG tư vấn Sống xanh & Xử lý rác trực tuyến",
    member: "Huỳnh Anh Tú",
    role: "Công dân (Citizen)",
    activeNav: "Dashboard",
    badges: [
      { text: "AI CHATBOT RAG", top: "-12px", right: "20px" },
      { text: "HỎI ĐÁP THÔNG MINH", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Trợ Lý AI RAG Tư Vấn Phân Loại Rác</div>
          <div class="page-subtitle">Chức năng 24 (Ảnh 24.2) • Phụ trách: Huỳnh Anh Tú</div>
        </div>
      </div>

      <div class="card-box" style="display: flex; flex-direction: column; gap: 12px;">
        <!-- User Chat -->
        <div style="align-self: flex-end; background: #111; color: #fff; padding: 10px 14px; border-radius: 12px 12px 0 12px; max-width: 70%; font-size: 13px;">
          Pin tiểu đồ chơi trẻ em đã hết thì vứt vào thùng nào vậy bot?
        </div>

        <!-- Bot Chat -->
        <div style="align-self: flex-start; background: #f3f4f6; border: 1.5px solid #222; padding: 12px 16px; border-radius: 12px 12px 12px 0; max-width: 80%; font-size: 13px; line-height: 1.5;">
          <b>🤖 GreenBot:</b> Pin cũ thuộc nhóm <b>Chất thải nguy hại</b> vì chứa chì và thủy ngân, tuyệt đối <b>KHÔNG</b> vứt vào thùng rác thông thường!<br><br>
          Bạn hãy bọc băng keo 2 đầu cực và mang đến <b>Trạm GreenHub Thủ Đức (12 Hàn Thuyên)</b> để thu gom an toàn và nhận ngay <b>+20 EcoPoints</b> nhé!
        </div>

        <div style="display: flex; gap: 8px; margin-top: 10px;">
          <input type="text" class="form-input" style="flex: 1;" placeholder="Nhập câu hỏi về rác hoặc lối sống xanh...">
          <button class="btn btn-black">Gửi câu hỏi</button>
        </div>
      </div>
    `
  }
];
