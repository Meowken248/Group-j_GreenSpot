// screens_quan.js - Wireframe screens for Bùi Nguyễn Minh Quân (Chức năng 25 - 36)

module.exports = [
  {
    id: "Anh_25_1",
    numBadge: "Ảnh 25.1",
    title: "Cổng xác thực tập trung - Màn hình Đăng nhập & JWT",
    member: "Bùi Nguyễn Minh Quân",
    role: "Quản trị / Mọi đối tượng",
    activeNav: "Xác thực",
    badges: [
      { text: "CỔNG XÁC THỰC", top: "-12px", right: "20px" },
      { text: "JWT SECURE LOGIN", top: "70px", right: "30px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Cổng Đăng Nhập Hệ Thống Quản Trị Môi Trường</div>
          <div class="page-subtitle">Chức năng 25 (Ảnh 25.1) • Phụ trách: Bùi Nguyễn Minh Quân</div>
        </div>
      </div>

      <div class="card-box" style="width: 440px; margin: 0 auto; padding: 24px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <div class="logo-box" style="display: inline-block; font-size: 16px; margin-bottom: 8px;">ECOREPORT</div>
          <div style="font-size: 13px; color: #4b5563;">Đăng nhập để truy cập phân hệ tác nghiệp WebGIS</div>
        </div>

        <div class="form-group">
          <label class="form-label">Tên đăng nhập hoặc Email cán bộ:</label>
          <input type="text" class="form-input" value="quan.officer@tphcm.gov.vn">
        </div>

        <div class="form-group">
          <label class="form-label">Mật khẩu:</label>
          <input type="password" class="form-input" value="••••••••••••">
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin: 12px 0 16px 0; font-size: 12px;">
          <label><input type="checkbox" checked> Ghi nhớ phiên đăng nhập (JWT Refresh)</label>
          <a href="#" style="color: #111; font-weight: 700;">Quên mật khẩu?</a>
        </div>

        <button class="btn btn-black" style="width: 100%; padding: 10px;">ĐĂNG NHẬP VÀO HỆ THỐNG</button>
      </div>
    `
  },
  {
    id: "Anh_25_2",
    numBadge: "Ảnh 25.2",
    title: "Cổng xác thực tập trung - Màn hình Đăng ký tài khoản công dân",
    member: "Bùi Nguyễn Minh Quân",
    role: "Công dân mới",
    activeNav: "Xác thực",
    badges: [
      { text: "ĐĂNG KÝ TÀI KHOẢN", top: "-12px", right: "20px" },
      { text: "OTP VERIFICATION", top: "70px", right: "30px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Đăng Ký Tài Khoản Công Dân Xanh</div>
          <div class="page-subtitle">Chức năng 25 (Ảnh 25.2) • Phụ trách: Bùi Nguyễn Minh Quân</div>
        </div>
      </div>

      <div class="card-box" style="width: 440px; margin: 0 auto; padding: 20px;">
        <div class="form-group">
          <label class="form-label">Họ và tên công dân:</label>
          <input type="text" class="form-input" value="Nguyễn Văn A">
        </div>
        <div class="form-group">
          <label class="form-label">Số điện thoại tiếp nhận OTP:</label>
          <input type="text" class="form-input" value="0908 123 456">
        </div>
        <div class="form-group">
          <label class="form-label">Khu vực sinh sống:</label>
          <select class="form-select" style="width: 100%;">
            <option>P. Linh Chiểu, TP. Thủ Đức</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Mật khẩu:</label>
          <input type="password" class="form-input" value="••••••••">
        </div>
        <button class="btn btn-black" style="width: 100%; padding: 10px; margin-top: 10px;">TIẾP TỤC & NHẬN MÃ OTP</button>
      </div>
    `
  },
  {
    id: "Anh_26_1",
    numBadge: "Ảnh 26.1",
    title: "Quản trị người dùng & Ma trận phân quyền động RBAC",
    member: "Bùi Nguyễn Minh Quân",
    role: "Quản trị viên cấp cao (Admin)",
    activeNav: "Quản trị hệ thống",
    badges: [
      { text: "RBAC MATRIX", top: "-12px", right: "20px" },
      { text: "4 CẤP VAI TRÒ", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Ma Trận Phân Quyền Vai Trò Người Dùng (RBAC)</div>
          <div class="page-subtitle">Chức năng 26 (Ảnh 26.1) • Phụ trách: Bùi Nguyễn Minh Quân</div>
        </div>
        <button class="btn btn-black btn-sm">+ Thêm vai trò mới</button>
      </div>

      <div class="card-box">
        <table class="wire-table">
          <tr>
            <th>Module Chức Năng</th>
            <th>Citizen (Công dân)</th>
            <th>Operator (Điều hành)</th>
            <th>Officer (Cán bộ quận)</th>
            <th>Admin (Toàn quyền)</th>
          </tr>
          <tr>
            <td>Gửi báo cáo sự cố & Ảnh EXIF</td>
            <td><b>✓ Đầy đủ</b></td>
            <td><b>✓ Đầy đủ</b></td>
            <td><b>✓ Đầy đủ</b></td>
            <td><b>✓ Đầy đủ</b></td>
          </tr>
          <tr>
            <td>Phân công đội xe thu gom</td>
            <td>— Không có</td>
            <td><b>✓ Đầy đủ</b></td>
            <td><b>✓ Đầy đủ</b></td>
            <td><b>✓ Đầy đủ</b></td>
          </tr>
          <tr>
            <td>Nghiệm thu Before / After</td>
            <td>— Không có</td>
            <td><b>✓ Đầy đủ</b></td>
            <td><b>✓ Đầy đủ</b></td>
            <td><b>✓ Đầy đủ</b></td>
          </tr>
          <tr>
            <td>Chuyển cấp thẩm quyền Sở TN&MT</td>
            <td>— Không có</td>
            <td>— Chỉ xem</td>
            <td><b>✓ Đầy đủ</b></td>
            <td><b>✓ Đầy đủ</b></td>
          </tr>
          <tr>
            <td>Cấu hình tham số & Xem Audit Log</td>
            <td>— Không có</td>
            <td>— Không có</td>
            <td>— Không có</td>
            <td><b>✓ Đầy đủ</b></td>
          </tr>
        </table>
      </div>
    `
  },
  {
    id: "Anh_27_1",
    numBadge: "Ảnh 27.1",
    title: "Quản lý năng lực đội xe thu gom rác & Tài xế hiện trường",
    member: "Bùi Nguyễn Minh Quân",
    role: "Điều hành tác nghiệp",
    activeNav: "Đội xe thu gom",
    badges: [
      { text: "QUẢN LÝ ĐỘI XE", top: "-12px", right: "20px" },
      { text: "FLEET CAPACITY", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Đội Ngũ Xe Thu Gom & Năng Lực Tác Nghiệp Hiện Trường</div>
          <div class="page-subtitle">Chức năng 27 (Ảnh 27.1) • Phụ trách: Bùi Nguyễn Minh Quân</div>
        </div>
        <button class="btn btn-black btn-sm">+ Thêm phương tiện</button>
      </div>

      <div class="card-box">
        <table class="wire-table">
          <tr><th>Biển số xe</th><th>Loại xe & Tải trọng</th><th>Tài xế phụ trách</th><th>Trạng thái</th><th>Vị trí GPS hiện tại</th><th>Thao tác</th></tr>
          <tr>
            <td>51D-892.11</td>
            <td>Xe ép rác 5 tấn</td>
            <td>Trần Văn Hùng (0912...)</td>
            <td><span class="tag tag-dark">Đang thu gom</span></td>
            <td>10.8521° N, 106.7732° E</td>
            <td><button class="btn btn-white btn-sm">Điều phối</button></td>
          </tr>
          <tr>
            <td>51D-451.90</td>
            <td>Xe cẩu xà bần 8 tấn</td>
            <td>Lê Minh Tuấn (0988...)</td>
            <td><span class="tag">Chờ lệnh</span></td>
            <td>Bãi xe Trung tâm Thủ Đức</td>
            <td><button class="btn btn-black btn-sm">Giao việc</button></td>
          </tr>
          <tr>
            <td>50M-120.33</td>
            <td>Xe ba gác điện ngõ hẹp</td>
            <td>Phạm Quốc Bảo (0903...)</td>
            <td><span class="tag tag-dark">Đang thu gom</span></td>
            <td>Hẻm 48 Võ Văn Ngân</td>
            <td><button class="btn btn-white btn-sm">Điều phối</button></td>
          </tr>
        </table>
      </div>
    `
  },
  {
    id: "Anh_28_1",
    numBadge: "Ảnh 28.1",
    title: "Nhật ký kiểm toán an ninh Audit Log và truy vết dữ liệu",
    member: "Bùi Nguyễn Minh Quân",
    role: "Quản trị viên (Admin)",
    activeNav: "Quản trị hệ thống",
    badges: [
      { text: "AUDIT LOG", top: "-12px", right: "20px" },
      { text: "SECURITY TRAIL", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Nhật Ký Kiểm Toán Hoạt Động Hệ Thống (Audit Trail)</div>
          <div class="page-subtitle">Chức năng 28 (Ảnh 28.1) • Phụ trách: Bùi Nguyễn Minh Quân</div>
        </div>
        <button class="btn btn-white btn-sm">Xuất file CSV log</button>
      </div>

      <div class="card-box">
        <table class="wire-table">
          <tr><th>Mốc thời gian</th><th>Người thực hiện</th><th>Vai trò</th><th>Hành động (Action)</th><th>Bản ghi tác động</th><th>IP Client</th></tr>
          <tr>
            <td>29/09/2026 11:05:12</td>
            <td>quan.admin</td>
            <td>Admin</td>
            <td><span class="tag tag-dark">APPROVE</span></td>
            <td>Nghiệm thu sự cố #RPT-8921 (Sạch)</td>
            <td>115.78.220.12</td>
          </tr>
          <tr>
            <td>29/09/2026 10:45:00</td>
            <td>tuan.operator</td>
            <td>Operator</td>
            <td><span class="tag">DISPATCH</span></td>
            <td>Giao xe 51D-892.11 dọn bãi rác #RPT-8921</td>
            <td>14.161.35.80</td>
          </tr>
          <tr>
            <td>29/09/2026 10:15:32</td>
            <td>nguyenvana</td>
            <td>Citizen</td>
            <td><span class="tag tag-gray">CREATE</span></td>
            <td>Tạo báo cáo bãi rác 53 Võ Văn Ngân</td>
            <td>27.72.105.14</td>
          </tr>
        </table>
      </div>
    `
  },
  {
    id: "Anh_29_1",
    numBadge: "Ảnh 29.1",
    title: "Trung tâm điều phối tác nghiệp & Danh sách sự cố tồn đọng",
    member: "Bùi Nguyễn Minh Quân",
    role: "Điều hành tác nghiệp",
    activeNav: "Điều phối tác nghiệp",
    badges: [
      { text: "TRUNG TÂM ĐIỀU PHỐI", top: "-12px", right: "20px" },
      { text: "SỰ CỐ TỒN ĐỌNG", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Trung Tâm Điều Phối & Phân Công Lệnh Xử Lý Hiện Trường</div>
          <div class="page-subtitle">Chức năng 29 (Ảnh 29.1) • Phụ trách: Bùi Nguyễn Minh Quân</div>
        </div>
      </div>

      <div class="card-box">
        <table class="wire-table">
          <tr><th>Mã phản ánh</th><th>Địa điểm</th><th>Loại rác</th><th>Mức khẩn cấp</th><th>Thời gian báo</th><th>Tác vụ</th></tr>
          <tr>
            <td><b>#RPT-8921</b></td>
            <td>53 Võ Văn Ngân, Thủ Đức</td>
            <td>Rác sinh hoạt bốc mùi</td>
            <td><span class="tag tag-dark">Cấp 3 - Cao</span></td>
            <td>10:15 (25 phút trước)</td>
            <td><button class="btn btn-black btn-sm">Điều phối xe ngay</button></td>
          </tr>
          <tr>
            <td><b>#RPT-8920</b></td>
            <td>120 Lê Văn Chí, Linh Trung</td>
            <td>Đổ trộm xà bần xây dựng</td>
            <td><span class="tag">Cấp 2 - Vừa</span></td>
            <td>09:30 (1 giờ trước)</td>
            <td><button class="btn btn-white btn-sm">Giao việc</button></td>
          </tr>
        </table>
      </div>
    `
  },
  {
    id: "Anh_29_2",
    numBadge: "Ảnh 29.2",
    title: "Modal phân công lệnh xử lý hiện trường cho tài xế",
    member: "Bùi Nguyễn Minh Quân",
    role: "Điều hành tác nghiệp",
    activeNav: "Điều phối tác nghiệp",
    badges: [
      { text: "LỆNH ĐIỀU PHỐI", top: "-12px", right: "20px" },
      { text: "MODAL GIAO VIỆC", top: "80px", left: "420px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Lập Lệnh Điều Động Đội Xe Hiện Trường</div>
          <div class="page-subtitle">Chức năng 29 (Ảnh 29.2) • Phụ trách: Bùi Nguyễn Minh Quân</div>
        </div>
      </div>

      <div class="card-box" style="position: relative;">
        <div class="modal-overlay" style="width: 480px;">
          <div class="modal-title">GIAO VIỆC XỬ LÝ SỰ CỐ #RPT-8921</div>
          <div style="text-align: left; font-size: 12px; margin-bottom: 12px;">
            <div class="form-group">
              <label class="form-label">Chọn phương tiện & Đội xử lý:</label>
              <select class="form-select" style="width: 100%;">
                <option>Xe 51D-892.11 (Xe ép rác 5T - Tài xế: Trần Văn Hùng)</option>
                <option>Xe 50M-120.33 (Xe ba gác điện - Tài xế: Phạm Quốc Bảo)</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Thời hạn hoàn tất cam kết (SLA Deadline):</label>
              <input type="text" class="form-input" value="14:00 ngày 29/09/2026 (Trong 3.5 giờ)">
            </div>
            <div class="form-group">
              <label class="form-label">Chỉ đạo nghiệp vụ đặc biệt:</label>
              <input type="text" class="form-input" value="Khu vực hẹp, cho xe ba gác vào gom trước, xịt khử khuẩn sau gom.">
            </div>
          </div>
          <div class="modal-actions">
            <button class="btn btn-black">Phát lệnh điều động xe</button>
            <button class="btn btn-white">Hủy</button>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_30_1",
    numBadge: "Ảnh 30.1",
    title: "Thẩm định chất lượng xử lý & Nghiệm thu Trước/Sau (Before/After)",
    member: "Bùi Nguyễn Minh Quân",
    role: "Cán bộ thẩm định / Officer",
    activeNav: "Nghiệm thu",
    badges: [
      { text: "BEFORE / AFTER", top: "-12px", right: "20px" },
      { text: "NGHIỆM THU HIỆN TRƯỜNG", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Thẩm Định Chất Lượng & Phê Duyệt Nghiệm Thu Hoàn Thành</div>
          <div class="page-subtitle">Chức năng 30 (Ảnh 30.1) • Phụ trách: Bùi Nguyễn Minh Quân</div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-black">✓ PHÊ DUYỆT NGHIỆM THU</button>
          <button class="btn btn-white">✕ YÊU CẦU DỌN LẠI</button>
        </div>
      </div>

      <div class="grid-2">
        <div class="card-box" style="text-align: center;">
          <div style="font-weight: 800; font-size: 13px; margin-bottom: 8px; color: #dc2626;">[ẢNH TRƯỚC DỌN - 10:15]</div>
          <div style="height: 180px; background: #e5e7eb; border: 1.5px solid #222; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 12px;">
            Ảnh hiện trường ngập rác sinh hoạt, bốc mùi hôi
          </div>
        </div>

        <div class="card-box" style="text-align: center;">
          <div style="font-weight: 800; font-size: 13px; margin-bottom: 8px; color: #16a34a;">[ẢNH SAU DỌN SẠCH - 11:30]</div>
          <div style="height: 180px; background: #f3f4f6; border: 2px solid #16a34a; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold;">
            Vỉa hè đã quét sạch bóng, đặt biển cấm xả rác
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_31_1",
    numBadge: "Ảnh 31.1",
    title: "Phân cấp quản lý 3 cấp & Chuyển tiếp hồ sơ thẩm quyền",
    member: "Bùi Nguyễn Minh Quân",
    role: "Cán bộ quản lý",
    activeNav: "Điều phối tác nghiệp",
    badges: [
      { text: "PHÂN CẤP 3 CẤP", top: "-12px", right: "20px" },
      { text: "CHUYỂN HỒ SƠ", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Quy Trình Chuyển Cấp Thẩm Quyền Xử Lý Sự Cố 3 Cấp</div>
          <div class="page-subtitle">Chức năng 31 (Ảnh 31.1) • Phụ trách: Bùi Nguyễn Minh Quân</div>
        </div>
      </div>

      <div class="card-box">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div style="text-align: center; flex: 1;">
            <div style="font-weight: 800; font-size: 13px;">CẤP 1: PHƯỜNG / XÃ</div>
            <span class="tag tag-gray">Xử lý rác vặt</span>
          </div>
          <div style="font-size: 20px;">➔</div>
          <div style="text-align: center; flex: 1;">
            <div style="font-weight: 800; font-size: 13px; color: #2563eb;">CẤP 2: TP. THỦ ĐỨC (HIỆN TẠI)</div>
            <span class="tag tag-dark">Quy mô lớn</span>
          </div>
          <div style="font-size: 20px;">➔</div>
          <div style="text-align: center; flex: 1;">
            <div style="font-weight: 800; font-size: 13px;">CẤP 3: SỞ TÀI NGUYÊN & MÔI TRƯỜNG</div>
            <span class="tag tag-gray">Sự cố khẩn cấp cấp TP</span>
          </div>
        </div>

        <div style="border-top: 1px solid #e5e7eb; padding-top: 12px;">
          <div class="form-group">
            <label class="form-label">Lý do chuyển tiếp lên Sở TN&MT TP.HCM:</label>
            <input type="text" class="form-input" value="Phát hiện chất thải lỏng có dấu hiệu chứa kim loại nặng độc hại, vượt thẩm quyền quận.">
          </div>
          <button class="btn btn-black">Ký số & Chuyển tiếp hồ sơ lên cấp Thành phố</button>
        </div>
      </div>
    `
  },
  {
    id: "Anh_32_1",
    numBadge: "Ảnh 32.1",
    title: "Giám sát hạn mức SLA thời gian thực & Cảnh báo trễ hạn",
    member: "Bùi Nguyễn Minh Quân",
    role: "Giám sát viên",
    activeNav: "Điều phối tác nghiệp",
    badges: [
      { text: "SLA MONITORING", top: "-12px", right: "20px" },
      { text: "OVERDUE ALERT", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Giám Sát Thời Gian Cam Kết Xử Lý (SLA Real-time Dashboard)</div>
          <div class="page-subtitle">Chức năng 32 (Ảnh 32.1) • Phụ trách: Bùi Nguyễn Minh Quân</div>
        </div>
      </div>

      <div class="card-box">
        <table class="wire-table">
          <tr><th>Mã hồ sơ</th><th>Mức độ</th><th>Thời hạn quy định</th><th>Thời gian còn lại</th><th>Tiến độ SLA</th><th>Cảnh báo</th></tr>
          <tr>
            <td>#RPT-8921</td>
            <td>Cấp 3 - Cao</td>
            <td>12 giờ</td>
            <td><b>còn 02h:15m</b></td>
            <td>
              <div style="width: 100px; height: 10px; background: #e5e7eb; border-radius: 5px; overflow: hidden;">
                <div style="width: 75%; height: 100%; background: #111;"></div>
              </div>
            </td>
            <td><span class="tag">Trong hạn</span></td>
          </tr>
          <tr>
            <td>#RPT-8890</td>
            <td>Cấp 4 - Khẩn cấp</td>
            <td>02 giờ</td>
            <td><b style="color: #dc2626;">Quá hạn 45 phút</b></td>
            <td>
              <div style="width: 100px; height: 10px; background: #dc2626; border-radius: 5px;"></div>
            </td>
            <td><span class="tag tag-dark" style="background: #dc2626;">🚨 VI PHẠM SLA</span></td>
          </tr>
        </table>
      </div>
    `
  },
  {
    id: "Anh_33_1",
    numBadge: "Ảnh 33.1",
    title: "Giám sát mạng lưới trạm cảm biến viễn trắc IoT đô thị",
    member: "Bùi Nguyễn Minh Quân",
    role: "Kỹ sư vận hành",
    activeNav: "Mạng lưới IoT",
    badges: [
      { text: "MẠNG LƯỚI IOT", top: "-12px", right: "20px" },
      { text: "TELEMETRY SENSORS", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Mạng Lưới Trạm Cảm Biến Môi Trường Viễn Trắc IoT</div>
          <div class="page-subtitle">Chức năng 33 (Ảnh 33.1) • Phụ trách: Bùi Nguyễn Minh Quân</div>
        </div>
      </div>

      <div class="grid-3">
        <div class="card-box">
          <div style="display: flex; justify-content: space-between;">
            <b>📡 Trạm Cảm Biến IoT #01</b>
            <span class="tag tag-dark">ONLINE</span>
          </div>
          <div style="font-size: 11px; color: #6b7280; margin: 4px 0;">Vị trí: Cống Rạch Ngang, Linh Trung</div>
          <div style="margin: 8px 0; font-size: 12px; line-height: 1.6;">
            <div>• Mực nước: <b>+1.42 m</b> (Dưới ngưỡng)</div>
            <div>• Pin năng lượng: <b>92%</b> 🔋</div>
            <div>• Tín hiệu 4G/LTE: <b>Mạnh (-65 dBm)</b></div>
          </div>
        </div>

        <div class="card-box">
          <div style="display: flex; justify-content: space-between;">
            <b>📡 Trạm Cảm Biến IoT #02</b>
            <span class="tag tag-dark">ONLINE</span>
          </div>
          <div style="font-size: 11px; color: #6b7280; margin: 4px 0;">Vị trí: Ngã 4 Bình Thái</div>
          <div style="margin: 8px 0; font-size: 12px; line-height: 1.6;">
            <div>• Mực nước: <b>+1.65 m</b> (Cảnh giác)</div>
            <div>• Pin năng lượng: <b>85%</b> 🔋</div>
            <div>• Tín hiệu 4G/LTE: <b>Mạnh (-70 dBm)</b></div>
          </div>
        </div>

        <div class="card-box">
          <div style="display: flex; justify-content: space-between;">
            <b>📡 Trạm Cảm Biến IoT #03</b>
            <span class="tag tag-gray">OFFLINE</span>
          </div>
          <div style="font-size: 11px; color: #6b7280; margin: 4px 0;">Vị trí: Kênh Ba Bò</div>
          <div style="margin: 8px 0; font-size: 12px; line-height: 1.6;">
            <div>• Mực nước: <i>Mất tín hiệu</i></div>
            <div>• Pin năng lượng: <b>12% (Yếu)</b></div>
            <div>• Cảnh báo: Cần bảo trì acquy</div>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_34_1",
    numBadge: "Ảnh 34.1",
    title: "Tự động hóa kết xuất báo cáo thống kê định kỳ PDF/Excel",
    member: "Bùi Nguyễn Minh Quân",
    role: "Quản trị / Báo cáo",
    activeNav: "Báo cáo thống kê",
    badges: [
      { text: "XUẤT BÁO CÁO", top: "-12px", right: "20px" },
      { text: "EXPORT PDF / EXCEL", top: "70px", right: "30px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Kết Xuất Báo Cáo Định Kỳ Hiện Trạng Môi Trường</div>
          <div class="page-subtitle">Chức năng 34 (Ảnh 34.1) • Phụ trách: Bùi Nguyễn Minh Quân</div>
        </div>
      </div>

      <div class="card-box" style="width: 480px; margin: 0 auto; padding: 20px;">
        <div class="form-group">
          <label class="form-label">Kỳ báo cáo:</label>
          <select class="form-select" style="width: 100%;">
            <option>Tháng 09/2026 (Từ 01/09 đến 30/09/2026)</option>
            <option>Quý III / 2026</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Phạm vi địa bàn:</label>
          <select class="form-select" style="width: 100%;">
            <option>Toàn địa bàn TP. Thủ Đức (34 Phường)</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Dữ liệu cần xuất:</label>
          <div style="font-size: 12px; line-height: 1.6;">
            <label><input type="checkbox" checked> Danh sách 128 điểm rác đã dọn sạch</label><br>
            <label><input type="checkbox" checked> Biểu đồ tỷ lệ tuân thủ cam kết SLA</label><br>
            <label><input type="checkbox" checked> Thống kê số lượng EcoPoints đã cấp</label>
          </div>
        </div>

        <div style="display: flex; gap: 10px; margin-top: 14px;">
          <button class="btn btn-black" style="flex: 1;">📄 Xuất file PDF Báo cáo</button>
          <button class="btn btn-white" style="flex: 1;">📊 Xuất file Excel (XLSX)</button>
        </div>
      </div>
    `
  },
  {
    id: "Anh_35_1",
    numBadge: "Ảnh 35.1",
    title: "Quản lý tuyến lộ trình xe gom rác cố định và trạm dừng checkpoints",
    member: "Bùi Nguyễn Minh Quân",
    role: "Điều hành đội xe",
    activeNav: "Đội xe thu gom",
    badges: [
      { text: "LỘ TRÌNH THU GOM", top: "-12px", right: "20px" },
      { text: "CHECKPOINTS", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Quản Lý Tuyến Lộ Trình Xe Gom Rác Cố Định</div>
          <div class="page-subtitle">Chức năng 35 (Ảnh 35.1) • Phụ trách: Bùi Nguyễn Minh Quân</div>
        </div>
      </div>

      <div class="card-box">
        <div class="map-box" style="height: 250px; position: relative;">
          <!-- SVG Route Line with checkpoints -->
          <svg style="width: 100%; height: 100%;">
            <path d="M 100 180 L 250 80 L 480 120 L 720 70" stroke="#111" stroke-width="4" stroke-dasharray="4 2" fill="none"/>
            <!-- Checkpoint 1 -->
            <circle cx="100" cy="180" r="10" fill="#111"/>
            <text x="100" y="210" font-size="11" font-weight="bold" text-anchor="middle">Điểm 1 (05:00)</text>
            <!-- Checkpoint 2 -->
            <circle cx="250" cy="80" r="10" fill="#111"/>
            <text x="250" y="60" font-size="11" font-weight="bold" text-anchor="middle">Điểm 2 (05:45)</text>
            <!-- Checkpoint 3 -->
            <circle cx="480" cy="120" r="10" fill="#111"/>
            <text x="480" y="150" font-size="11" font-weight="bold" text-anchor="middle">Điểm 3 (06:30)</text>
            <!-- Checkpoint 4 (Bãi chôn lấp) -->
            <rect x="710" y="60" width="20" height="20" fill="#22c55e"/>
            <text x="720" y="100" font-size="11" font-weight="bold" text-anchor="middle">Trạm Ép Rác</text>
          </svg>
          <div style="position: absolute; bottom: 12px; left: 16px; background: rgba(0,0,0,0.75); color: #fff; padding: 4px 10px; border-radius: 4px; font-size: 11px;">
            Tuyến số 04: Võ Văn Ngân ➔ Kha Vạn Cân ➔ Trạm trung chuyển Đa Phước
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_36_1",
    numBadge: "Ảnh 36.1",
    title: "Bảng điều khiển tác nghiệp tổng quan Quản lý (Admin Dashboard)",
    member: "Bùi Nguyễn Minh Quân",
    role: "Quản trị viên / Lãnh đạo",
    activeNav: "Dashboard",
    badges: [
      { text: "ADMIN DASHBOARD", top: "-12px", right: "20px" },
      { text: "CHỈ SỐ KPI", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Bảng Điều Khiển Quản Trị Tác Nghiệp Tổng Thể</div>
          <div class="page-subtitle">Chức năng 36 (Ảnh 36.1) • Phụ trách: Bùi Nguyễn Minh Quân</div>
        </div>
      </div>

      <div class="grid-4" style="margin-bottom: 12px;">
        <div class="card-box" style="text-align: center;">
          <div style="font-size: 11px; color: #6b7280;">Báo cáo hôm nay</div>
          <div style="font-size: 24px; font-weight: 900;">42</div>
          <div style="font-size: 10px; color: #16a34a;">↑ +12% so với hôm qua</div>
        </div>
        <div class="card-box" style="text-align: center;">
          <div style="font-size: 11px; color: #6b7280;">Đang xử lý</div>
          <div style="font-size: 24px; font-weight: 900;">15</div>
          <div style="font-size: 10px; color: #4b5563;">3 xe đang làm nhiệm vụ</div>
        </div>
        <div class="card-box" style="text-align: center;">
          <div style="font-size: 11px; color: #6b7280;">Đã dọn sạch</div>
          <div style="font-size: 24px; font-weight: 900;">27</div>
          <div style="font-size: 10px; color: #16a34a;">Tỷ lệ: 64.2%</div>
        </div>
        <div class="card-box" style="text-align: center;">
          <div style="font-size: 11px; color: #6b7280;">Tuân thủ SLA</div>
          <div style="font-size: 24px; font-weight: 900;">94.8%</div>
          <div style="font-size: 10px; color: #16a34a;">Đạt chỉ tiêu xanh</div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_36_2",
    numBadge: "Ảnh 36.2",
    title: "Trung tâm chẩn đoán sức khỏe hệ thống & Giám sát API Health Check",
    member: "Bùi Nguyễn Minh Quân",
    role: "Quản trị viên hạ tầng",
    activeNav: "Quản trị hệ thống",
    badges: [
      { text: "API HEALTH CHECK", top: "-12px", right: "20px" },
      { text: "SYSTEM DIAGNOSTICS", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Trung Tâm Chẩn Đoán & Giám Sát Sức Khỏe Microservices</div>
          <div class="page-subtitle">Chức năng 36 (Ảnh 36.2) • Phụ trách: Bùi Nguyễn Minh Quân</div>
        </div>
      </div>

      <div class="card-box">
        <table class="wire-table">
          <tr><th>Service / Cụm máy chủ</th><th>Endpoint kiểm tra</th><th>Thời gian phản hồi (Latency)</th><th>Trạng thái</th><th>Uptime 30 ngày</th></tr>
          <tr>
            <td>PostgreSQL 16 + PostGIS 3.4</td>
            <td>tcp://localhost:5432</td>
            <td>1.2 ms</td>
            <td><span class="tag tag-dark">HEALTHY</span></td>
            <td>99.99%</td>
          </tr>
          <tr>
            <td>FastAPI Backend API</td>
            <td>https://api.greenspot.vn/health</td>
            <td>14 ms</td>
            <td><span class="tag tag-dark">HEALTHY</span></td>
            <td>99.95%</td>
          </tr>
          <tr>
            <td>OSRM Routing Engine</td>
            <td>http://router.project-osrm.org</td>
            <td>45 ms</td>
            <td><span class="tag tag-dark">HEALTHY</span></td>
            <td>99.80%</td>
          </tr>
          <tr>
            <td>RainViewer Radar API</td>
            <td>https://api.rainviewer.com/v2</td>
            <td>120 ms</td>
            <td><span class="tag tag-dark">HEALTHY</span></td>
            <td>99.50%</td>
          </tr>
        </table>
      </div>
    `
  }
];
