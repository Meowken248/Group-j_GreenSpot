# FrontEnd - GreenSpot (React + Vite)

Ứng dụng client GreenSpot xây dựng bằng React 19, Vite và Mapbox GL.

---

## 1. Cài đặt các gói phụ thuộc

```bash
cd FrontEnd
npm install
```

---

## 2. Cấu hình biến môi trường (.env)

Tạo file `.env` trong thư mục `FrontEnd/` từ file mẫu `.env.example`:

```bash
cp .env.example .env
```

Nội dung file `.env`:
```env
# Mapbox Public Token (giới hạn theo domain trong Mapbox dashboard)
VITE_MAPBOX_TOKEN=pk.xxxxx
```

> **Lưu ý**: `VITE_MAPBOX_TOKEN` là Public token (bắt đầu bằng `pk.`). Bạn có thể tạo và cấu hình URL restriction trong [Mapbox Dashboard](https://account.mapbox.com/access-tokens/).

---

## 3. Khởi chạy ứng dụng

```bash
npm run dev
```

Ứng dụng sẽ chạy tại địa chỉ: [http://localhost:5173](http://localhost:5173)

---

## 4. Build dự án

```bash
npm run build
```
