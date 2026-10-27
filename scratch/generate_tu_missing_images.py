# -*- coding: utf-8 -*-
import subprocess
import os

html_template = """<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
body { background: #fff; width: 878px; height: 555px; border: 2px solid #000; overflow: hidden; position: relative; }

/* Top Header */
.top-header { height: 45px; border-bottom: 2px solid #000; display: flex; align-items: center; justify-content: space-between; padding: 0 15px; }
.top-header-left { display: flex; align-items: center; gap: 12px; font-weight: 700; font-size: 14px; }
.logo-box { border: 1.5px solid #000; border-radius: 4px; padding: 2px 8px; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; }
.top-header-right { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; }
.user-avatar { width: 24px; height: 24px; border: 1.5px solid #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; }

/* Body layout */
.app-body { display: flex; height: 506px; }

/* Sidebar */
.sidebar { width: 170px; border-right: 2px solid #000; padding-top: 15px; display: flex; flex-direction: column; }
.nav-item { padding: 9px 18px; font-size: 13px; font-weight: 600; color: #222; text-decoration: none; cursor: pointer; }
.nav-item.active { background: #ededed; font-weight: 800; border-left: 4px solid #000; padding-left: 14px; }

/* Main Content */
.main-content { flex: 1; padding: 12px 16px; display: flex; flex-direction: column; gap: 10px; position: relative; }
.screen-title-bar { display: flex; justify-content: space-between; align-items: center; }
.screen-title { font-size: 15px; font-weight: 800; }
.screen-badge { border: 1.5px solid #000; border-radius: 12px; padding: 2px 10px; font-size: 10px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; }

/* Panels */
.info-panel { border: 1.5px solid #000; border-radius: 8px; padding: 8px 12px; font-size: 11.5px; line-height: 1.5; }
.info-panel li { list-style: none; margin-bottom: 2px; }
.info-panel li strong { font-weight: 700; }

.work-panel { border: 1.5px solid #000; border-radius: 8px; padding: 12px; flex: 1; position: relative; display: flex; flex-direction: column; gap: 8px; }

/* Form elements */
.form-row { display: flex; gap: 10px; align-items: center; }
.form-group { display: flex; flex-direction: column; gap: 3px; flex: 1; font-size: 11px; font-weight: 600; }
.input-box { border: 1px solid #666; border-radius: 4px; padding: 5px 8px; font-size: 11px; }

/* Modal */
.modal-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.15); display: flex; align-items: center; justify-content: center; z-index: 10; }
.modal-window { background: #fff; border: 2px solid #000; border-radius: 8px; width: 440px; padding: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.3); text-align: center; position: relative; }
.modal-badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #fff; border: 1.5px solid #000; border-radius: 10px; padding: 1px 12px; font-size: 10px; font-weight: 800; }
.modal-text { font-size: 12px; font-weight: 700; margin: 12px 0 16px; line-height: 1.4; }
.modal-actions { display: flex; justify-content: center; gap: 12px; }
.btn-primary { background: #111; color: #fff; border: none; border-radius: 4px; padding: 7px 18px; font-size: 11px; font-weight: 700; cursor: pointer; }
.btn-secondary { background: #fff; color: #111; border: 1.5px solid #000; border-radius: 4px; padding: 6px 16px; font-size: 11px; font-weight: 700; cursor: pointer; }

/* Comment items */
.comment-item { border-bottom: 1px solid #ddd; padding: 6px 0; font-size: 11px; }
.comment-header { display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 2px; }
.comment-body { color: #333; }
</style>
</head>
<body>
<div class="top-header">
    <div class="top-header-left">
        <div class="logo-box">LOGO</div>
        <span>Hệ thống Báo cáo & Theo dõi Điểm rác thải / Ô nhiễm</span>
    </div>
    <div class="top-header-right">
        <div class="user-avatar">👤</div>
        <span>Nguyễn Văn A ▾</span>
    </div>
</div>
<div class="app-body">
    <div class="sidebar">
        <div class="nav-item">Dashboard</div>
        <div class="nav-item">Báo cáo rác</div>
        <div class="nav-item">Bản đồ ô nhiễm</div>
        <div class="nav-item active">Điểm xanh</div>
        <div class="nav-item">Cài đặt</div>
    </div>
    <div class="main-content">
        __CONTENT__
    </div>
</div>
</body>
</html>
"""

