# Hướng Dẫn Vận Hành Hệ Thống & Database (EcoReport / GreenSpot)

Tài liệu tổng hợp các câu lệnh cần thiết để khởi chạy hệ thống, quản lý cơ sở dữ liệu PostgreSQL (PostGIS), chạy migration và nạp dữ liệu mẫu.

---

## 1. Khởi Động Hệ Thống Bằng Docker Compose

### Khởi động toàn bộ dịch vụ (Database + Backend + Frontend)
```bash
docker compose up -d
```

### Chỉ khởi động riêng dịch vụ Database
```bash
docker compose up -d db
```

### Kiểm tra trạng thái các container
```bash
docker compose ps
```

### Xem log các dịch vụ
```bash
# Xem log toàn bộ hệ thống
docker compose logs -f

# Hoặc xem log riêng database / backend
docker compose logs -f db
docker compose logs -f backend
```

### Dừng hệ thống
```bash
docker compose down
```

---

## 2. Quản Lý & Chạy Database (Alembic Migration)

Cơ sở dữ liệu chính được đặt tên là: `ecoreport_db` (PostgreSQL 16 + PostGIS 3.4).

### Chạy Migration (Khởi tạo hoặc cập nhật toàn bộ bảng dữ liệu)
```bash
docker compose exec backend alembic upgrade head
```

### Kiểm tra lịch sử migration hiện tại
```bash
docker compose exec backend alembic current
```

---

## 3. Nạp Dữ Liệu Mẫu (Seed Data)

### Quy trình nạp ĐẦY ĐỦ dữ liệu cho CSDL mới (chạy đúng thứ tự)
```bash
# 1. Khởi động Database + Backend + Frontend (lần đầu thêm --build)
docker compose up -d --build

# 2. Tạo/cập nhật toàn bộ bảng dữ liệu (bắt buộc trước khi seed)
docker compose exec backend alembic upgrade head

# 3. Nạp đầy đủ dữ liệu mẫu của 15 bước (RBAC + Admin + toàn bộ chức năng)
docker compose exec backend python -m app.seeds.seed_all
```
Sau 3 lệnh trên, CSDL đã có đủ dữ liệu cho mọi chức năng, bao gồm các tài khoản demo:

| Email | Mật khẩu | Vai trò |
| :--- | :--- | :--- |
| `admin@gmail.com` | `admin@gmail.com` | ADMIN (105 quyền) |
| `citizen@ecoreport.gov.vn` | `Password123@` | CITIZEN |
| `friend_tuan@ecoreport.gov.vn`, `friend_ngan@…`, `req_*@…`, `sug_*@…` | `Password123@` | CITIZEN (tài khoản mẫu) |

> `seed_all` chạy lại nhiều lần vẫn an toàn (idempotent), không nhân đôi dữ liệu.

### Nạp dữ liệu mẫu cơ bản (Khuyên dùng)
Bao gồm: tài khoản mẫu (`admin`, `officer`, `collector`, `citizen`), danh mục phân loại rác, sự cố mẫu, trạm cảm biến IoT, lộ trình thu gom, cấu hình hệ thống...
```bash
docker compose exec backend python -m app.seeds.seed_data
```

### Nạp toàn bộ dữ liệu mẫu của tất cả chức năng (RBAC, Bạn bè, Geo-Feed, Sinh nhật, ...)
Lệnh này gộp 15 bước: RBAC + tạo tài khoản `admin@gmail.com`, dữ liệu nền TP.HCM, hồ sơ
công dân, bạn bè, Geo-Feed, quy định xử phạt, cài đặt, nhóm, chat, reactions, sinh nhật & thiệp xanh, AI Triage,
hội thoại mẫu của Trợ lý AI Chatbot (STT 24).
Bao gồm cả **Chức năng 17 - Sinh nhật bạn bè & Thiệp xanh sinh thái**: ngày sinh của
nhóm bạn bè mẫu, cờ hiển thị ngày sinh và hộp thư lời chúc/thiệp xanh (kèm điểm thưởng).
```bash
docker compose exec backend python -m app.seeds.seed_all
```

### Chỉ nạp lại dữ liệu Sinh nhật bạn bè & Thiệp xanh (Chức năng 17)
Seeder này gán ngày sinh rơi đúng vào **hôm nay** nên cần chạy lại mỗi ngày trước khi demo:
```bash
docker compose exec backend python -m app.seeds.seed_birthdays
```
Dữ liệu nạp: ngày sinh cho nhóm bạn mẫu của `citizen@ecoreport.gov.vn` / `admin@gmail.com`
(kèm 3 ca biên: tài khoản bị khoá, chưa kết bạn, đã tắt hiển thị ngày sinh), 8 lời chúc /
thiệp xanh của năm trước (đủ 4 mẫu thiệp, có lời chúc chưa đọc để hiện badge hộp thư,
+5 điểm xanh nhất quán cho cả người gửi & người nhận). Seeder chạy lại nhiều lần
không nhân đôi dữ liệu.

### Nạp dữ liệu lớn mô phỏng hiệu năng (Bulk Seeder >= 100.000 records)
```bash
docker compose exec backend python -m app.seeds.bulk_seeder
```

---

## 4. Kết Nối Database Trên DBeaver / PGAdmin

Dùng các thông tin sau để tạo kết nối trong DBeaver hoặc các công cụ GUI quản lý database:

| Thông số | Giá trị |
| :--- | :--- |
| **Host** | `localhost` |
| **Port** | `5432` |
| **Database** | `ecoreport_db` |
| **Username** | `postgres` |
| **Password** | `postgres` |

> **Lưu ý trong DBeaver**: Sau khi kết nối, mở theo đường dẫn:  
> **`ecoreport_db`** ➔ **`Schemas`** ➔ **`public`** ➔ **`Tables`** để xem danh sách bảng.

---

## 5. Truy Cập Trực Tiếp Dòng Lệnh PostgreSQL (psql CLI)

```bash
# Đăng nhập vào database ecoreport_db trong container
docker compose exec db psql -U postgres -d ecoreport_db
```

Một số lệnh psql thường dùng:
* `\dt`: Liệt kê tất cả các bảng trong schema hiện tại.
* `\d <ten_bang>`: Xem chi tiết cấu trúc một bảng.
* `\q`: Thoát khỏi psql.

python scripts/db.py up       # Bật database Docker
python scripts/db.py studio   # Mở giao diện xem bảng dữ liệu
python scripts/db.py seed     # Nạp dữ liệu mẫu
python scripts/db.py migrate  # Cập nhật cấu trúc bảng
python scripts/db.py pull     # Kéo schema về Prisma
