import os
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Tuple, Optional
from PIL import Image, ImageDraw, ImageFont, ImageOps

from app.core.config import UPLOAD_DIR

# Thư mục lưu trữ media sự cố
INCIDENTS_MEDIA_DIR = Path(UPLOAD_DIR) / "incidents"
INCIDENTS_MEDIA_DIR.mkdir(parents=True, exist_ok=True)

# Múi giờ Việt Nam (UTC+7)
VN_TZ = timezone(timedelta(hours=7))


def get_current_vn_time_str() -> str:
    now_vn = datetime.now(VN_TZ)
    return now_vn.strftime("%Y-%m-%d %H:%M:%S")


def get_scaled_font(font_size: int) -> ImageFont.ImageFont:
    """Tải font có kích thước co giãn theo độ phân giải ảnh"""
    try:
        return ImageFont.load_default(size=font_size)
    except Exception:
        return ImageFont.load_default()


def apply_image_watermark(
    input_bytes: bytes,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    server_time_str: Optional[str] = None,
) -> Tuple[str, str, int, str]:
    """
    Đóng dấu Watermark thời gian thực của máy chủ và toạ độ GPS lên ảnh bằng Pillow.
    Tạo thumbnail và lưu trữ an toàn trong thư mục uploads/incidents.
    
    Returns:
        (file_url, thumbnail_url, file_size, watermark_summary)
    """
    if not server_time_str:
        server_time_str = get_current_vn_time_str()

    import io
    image = Image.open(io.BytesIO(input_bytes))
    image = ImageOps.exif_transpose(image)  # Giữ đúng chiều xoay gốc của camera

    # Chuyển sang RGBA để xử lý layer trong suốt
    base_rgba = image.convert("RGBA")
    w, h = base_rgba.size

    # Tính toán kích thước font và chiều cao thanh watermark dựa trên ảnh
    font_size = max(14, int(min(w, h) / 32))
    font = get_scaled_font(font_size)
    line_spacing = int(font_size * 0.4)
    padding_x = int(font_size * 0.8)
    padding_y = int(font_size * 0.6)

    # Chuẩn bị nội dung đóng dấu
    gps_str = f"GPS: {latitude:.6f}, {longitude:.6f}" if (latitude is not None and longitude is not None) else "GPS: Chưa xác định"
    time_str = f"THỜI GIAN: {server_time_str} (GMT+7)"
    branding_str = "HỆ THỐNG QUẢN LÝ MÔI TRƯỜNG ĐÔ THỊ - GREENSPOT"

    lines = [branding_str, time_str, gps_str]

    # Tính tổng chiều cao của thanh watermark
    total_text_height = (len(lines) * font_size) + ((len(lines) - 1) * line_spacing)
    banner_height = total_text_height + (padding_y * 2)

    # Tạo layer trong suốt cho banner
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Dải băng màu đen bán trong suốt (alpha = 190) ở góc dưới ảnh
    banner_top = h - banner_height
    draw.rectangle([(0, banner_top), (w, h)], fill=(15, 23, 42, 195))

    # Viền trên của banner màu xanh ngọc (Emerald Green #10B981)
    accent_bar_height = max(3, int(font_size * 0.15))
    draw.rectangle([(0, banner_top), (w, banner_top + accent_bar_height)], fill=(16, 185, 129, 255))

    # Vẽ từng dòng chữ watermark với màu tương phản cao
    curr_y = banner_top + padding_y + accent_bar_height
    for idx, line in enumerate(lines):
        if idx == 0:
            # Dòng tiêu đề GreenSpot màu xanh ngọc sáng
            draw.text((padding_x, curr_y), line, fill=(52, 211, 153, 255), font=font)
        else:
            # Các dòng thời gian và tọa độ màu trắng sáng
            draw.text((padding_x, curr_y), line, fill=(248, 250, 252, 255), font=font)
        curr_y += font_size + line_spacing

    # Hợp nhất layer
    watermarked = Image.alpha_composite(base_rgba, overlay).convert("RGB")

    # Tạo tên file duy nhất
    file_id = uuid.uuid4().hex
    filename = f"incident_{file_id}.jpg"
    thumb_filename = f"thumb_incident_{file_id}.jpg"

    file_path = INCIDENTS_MEDIA_DIR / filename
    thumb_path = INCIDENTS_MEDIA_DIR / thumb_filename

    # Lưu ảnh gốc đã đóng dấu chất lượng cao
    watermarked.save(file_path, format="JPEG", quality=88, optimize=True)
    file_size = os.path.getsize(file_path)

    # Tạo và lưu thumbnail tỉ lệ nhỏ hơn để tải nhanh trên giao diện
    thumb_max_width = 480
    if w > thumb_max_width:
        thumb_h = int((thumb_max_width / w) * h)
        thumbnail = watermarked.resize((thumb_max_width, thumb_h), Image.Resampling.LANCZOS)
    else:
        thumbnail = watermarked.copy()
    thumbnail.save(thumb_path, format="JPEG", quality=80, optimize=True)

    file_url = f"/uploads/incidents/{filename}"
    thumbnail_url = f"/uploads/incidents/{thumb_filename}"
    watermark_summary = f"{time_str} | {gps_str}"

    return file_url, thumbnail_url, file_size, watermark_summary