# Screen 44: Đăng ký tham gia chiến dịch tình nguyện xanh
content_44 = """
<div class="screen-title-bar">
    <div class="screen-title">Màn hình 44: Đăng ký tham gia chiến dịch tình nguyện xanh</div>
    <div class="screen-badge">VOLUNTEER REGISTRATION</div>
</div>
<div class="info-panel">
    <ul>
        <li>• <strong>Chiến dịch đã chọn:</strong> "Chủ nhật xanh lần thứ 152" - Làm sạch tuyến bờ kè Kênh Nhiêu Lộc</li>
        <li>• <strong>Thời gian:</strong> 07:00 - 10:30 Chủ nhật (20/09/2026) • <strong>Số lượng:</strong> Đã đăng ký 78/100 tình nguyện viên</li>
        <li>• <strong>Quyền lợi:</strong> Được trang bị dụng cụ bảo hộ, cấp nước uống, ăn nhẹ & cộng <strong>+150 Điểm Xanh</strong> sau nghiệm thu</li>
    </ul>
</div>
<div class="work-panel">
    <div class="form-row">
        <div class="form-group">
            <label>Họ và tên tình nguyện viên:</label>
            <input type="text" class="input-box" value="Nguyễn Văn A" readonly>
        </div>
        <div class="form-group">
            <label>Số điện thoại liên hệ:</label>
            <input type="text" class="input-box" value="0908 123 456">
        </div>
    </div>
    <div class="form-row">
        <div class="form-group">
            <label>Ca tham gia tình nguyện:</label>
            <select class="input-box">
                <option selected>Ca trọn vẹn: 07:00 - 10:30 (Được cộng trọn +150đ)</option>
                <option>Ca tăng cường: 08:30 - 10:30 (+75đ)</option>
            </select>
        </div>
        <div class="form-group">
            <label>Nhóm công việc mong muốn:</label>
            <select class="input-box">
                <option selected>Thu gom rác ven bờ kè & vớt rác rãnh nước</option>
                <option>Phân loại rác tại nguồn & đóng bao tải</option>
                <option>Hậu cần, tiếp nước & chụp ảnh ghi nhận</option>
            </select>
        </div>
    </div>
    <div style="font-size: 11px; margin-top: 5px; color: #444;">
        <label><input type="checkbox" checked> Tôi cam kết tuân thủ quy định an toàn lao động và hướng dẫn của Ban tổ chức.</label>
    </div>
    <div style="margin-top: auto; display: flex; justify-content: flex-end; gap: 8px;">
        <button class="btn-secondary" style="font-size:11px; padding: 5px 12px;">Quay lại danh sách</button>
        <button class="btn-primary" style="font-size:11px; padding: 5px 16px;">GỬI ĐĂNG KÝ THAM GIA</button>
    </div>

    <!-- Modal confirm -->
    <div class="modal-overlay">
        <div class="modal-window">
            <div class="modal-badge">MODAL XÁC NHẬN</div>
            <div class="modal-text">
                Xác nhận đăng ký tham gia Chiến dịch "Chủ nhật xanh lần thứ 152"?<br>
                Mã xác nhận <strong>VOL-2026-152-079</strong> sẽ được gửi qua tin nhắn SMS.
            </div>
            <div class="modal-actions">
                <button class="btn-primary">Xác nhận đăng ký</button>
                <button class="btn-secondary">Để sau</button>
            </div>
        </div>
    </div>
</div>
"""

