import os
import subprocess

OUT_DIR = os.path.abspath("docs/images/quan")
os.makedirs(OUT_DIR, exist_ok=True)
CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

mockups = [
    {
        "id": 25,
        "filename": "hinh_4_25.png",
        "title": "Chức năng 25 - Cổng xác thực tập trung đa nền tảng và Quản lý phiên JWT an toàn",
        "url": "https://greenspot.vn/admin/auth-security",
        "active_nav": "Xác thực JWT",
        "left_card_title": "Cấu hình Phiên xác thực & Token Lifecycle",
        "left_card_content": """
          <div style="font-size:11px; line-height:1.9; color:#222;">
            <div style="display:flex; justify-content:space-between; border-bottom:1px dashed #e0e0e0; padding:3px 0;">
              <span>Thời hạn Access Token:</span><strong>15 phút (RS256 Private Key)</strong>
            </div>
            <div style="display:flex; justify-content:space-between; border-bottom:1px dashed #e0e0e0; padding:3px 0;">
              <span>Thời hạn Refresh Token:</span><strong>7 ngày (HttpOnly, Secure Cookie)</strong>
            </div>
            <div style="display:flex; justify-content:space-between; border-bottom:1px dashed #e0e0e0; padding:3px 0;">
              <span>Giới hạn phiên đăng nhập đồng thời:</span><strong>03 thiết bị / tài khoản</strong>
            </div>
            <div style="display:flex; justify-content:space-between; border-bottom:1px dashed #e0e0e0; padding:3px 0;">
              <span>Xác thực hai yếu tố (TOTP 2FA):</span><strong>Bắt buộc cho Quản trị viên</strong>
            </div>
            <div style="display:flex; justify-content:space-between; padding:3px 0;">
              <span>Khóa tài khoản khi sai mật khẩu:</span><strong>Khóa 15 phút sau 5 lần sai</strong>
            </div>
          </div>
          <div style="margin-top:16px; display:flex; gap:10px;">
            <button style="border:1px solid #777; background:#fff; padding:5px 12px; border-radius:4px; font-size:11px; font-weight:600;">Thu hồi toàn bộ Token</button>
            <button style="border:1px solid #111; background:#e8ecf0; padding:5px 14px; border-radius:4px; font-size:11px; font-weight:bold;">Lưu cấu hình phiên</button>
          </div>
        """,
        "right_card_title": "Trạng thái Phiên hoạt động (Active Sessions)",
        "right_card_content": """
          <div>
            <div style="text-align:center; margin:10px 0 14px 0;">
              <div style="font-size:36px; font-weight:bold; color:#111;">1,248</div>
              <div style="font-size:11px; color:#555;">Phiên JWT đang trực tuyến</div>
            </div>
            <div style="font-size:11px; line-height:1.8; color:#333;">
              <div style="display:flex; justify-content:space-between;"><span>Token cấp phát hôm nay:</span><strong>4,592 tokens</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Phiên bất thường bị chặn:</span><strong style="color:#b91c1c;">18 trường hợp</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Blacklist Token (Redis Cache):</span><strong>24 tokens</strong></div>
            </div>
          </div>
          <div style="border-top:1px dashed #bbb; padding-top:8px; text-align:center; font-size:10px; color:#555;">
            Cơ chế: JWT Rotation & JTI Blacklist Security Model
          </div>
        """,
        "table_rows": [
            ("Access Token hết hạn hoặc chữ ký không khớp", "TokenExpiredError: Phiên hết hạn, đang tự động làm mới.", "Client âm thầm gọi /refresh-token, không ngắt trải nghiệm."),
            ("Refresh Token nằm trong danh sách đen (Blacklist)", "401 Unauthorized: Phiên đã bị thu hồi từ thiết bị khác.", "Xóa cookie HttpOnly, chuyển hướng về trang Đăng nhập."),
            ("Đăng nhập sai quá 5 lần liên tiếp", "429 Too Many Requests: Tài khoản bị tạm khóa 15 phút.", "Khóa form đăng nhập, hiển thị đồng hồ đếm ngược mở khóa.")
        ]
    },
    {
        "id": 26,
        "filename": "hinh_4_26.png",
        "title": "Chức năng 26 - Quản trị người dùng và Ma trận phân quyền động RBAC đa cấp độ",
        "url": "https://greenspot.vn/admin/rbac-matrix",
        "active_nav": "Phân quyền",
        "left_card_title": "Ma trận Phân quyền Vai trò (RBAC Permissions Matrix)",
        "left_card_content": """
          <table style="width:100%; border-collapse:collapse; font-size:10.5px; text-align:center; margin-top:4px;">
            <thead>
              <tr style="background:#f0f2f5;">
                <th style="border:1px solid #aaa; padding:4px;">Vai trò (Role)</th>
                <th style="border:1px solid #aaa; padding:4px;">Xem cảnh báo</th>
                <th style="border:1px solid #aaa; padding:4px;">Đăng cảnh báo</th>
                <th style="border:1px solid #aaa; padding:4px;">Duyệt SOS</th>
                <th style="border:1px solid #aaa; padding:4px;">Quản trị</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style="border:1px solid #ccc; font-weight:bold; padding:4px;">SUPER_ADMIN</td><td style="border:1px solid #ccc;">✓</td><td style="border:1px solid #ccc;">✓</td><td style="border:1px solid #ccc;">✓</td><td style="border:1px solid #ccc;">✓</td></tr>
              <tr><td style="border:1px solid #ccc; font-weight:bold; padding:4px;">ALERT_MODERATOR</td><td style="border:1px solid #ccc;">✓</td><td style="border:1px solid #ccc;">✓ (Địa bàn)</td><td style="border:1px solid #ccc;">✓</td><td style="border:1px solid #ccc;">-</td></tr>
              <tr><td style="border:1px solid #ccc; font-weight:bold; padding:4px;">WARD_OFFICER</td><td style="border:1px solid #ccc;">✓</td><td style="border:1px solid #ccc;">Gửi duyệt</td><td style="border:1px solid #ccc;">Xác minh</td><td style="border:1px solid #ccc;">-</td></tr>
              <tr><td style="border:1px solid #ccc; font-weight:bold; padding:4px;">CITIZEN (Dân)</td><td style="border:1px solid #ccc;">✓ (Công khai)</td><td style="border:1px solid #ccc;">-</td><td style="border:1px solid #ccc;">Gửi SOS</td><td style="border:1px solid #ccc;">-</td></tr>
            </tbody>
          </table>
          <div style="margin-top:14px; display:flex; gap:10px;">
            <button style="border:1px solid #777; background:#fff; padding:5px 12px; border-radius:4px; font-size:11px; font-weight:600;">Thêm vai trò mới</button>
            <button style="border:1px solid #111; background:#e8ecf0; padding:5px 14px; border-radius:4px; font-size:11px; font-weight:bold;">Cập nhật ma trận</button>
          </div>
        """,
        "right_card_title": "Cơ cấu Tài khoản Người dùng",
        "right_card_content": """
          <div>
            <div style="text-align:center; margin:10px 0 14px 0;">
              <div style="font-size:36px; font-weight:bold; color:#111;">18,420</div>
              <div style="font-size:11px; color:#555;">Tổng số tài khoản trên hệ thống</div>
            </div>
            <div style="font-size:11px; line-height:1.8; color:#333;">
              <div style="display:flex; justify-content:space-between;"><span>Quản trị viên (Admin):</span><strong>12 tài khoản</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Biên tập viên cảnh báo:</span><strong>45 tài khoản</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Cán bộ Phường / Xã:</span><strong>183 tài khoản</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Công dân kích hoạt:</span><strong>18,180 tài khoản</strong></div>
            </div>
          </div>
          <div style="border-top:1px dashed #bbb; padding-top:8px; text-align:center; font-size:10px; color:#555;">
            Mô hình: Multi-tier Dynamic RBAC + Resource Scopes
          </div>
        """,
        "table_rows": [
            ("Cán bộ thao tác ngoài phạm vi thẩm quyền được cấp", "403 Forbidden: Bạn không có quyền thao tác trên tài nguyên này.", "Hiện modal cảnh báo đỏ, ghi nhận vết truy cập vào Audit Log."),
            ("Tự khóa tài khoản của chính mình", "RBAC_001: Không thể tự khóa tài khoản quản trị hiện tại.", "Vô hiệu hóa nút Khóa, hiển thị tooltip giải thích an toàn."),
            ("Khóa tài khoản có hành vi spam / vi phạm", "Tài khoản [USR-9821] đã bị tạm khóa 7 ngày.", "Ghi nhận lý do vào nhật ký, thu hồi toàn bộ token đăng nhập.")
        ]
    },
    {
        "id": 27,
        "filename": "hinh_4_27.png",
        "title": "Chức năng 27 - Hệ thống Nhật ký kiểm toán an ninh Audit Log và Giám sát truy vết biến động dữ liệu",
        "url": "https://greenspot.vn/admin/audit-logs",
        "active_nav": "Nhật ký",
        "left_card_title": "Bộ lọc Tra cứu & Phân loại Nhật ký Kiểm toán",
        "left_card_content": """
          <div style="font-size:11px; line-height:1.8; color:#222;">
            <div style="margin-bottom:8px;">
              <span>Khoảng thời gian:</span><br>
              <input type="text" value="01/09/2026 - 18/09/2026" readonly style="width:96%; padding:4px 8px; font-size:11px; border:1px solid #888; border-radius:3px; background:#fafafa; margin-top:2px;">
            </div>
            <div style="margin-bottom:8px;">
              <span>Loại hành động:</span><br>
              <select style="width:96%; padding:4px 8px; font-size:11px; border:1px solid #888; border-radius:3px; background:#fff; margin-top:2px;">
                <option>Tất cả (PUBLISH_ALERT, LOCK_USER, SOS_ACTIVATE)</option>
              </select>
            </div>
            <div>
              <span>Địa chỉ IP / Người thực hiện:</span><br>
              <input type="text" placeholder="Nhập IP (VD: 118.69.12.4) hoặc User ID" style="width:96%; padding:4px 8px; font-size:11px; border:1px solid #888; border-radius:3px; background:#fff; margin-top:2px;">
            </div>
          </div>
          <div style="margin-top:14px; display:flex; gap:10px;">
            <button style="border:1px solid #111; background:#e8ecf0; padding:5px 14px; border-radius:4px; font-size:11px; font-weight:bold;">Lọc dữ liệu</button>
            <button style="border:1px solid #777; background:#fff; padding:5px 12px; border-radius:4px; font-size:11px; font-weight:600;">Xuất nhật ký (CSV)</button>
          </div>
        """,
        "right_card_title": "Giám sát Toàn vẹn Nhật ký An ninh",
        "right_card_content": """
          <div>
            <div style="text-align:center; margin:10px 0 14px 0;">
              <div style="font-size:36px; font-weight:bold; color:#111;">126,850</div>
              <div style="font-size:11px; color:#555;">Bản ghi kiểm toán an ninh lưu vết</div>
            </div>
            <div style="font-size:11px; line-height:1.8; color:#333;">
              <div style="display:flex; justify-content:space-between;"><span>Hành động đăng cảnh báo:</span><strong>142 lượt</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Cờ cảnh báo thao tác khả nghi:</span><strong style="color:#b91c1c;">03 cờ đỏ</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Trạng thái toàn vẹn chuỗi băm:</span><strong style="color:#15803d;">HỢP LỆ (SHA-256)</strong></div>
            </div>
          </div>
          <div style="border-top:1px dashed #bbb; padding-top:8px; text-align:center; font-size:10px; color:#555;">
            Đặc tính: Tamper-evident Append-only Audit Log Hub
          </div>
        """,
        "table_rows": [
            ("Khoảng ngày lọc không hợp lệ (Ngày bắt đầu > Ngày kết thúc)", "AUD_001: Ngày bắt đầu tìm kiếm không thể sau ngày kết thúc.", "Báo đỏ khung chọn ngày, tự động gán lại khoảng 7 ngày gần nhất."),
            ("Yêu cầu sửa hoặc xóa nhật ký kiểm toán", "AUD_002: Bảng nhật ký kiểm toán an ninh là bất biến (Read-only).", "Từ chối tuyệt đối mọi yêu cầu DELETE/UPDATE từ giao diện."),
            ("Thao tác từ dải IP bất thường / VPN nước ngoài", "AUD_ALERT: Phát hiện đăng nhập quản trị từ IP bất thường.", "Tự động gắn cờ is_suspicious=True, gửi email cảnh báo an ninh.")
        ]
    },
    {
        "id": 28,
        "filename": "hinh_4_28.png",
        "title": "Chức năng 28 - Trung tâm Biên tập và Phát hành Bản tin Cảnh báo Ô nhiễm Môi trường Khẩn cấp",
        "url": "https://greenspot.vn/admin/alert-publishing",
        "active_nav": "Cảnh báo",
        "left_card_title": "Biên tập Bản tin Cảnh báo Ô nhiễm",
        "left_card_content": """
          <div style="font-size:11px; line-height:1.7; color:#222;">
            <div style="margin-bottom:6px;">
              <span>Tiêu đề cảnh báo:</span>
              <input type="text" value="Cảnh báo mùi khói khét rác thải khu vực P. Linh Trung" style="width:96%; padding:4px 8px; font-size:11px; border:1px solid #777; border-radius:3px; margin-top:2px;">
            </div>
            <div style="margin-bottom:6px;">
              <span>Cấp độ cảnh báo:</span> &nbsp;
              <span style="background:#fee2e2; border:1px solid #ef4444; color:#b91c1c; padding:2px 8px; border-radius:4px; font-weight:bold;">Mức 3 - ĐỎ (Khẩn cấp nguy hại)</span>
            </div>
            <div style="margin-bottom:6px;">
              <span>Phạm vi ảnh hưởng:</span>
              <input type="text" value="P. Linh Trung, P. Linh Chiểu, TP. Thủ Đức" style="width:96%; padding:4px 8px; font-size:11px; border:1px solid #777; border-radius:3px; margin-top:2px;">
            </div>
            <div style="margin-bottom:8px;">
              <span>Khuyến cáo nhân dân:</span>
              <textarea rows="2" style="width:96%; padding:4px 8px; font-size:10.5px; border:1px solid #777; border-radius:3px; margin-top:2px;">Đóng kín cửa sổ, hạn chế ra ngoài, đeo khẩu trang lọc bụi N95 khi di chuyển qua khu vực.</textarea>
            </div>
          </div>
          <button style="background:#ef4444; color:#fff; border:none; padding:6px 16px; border-radius:4px; font-weight:bold; font-size:11px;">Phát hành Cảnh báo Ngay</button>
        """,
        "right_card_title": "Phạm vi Tác động & Tự động Hóa",
        "right_card_content": """
          <div>
            <div style="text-align:center; margin:10px 0 14px 0;">
              <div style="font-size:36px; font-weight:bold; color:#111;">45,820</div>
              <div style="font-size:11px; color:#555;">Người dân trong vùng nhận thông báo đẩy tức thì</div>
            </div>
            <div style="font-size:11px; line-height:1.8; color:#333;">
              <div style="display:flex; justify-content:space-between;"><span>Bán kính tác động tự động:</span><strong>2.0 km</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Kênh phát sóng:</span><strong>In-App, Web Push, Banner đỏ</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Trạng thái phát sóng:</span><strong style="color:#15803d;">Sẵn sàng phát tin</strong></div>
            </div>
          </div>
          <div style="border-top:1px dashed #bbb; padding-top:8px; text-align:center; font-size:10px; color:#555;">
            Cơ chế: Real-time Geo-Push Notification Engine
          </div>
        """,
        "table_rows": [
            ("Tiêu đề bản tin để trống hoặc dưới 10 ký tự", "WARN_001: Tiêu đề bản tin cảnh báo phải có độ dài từ 10 ký tự trở lên.", "Viền đỏ ô tiêu đề, hiện tooltip thông báo lỗi."),
            ("Chưa chọn địa bàn hành chính chịu ảnh hưởng", "WARN_003: Vui lòng chọn ít nhất một Phường/Xã chịu ảnh hưởng.", "Rung nhẹ khung chọn địa bàn, hiển thị toast đỏ cảnh báo."),
            ("Phát hành bản tin cấp Đỏ (Khẩn cấp nguy hại)", "Cảnh báo: Bản tin cấp Đỏ sẽ kích hoạt Push toàn bộ cư dân.", "Mở Modal xác nhận 2 lớp kèm mã OTP trước khi xuất bản.")
        ]
    },
    {
        "id": 29,
        "filename": "hinh_4_29.png",
        "title": "Chức năng 29 - Hệ thống Điều phối Thông báo Đẩy (Push Notification) Cảnh báo Ô nhiễm theo Thời gian thực",
        "url": "https://greenspot.vn/admin/push-dispatch",
        "active_nav": "Cảnh báo",
        "left_card_title": "Hàng đợi Điều phối Thông báo Đẩy (Push Dispatch Queue)",
        "left_card_content": """
          <div style="font-size:11px; line-height:1.8; color:#222;">
            <div style="display:flex; justify-content:space-between; border-bottom:1px dashed #e0e0e0; padding:3px 0;">
              <span>Tốc độ phát tán thông báo:</span><strong>5,000 thông báo / giây</strong>
            </div>
            <div style="display:flex; justify-content:space-between; border-bottom:1px dashed #e0e0e0; padding:3px 0;">
              <span>Kênh thông báo chủ đạo:</span><strong>In-App Bell (Chuông đỏ) & Web Push</strong>
            </div>
            <div style="display:flex; justify-content:space-between; border-bottom:1px dashed #e0e0e0; padding:3px 0;">
              <span>Thời gian trễ trung bình:</span><strong>0.85 giây</strong>
            </div>
            <div style="display:flex; justify-content:space-between; border-bottom:1px dashed #e0e0e0; padding:3px 0;">
              <span>Thuật toán khử trùng lặp (Deduplication):</span><strong>Bật (Cửa sổ 5 phút)</strong>
            </div>
            <div style="display:flex; justify-content:space-between; padding:3px 0;">
              <span>Tiến độ phát tin đợt hiện tại:</span><strong style="color:#15803d;">Hoàn tất 100%</strong>
            </div>
          </div>
          <div style="margin-top:14px; display:flex; gap:10px;">
            <button style="border:1px solid #111; background:#e8ecf0; padding:5px 14px; border-radius:4px; font-size:11px; font-weight:bold;">Xem chi tiết hàng đợi</button>
            <button style="border:1px solid #777; background:#fff; padding:5px 12px; border-radius:4px; font-size:11px; font-weight:600;">Kiểm tra kết nối Push</button>
          </div>
        """,
        "right_card_title": "Hiệu suất Chuyển phát Thông báo",
        "right_card_content": """
          <div>
            <div style="text-align:center; margin:10px 0 14px 0;">
              <div style="font-size:36px; font-weight:bold; color:#15803d;">99.4%</div>
              <div style="font-size:11px; color:#555;">Tỷ lệ thông báo chuyển phát thành công</div>
            </div>
            <div style="font-size:11px; line-height:1.8; color:#333;">
              <div style="display:flex; justify-content:space-between;"><span>Tổng số thông báo gửi:</span><strong>45,820 tin</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Chuyển phát thành công:</span><strong>45,540 thiết bị</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Lưu đệm chờ online:</span><strong>280 thiết bị</strong></div>
            </div>
          </div>
          <div style="border-top:1px dashed #bbb; padding-top:8px; text-align:center; font-size:10px; color:#555;">
            Hạ tầng: Asynchronous Push Notification Worker Pool
          </div>
        """,
        "table_rows": [
            ("Trùng lặp thông báo trong khoảng thời gian ngắn", "PUSH_001: Thông báo cảnh báo trùng lặp đã được loại trừ tự động.", "Bỏ qua tin trùng lặp, không gửi lại để tránh quấy rầy người dùng."),
            ("Trình duyệt người dùng chặn quyền Push Notification", "PUSH_FALLBACK: Trình duyệt không hỗ trợ hoặc chặn quyền Push.", "Tự động chuyển sang thông báo In-App qua biểu tượng Chuông đỏ."),
            ("Hàng đợi gửi tin bị nghẽn do sự cố diện rộng", "PUSH_RETRY: Kích hoạt cơ chế giãn nở hàng đợi Exponential Backoff.", "Tự động chia nhỏ mẻ gửi 1,000 tin/lần để tránh sập máy chủ.")
        ]
    },
    {
        "id": 30,
        "filename": "hinh_4_30.png",
        "title": "Chức năng 30 - Cổng Tra cứu Công khai Tiến độ và Lịch sử Xử lý Sự cố Dành cho Người Dân",
        "url": "https://greenspot.vn/tracking",
        "active_nav": "Giám sát",
        "left_card_title": "Tra cứu Tiến độ Công khai (Không cần Đăng nhập)",
        "left_card_content": """
          <div style="font-size:11px; line-height:1.7; color:#222;">
            <div style="display:flex; gap:8px; margin-bottom:12px;">
              <input type="text" value="INC-2026-0042" style="flex:1; padding:6px 10px; font-size:12px; font-weight:bold; border:1.5px solid #333; border-radius:4px;">
              <button style="background:#15803d; color:#fff; border:none; padding:6px 14px; border-radius:4px; font-weight:bold; font-size:11px;">Tra Cứu</button>
            </div>
            <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:10px;">
              <div style="font-size:11.5px; font-weight:bold; margin-bottom:4px; color:#0f172a;">Tiến trình xử lý hồ sơ:</div>
              <div style="font-size:10.5px; color:#334155; line-height:1.6;">
                • <strong>14:20 - 15/09:</strong> Tiếp nhận phản ánh rác thải tồn đọng.<br>
                • <strong>16:00 - 15/09:</strong> Cán bộ kiểm tra hiện trường và lập kế hoạch thu dọn.<br>
                • <strong>09:30 - 16/09:</strong> Đã thu gom 4.5 m³ rác, khử trùng sạch sẽ [HOÀN TẤT].
              </div>
            </div>
          </div>
        """,
        "right_card_title": "Minh bạch Hình ảnh Hiện trường Before / After",
        "right_card_content": """
          <div>
            <div style="text-align:center; margin:8px 0 10px 0;">
              <div style="font-size:32px; font-weight:bold; color:#15803d;">ĐÃ KHẮC PHỤC</div>
              <div style="font-size:11px; color:#555;">Hồ sơ đã được nghiệm thu và công khai kết quả</div>
            </div>
            <div style="display:flex; gap:8px; justify-content:center; margin:6px 0;">
              <div style="border:1px solid #bbb; padding:4px; border-radius:4px; text-align:center; font-size:10px; background:#fef2f2; width:46%;">
                [Ảnh Trước: Bãi rác tự phát]
              </div>
              <div style="border:1px solid #bbb; padding:4px; border-radius:4px; text-align:center; font-size:10px; background:#f0fdf4; width:46%;">
                [Ảnh Sau: Đã dọn sạch 100%]
              </div>
            </div>
            <div style="font-size:10px; color:#64748b; text-align:center; margin-top:4px;">
              Người phản ánh: Công dân (090****123 - Đã ẩn danh bảo mật)
            </div>
          </div>
          <div style="border-top:1px dashed #bbb; padding-top:6px; text-align:center; font-size:10px; color:#555;">
            Tiêu chuẩn: Open Transparency & Privacy Masking Protocol
          </div>
        """,
        "table_rows": [
            ("Mã tra cứu để trống hoặc không đúng định dạng", "TRK_002: Mã sự cố không đúng định dạng chuẩn (Ví dụ: INC-2026-0042).", "Báo lỗi viền đỏ ô tìm kiếm, gợi ý cú pháp mẫu."),
            ("Không tìm thấy bản ghi sự cố trong hệ thống", "TRK_003: Không tìm thấy hồ sơ sự cố tương ứng với mã đã nhập.", "Hiển thị thông báo không tìm thấy, gợi ý kiểm tra lại mã."),
            ("Bảo vệ quyền riêng tư của người báo ban đầu", "PRIVACY_MASK: Tự động che số điện thoại và họ tên công dân.", "Chỉ hiển thị 090****123, bảo vệ danh tính tuyệt đối trước cộng đồng.")
        ]
    },
    {
        "id": 31,
        "filename": "hinh_4_31.png",
        "title": "Chức năng 31 - Bản đồ Giám sát Hiện trạng Điểm Cảnh báo Ô nhiễm Trực quan cho Cộng đồng",
        "url": "https://greenspot.vn/map-viewer",
        "active_nav": "Bản đồ",
        "left_card_title": "Không gian Giám sát Điểm Cảnh báo (Leaflet Map Viewer)",
        "left_card_content": """
          <div style="border:1px solid #cbd5e1; border-radius:6px; height:190px; background:#f1f5f9; display:flex; flex-direction:column; justify-content:space-between; padding:8px;">
            <div style="display:flex; justify-content:space-between; font-size:10.5px;">
              <span style="background:#fff; border:1px solid #cbd5e1; padding:2px 8px; border-radius:4px; font-weight:bold;">Tâm bản đồ: TP. Thủ Đức</span>
              <span style="background:#fff; border:1px solid #cbd5e1; padding:2px 8px; border-radius:4px;">Bán kính xem: 5.0 km</span>
            </div>
            <div style="text-align:center; font-size:11px; color:#475569;">
              [Bản đồ số đường phố: 14 Marker cảnh báo ô nhiễm]<br>
              <span style="color:#b91c1c; font-weight:bold;">● Đỏ: 2 điểm</span> &nbsp;|&nbsp; 
              <span style="color:#ea580c; font-weight:bold;">● Cam: 5 điểm</span> &nbsp;|&nbsp; 
              <span style="color:#ca8a04; font-weight:bold;">● Vàng: 7 điểm</span>
            </div>
            <div style="display:flex; gap:6px; font-size:10px;">
              <button style="border:1px solid #64748b; background:#fff; padding:3px 8px; border-radius:3px;">Định vị vị trí tôi</button>
              <button style="border:1px solid #64748b; background:#fff; padding:3px 8px; border-radius:3px;">Lọc loại ô nhiễm</button>
            </div>
          </div>
        """,
        "right_card_title": "Chi tiết Điểm Cảnh báo Đang Chọn",
        "right_card_content": """
          <div>
            <div style="font-size:12px; font-weight:bold; color:#b91c1c; margin-bottom:4px;">Điểm nóng: Ngã tư Linh Trung - Kha Vạn Cân</div>
            <div style="font-size:10.5px; line-height:1.6; color:#334155;">
              • <strong>Cấp độ:</strong> <span style="color:#b91c1c; font-weight:bold;">Cấp 3 - ĐỎ (Khẩn cấp nguy hại)</span><br>
              • <strong>Loại sự cố:</strong> Khói độc phát tán từ bãi phế liệu tự phát.<br>
              • <strong>Khoảng cách:</strong> Cách vị trí của bạn <strong>1.2 km</strong>.<br>
              • <strong>Khuyến cáo:</strong> Tránh đi qua tuyến đường Kha Vạn Cân đoạn km 12; người dân khu vực cần đóng kín cửa nhà.
            </div>
          </div>
          <div style="border-top:1px dashed #bbb; padding-top:6px; text-align:center; font-size:10px; color:#555;">
            Công nghệ: Leaflet GeoJSON Vector Layer + Marker Clustering
          </div>
        """,
        "table_rows": [
            ("Tọa độ GPS điểm cảnh báo nằm ngoài ranh giới bản đồ", "MAP_001: Tọa độ vị trí điểm cảnh báo không hợp lệ trên bản đồ.", "Bỏ qua marker lỗi, thông báo cho quản trị viên kiểm tra tọa độ."),
            ("Người dùng từ chối cấp quyền định vị vị trí GPS", "GEOLOC_DENIED: Không thể lấy tọa độ vị trí hiện tại.", "Tự động căn tâm bản đồ về trụ sở UBND thành phố."),
            ("Mất kết nối Internet trong quá trình xem bản đồ", "MAP_OFFLINE: Thiết bị mất kết nối mạng Internet.", "Giữ nguyên các điểm đã nạp trong bộ nhớ đệm (Offline Cache).")
        ]
    },
    {
        "id": 32,
        "filename": "hinh_4_32.png",
        "title": "Chức năng 32 - Cơ chế Đăng ký Nhận Tin Cảnh báo Cá nhân hóa theo Khu Vực / Địa Bàn Cư Trú",
        "url": "https://greenspot.vn/profile/alert-preferences",
        "active_nav": "Cài đặt",
        "left_card_title": "Tùy biến Khu vực Địa bàn Cư trú Theo dõi",
        "left_card_content": """
          <div style="font-size:11px; line-height:1.8; color:#222;">
            <div style="font-weight:bold; margin-bottom:4px;">Chọn tối đa 05 Phường/Xã quan tâm:</div>
            <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:4px; padding:6px 10px; font-size:10.5px;">
              <label><input type="checkbox" checked> <strong>Phường Linh Trung</strong> (Nơi ở hiện tại)</label><br>
              <label><input type="checkbox" checked> <strong>Phường Tăng Nhơn Phú A</strong> (Khu công nghệ cao / Nơi làm việc)</label><br>
              <label><input type="checkbox" checked> <strong>Phường Linh Chiểu</strong> (Trường học của con)</label><br>
              <label><input type="checkbox"> Phường Hiệp Phú</label><br>
              <label><input type="checkbox"> Phường Bình Thọ</label>
            </div>
            <div style="margin-top:8px; font-size:10.5px;">
              <span>Kênh nhận tin:</span> &nbsp;
              <label><input type="checkbox" checked> Chuông Web</label> &nbsp;
              <label><input type="checkbox" checked> Email</label>
            </div>
          </div>
          <button style="margin-top:10px; background:#15803d; color:#fff; border:none; padding:5px 14px; border-radius:4px; font-weight:bold; font-size:11px;">Lưu Cấu Hình Nhận Tin</button>
        """,
        "right_card_title": "Cấu hình Ngưỡng & Tần suất Nhận Cảnh báo",
        "right_card_content": """
          <div>
            <div style="text-align:center; margin:10px 0 12px 0;">
              <div style="font-size:36px; font-weight:bold; color:#111;">03 / 05</div>
              <div style="font-size:11px; color:#555;">Khu vực địa bàn đang theo dõi tích cực</div>
            </div>
            <div style="font-size:11px; line-height:1.8; color:#333;">
              <div style="display:flex; justify-content:space-between;"><span>Ngưỡng cảnh báo tối thiểu:</span><strong>Mức Cam & Đỏ</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Khung giờ yên tĩnh:</span><strong>22:00 - 06:00 (Mute)</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Email xác thực:</span><strong style="color:#15803d;">quan.bui@gmail.com (✓)</strong></div>
            </div>
          </div>
          <div style="border-top:1px dashed #bbb; padding-top:8px; text-align:center; font-size:10px; color:#555;">
            Tính năng: Granular Alert Subscription & Privacy Controls
          </div>
        """,
        "table_rows": [
            ("Người dùng chọn quá 5 khu vực theo dõi", "SUB_001: Bạn chỉ có thể đăng ký theo dõi tối đa 5 khu vực địa bàn.", "Khóa checkbox thứ 6, hiển thị thông báo giới hạn tài nguyên."),
            ("Tắt toàn bộ các kênh nhận tin (Bỏ chọn cả Web và Email)", "SUB_002: Vui lòng giữ ít nhất một kênh nhận tin hoạt động.", "Ngăn không cho lưu cấu hình rỗng, đánh dấu đỏ mục kênh nhận tin."),
            ("Địa chỉ email chưa được xác minh danh tính", "SUB_003: Địa chỉ email chưa được xác minh. Vui lòng xác thực email.", "Hiện nút Gửi liên kết xác thực vào hòm thư công dân.")
        ]
    },
    {
        "id": 33,
        "filename": "hinh_4_33.png",
        "title": "Chức năng 33 - Bảng Tổng quan Chỉ số Hiện trạng Môi trường Đô thị Công cộng (Public Environmental Dashboard)",
        "url": "https://greenspot.vn/dashboard",
        "active_nav": "Tổng quan",
        "left_card_title": "Chỉ số Môi trường Đô thị Công cộng (Public Transparency KPI)",
        "left_card_content": """
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:11px;">
            <div style="background:#fef2f2; border:1px solid #fca5a5; padding:10px; border-radius:6px; text-align:center;">
              <div style="font-size:22px; font-weight:bold; color:#b91c1c;">14</div>
              <div style="font-size:10px; color:#7f1d1d;">Điểm Cảnh báo Đang Mở</div>
            </div>
            <div style="background:#f0fdf4; border:1px solid #86efac; padding:10px; border-radius:6px; text-align:center;">
              <div style="font-size:22px; font-weight:bold; color:#15803d;">1,420</div>
              <div style="font-size:10px; color:#14532d;">Sự cố Đã Xử Lý Sạch</div>
            </div>
            <div style="background:#eff6ff; border:1px solid #93c5fd; padding:10px; border-radius:6px; text-align:center;">
              <div style="font-size:22px; font-weight:bold; color:#1d4ed8;">94.2%</div>
              <div style="font-size:10px; color:#1e3a8a;">Tỷ lệ Khu vực An toàn</div>
            </div>
            <div style="background:#faf5ff; border:1px solid #d8b4fe; padding:10px; border-radius:6px; text-align:center;">
              <div style="font-size:22px; font-weight:bold; color:#7e22ce;">3.5 giờ</div>
              <div style="font-size:10px; color:#581c87;">Thời gian phản hồi TB</div>
            </div>
          </div>
          <div style="margin-top:10px; font-size:10px; color:#64748b; text-align:center;">
            Dữ liệu tổng hợp tự động từ 16 Quận/Huyện và TP. Thủ Đức
          </div>
        """,
        "right_card_title": "Cơ cấu Ô nhiễm & Xếp hạng Phường Xanh",
        "right_card_content": """
          <div>
            <div style="font-size:11px; font-weight:bold; color:#333; margin-bottom:4px;">Cơ cấu Loại hình Ô nhiễm tháng 09/2026:</div>
            <div style="font-size:10px; line-height:1.6; color:#475569; margin-bottom:8px;">
              • Rác thải sinh hoạt tồn đọng: <strong>60%</strong><br>
              • Khói bụi / Mùi hóa chất: <strong>22%</strong><br>
              • Xả nước thải đen kênh rạch: <strong>15%</strong><br>
              • Tiếng ồn ban đêm: <strong>3%</strong>
            </div>
            <div style="font-size:11px; font-weight:bold; color:#15803d; margin-bottom:2px;">Top 1 Phường Xanh - Sạch - Đẹp:</div>
            <div style="font-size:10.5px; color:#334155;">Phường Thảo Điền (98/100 điểm môi trường)</div>
          </div>
          <div style="border-top:1px dashed #bbb; padding-top:6px; text-align:center; font-size:10px; color:#555;">
            Tốc độ tải: 0.45 giây (Redis Cached Materialized View)
          </div>
        """,
        "table_rows": [
            ("Dữ liệu thống kê đang trong quá trình tính toán lại", "DSH_001: Đang cập nhật dữ liệu thống kê chu kỳ đầu tiên.", "Trả về bản lưu đệm gần nhất (Stale-While-Revalidate), không ngắt trang."),
            ("Trình duyệt không hỗ trợ đồ họa canvas Chart.js", "DSH_002: Trình duyệt không hỗ trợ hiển thị biểu đồ đồ họa.", "Tự động chuyển đổi sang bảng số liệu văn bản thay thế."),
            ("Người dân tra cứu vào thời điểm lưu lượng truy cập cao", "DSH_FAST: Tải trang tốc độ cao từ CDN Edge Cache.", "Bảo đảm thời gian phản hồi dưới 1 giây cho toàn bộ công dân.")
        ]
    },
    {
        "id": 34,
        "filename": "hinh_4_34.png",
        "title": "Chức năng 34 - Quản trị Ngưỡng Kích hoạt Cảnh báo và Phân loại Mức độ Nghiêm trọng Sự cố",
        "url": "https://greenspot.vn/admin/alert-thresholds",
        "active_nav": "Cấu hình",
        "left_card_title": "Danh mục Cấp độ & Ngưỡng Kích hoạt Tự động",
        "left_card_content": """
          <table style="width:100%; border-collapse:collapse; font-size:10.5px; text-align:center; margin-top:4px;">
            <thead>
              <tr style="background:#f1f5f9;">
                <th style="border:1px solid #cbd5e1; padding:4px;">Mức độ</th>
                <th style="border:1px solid #cbd5e1; padding:4px;">Bán kính phát</th>
                <th style="border:1px solid #cbd5e1; padding:4px;">Kênh phát</th>
                <th style="border:1px solid #cbd5e1; padding:4px;">Khuyến cáo</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style="border:1px solid #cbd5e1; font-weight:bold; color:#ca8a04; padding:4px;">Mức 1 (Vàng)</td><td style="border:1px solid #cbd5e1;">0.5 km</td><td style="border:1px solid #cbd5e1;">In-App Bell</td><td style="border:1px solid #cbd5e1;">Chú ý vệ sinh</td></tr>
              <tr><td style="border:1px solid #cbd5e1; font-weight:bold; color:#ea580c; padding:4px;">Mức 2 (Cam)</td><td style="border:1px solid #cbd5e1;">1.0 km</td><td style="border:1px solid #cbd5e1;">In-App + Push</td><td style="border:1px solid #cbd5e1;">Đeo khẩu trang</td></tr>
              <tr><td style="border:1px solid #cbd5e1; font-weight:bold; color:#b91c1c; padding:4px;">Mức 3 (Đỏ)</td><td style="border:1px solid #cbd5e1;">2.0 km</td><td style="border:1px solid #cbd5e1;">Toàn bộ kênh + SOS</td><td style="border:1px solid #cbd5e1;">Đóng kín cửa nhà</td></tr>
            </tbody>
          </table>
          <div style="margin-top:14px; display:flex; gap:10px;">
            <button style="border:1px solid #111; background:#e8ecf0; padding:5px 14px; border-radius:4px; font-size:11px; font-weight:bold;">Chỉnh sửa quy chuẩn</button>
            <button style="border:1px solid #777; background:#fff; padding:5px 12px; border-radius:4px; font-size:11px; font-weight:600;">Khôi phục chuẩn BYT</button>
          </div>
        """,
        "right_card_title": "Quy chuẩn Định mức Áp dụng Đô thị",
        "right_card_content": """
          <div>
            <div style="text-align:center; margin:10px 0 14px 0;">
              <div style="font-size:36px; font-weight:bold; color:#111;">03</div>
              <div style="font-size:11px; color:#555;">Cấp độ cảnh báo chuẩn hóa theo QCVN</div>
            </div>
            <div style="font-size:11px; line-height:1.8; color:#333;">
              <div style="display:flex; justify-content:space-between;"><span>Bán kính bảo vệ tối thiểu:</span><strong>0.5 km</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Bán kính bảo vệ tối đa:</span><strong>10.0 km</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Tiêu chuẩn tham chiếu:</span><strong>QCVN 05:2023/BTNMT</strong></div>
            </div>
          </div>
          <div style="border-top:1px dashed #bbb; padding-top:8px; text-align:center; font-size:10px; color:#555;">
            Chính sách: Automated Severity Escalation & Geo-threshold
          </div>
        """,
        "table_rows": [
            ("Thiết lập bán kính cảnh báo nhỏ hơn 0.5 km", "RULE_001: Bán kính cảnh báo không thể nhỏ hơn 0.5 km.", "Báo lỗi viền đỏ ô bán kính, tự động khôi phục mức 0.5 km."),
            ("Thiết lập bán kính cảnh báo vượt quá 10.0 km", "RULE_002: Bán kính cảnh báo tối đa cho một sự cố đô thị là 10.0 km.", "Ngăn chặn giá trị quá lớn để tránh gây nhiễu người dân toàn thành."),
            ("Bỏ trống nội dung mẫu khuyến cáo y tế", "RULE_003: Mẫu thông điệp khuyến cáo y tế không được để trống.", "Yêu cầu nhập đầy đủ hướng dẫn phòng hộ bảo vệ sức khỏe.")
        ]
    },
    {
        "id": 35,
        "filename": "hinh_4_35.png",
        "title": "Chức năng 35 - Kênh Tiếp nhận Tín hiệu Cứu nạn Môi trường Khẩn cấp (SOS Environmental Alert Channel)",
        "url": "https://greenspot.vn/admin/sos-intake",
        "active_nav": "Cảnh báo",
        "left_card_title": "Bảng Điều khiển Trực ban Khẩn cấp SOS",
        "left_card_content": """
          <div style="font-size:11px; line-height:1.7; color:#222;">
            <div style="background:#fef2f2; border:1px solid #f87171; border-radius:6px; padding:8px 10px; margin-bottom:8px;">
              <div style="display:flex; justify-content:space-between; font-weight:bold; color:#991b1b;">
                <span>TÍN HIỆU SOS MỚI NHẬN</span><span>14:15 - Vừa xong</span>
              </div>
              <div style="font-size:10.5px; color:#450a0a; margin-top:2px;">
                • Vị trí: Bờ kênh Ba Bò, P. Bình Chiểu, TP. Thủ Đức<br>
                • Sự cố: Tràn hóa chất màu tím sủi bọt nồng nặc bốc mùi cay mắt.<br>
                • SĐT người báo khẩn: <strong>0982.***.891</strong> (Đang kết nối trực ban)
              </div>
            </div>
            <div style="display:flex; gap:8px;">
              <button style="background:#dc2626; color:#fff; border:none; padding:5px 12px; border-radius:4px; font-weight:bold; font-size:11px;">Kích hoạt Banner Khẩn Cấp Toàn Cổng</button>
              <button style="border:1px solid #777; background:#fff; padding:5px 10px; border-radius:4px; font-size:11px;">Gọi Xác Minh Ngay</button>
            </div>
          </div>
        """,
        "right_card_title": "Chỉ số Trực ban Khẩn cấp 24/7",
        "right_card_content": """
          <div>
            <div style="text-align:center; margin:10px 0 14px 0;">
              <div style="font-size:36px; font-weight:bold; color:#dc2626;">02</div>
              <div style="font-size:11px; color:#555;">Cuộc gọi / Tín hiệu SOS đang xử lý khẩn cấp</div>
            </div>
            <div style="font-size:11px; line-height:1.8; color:#333;">
              <div style="display:flex; justify-content:space-between;"><span>Thời gian can thiệp trung bình:</span><strong>8 phút</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Trạng thái Banner khẩn cấp:</span><strong style="color:#dc2626;">ĐANG PHÁT SÓNG</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Đơn vị cơ động tiếp nhận:</span><strong>Đội phản ứng nhanh PCCC</strong></div>
            </div>
          </div>
          <div style="border-top:1px dashed #bbb; padding-top:8px; text-align:center; font-size:10px; color:#555;">
            Kênh liên thông: Public SOS Emergency Dispatcher Link
          </div>
        """,
        "table_rows": [
            ("Số điện thoại khẩn không hợp lệ khi gửi tin SOS", "SOS_001: Vui lòng nhập số điện thoại hợp lệ để cán bộ liên hệ ngay.", "Báo lỗi viền đỏ ô SĐT, yêu cầu nhập đúng 10 số di động."),
            ("Người dùng bấm gửi tin SOS liên tiếp trong thời gian ngắn", "SOS_003: Bạn vừa gửi tin khẩn cấp. Cán bộ trực ban đang xử lý liên hệ.", "Khóa nút gửi 5 phút để chống spam phá hoại hệ thống."),
            ("Cán bộ kích hoạt Banner khẩn cấp toàn cổng thông tin", "BROADCAST_ACTIVE: Đã phát dải Banner đỏ trên đầu toàn bộ website.", "Hiển thị dải banner chữ chạy thông báo nguy cấp cho toàn bộ nhân dân.")
        ]
    },
    {
        "id": 36,
        "filename": "hinh_4_36.png",
        "title": "Chức năng 36 - Trung tâm Kết xuất Bản tin Báo cáo Hiện trạng Môi trường Công khai (PDF/Excel)",
        "url": "https://greenspot.vn/open-data/reports",
        "active_nav": "Báo cáo",
        "left_card_title": "Trung tâm Kết xuất Báo cáo & Dữ liệu Mở Môi trường",
        "left_card_content": """
          <div style="font-size:11px; line-height:1.8; color:#222;">
            <div style="margin-bottom:8px;">
              <span>Chọn kỳ báo cáo công khai:</span><br>
              <select style="width:96%; padding:4px 8px; font-size:11px; border:1px solid #888; border-radius:3px; background:#fff; margin-top:2px;">
                <option>Bản tin Môi trường Tháng 09/2026 (Chính thức)</option>
                <option>Bản tin Môi trường Quý III/2026 (Tổng hợp)</option>
              </select>
            </div>
            <div style="margin-bottom:12px;">
              <span>Phạm vi trích xuất dữ liệu mở:</span><br>
              <select style="width:96%; padding:4px 8px; font-size:11px; border:1px solid #888; border-radius:3px; background:#fff; margin-top:2px;">
                <option>Toàn Thành phố (Đầy đủ các Quận/Huyện)</option>
                <option>Riêng TP. Thủ Đức</option>
              </select>
            </div>
            <div style="display:flex; gap:10px;">
              <button style="background:#b91c1c; color:#fff; border:none; padding:6px 14px; border-radius:4px; font-weight:bold; font-size:11px;">Tải Bản Tin PDF</button>
              <button style="background:#15803d; color:#fff; border:none; padding:6px 14px; border-radius:4px; font-weight:bold; font-size:11px;">Tải Dữ Liệu Mở (.xlsx)</button>
            </div>
          </div>
        """,
        "right_card_title": "Thống kê Tiếp cận Dữ liệu Môi trường Mở",
        "right_card_content": """
          <div>
            <div style="text-align:center; margin:10px 0 14px 0;">
              <div style="font-size:36px; font-weight:bold; color:#111;">12,650</div>
              <div style="font-size:11px; color:#555;">Lượt tải bản tin và số liệu môi trường cộng đồng</div>
            </div>
            <div style="font-size:11px; line-height:1.8; color:#333;">
              <div style="display:flex; justify-content:space-between;"><span>Số kỳ bản tin đã xuất bản:</span><strong>48 kỳ</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Bảo vệ quyền riêng tư:</span><strong style="color:#15803d;">Ẩn danh 100%</strong></div>
              <div style="display:flex; justify-content:space-between;"><span>Định dạng hỗ trợ:</span><strong>PDF (A4 chuẩn in), Excel (OpenData)</strong></div>
            </div>
          </div>
          <div style="border-top:1px dashed #bbb; padding-top:8px; text-align:center; font-size:10px; color:#555;">
            Tiêu chuẩn: Open Environmental Data & Public Transparency
          </div>
        """,
        "table_rows": [
            ("Lọc bỏ dữ liệu cá nhân nhạy cảm khi xuất dữ liệu mở", "OPEN_001: Dữ liệu đã được ẩn danh hóa chuẩn bảo vệ quyền riêng tư.", "Tự động loại bỏ cột Họ tên, Số điện thoại, Email, IP người phản ánh."),
            ("Khoảng thời gian trích xuất dữ liệu vượt quá 1 năm", "OPEN_002: Vui lòng chọn khoảng thời gian trích xuất tối đa 1 năm.", "Báo lỗi giới hạn kỳ báo cáo để tối ưu dung lượng tệp tin."),
            ("Kỳ báo cáo tháng hiện tại chưa kết thúc chu kỳ", "OPEN_STATUS: Kỳ báo cáo đang diễn ra. Đang xuất bản sơ bộ.", "Đóng dấu chìm watermark 'BẢN THẢO TẠM THỜI' trên tệp PDF.")
        ]
    }
]

