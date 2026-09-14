# BackEnd - GreenSpot (Next.js)

Dự án BackEnd xây dựng bằng Next.js (App Router), TypeScript và Prisma ORM kết nối với cơ sở dữ liệu PostgreSQL.

---

## 1. Cài đặt các gói phụ thuộc (Dependencies)

Nếu mới clone repository hoặc cài đặt lại môi trường:

```bash
# Di chuyển vào thư mục BackEnd
cd BackEnd

# Cài đặt các gói phụ thuộc
npm install --legacy-peer-deps
```

> **Lưu ý**: Các package chính đã được cấu hình gồm:
> - `@prisma/client`: Thư viện client type-safe để truy vấn database.
> - `prisma` (devDependencies): Công cụ CLI quản lý schema và migration.

---

## 2. Cấu hình biến môi trường (.env)

Tạo file `.env` trong thư mục `BackEnd/` từ file mẫu `.env.example`:

```bash
cp .env.example .env
```

Nội dung cấu hình trong file `.env`:

### Môi trường Local (PostgreSQL chạy qua Docker)
```env
MAPBOX_SECRET_TOKEN=
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/greenspot_db?schema=public"
```

### Môi trường Cloud (Supabase)
Khi chuyển sang sử dụng Supabase:
```env
MAPBOX_SECRET_TOKEN=
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
```

---

## 3. Khởi chạy cơ sở dữ liệu PostgreSQL (Docker Local)

Tại thư mục gốc của repository (`Group-j_GreenSpot`):

```bash
# 1. Bật Docker Desktop trên máy tính
# 2. Khởi chạy container PostgreSQL ngầm
docker compose up -d

# Kiểm tra container đã hoạt động
docker ps

# Dừng container khi không sử dụng
docker compose down
```

Thông số database mặc định:
- **Host**: `localhost`
- **Port**: `5432`
- **User**: `postgres`
- **Password**: `postgres`
- **Database**: `greenspot_db`

---

## 4. Các lệnh quản lý Database với Prisma

Trong thư mục `BackEnd/`, sử dụng các lệnh npm scripts sau:

| Lệnh | Ý nghĩa |
|---|---|
| `npm run db:push` | Đẩy định nghĩa từ `schema.prisma` trực tiếp vào database (nhanh chóng khi dev) |
| `npm run db:migrate` | Tạo migration mới và áp dụng vào database theo lịch sử thay đổi |
| `npm run db:generate` | Sinh code Prisma Client tương ứng với `schema.prisma` |
| `npm run db:studio` | Mở giao diện quản lý dữ liệu trực quan Prisma Studio trên trình duyệt (`localhost:5555`) |

---

## 5. Khởi chạy Server và kiểm tra kết nối

### Chạy development server:
```bash
npm run dev
```
Truy cập [http://localhost:3000](http://localhost:3000).

### Kiểm tra kết nối Database qua API:
Truy cập endpoint kiểm tra sức khỏe cơ sở dữ liệu:
[http://localhost:3000/api/db-test](http://localhost:3000/api/db-test)

Kết quả trả về khi kết nối thành công:
```json
{
  "success": true,
  "message": "Kết nối cơ sở dữ liệu PostgreSQL thành công!",
  "data": {
    "userCount": 0
  },
  "timestamp": "..."
}
```

---

## 6. Cấu trúc thư mục liên quan tới Database

```text
BackEnd/
├── app/
│   └── api/
│       └── db-test/
│           └── route.ts         # Endpoint test kết nối DB
├── lib/
│   └── prisma.ts                # Prisma Client Singleton
├── prisma/
│   └── schema.prisma            # Định nghĩa bảng và quan hệ dữ liệu
├── .env                         # Biến môi trường bí mật (không commit git)
└── .env.example                 # Mẫu cấu hình biến môi trường
```
