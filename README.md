# 🌿 GreenSpot - Hệ Thống Bản Đồ Quản Lý & Định Vị Điểm Xanh

Dự án ứng dụng web Fullstack hiện đại xây dựng trên nền tảng **Next.js 16 (App Router)**, tích hợp **Prisma ORM**, **PostgreSQL**, **Mapbox GL** và quản lý hạ tầng bằng **Docker Compose**.

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

* **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS v4, Mapbox GL (`react-map-gl`).
* **Backend:** Next.js Server Components, API Route Handlers, Server Actions.
* **Database & ORM:** PostgreSQL 16, Prisma ORM 6.
* **Hạ tầng & Container:** Docker, Docker Compose, Adminer Web UI.
* **Package Manager:** `pnpm` (nhanh, tiết kiệm dung lượng ổ cứng).

---

## 📋 Yêu Cầu Cài Đặt (Prerequisites)

Trước khi bắt đầu, máy tính của bạn cần cài đặt sẵn:
1. **Node.js** phiên bản 20.x trở lên ([Tải tại đây](https://nodejs.org/)).
2. **pnpm**: Nếu chưa có, mở Terminal/PowerShell gõ:
   ```bash
   npm install -g pnpm
   ```
3. **Docker Desktop**: Để chạy cơ sở dữ liệu PostgreSQL cục bộ ([Tải tại đây](https://www.docker.com/products/docker-desktop/)). Hãy chắc chắn Docker Desktop đang chạy (màu xanh).

---

## 🚀 Hướng Dẫn Khởi Chạy Dự Án (Quick Start)

Chỉ cần **4 bước đơn giản** sau khi clone repository về máy:

### Bước 1: Cài đặt thư viện dependencies
```bash
pnpm install
```

### Bước 2: Khởi tạo file biến môi trường (`.env`)
* **Trên Windows (PowerShell):**
  ```powershell
  copy .env.example .env
  ```
* **Trên macOS / Linux:**
  ```bash
  cp .env.example .env
  ```
*(Nếu cần, điền `NEXT_PUBLIC_MAPBOX_TOKEN` từ tài khoản Mapbox của bạn vào file `.env`).*

### Bước 3: Khởi động Cơ sở dữ liệu bằng Docker
```bash
docker compose up -d
```
> Lệnh này sẽ tự động tải và chạy:
> * **PostgreSQL 16**: Cổng `5432`
> * **Adminer (Web UI xem DB)**: Cổng `8080`

### Bước 4: Đồng bộ cấu trúc Database & Chạy Web
1. Đẩy các bảng trong `schema.prisma` vào database:
   ```bash
   pnpm run db:push
   ```
2. Khởi chạy máy chủ phát triển (Dev Server):
   ```bash
   pnpm dev
   ```

🎉 **Mở trình duyệt:**
* **Trang web chính:** [http://localhost:3000](http://localhost:3000)
* **API test kết nối DB:** [http://localhost:3000/api/db-test](http://localhost:3000/api/db-test)
* **Giao diện quản lý Database trực quan (Adminer):** [http://localhost:8080](http://localhost:8080)

---

## 🗄️ Quản Lý Cơ Sở Dữ Liệu (Database Tools)

Dự án cung cấp **2 cách** cực kỳ trực quan để xem và chỉnh sửa dữ liệu trong PostgreSQL:

### Cách 1: Dùng Adminer (Có sẵn trong Docker)
Truy cập [http://localhost:8080](http://localhost:8080) và đăng nhập với thông tin:
* **Hệ quản trị (System):** `PostgreSQL`
* **Máy chủ (Server):** `postgres` (hoặc `localhost`)
* **Tài khoản (Username):** `postgres`
* **Mật khẩu (Password):** `postgres`
* **Cơ sở dữ liệu (Database):** `greenspot_db`

### Cách 2: Dùng Prisma Studio (Công cụ xịn của Prisma)
Chạy lệnh sau trong terminal:
```bash
pnpm run db:studio
```
Prisma sẽ tự động mở giao diện quản trị tại [http://localhost:5555](http://localhost:5555).

---

## 📁 Cấu Trúc Dự Án (Quy Ước Code Cho Nhóm)

```text
Group-j_GreenSpot/
├── app/                        
│   ├── layout.tsx              <-- [FE] Khung giao diện toàn web (Navbar, Footer, Font)
│   ├── page.tsx                <-- [FE] Giao diện Trang chủ (URL: /)
│   ├── globals.css             <-- [FE] File CSS toàn dự án (Tailwind v4)
│   │
│   ├── (features)/             <-- [FE] Các trang tính năng (ví dụ: map, profile,...)
│   │   └── map/page.tsx        <-- URL: /map
│   │
│   └── api/                    <-- [BE] TOÀN BỘ API ROUTE NẰM Ở ĐÂY
│       ├── db-test/route.ts    <-- API kiểm tra DB (URL: /api/db-test)
│       └── spots/route.ts      <-- API điểm xanh (GET/POST /api/spots)
│
├── components/                 <-- [FE] Các khối giao diện dùng lại (Bản đồ, Card, Modal,...)
├── prisma/
│   └── schema.prisma           <-- [DATABASE] Định nghĩa các bảng dữ liệu
├── lib/
│   └── prisma.ts               <-- [BE] Singleton kết nối Prisma Client
├── docker-compose.yml          <-- [DOCKER] Cấu hình PostgreSQL & Adminer
├── Dockerfile                  <-- [DOCKER] Đóng gói Next.js chạy độc lập
├── .env.example                <-- [CONFIG] File mẫu biến môi trường
└── package.json                <-- [CONFIG] Khai báo thư viện và scripts
```

---

## 🔧 Các Lệnh Tiện Ích Thường Dùng (Scripts)

| Lệnh | Ý nghĩa |
| :--- | :--- |
| `pnpm dev` | Khởi động web ở chế độ phát triển (hot reload) |
| `pnpm build` | Kiểm tra biên dịch và tối ưu mã nguồn cho production |
| `pnpm run db:generate` | Sinh lại Prisma Client khi thay đổi `schema.prisma` |
| `pnpm run db:push` | Đẩy trực tiếp schema lên database PostgreSQL |
| `pnpm run db:studio` | Mở giao diện xem bảng dữ liệu trên trình duyệt |
| `docker compose up -d` | Bật database PostgreSQL và Adminer chạy ngầm |
| `docker compose down` | Tắt database |
| `docker compose down -v` | Xóa sạch database và reset lại từ đầu (kèm volume) |

---

## ⚠️ Xử Lý Sự Cố Thường Gặp (Troubleshooting)

### 1. Bị lỗi trùng cổng 5432 (`port is already allocated`)
* **Nguyên nhân:** Máy tính của bạn đã cài sẵn một bản PostgreSQL từ trước và đang chiếm cổng 5432.
* **Cách khắc phục:** Mở file `.env` và sửa:
  ```env
  POSTGRES_PORT=5433
  DATABASE_URL="postgresql://postgres:postgres@localhost:5433/greenspot_db?schema=public"
  ```
  Sau đó chạy lại `docker compose up -d`.

### 2. Không thể kết nối Database (`PrismaClientInitializationError`)
* Hãy chắc chắn rằng **Docker Desktop đã được bật**.
* Kiểm tra container đang chạy bằng lệnh: `docker ps`. Nếu chưa chạy, gõ `docker compose up -d`.