template = """<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1051px;
    height: 657px;
    background: #ffffff;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    border: 1.5px solid #222;
    overflow: hidden;
  }
  .browser-header {
    height: 38px;
    border-bottom: 1.5px solid #333;
    display: flex;
    align-items: center;
    padding: 0 12px;
    background: #ffffff;
    gap: 12px;
  }
  .nav-arrows { font-size: 14px; font-weight: bold; color: #333; display: flex; gap: 8px; }
  .url-bar {
    flex: 1;
    height: 24px;
    border: 1px solid #444;
    border-radius: 4px;
    padding: 0 10px;
    font-size: 11px;
    color: #333;
    display: flex;
    align-items: center;
    background: #fafafa;
  }
  .window-btns { font-size: 12px; color: #555; }
  .browser-body {
    display: flex;
    height: calc(657px - 38px);
  }
  .sidebar {
    width: 108px;
    border-right: 1.5px solid #333;
    padding: 8px 6px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .brand-logo {
    font-size: 14px;
    font-weight: 800;
    text-align: center;
    margin-bottom: 2px;
    color: #111;
  }
  .nav-btn {
    border: 1px solid #777;
    border-radius: 4px;
    padding: 3px 2px;
    font-size: 10px;
    font-weight: 600;
    text-align: center;
    background: #fff;
    color: #222;
  }
  .nav-btn.active {
    background: #e8ecf0;
    border: 1.5px solid #111;
    font-weight: bold;
  }
  .main-content {
    flex: 1;
    padding: 10px 16px;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    gap: 8px;
  }
  .page-title {
    font-size: 15px;
    font-weight: bold;
    color: #111;
    margin-bottom: 2px;
  }
  .panels-row {
    display: flex;
    gap: 12px;
    height: 270px;
  }
  .panel-card {
    border: 1px solid #444;
    border-radius: 6px;
    padding: 10px 12px;
    background: #fff;
  }
  .panel-card.left { flex: 1.25; display: flex; flex-direction: column; justify-content: flex-start; }
  .panel-card.right { flex: 0.95; display: flex; flex-direction: column; justify-content: space-between; }
  .card-title {
    font-size: 12px;
    font-weight: bold;
    color: #111;
    margin-bottom: 6px;
  }
  .table-error {
    border: 1px solid #555;
    border-collapse: collapse;
    width: 100%;
    font-size: 9.5px;
  }
  .table-error th {
    background: #e9ecef;
    border: 1px solid #666;
    padding: 3px 5px;
    font-weight: bold;
    color: #222;
  }
  .table-error td {
    border: 1px solid #777;
    padding: 2.5px 5px;
    color: #222;
  }
</style>
</head>
<body>
  <div class="browser-header">
    <div class="nav-arrows">← &nbsp; → &nbsp; ✕</div>
    <div class="url-bar">__URL__</div>
    <div class="window-btns">▢</div>
  </div>
  <div class="browser-body">
    <div class="sidebar">
      <div class="brand-logo">GreenSpot</div>
      __SIDEBAR_HTML__
    </div>
    <div class="main-content">
      <div class="page-title">__TITLE__</div>
      <div class="panels-row">
        <div class="panel-card left">
          <div class="card-title">__LEFT_CARD_TITLE__</div>
          __LEFT_CARD_CONTENT__
        </div>
        <div class="panel-card right">
          <div class="card-title">__RIGHT_CARD_TITLE__</div>
          __RIGHT_CARD_CONTENT__
        </div>
      </div>
      <div>
        <div style="font-size:11px; font-weight:bold; margin-bottom:3px;">Mô tả nhanh / xử lý lỗi</div>
        <table class="table-error">
          <thead>
            <tr>
              <th style="width:25%;">Nguyên nhân</th>
              <th style="width:38%;">Message / Thông báo</th>
              <th style="width:37%;">Giao diện</th>
            </tr>
          </thead>
          <tbody>
            __TABLE_ROWS_HTML__
          </tbody>
        </table>
      </div>
    </div>
  </div>
</body>
</html>
"""

