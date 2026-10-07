import subprocess
import os

html_content = """<!DOCTYPE html>
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
    padding: 10px 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .brand-logo {
    font-size: 15px;
    font-weight: 800;
    text-align: center;
    margin-bottom: 4px;
    color: #111;
  }
  .nav-btn {
    border: 1px solid #777;
    border-radius: 4px;
    padding: 4px 2px;
    font-size: 11px;
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
    padding: 14px 18px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .page-title {
    font-size: 17px;
    font-weight: bold;
    color: #111;
    margin-bottom: 12px;
  }
  .panels-row {
    display: flex;
    gap: 16px;
    height: 340px;
  }
  .panel-card {
    border: 1px solid #444;
    border-radius: 8px;
    padding: 14px;
    background: #fff;
  }
  .panel-card.left { flex: 1.25; }
  .panel-card.right { flex: 0.95; display: flex; flex-direction: column; justify-content: space-between; }
  .card-title {
    font-size: 13px;
    font-weight: bold;
    color: #111;
    margin-bottom: 14px;
  }
  .table-error {
    border: 1px solid #555;
    border-collapse: collapse;
    width: 100%;
    font-size: 10.5px;
  }
  .table-error th {
    background: #e9ecef;
    border: 1px solid #666;
    padding: 4px 6px;
    font-weight: bold;
    color: #222;
  }
  .table-error td {
    border: 1px solid #777;
    padding: 4px 6px;
    color: #222;
  }
</style>
</head>
<body>
  <div class="browser-header">
    <div class="nav-arrows">← &nbsp; → &nbsp; ✕</div>
    <div class="url-bar">https://greenspot.vn/admin/alerts</div>
    <div class="window-btns">▢</div>
  </div>
  <div class="browser-body">
    <div class="sidebar">
      <div class="brand-logo">GreenSpot</div>
      <div class="nav-btn">Tổng quan</div>
      <div class="nav-btn active">Cảnh báo</div>
      <div class="nav-btn">Giám sát</div>
      <div class="nav-btn">Bản đồ</div>
      <div class="nav-btn">Tài khoản</div>
      <div class="nav-btn">Nhật ký</div>
      <div class="nav-btn">Cấu hình</div>
    </div>
    <div class="main-content">
      <div class="page-title">Chức năng 28 - Trung tâm Biên tập và Phát hành Bản tin Cảnh báo Ô nhiễm Môi trường Khẩn cấp</div>
      <div class="panels-row">
        <div class="panel-card left">
          <div class="card-title">Biên tập Bản tin Cảnh báo Ô nhiễm</div>
          <p style="font-size:11px; margin-bottom:8px;"><strong>Tiêu đề:</strong> Cảnh báo mùi khói khét khu vực P. Linh Trung</p>
          <p style="font-size:11px; margin-bottom:8px;"><strong>Mức độ:</strong> <span style="background:#fee2e2; border:1px solid #ef4444; color:#b91c1c; padding:2px 8px; border-radius:4px; font-weight:bold;">Mức 3 - ĐỎ (Khẩn cấp)</span></p>
          <p style="font-size:11px; margin-bottom:8px;"><strong>Phạm vi ảnh hưởng:</strong> P. Linh Trung, P. Linh Chiểu, TP. Thủ Đức</p>
          <p style="font-size:11px; margin-bottom:12px;"><strong>Khuyến cáo nhân dân:</strong> Đóng kín cửa sổ, hạn chế ra ngoài, đeo khẩu trang N95.</p>
          <button style="background:#ef4444; color:#fff; border:none; padding:6px 16px; border-radius:4px; font-weight:bold; font-size:11px;">Phát hành Cảnh báo Ngay</button>
        </div>
        <div class="panel-card right">
          <div>
            <div class="card-title">Phạm vi Tác động & Tự động Hóa</div>
            <div style="text-align:center; margin:16px 0;">
              <div style="font-size:32px; font-weight:bold; color:#111;">45,820</div>
              <div style="font-size:11px; color:#555;">Người dân trong vùng nhận thông báo đẩy tức thì</div>
            </div>
            <div style="font-size:11px; line-height:1.6; color:#333;">
              • Bán kính ảnh hưởng: <strong>2.0 km</strong><br>
              • Kênh phát: In-App, Web Push, Banner khẩn cấp<br>
              • Trạng thái: <strong>Sẵn sàng phát sóng</strong>
            </div>
          </div>
          <div style="border-top:1px dashed #aaa; padding-top:8px; text-align:center; font-size:10px; color:#555;">
            Cơ chế: Real-time Geo-Push Notification Engine
          </div>
        </div>
      </div>
      <div>
        <div style="font-size:11px; font-weight:bold; margin-bottom:4px;">Mô tả nhanh / xử lý lỗi</div>
        <table class="table-error">
          <thead>
            <tr>
              <th style="width:25%;">Nguyên nhân</th>
              <th style="width:38%;">Message / Thông báo</th>
              <th style="width:37%;">Giao diện</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Tiêu đề để trống hoặc dưới 10 ký tự</td>
              <td>WARN_001: Tiêu đề cảnh báo phải từ 10 ký tự trở lên.</td>
              <td>Viền đỏ ô nhập tiêu đề, hiển thị tooltip cảnh báo lỗi.</td>
            </tr>
            <tr>
              <td>Chưa chọn địa bàn hành chính</td>
              <td>WARN_003: Vui lòng chọn ít nhất một Phường/Xã chịu ảnh hưởng.</td>
              <td>Rung nhẹ khung chọn Phường/Quận, thông báo toast đỏ.</td>
            </tr>
            <tr>
              <td>Phát bản tin cấp Đỏ (Khẩn cấp)</td>
              <td>Cảnh báo: Bản tin cấp Đỏ sẽ kích hoạt Push toàn bộ cư dân.</td>
              <td>Mở Modal xác nhận 2 lớp kèm mã OTP trước khi phát tin.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</body>
</html>
"""

os.makedirs("scratch", exist_ok=True)
html_file = os.path.abspath("scratch/test_mockup.html")
png_file = os.path.abspath("scratch/test_mockup.png")

with open(html_file, "w", encoding="utf-8") as f:
    f.write(html_content)

chrome = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
cmd = [
    chrome,
    "--headless",
    "--disable-gpu",
    f"--screenshot={png_file}",
    "--window-size=1051,657",
    "--hide-scrollbars",
    f"file:///{html_file}"
]

res = subprocess.run(cmd, capture_output=True, text=True)
print("Chrome return code:", res.returncode)
if os.path.exists(png_file):
    print("Screenshot generated successfully! Size:", os.path.getsize(png_file))
