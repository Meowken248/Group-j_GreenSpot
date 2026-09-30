// screens_dat.cjs - Wireframe screens for Nguyễn Thành Đạt (STT 01 - STT 12)
// Phân hệ: Quản trị RBAC, Xác thực bảo mật & Xử lý Sự cố Môi trường

module.exports = [
  {
    id: "Anh_01_1",
    numBadge: "Ảnh 01.1",
    title: "Đăng ký tài khoản người dân (Citizen Registration)",
    member: "Nguyễn Thành Đạt",
    role: "Khách vãng lai / Công dân mới",
    activeNav: "Xác thực",
    badges: [
      { text: "STT 01: ĐĂNG KÝ CÔNG DÂN", top: "-12px", right: "20px" },
      { text: "RBAC CITIZEN DEFAULT", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Đăng Ký Tài Khoản Công Dân Xanh (Citizen Registration)</div>
          <div class="page-subtitle">STT 01 (Ảnh 01.1) • Phân hệ: Quản trị RBAC • Phụ trách: Nguyễn Thành Đạt</div>
        </div>
      </div>

      <div class="card-box" style="width: 480px; margin: 0 auto; padding: 22px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 18px;">
          <div class="logo-box" style="display: inline-block; font-size: 16px; margin-bottom: 6px;">GREENSPOT ID</div>
          <div style="font-size: 13px; color: #4b5563;">Tạo tài khoản định danh để gửi và theo dõi báo cáo môi trường</div>
        </div>

        <div class="form-group">
          <label class="form-label">Họ và tên công dân:</label>
          <input type="text" class="form-input" placeholder="Nguyễn Văn An" value="Nguyễn Văn An">
        </div>

        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">Email liên hệ:</label>
            <input type="email" class="form-input" placeholder="an.nguyen@gmail.com" value="an.nguyen@gmail.com">
          </div>
          <div class="form-group">
            <label class="form-label">Số điện thoại:</label>
            <input type="tel" class="form-input" placeholder="0912 345 678" value="0912 345 678">
          </div>
        </div>

        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">Mật khẩu:</label>
            <input type="password" class="form-input" value="••••••••••••">
          </div>
          <div class="form-group">
            <label class="form-label">Xác nhận mật khẩu:</label>
            <input type="password" class="form-input" value="••••••••••••">
          </div>
        </div>

        <div style="font-size: 11px; color: #6b7280; margin: 8px 0 14px 0;">
          <label><input type="checkbox" checked> Tôi cam kết cung cấp thông tin trung thực và đồng ý điều khoản xử lý môi trường đô thị</label>
        </div>

        <button class="btn btn-black" style="width: 100%; padding: 10px; font-size: 13px;">TẠO TÀI KHOẢN CÔNG DÂN</button>

        <div style="text-align: center; margin-top: 14px; font-size: 12px; color: #4b5563;">
          Đã có tài khoản? <a href="#" style="font-weight: 700; color: #111;">Đăng nhập ngay</a>
        </div>
      </div>
    `
  },
  {
    id: "Anh_01_2",
    numBadge: "Ảnh 01.2",
    title: "Xác thực kích hoạt tài khoản OTP (Email / SMS Verification)",
    member: "Nguyễn Thành Đạt",
    role: "Công dân mới",
    activeNav: "Xác thực",
    badges: [
      { text: "STT 01: XÁC THỰC OTP", top: "-12px", right: "20px" },
      { text: "BẢO MẬT 6 SỐ", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Xác Thực Mã Kích Hoạt OTP (Activation Verification)</div>
          <div class="page-subtitle">STT 01 (Ảnh 01.2) • Phân hệ: Quản trị RBAC • Phụ trách: Nguyễn Thành Đạt</div>
        </div>
      </div>

      <div class="card-box" style="position: relative; height: 380px;">
        <div class="modal-overlay">
          <div style="font-size: 30px; margin-bottom: 6px;">📩</div>
          <div class="modal-title">NHẬP MÃ XÁC THỰC KÍCH HOẠT</div>
          <div class="modal-text">
            Hệ thống đã gửi mã OTP 6 chữ số đến email: <b>an.nguyen@gmail.com</b>. Mã có hiệu lực trong 5 phút.
          </div>

          <div style="display: flex; justify-content: center; gap: 8px; margin: 16px 0 20px 0;">
            <input type="text" class="form-input" style="width: 42px; height: 48px; text-align: center; font-size: 20px; font-weight: 800;" value="8" readonly>
            <input type="text" class="form-input" style="width: 42px; height: 48px; text-align: center; font-size: 20px; font-weight: 800;" value="3" readonly>
            <input type="text" class="form-input" style="width: 42px; height: 48px; text-align: center; font-size: 20px; font-weight: 800;" value="9" readonly>
            <input type="text" class="form-input" style="width: 42px; height: 48px; text-align: center; font-size: 20px; font-weight: 800;" value="1" readonly>
            <input type="text" class="form-input" style="width: 42px; height: 48px; text-align: center; font-size: 20px; font-weight: 800;" value="2" readonly>
            <input type="text" class="form-input" style="width: 42px; height: 48px; text-align: center; font-size: 20px; font-weight: 800;" value="6" readonly>
          </div>

          <div class="modal-actions">
            <button class="btn btn-black" style="padding: 9px 22px;">XÁC THỰC & KÍCH HOẠT</button>
            <button class="btn btn-white">Gửi lại mã (54s)</button>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_02_1",
    numBadge: "Ảnh 02.1",
    title: "Đăng nhập & Xác thực bảo mật phiên làm việc (JWT Secure Login)",
    member: "Nguyễn Thành Đạt",
    role: "Toàn bộ người dùng",
    activeNav: "Xác thực",
    badges: [
      { text: "STT 02: ĐĂNG NHẬP JWT", top: "-12px", right: "20px" },
      { text: "BẢO VỆ PHÂN QUYỀN", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Cổng Đăng Nhập & Xác Thực Phiên Làm Việc (JWT Auth)</div>
          <div class="page-subtitle">STT 02 (Ảnh 02.1) • Phân hệ: Quản trị RBAC • Phụ trách: Nguyễn Thành Đạt</div>
        </div>
      </div>

      <div class="card-box" style="width: 440px; margin: 0 auto; padding: 24px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <div class="logo-box" style="display: inline-block; font-size: 16px; margin-bottom: 8px;">GREENSPOT CORE</div>
          <div style="font-size: 13px; color: #4b5563;">Truy cập nền tảng WebGIS và phân hệ tác nghiệp môi trường</div>
        </div>

        <div class="form-group">
          <label class="form-label">Tài khoản Email / Số điện thoại:</label>
          <input type="text" class="form-input" value="dat.admin@greenspot.vn">
        </div>

        <div class="form-group">
          <label class="form-label">Mật khẩu:</label>
          <input type="password" class="form-input" value="••••••••••••">
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin: 12px 0 16px 0; font-size: 12px;">
          <label><input type="checkbox" checked> Ghi nhớ phiên làm việc (JWT Refresh Token)</label>
          <a href="#" style="color: #111; font-weight: 700;">Quên mật khẩu?</a>
        </div>

        <button class="btn btn-black" style="width: 100%; padding: 10px;">ĐĂNG NHẬP VÀO HỆ THỐNG</button>

        <div style="text-align: center; margin: 16px 0; font-size: 12px; color: #6b7280;">— HOẶC ĐĂNG NHẬP BẰNG —</div>

        <div class="grid-2">
          <button class="btn btn-white"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg> Google SSO</button>
          <button class="btn btn-white"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/></svg> VNeID Định danh</button>
        </div>
      </div>
    `
  },
  {
    id: "Anh_02_2",
    numBadge: "Ảnh 02.2",
    title: "Modal đăng nhập nhanh trên WebGIS khi gửi báo cáo sự cố",
    member: "Nguyễn Thành Đạt",
    role: "Công dân chưa đăng nhập",
    activeNav: "Bản đồ ô nhiễm",
    badges: [
      { text: "STT 02: QUICK AUTH MODAL", top: "-12px", right: "20px" },
      { text: "TIẾP TỤC BÁO CÁO", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Hộp Thoại Đăng Nhập Nhanh Tại Hiện Trường (Quick Auth)</div>
          <div class="page-subtitle">STT 02 (Ảnh 02.2) • Phân hệ: Quản trị RBAC • Phụ trách: Nguyễn Thành Đạt</div>
        </div>
      </div>

      <div class="card-box" style="position: relative; height: 380px;">
        <div class="map-box" style="height: 100%; opacity: 0.4;"></div>
        <div class="modal-overlay">
          <div class="modal-title">BẠN CẦN ĐĂNG NHẬP ĐỂ GỬI BÁO CÁO</div>
          <div class="modal-text">
            Đăng nhập giúp liên kết sự cố với tài khoản của bạn để nhận thông báo khi đội phản ứng nhanh xử lý xong.
          </div>
          <div class="form-group" style="text-align: left;">
            <label class="form-label">Email:</label>
            <input type="text" class="form-input" value="citizen@greenspot.vn">
          </div>
          <div class="form-group" style="text-align: left;">
            <label class="form-label">Mật khẩu:</label>
            <input type="password" class="form-input" value="••••••••">
          </div>
          <div class="modal-actions" style="margin-top: 14px;">
            <button class="btn btn-black">Đăng nhập & Tiếp tục</button>
            <button class="btn btn-white">Gửi ẩn danh</button>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_03_1",
    numBadge: "Ảnh 03.1",
    title: "Quản lý hồ sơ người dùng & Lịch sử đóng góp",
    member: "Nguyễn Thành Đạt",
    role: "Công dân (Citizen)",
    activeNav: "Dashboard",
    badges: [
      { text: "STT 03: HỒ SƠ CÁ NHÂN", top: "-12px", right: "20px" },
      { text: "LỊCH SỬ BÁO CÁO", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Hồ Sơ Công Dân & Lịch Sử Phản Ánh Môi Trường</div>
          <div class="page-subtitle">STT 03 (Ảnh 03.1) • Phân hệ: Quản trị RBAC • Phụ trách: Nguyễn Thành Đạt</div>
        </div>
        <button class="btn btn-black">Chỉnh sửa hồ sơ</button>
      </div>

      <div class="grid-3" style="margin-bottom: 12px;">
        <div class="card-box" style="text-align: center;">
          <div style="width: 50px; height: 50px; border-radius: 50%; background: #111; color: #fff; margin: 0 auto 8px auto; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 18px;">ĐA</div>
          <div style="font-weight: 800; font-size: 14px;">Nguyễn Thành Đạt</div>
          <div style="font-size: 11px; color: #6b7280;">Công dân tích cực • Quận 1</div>
          <div style="margin-top: 6px;"><span class="tag tag-dark">CITIZEN TIER 3</span></div>
        </div>

        <div class="card-box">
          <div class="card-title">Thống kê đóng góp</div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 12px;">
            <span>Tổng sự cố đã phản ánh:</span><b>14 sự cố</b>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 12px;">
            <span>Đã xử lý dọn sạch:</span><b>12 sự cố (85.7%)</b>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px;">
            <span>Lượt cộng đồng đồng tình:</span><b>148 upvotes</b>
          </div>
        </div>

        <div class="card-box">
          <div class="card-title">Độ tin cậy tài khoản</div>
          <div style="font-size: 24px; font-weight: 900; margin: 4px 0;">98.5%</div>
          <div style="font-size: 11px; color: #6b7280;">Tài khoản đã xác minh qua OTP & VNeID. Không có vi phạm báo cáo rác giả mạo.</div>
        </div>
      </div>

      <div class="card-box">
        <div class="card-title">Lịch sử sự cố đã gửi gần đây</div>
        <table class="wire-table">
          <tr><th>Mã theo dõi</th><th>Địa điểm</th><th>Danh mục</th><th>Thời gian</th><th>Độ nguy hiểm</th><th>Trạng thái</th></tr>
          <tr><td><b>INC-2026-0891</b></td><td>53 Võ Văn Ngân, Thủ Đức</td><td>Rác thải sinh hoạt</td><td>28/09/2026</td><td><span class="tag tag-gray">Cao</span></td><td><span class="tag tag-dark">ĐÃ NGHIỆM THU</span></td></tr>
          <tr><td><b>INC-2026-0842</b></td><td>120 Xa Lộ Hà Nội, Q.2</td><td>Xà bần xây dựng</td><td>22/09/2026</td><td><span class="tag tag-gray">Trung bình</span></td><td><span class="tag tag-dark">ĐÃ NGHIỆM THU</span></td></tr>
          <tr><td><b>INC-2026-0795</b></td><td>Cầu Rạch Đĩa, Q.7</td><td>Tắc nghẽn cống ngập</td><td>15/09/2026</td><td><span class="tag tag-gray">Khẩn cấp</span></td><td><span class="tag tag-dark">ĐÃ NGHIỆM THU</span></td></tr>
        </table>
      </div>
    `
  },
  {
    id: "Anh_04_1",
    numBadge: "Ảnh 04.1",
    title: "Phân quyền vai trò RBAC (Admin, Manager, Citizen, Responder)",
    member: "Nguyễn Thành Đạt",
    role: "Quản trị viên (Super Admin)",
    activeNav: "Quản trị hệ thống",
    badges: [
      { text: "STT 04: MA TRẬN RBAC", top: "-12px", right: "20px" },
      { text: "4 CẤP BẬC VAI TRÒ", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Ma Trận Phân Quyền Vai Trò Người Dùng (RBAC Schema)</div>
          <div class="page-subtitle">STT 04 (Ảnh 04.1) • Phân hệ: Quản trị RBAC • Phụ trách: Nguyễn Thành Đạt</div>
        </div>
        <button class="btn btn-black">+ Thêm quyền mới</button>
      </div>

      <div class="card-box">
        <table class="wire-table">
          <tr>
            <th>Nhóm Quyền Hạn (Permissions)</th>
            <th style="text-align:center;">SUPER_ADMIN<br><span style="font-size:10px;font-weight:normal;">(Quản trị tối cao)</span></th>
            <th style="text-align:center;">DISTRICT_MANAGER<br><span style="font-size:10px;font-weight:normal;">(Cán bộ quận)</span></th>
            <th style="text-align:center;">FIELD_RESPONDER<br><span style="font-size:10px;font-weight:normal;">(Đội phản ứng nhanh)</span></th>
            <th style="text-align:center;">CITIZEN<br><span style="font-size:10px;font-weight:normal;">(Người dân)</span></th>
          </tr>
          <tr><td><b>incident:create</b> (Gửi báo cáo sự cố kèm GPS)</td><td style="text-align:center;">✅</td><td style="text-align:center;">✅</td><td style="text-align:center;">✅</td><td style="text-align:center;">✅</td></tr>
          <tr><td><b>incident:read</b> (Xem chi tiết bản đồ và sự cố)</td><td style="text-align:center;">✅</td><td style="text-align:center;">✅</td><td style="text-align:center;">✅</td><td style="text-align:center;">✅</td></tr>
          <tr><td><b>incident:upvote</b> (Xác nhận sự cố cộng đồng)</td><td style="text-align:center;">✅</td><td style="text-align:center;">✅</td><td style="text-align:center;">✅</td><td style="text-align:center;">✅</td></tr>
          <tr><td><b>incident:assign</b> (Điều phối giao việc theo quận)</td><td style="text-align:center;">✅</td><td style="text-align:center;">✅</td><td style="text-align:center;">❌</td><td style="text-align:center;">❌</td></tr>
          <tr><td><b>incident:resolve</b> (Nghiệm thu dọn sạch hiện trường)</td><td style="text-align:center;">✅</td><td style="text-align:center;">✅</td><td style="text-align:center;">✅</td><td style="text-align:center;">❌</td></tr>
          <tr><td><b>iot:manage</b> (Cấu hình trạm quan trắc IoT viễn trắc)</td><td style="text-align:center;">✅</td><td style="text-align:center;">❌</td><td style="text-align:center;">❌</td><td style="text-align:center;">❌</td></tr>
          <tr><td><b>user:manage</b> (Khóa tài khoản, phân quyền cán bộ)</td><td style="text-align:center;">✅</td><td style="text-align:center;">❌</td><td style="text-align:center;">❌</td><td style="text-align:center;">❌</td></tr>
        </table>
      </div>
    `
  },
  {
    id: "Anh_05_1",
    numBadge: "Ảnh 05.1",
    title: "Quản lý trạng thái tài khoản & Chặn báo cáo giả mạo",
    member: "Nguyễn Thành Đạt",
    role: "Quản trị viên (Super Admin)",
    activeNav: "Quản trị hệ thống",
    badges: [
      { text: "STT 05: ANTI-SPAM CONTROL", top: "-12px", right: "20px" },
      { text: "KHÓA TÀI KHOẢN GIẢ", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Quản Lý Trạng Thái Người Dùng & Chặn Báo Cáo Rác Giả Mạo</div>
          <div class="page-subtitle">STT 05 (Ảnh 05.1) • Phân hệ: Quản trị RBAC • Phụ trách: Nguyễn Thành Đạt</div>
        </div>
        <div style="display:flex; gap:8px;">
          <input type="text" class="form-input" placeholder="Tìm tên/email/SĐT..." style="width: 220px;">
          <button class="btn btn-black">Tìm kiếm</button>
        </div>
      </div>

      <div class="card-box">
        <table class="wire-table">
          <tr><th>ID</th><th>Họ và tên</th><th>Email</th><th>Vai trò</th><th>Trạng thái (is_active)</th><th>Xác thực (is_verified)</th><th>Cảnh báo spam</th><th>Thao tác</th></tr>
          <tr><td>#U-101</td><td>Nguyễn Thành Đạt</td><td>dat.admin@greenspot.vn</td><td>SUPER_ADMIN</td><td><span class="tag tag-dark">HOẠT ĐỘNG</span></td><td>✅ Đã xác thực</td><td>0 lần</td><td><button class="btn btn-white btn-sm">Chi tiết</button></td></tr>
          <tr><td>#U-102</td><td>Trần Văn Bình</td><td>binh.manager@quan1.gov.vn</td><td>DISTRICT_MANAGER</td><td><span class="tag tag-dark">HOẠT ĐỘNG</span></td><td>✅ Đã xác thực</td><td>0 lần</td><td><button class="btn btn-white btn-sm">Chi tiết</button></td></tr>
          <tr><td>#U-108</td><td>Lê Minh Tú</td><td>tu.citizen@gmail.com</td><td>CITIZEN</td><td><span class="tag tag-dark">HOẠT ĐỘNG</span></td><td>✅ Đã xác thực</td><td>1 lần</td><td><button class="btn btn-white btn-sm">Chi tiết</button></td></tr>
          <tr><td style="color:#dc2626;">#U-194</td><td style="color:#dc2626;">Spam Bot Account</td><td style="color:#dc2626;">bot998@tempmail.com</td><td>CITIZEN</td><td><span class="tag tag-gray" style="color:#dc2626;border-color:#dc2626;">ĐÃ KHÓA</span></td><td>❌ Chưa xác thực</td><td><b style="color:#dc2626;">9 lần spam</b></td><td><button class="btn btn-black btn-sm">Mở khóa</button></td></tr>
        </table>
      </div>
    `
  },
  {
    id: "Anh_06_1",
    numBadge: "Ảnh 06.1",
    title: "Popover chẩn đoán kết nối Microservice Backend (/health) - Vị trí nút",
    member: "Nguyễn Thành Đạt",
    role: "Toàn bộ người dùng",
    activeNav: "Bản đồ ô nhiễm",
    badges: [
      { text: "STT 06: HEALTH STATUS LED", top: "-12px", right: "20px" },
      { text: "GIÁM SÁT REALTIME", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Trạng Thái Kết Nối Backend Realtime (/health Popover)</div>
          <div class="page-subtitle">STT 06 (Ảnh 06.1) • Phân hệ: Quản trị RBAC • Phụ trách: Nguyễn Thành Đạt</div>
        </div>
      </div>

      <div class="card-box" style="margin-bottom: 12px; background: #fafafa;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="font-weight: 700;">Thanh công cụ Toolbar phía trên cùng WebGIS EcoMap:</div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="font-size: 12px; color: #4b5563;">Endpoint: <code>GET /health</code></div>
            <button class="btn btn-white" style="border: 2px solid #16a34a; background: #f0fdf4; color: #166534;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: #16a34a; display: inline-block;"></span>
              <b>API: Online (14ms)</b>
            </button>
          </div>
        </div>
      </div>

      <div class="map-box" style="height: 280px; position: relative;">
        <div style="position: absolute; top: 16px; right: 16px; border: 2px solid #222; background: #fff; padding: 12px; border-radius: 8px; width: 260px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          <div style="font-weight: 800; font-size: 13px; margin-bottom: 6px;">🟢 Máy chủ vận hành ổn định</div>
          <div style="font-size: 11px; color: #4b5563; line-height: 1.5;">
            Nhấp chuột vào nút <b>API: Online</b> để mở Popover chẩn đoán hiệu năng mạng và các dịch vụ nền tảng.
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_06_2",
    numBadge: "Ảnh 06.2",
    title: "Popover chi tiết chẩn đoán Microservice Backend (/health)",
    member: "Nguyễn Thành Đạt",
    role: "Quản trị viên / Kỹ thuật viên",
    activeNav: "Bản đồ ô nhiễm",
    badges: [
      { text: "STT 06: CHẨN ĐOÁN HỆ THỐNG", top: "-12px", right: "20px" },
      { text: "POSTGRES & FASTAPI", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Popover Chẩn Đoán Chi Tiết Trạng Thái Microservice Backend</div>
          <div class="page-subtitle">STT 06 (Ảnh 06.2) • Phân hệ: Quản trị RBAC • Phụ trách: Nguyễn Thành Đạt</div>
        </div>
      </div>

      <div class="card-box" style="position: relative; height: 380px;">
        <div class="map-box" style="height: 100%; opacity: 0.35;"></div>
        
        <div style="position: absolute; top: 30px; right: 40px; width: 360px; background: #fff; border: 2px solid #222; border-radius: 10px; padding: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.25); z-index: 50;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #222; padding-bottom: 8px; margin-bottom: 12px;">
            <div style="font-weight: 800; font-size: 14px;">🛠️ CHẨN ĐOÁN BACKEND (/health)</div>
            <span class="tag tag-dark">HEALTHY</span>
          </div>

          <div style="font-size: 12px; display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #6b7280;">Trạng thái API FastAPI:</span>
              <b>HTTP 200 OK</b>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #6b7280;">Độ trễ Ping (Latency):</span>
              <b>12 ms</b>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #6b7280;">Cơ sở dữ liệu PostGIS:</span>
              <span style="color: #166534; font-weight: 700;">🟢 Connected (PostgreSQL 16)</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #6b7280;">Open-Meteo & GloFAS API:</span>
              <span style="color: #166534; font-weight: 700;">🟢 Online</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #6b7280;">Tiến trình nền (Background Worker):</span>
              <b>Running (Periodic 5m)</b>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #6b7280;">Thời gian hoạt động (Uptime):</span>
              <b>14 ngày 08 giờ 24 phút</b>
            </div>
          </div>

          <div style="margin-top: 14px; text-align: right;">
            <button class="btn btn-black btn-sm">Ping lại ngay</button>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_07_1",
    numBadge: "Ảnh 07.1",
    title: "Báo cáo sự cố môi trường kèm tọa độ GPS trực tiếp - Bắt GPS vệ tinh",
    member: "Nguyễn Thành Đạt",
    role: "Công dân (Citizen)",
    activeNav: "Báo cáo rác",
    badges: [
      { text: "STT 07: BẮT TỌA ĐỘ GPS", top: "-12px", right: "20px" },
      { text: "POSTGIS POINT", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Thu Nhận Vị Trí Hiện Trường Bằng GPS Phần Cứng Tự Động</div>
          <div class="page-subtitle">STT 07 (Ảnh 07.1) • Phân hệ: Xử lý Sự cố • Phụ trách: Nguyễn Thành Đạt</div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-black">Lấy lại GPS</button>
          <button class="btn btn-white">Khóa tọa độ</button>
        </div>
      </div>

      <div class="card-box">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <div>
            <div><b>Tọa độ thu nhận:</b> 10.850500° N, 106.771900° E (SRID 4326)</div>
            <div style="font-size: 12px; color: #4b5563; margin-top: 2px;">• Bán kính sai số GPS: <b>4.8 mét</b> | Độ chính xác cao (High Accuracy)</div>
            <div style="font-size: 12px; color: #4b5563;">• Địa chỉ giải mã (Reverse Geocoding): <b>53 Võ Văn Ngân, P. Linh Chiểu, TP. Thủ Đức</b></div>
          </div>
          <span class="tag tag-dark">GPS SẴN SÀNG</span>
        </div>

        <div class="map-box">
          <svg style="width: 100%; height: 100%; position: absolute;">
            <path d="M-10 80 Q 220 90 450 40 T 780 70" stroke="#cbd5e1" stroke-width="16" fill="none"/>
            <path d="M 80 -10 Q 140 140 220 280" stroke="#cbd5e1" stroke-width="14" fill="none"/>
            <path d="M 320 -10 L 360 280" stroke="#cbd5e1" stroke-width="12" fill="none"/>
          </svg>
          <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center;">
            <div style="width: 70px; height: 70px; border-radius: 50%; background: rgba(37, 99, 235, 0.15); border: 2px dashed #2563eb; display: flex; align-items: center; justify-content: center;">
              <div style="width: 14px; height: 14px; border-radius: 50%; background: #2563eb; border: 3px solid #fff;"></div>
            </div>
            <span style="font-size: 11px; font-weight: 700; background: #fff; border: 1.5px solid #222; padding: 2px 6px; border-radius: 4px; margin-top: 4px;">Vị trí của bạn (±4.8m)</span>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_07_2",
    numBadge: "Ảnh 07.2",
    title: "Form nhập thông tin chi tiết sự cố hiện trường kèm tọa độ",
    member: "Nguyễn Thành Đạt",
    role: "Công dân (Citizen)",
    activeNav: "Báo cáo rác",
    badges: [
      { text: "STT 07: FORM BÁO CÁO", top: "-12px", right: "20px" },
      { text: "BẢO VỆ RIÊNG TƯ", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Nhập Thông Tin Phản Ánh Sự Cố Môi Trường</div>
          <div class="page-subtitle">STT 07 (Ảnh 07.2) • Phân hệ: Xử lý Sự cố • Phụ trách: Nguyễn Thành Đạt</div>
        </div>
      </div>

      <div class="card-box" style="width: 580px; margin: 0 auto; padding: 20px;">
        <div class="form-group">
          <label class="form-label">Địa chỉ phát hiện (Tự động điền theo GPS):</label>
          <input type="text" class="form-input" value="53 Võ Văn Ngân, P. Linh Chiểu, TP. Thủ Đức, TP.HCM">
        </div>

        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">Loại sự cố môi trường:</label>
            <select class="form-select">
              <option selected>Rác thải sinh hoạt bừa bãi</option>
              <option>Xà bần xây dựng đổ trộm</option>
              <option>Cống nghẹt ngập nước bốc mùi</option>
              <option>Rác điện tử / Pin cũ nguy hại</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Quy mô ước lượng:</label>
            <select class="form-select">
              <option selected>Bãi rác nhỏ (< 1 m³)</option>
              <option>Bãi rác trung bình (1 - 5 m³)</option>
              <option>Bãi rác lớn (> 5 m³)</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Mô tả hiện trường:</label>
          <textarea class="form-input" style="height: 70px; resize: none;">Bãi rác tự phát bốc mùi hôi thối nằm trước cổng trường học, rác tràn xuống lòng đường gây cản trở giao thông.</textarea>
        </div>

        <div style="font-size: 11px; color: #4b5563; margin-bottom: 14px;">
          <label><input type="checkbox" checked> Bật bảo vệ quyền riêng tư (Làm lệch ngẫu nhiên GPS 30m để ẩn danh số nhà của bạn)</label>
        </div>

        <button class="btn btn-black" style="width: 100%; padding: 10px;">TIẾP THEO: TẢI ẢNH BẰNG CHỨNG ➔</button>
      </div>
    `
  },
  {
    id: "Anh_08_1",
    numBadge: "Ảnh 08.1",
    title: "Đính kèm hình ảnh/video minh chứng hiện trường sự cố",
    member: "Nguyễn Thành Đạt",
    role: "Công dân (Citizen)",
    activeNav: "Báo cáo rác",
    badges: [
      { text: "STT 08: ĐÍNH KÈM HÌNH ẢNH", top: "-12px", right: "20px" },
      { text: "TRÍCH XUẤT EXIF", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Đính Kèm Hình Ảnh & Video Minh Chứng Hiện Trường (Media Evidence)</div>
          <div class="page-subtitle">STT 08 (Ảnh 08.1) • Phân hệ: Xử lý Sự cố • Phụ trách: Nguyễn Thành Đạt</div>
        </div>
      </div>

      <div class="card-box" style="border: 2px dashed #4b5563; background: #fafafa; text-align: center; padding: 24px; margin-bottom: 14px;">
        <div style="font-size: 32px; margin-bottom: 6px;">📷</div>
        <div style="font-weight: 800; font-size: 14px;">Kéo thả ảnh/video hiện trường hoặc nhấp chuột để tải lên</div>
        <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">Hỗ trợ JPG, PNG, MP4 tối đa 25MB • Tự động trích xuất đóng dấu thời gian Timestamp & GPS EXIF</div>
      </div>

      <div class="card-box">
        <div class="card-title">Hình ảnh đã tải lên (2 tệp):</div>
        <div class="grid-2">
          <div style="border: 1.5px solid #222; border-radius: 6px; padding: 10px; display: flex; gap: 12px; align-items: center;">
            <div style="width: 70px; height: 60px; background: #e5e7eb; border: 1px solid #9ca3af; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold;">HÌNH 1</div>
            <div style="font-size: 11px; line-height: 1.4;">
              <b>IMG_20260928_1045.jpg</b> (2.4 MB)
              <div style="color: #6b7280;">• EXIF Time: 28/09/2026 10:45:12</div>
              <div style="color: #6b7280;">• EXIF GPS: 10.8505°N, 106.7719°E</div>
            </div>
          </div>
          <div style="border: 1.5px solid #222; border-radius: 6px; padding: 10px; display: flex; gap: 12px; align-items: center;">
            <div style="width: 70px; height: 60px; background: #e5e7eb; border: 1px solid #9ca3af; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold;">HÌNH 2</div>
            <div style="font-size: 11px; line-height: 1.4;">
              <b>IMG_20260928_1046.jpg</b> (3.1 MB)
              <div style="color: #6b7280;">• EXIF Time: 28/09/2026 10:46:01</div>
              <div style="color: #6b7280;">• EXIF GPS: 10.8505°N, 106.7719°E</div>
            </div>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_09_1",
    numBadge: "Ảnh 09.1",
    title: "Định danh mã theo dõi sự cố công khai (Tracking Code)",
    member: "Nguyễn Thành Đạt",
    role: "Toàn bộ người dùng",
    activeNav: "Bản đồ ô nhiễm",
    badges: [
      { text: "STT 09: MÃ TRACKING ĐỊNH DANH", top: "-12px", right: "20px" },
      { text: "INC-2026-0891", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Mã Định Danh Theo Dõi Tiến Độ Xử Lý Công Khai (Tracking Code)</div>
          <div class="page-subtitle">STT 09 (Ảnh 09.1) • Phân hệ: Xử lý Sự cố • Phụ trách: Nguyễn Thành Đạt</div>
        </div>
      </div>

      <div class="card-box" style="width: 520px; margin: 0 auto; padding: 22px;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #222; padding-bottom: 12px; margin-bottom: 16px;">
          <div>
            <div style="font-size: 11px; color: #6b7280; font-weight: 700;">MÃ TRA CỨU TIẾN ĐỘ:</div>
            <div style="font-size: 24px; font-weight: 900; letter-spacing: 1px;">INC-2026-0891</div>
          </div>
          <div style="width: 50px; height: 50px; border: 2px solid #222; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: bold; background: #fafafa;">QR CODE</div>
        </div>

        <div style="font-size: 12px; display: flex; flex-direction: column; gap: 8px; margin-bottom: 18px;">
          <div><b>Địa điểm:</b> 53 Võ Văn Ngân, P. Linh Chiểu, TP. Thủ Đức</div>
          <div><b>Thời gian gửi:</b> 28/09/2026 - 10:46 (2 giờ trước)</div>
          <div><b>Đơn vị phụ trách:</b> Đội Vệ Sinh Môi Trường Đô Thị Thủ Đức</div>
          <div><b>Độ ưu tiên:</b> <span class="tag tag-gray">Mức Cao (SLA 8h)</span></div>
        </div>

        <div style="background: #f3f4f6; border: 1.5px solid #222; border-radius: 6px; padding: 12px;">
          <div style="font-size: 11px; font-weight: 700; margin-bottom: 6px;">TIẾN TRÌNH THỰC HIỆN:</div>
          <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: bold;">
            <span>1. Tiếp nhận ✅</span>
            <span>2. Đang điều phối xe 🚚</span>
            <span style="color: #6b7280;">3. Nghiệm thu ⏳</span>
          </div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_10_1",
    numBadge: "Ảnh 10.1",
    title: "Tương tác cộng đồng: Xác nhận (Upvotes) sự cố",
    member: "Nguyễn Thành Đạt",
    role: "Cộng đồng dân cư",
    activeNav: "Bản đồ ô nhiễm",
    badges: [
      { text: "STT 10: XÁC NHẬN CỘNG ĐỒNG", top: "-12px", right: "20px" },
      { text: "UPVOTES & BÌNH LUẬN", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Cơ Chế Xác Nhận Tán Thành (Upvotes) Tăng Độ Tin Cậy Sự Cố</div>
          <div class="page-subtitle">STT 10 (Ảnh 10.1) • Phân hệ: Xử lý Sự cố • Phụ trách: Nguyễn Thành Đạt</div>
        </div>
      </div>

      <div class="card-box" style="width: 540px; margin: 0 auto; padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px;">
          <div>
            <div style="font-size: 15px; font-weight: 800;">Bãi rác tự phát bốc mùi - 53 Võ Văn Ngân</div>
            <div style="font-size: 11px; color: #6b7280;">Mã sự cố: INC-2026-0891 • Người gửi: Nguyễn Thành Đạt</div>
          </div>
          <span class="tag tag-dark">CẦN XỬ LÝ GẤP</span>
        </div>

        <div style="border: 1.5px solid #222; border-radius: 8px; padding: 14px; background: #fafafa; display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <div>
            <div style="font-size: 22px; font-weight: 900;">👍 38 Lượt Xác Nhận</div>
            <div style="font-size: 11px; color: #4b5563;">38 người đi đường cùng khu vực đã bấm "Sự cố có thật"</div>
          </div>
          <button class="btn btn-black" style="padding: 10px 18px; font-size: 13px;">
            👍 XÁC NHẬN SỰ CỐ CÓ THẬT (+1)
          </button>
        </div>

        <div class="card-title">Ý kiến nhân chứng hiện trường (3 bình luận):</div>
        <div style="font-size: 11px; display: flex; flex-direction: column; gap: 6px;">
          <div style="border-bottom: 1px solid #e5e7eb; padding-bottom: 4px;"><b>Trần Hữu Nam (15 phút trước):</b> Sáng nay đi làm mùi rất hôi, mong đội vệ sinh xử lý sớm.</div>
          <div style="border-bottom: 1px solid #e5e7eb; padding-bottom: 4px;"><b>Lê Thị Mai (30 phút trước):</b> Xe rác dân cư đổ lén lúc nửa đêm.</div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_11_1",
    numBadge: "Ảnh 11.1",
    title: "Phân loại sự cố theo danh mục rác thải đô thị",
    member: "Nguyễn Thành Đạt",
    role: "Cán bộ / Công dân",
    activeNav: "Báo cáo rác",
    badges: [
      { text: "STT 11: 5 DANH MỤC CHẤT THẢI", top: "-12px", right: "20px" },
      { text: "PHÂN LOẠI ĐÔ THỊ", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Bộ Danh Mục Phân Loại Rác Thải & Sự Cố Môi Trường Đô Thị</div>
          <div class="page-subtitle">STT 11 (Ảnh 11.1) • Phân hệ: Xử lý Sự cố • Phụ trách: Nguyễn Thành Đạt</div>
        </div>
      </div>

      <div class="grid-3">
        <div class="card-box" style="border: 2px solid #111;">
          <div style="font-size: 26px; margin-bottom: 4px;">🗑️</div>
          <div style="font-weight: 800; font-size: 13px;">RÁC THẢI SINH HOẠT</div>
          <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">Túi ni-lông, thức ăn thừa, rác hữu cơ bốc mùi lề đường.</div>
        </div>
        <div class="card-box" style="border: 2px solid #111;">
          <div style="font-size: 26px; margin-bottom: 4px;">🧱</div>
          <div style="font-weight: 800; font-size: 13px;">XÀ BẦN XÂY DỰNG</div>
          <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">Gạch vỡ, bê tông, đất cát phế thải san lấp trái phép.</div>
        </div>
        <div class="card-box" style="border: 2px solid #111;">
          <div style="font-size: 26px; margin-bottom: 4px;">💻</div>
          <div style="font-weight: 800; font-size: 13px;">RÁC ĐIỆN TỬ (E-WASTE)</div>
          <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">Bo mạch, màn hình hỏng, dây cáp và thiết bị gia dụng.</div>
        </div>
      </div>

      <div class="grid-2" style="margin-top: 12px;">
        <div class="card-box" style="border: 2px solid #dc2626;">
          <div style="font-size: 26px; margin-bottom: 4px;">☣️</div>
          <div style="font-weight: 800; font-size: 13px; color: #dc2626;">CHẤT THẢI NGUY HẠI & Y TẾ</div>
          <div style="font-size: 11px; color: #4b5563; margin-top: 4px;">Pin cũ chứa chì/thủy ngân, kim tiêm, hóa chất rò rỉ độc hại. Ưu tiên xử lý đặc biệt.</div>
        </div>
        <div class="card-box" style="border: 2px solid #111;">
          <div style="font-size: 26px; margin-bottom: 4px;">🌊</div>
          <div style="font-weight: 800; font-size: 13px;">BÙN THẢI & NGHẼN CỐNG</div>
          <div style="font-size: 11px; color: #6b7280; margin-top: 4px;">Bùn đất rác bịt miệng cống thoát nước gây ngập lụt đô thị khi mưa lớn.</div>
        </div>
      </div>
    `
  },
  {
    id: "Anh_12_1",
    numBadge: "Ảnh 12.1",
    title: "Theo dõi vòng đời xử lý sự cố (Pending, Progress, Resolved)",
    member: "Nguyễn Thành Đạt",
    role: "Điều phối viên / Đội vệ sinh",
    activeNav: "Nghiệm thu",
    badges: [
      { text: "STT 12: VÒNG ĐỜI XỬ LÝ", top: "-12px", right: "20px" },
      { text: "BEFORE / AFTER", top: "50px", right: "20px" }
    ],
    contentHtml: `
      <div class="page-header">
        <div>
          <div class="page-title">Theo Dõi Vòng Đời Xử Lý & Nghiệm Thu Dọn Sạch Hiện Trường</div>
          <div class="page-subtitle">STT 12 (Ảnh 12.1) • Phân hệ: Xử lý Sự cố • Phụ trách: Nguyễn Thành Đạt</div>
        </div>
        <span class="tag tag-dark">TRẠNG THÁI: RESOLVED</span>
      </div>

      <div class="card-box" style="margin-bottom: 12px; background: #fafafa;">
        <div style="display: flex; justify-content: space-around; align-items: center; text-align: center;">
          <div>
            <div style="font-size: 11px; color: #6b7280;">BƯỚC 1</div>
            <div style="font-weight: 800;">Chờ tiếp nhận</div>
            <div style="font-size: 10px; color: #166534;">✅ 10:46 (28/09)</div>
          </div>
          <div style="font-size: 20px;">➔</div>
          <div>
            <div style="font-size: 11px; color: #6b7280;">BƯỚC 2</div>
            <div style="font-weight: 800;">Đang xử lý tại chỗ</div>
            <div style="font-size: 10px; color: #166534;">✅ 11:15 (Xe gom #04)</div>
          </div>
          <div style="font-size: 20px;">➔</div>
          <div>
            <div style="font-size: 11px; color: #6b7280;">BƯỚC 3</div>
            <div style="font-weight: 800;">Đã nghiệm thu sạch</div>
            <div style="font-size: 10px; color: #166534;">✅ 12:30 (Hoàn thành)</div>
          </div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card-box">
          <div class="card-title">ẢNH HIỆN TRƯỜNG TRƯỚC XỬ LÝ (BEFORE)</div>
          <div style="height: 140px; background: #e5e7eb; border: 1.5px dashed #222; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px;">
            [Ảnh bãi rác 3 tấn tràn lòng đường - 10:46]
          </div>
        </div>
        <div class="card-box">
          <div class="card-title">ẢNH NGHIỆM THU SAU XỬ LÝ (AFTER)</div>
          <div style="height: 140px; background: #f0fdf4; border: 1.5px solid #16a34a; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; color: #166534;">
            [Ảnh vỉa hè đã thu dọn & khử khuẩn sạch - 12:30]
          </div>
        </div>
      </div>
    `
  }
];