nav_items = ["Tổng quan", "Xác thực JWT", "Phân quyền", "Cảnh báo", "Giám sát", "Bản đồ", "Cài đặt", "Nhật ký", "Cấu hình", "Báo cáo"]

for m in mockups:
    sidebar_parts = []
    for item in nav_items:
        is_active = (item == m["active_nav"])
        active_cls = " active" if is_active else ""
        sidebar_parts.append(f'<div class="nav-btn{active_cls}">{item}</div>')
    sidebar_html = "\n      ".join(sidebar_parts)

    table_rows_html = ""
    for r in m["table_rows"]:
        table_rows_html += f"<tr><td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td></tr>\n"

    html = (
        template
        .replace("__URL__", m["url"])
        .replace("__SIDEBAR_HTML__", sidebar_html)
        .replace("__TITLE__", m["title"])
        .replace("__LEFT_CARD_TITLE__", m["left_card_title"])
        .replace("__LEFT_CARD_CONTENT__", m["left_card_content"])
        .replace("__RIGHT_CARD_TITLE__", m["right_card_title"])
        .replace("__RIGHT_CARD_CONTENT__", m["right_card_content"])
        .replace("__TABLE_ROWS_HTML__", table_rows_html)
    )

    temp_html = os.path.abspath(f"scratch/temp_{m['id']}.html")
    out_png = os.path.join(OUT_DIR, m["filename"])

    with open(temp_html, "w", encoding="utf-8") as f:
        f.write(html)

    cmd = [
        CHROME_PATH,
        "--headless",
        "--disable-gpu",
        f"--screenshot={out_png}",
        "--window-size=1051,657",
        "--hide-scrollbars",
        f"file:///{temp_html}"
    ]

    res = subprocess.run(cmd, capture_output=True, text=True)
    if os.path.exists(temp_html):
        os.remove(temp_html)
    print(f"Generated {m['filename']} -> Code {res.returncode}, Size: {os.path.getsize(out_png) if os.path.exists(out_png) else 'FAILED'}")

print("Done rendering all 12 mockups!")
