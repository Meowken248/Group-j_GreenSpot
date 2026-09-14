# GreenSpot

Dự án GreenSpot bao gồm FrontEnd (Vite + React) và BackEnd (Next.js + Prisma + PostgreSQL).

---

## Cấu trúc dự án

- **FrontEnd**: Ứng dụng client xây dựng bằng Vite, React và Mapbox GL.
- **BackEnd**: API server xây dựng bằng Next.js (App Router), TypeScript, Prisma ORM và Docker Compose cho PostgreSQL.

---

## Hướng dẫn khởi chạy nhanh (Quick Start)

### 1. Cài đặt và chạy BackEnd (kèm Database)
Toàn bộ cơ sở dữ liệu và API server nằm trong `BackEnd/`:

```bash
cd BackEnd

# Cài đặt dependencies
npm install --legacy-peer-deps

# Tạo file .env từ file mẫu nếu chưa có
cp .env.example .env

# Khởi chạy PostgreSQL container bằng Docker (đảm bảo Docker Desktop đã mở)
docker compose up -d

# Đẩy schema vào database
npm run db:push


# Khởi chạy BackEnd server (cổng 3000)
npm run dev
```
> Kiểm tra kết nối DB tại: [http://localhost:3000/api/db-test](http://localhost:3000/api/db-test)

### 3. Cài đặt và chạy FrontEnd
Mở một terminal khác:
```bash
cd FrontEnd

# Cài đặt dependencies
npm install

# Tạo file .env từ file mẫu nếu chưa có
cp .env.example .env

# Khởi chạy FrontEnd dev server
npm run dev
```

---

## Cấu hình biến môi trường Mapbox

- **FrontEnd (`FrontEnd/.env`)**:
  ```env
  # Public token (bắt đầu bằng pk.), giới hạn theo domain trong Mapbox dashboard
  VITE_MAPBOX_TOKEN=pk.xxxxx
  ```

- **BackEnd (`BackEnd/.env`)**:
  ```env
  # Secret token (bắt đầu bằng sk.) cho Geocoding API, KHÔNG lộ ra frontend
  MAPBOX_SECRET_TOKEN=sk.xxxxx
  ```

---

## Các lệnh Prisma Database trong BackEnd

| Lệnh | Mô tả |
|---|---|
| `npm run db:push` | Đồng bộ schema từ `prisma/schema.prisma` trực tiếp vào database |
| `npm run db:migrate` | Áp dụng database migrations |
| `npm run db:generate` | Tạo lại code cho Prisma Client |
| `npm run db:studio` | Mở giao diện xem và chỉnh sửa dữ liệu Prisma Studio |

Chi tiết hơn xem tại [BackEnd/README.md](BackEnd/README.md).