def save_video_media(
    video_bytes: bytes,
    extension: str = "mp4",
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    server_time_str: Optional[str] = None,
) -> Tuple[str, str, int, str]:
    """
    Lưu trữ video đính kèm (tối đa 50MB, tối đa 30s) và tạo poster thumbnail có đóng dấu Watermark.
    """
    if not server_time_str:
        server_time_str = get_current_vn_time_str()

    file_id = uuid.uuid4().hex
    filename = f"incident_video_{file_id}.{extension.lower()}"
    thumb_filename = f"thumb_video_{file_id}.jpg"

    file_path = INCIDENTS_MEDIA_DIR / filename
    thumb_path = INCIDENTS_MEDIA_DIR / thumb_filename

    # Ghi file video xuống đĩa
    with open(file_path, "wb") as f:
        f.write(video_bytes)
    file_size = len(video_bytes)

    # Tạo poster thumbnail có gắn biểu tượng Video và watermark
    thumb_w, thumb_h = 640, 360
    poster = Image.new("RGB", (thumb_w, thumb_h), color=(15, 23, 42))
    draw = ImageDraw.Draw(poster)

    # Vẽ icon Play ở giữa
    center_x, center_y = thumb_w // 2, (thumb_h // 2) - 20
    draw.ellipse([(center_x - 35, center_y - 35), (center_x + 35, center_y + 35)], fill=(30, 41, 59), outline=(16, 185, 129), width=2)
    draw.polygon([(center_x - 10, center_y - 18), (center_x - 10, center_y + 18), (center_x + 18, center_y)], fill=(16, 185, 129))

    # Đóng dấu watermark vào góc dưới thumbnail video
    font = get_scaled_font(15)
    gps_str = f"GPS: {latitude:.6f}, {longitude:.6f}" if (latitude is not None and longitude is not None) else "GPS: Chưa xác định"
    time_str = f"THỜI GIAN: {server_time_str} (GMT+7)"
    
    draw.rectangle([(0, thumb_h - 70), (thumb_w, thumb_h)], fill=(10, 15, 30))
    draw.rectangle([(0, thumb_h - 70), (thumb_w, thumb_h - 67)], fill=(16, 185, 129))
    draw.text((15, thumb_h - 60), "VIDEO MINH CHỨNG SỰ CỐ - GREENSPOT", fill=(52, 211, 153), font=font)
    draw.text((15, thumb_h - 40), f"{time_str} | {gps_str}", fill=(241, 245, 249), font=font)

    poster.save(thumb_path, format="JPEG", quality=85)

    file_url = f"/uploads/incidents/{filename}"
    thumbnail_url = f"/uploads/incidents/{thumb_filename}"
    watermark_summary = f"[VIDEO] {time_str} | {gps_str}"

    return file_url, thumbnail_url, file_size, watermark_summary

