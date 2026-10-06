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

### Nạp dữ liệu mẫu cơ bản (Khuyên dùng)
Bao gồm: tài khoản mẫu (`admin`, `officer`, `collector`, `citizen`), danh mục phân loại rác, sự cố mẫu, trạm cảm biến IoT, lộ trình thu gom, cấu hình hệ thống...
```bash
docker compose exec backend python -m app.seeds.seed_data
```

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