# Screen 45: Bình luận và Thảo luận dưới bài phản ánh sự cố
content_45 = """
<div class="screen-title-bar">
    <div class="screen-title">Màn hình 45: Bình luận và Thảo luận dưới bài phản ánh sự cố</div>
    <div class="screen-badge">INCIDENT COMMENTS</div>
</div>
<div class="info-panel">
    <ul>
        <li>• <strong>Sự cố phản ánh:</strong> Bãi rác sinh hoạt tự phát góc đường Lê Văn Việt (#RC-8492)</li>
        <li>• <strong>Hiện trạng:</strong> Đang xử lý • <strong>Đơn vị phụ trách:</strong> Tổ VSMT Phường Tăng Nhơn Phú B</li>
        <li>• <strong>Quy tắc thảo luận:</strong> Nghiêm cấm ngôn từ thô tục, công kích cá nhân; bộ lọc tự động kiểm duyệt 24/7</li>
    </ul>
</div>
<div class="work-panel">
    <div style="max-height: 145px; overflow-y: hidden; display: flex; flex-direction: column; gap: 6px;">
        <div class="comment-item">
            <div class="comment-header"><span>Trần Văn Hùng (Tổ trưởng dân phố 4)</span> <span style="font-size:10px; color:#666;">Hôm nay 08:30</span></div>
            <div class="comment-body">Bãi rác này bốc mùi quá hôi, cảm ơn bà con đã kịp thời phản ánh lên GreenSpot.</div>
        </div>
        <div class="comment-item">
            <div class="comment-header"><span>Cán bộ VSMT Đội 2 (Đơn vị tiếp nhận)</span> <span style="font-size:10px; color:#666;">Hôm nay 09:15</span></div>
            <div class="comment-body">Xe chuyên dụng đang trên đường di chuyển tới hiện trường, dự kiến 10h dọn sạch.</div>
        </div>
        <div class="comment-item">
            <div class="comment-header"><span>Nguyễn Văn A (Bạn)</span> <span style="font-size:10px; color:#666;">Hôm nay 10:10</span></div>
            <div class="comment-body">Đội công nhân vừa gom xong đống rác lớn, hiện đang xịt rửa vỉa hè rất sạch sẽ!</div>
        </div>
    </div>
    
    <div style="margin-top: auto; display: flex; gap: 8px;">
        <input type="text" class="input-box" style="flex:1;" placeholder="Nhập bình luận hoặc cập nhật tình hình thực tế hiện trường...">
        <button class="btn-primary" style="font-size:11px; padding: 6px 14px;">Gửi bình luận</button>
    </div>

    <!-- Modal confirm -->
    <div class="modal-overlay">
        <div class="modal-window">
            <div class="modal-badge">MODAL BÌNH LUẬN</div>
            <div class="modal-text">
                Xác nhận đăng bình luận công khai dưới sự cố <strong>#RC-8492</strong>?<br>
                Bình luận của bạn sẽ hiển thị minh bạch cho toàn bộ cộng đồng khu dân cư.
            </div>
            <div class="modal-actions">
                <button class="btn-primary">Đăng bình luận</button>
                <button class="btn-secondary">Chỉnh sửa lại</button>
            </div>
        </div>
    </div>
</div>
"""

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
target_dir = r"c:\wamp64\www\Group-j_GreenSpot\docs\images\tu"
os.makedirs(target_dir, exist_ok=True)

for num, content in [("hinh_4_20", content_44), ("hinh_4_21", content_45)]:
    html_file = os.path.join(r"c:\wamp64\www\Group-j_GreenSpot\scratch", f"temp_{num}.html")
    with open(html_file, "w", encoding="utf-8") as f:
        f.write(html_template.replace("__CONTENT__", content))
    
    png_file = os.path.join(target_dir, f"{num}.png")
    cmd = [
        chrome_path,
        "--headless",
        "--disable-gpu",
        "--no-sandbox",
        f"--screenshot={png_file}",
        "--window-size=878,555",
        html_file
    ]
    subprocess.run(cmd, check=True)
    print(f"Generated {num}.png successfully!")

print("All 12 images for Tu are now completely available in docs/images/tu/!")
