# 📚 TÀI LIỆU KỸ THUẬT: TÍNH NĂNG 41 (STT 41)
# TÌM TUYẾN ĐƯỜNG AN TOÀN TRÁNH NGẬP (FLOOD-AWARE NAVIGATION ROUTING)

> **Mã chức năng:** STT 41 (Phân hệ WebGIS Định tuyến Thông minh & Thích ứng Biến đổi Khí hậu)  
> **Phiên bản:** 1.0.0 (Clean Architecture OOP + OSRM + Harmonic Tide Engine + PostGIS)  
> **Tác giả:** Kỹ sư AI (10 năm kinh nghiệm) & Senior Backend Engineer (20 năm kinh nghiệm)  
> **Mục tiêu:** Hỗ trợ người dân và xe chuyên dụng thu gom rác tìm lộ trình an toàn trong mùa mưa bão/triều cường, phân tích đối chiếu 2 tuyến (Nhanh nhất vs An toàn nhất), chỉ dẫn từng bước né vũng ngập và cảnh báo sớm khẩn cấp (< 500m).

---

## 📑 MỤC LỤC
1. [Tổng quan nghiệp vụ & Mục tiêu](#1-tổng-quan-nghiệp-vụ--mục-tiêu)
2. [Kiến trúc cơ sở dữ liệu & Không gian địa lý (PostGIS)](#2-kiến-trúc-cơ-sở-dữ-liệu--không-gian-địa-lý-postgis)
3. [Thiết kế OOP Clean Architecture & Interfaces](#3-thiết-kế-oop-clean-architecture--interfaces)
4. [Thuật toán Định tuyến Né ngập & Ngưỡng Phương tiện](#4-thuật-toán-định-tuyến-né-ngập--ngưỡng-phương-tiện)
5. [Hệ thống Cảnh báo Sớm Thời gian thực (< 500m) & TTS Audio](#5-hệ-thống-cảnh-báo-sớm-thời-gian-thực--500m--tts-audio)
6. [Đặc tả RESTful API Endpoints](#6-đặc-tả-restful-api-endpoints)
7. [Kiến trúc Giao diện FrontEnd (4 Màn hình)](#7-kiến-trúc-giao-diện-frontend-4-màn-hình)
8. [Bộ kiểm thử tự động (TDD)](#8-bộ-kiểm-thử-tự-động-tdd)

---

## 1. TỔNG QUAN NGHIỆP VỤ & MỤC TIÊU

### 1.1. Bối cảnh
Tại đô thị TP.HCM, ngập lụt do triều cường kết hợp mưa lớn cục bộ thường xuyên gây chết máy phương tiện, tê liệt giao thông và hư hỏng động cơ xe chuyên dụng (thủy kích). Tính năng STT 41 đóng vai trò công cụ định tuyến thích ứng biến đổi khí hậu:
- **Phân loại phương tiện**: Xe đạp (15cm), Xe máy (25cm), Ô tô (35cm), Xe ép rác chuyên dụng (55cm).
- **So sánh 2 tuyến trực quan**: Tuyến nhanh nhất (đánh dấu điểm ngập có nguy cơ) vs Tuyến an toàn nhất (mặt đường cao ráo, 0 điểm ngập).
- **Turn-by-turn Directions**: Chỉ dẫn rẽ từng ngã tư kèm minh chứng né ngập.
- **Early Warning Proximity Alert**: Quét liên tục điểm ngập phát sinh trong bán kính < 500m, phát âm thanh báo động và giọng đọc AI hướng dẫn đổi tuyến.

---

## 2. KIẾN TRÚC CƠ SỞ DỮ LIỆU & KHÔNG GIAN ĐỊA LÝ (POSTGIS)

- Bảng `safe_navigation_routes`:
  - `origin_point`: `Geometry(POINT, 4326)`
  - `destination_point`: `Geometry(POINT, 4326)`
  - `default_route_geom`: `Geometry(LINESTRING, 4326)`
  - `recommended_safe_geom`: `Geometry(LINESTRING, 4326)`
  - `avoided_hotspots_count`: Số điểm đen ngập đã né
  - `route_details_json`: Chi tiết turn steps và danh sách chặng di chuyển
- Bảng `flood_hotspots`: Chứa tọa độ tâm, đoạn đường corridor, cao độ, ngưỡng triều và mưa.

---

## 3. THIẾT KẾ OOP CLEAN ARCHITECTURE & INTERFACES

Hệ thống tuân thủ nghiêm ngặt Dependency Inversion:
- **Interface:** `BackEnd/app/services/navigation/interface.py` (`ISafeNavigationService`).
- **Implementations:** `BackEnd/app/services/navigation/service.py` (`SafeNavigationService`).
- **Schemas / DTOs:** `BackEnd/app/schemas/navigation/schemas.py`.

---

## 4. THUẬT TOÁN ĐỊNH TUYẾN NÉ NGẬP & NGƯỠNG PHƯƠNG TIỆN

| Phương tiện | Ngưỡng ngập tối đa | Nguy cơ chính khi ngập |
|:---|:---|:---|
| **Xe đạp** (`BICYCLE`) | 15 cm | Nguy cơ ngã xe, nước cuốn trôi |
| **Xe máy** (`MOTORBIKE`) | 25 cm | Nước tràn ống xả, chết bugi |
| **Ô tô** (`CAR`) | 35 cm | Thủy kích động cơ gầm thấp |
| **Xe ép rác** (`WASTE_TRUCK`) | 55 cm | Gầm cao tải trọng lớn, né đoạn trũng sâu |

---

## 5. HỆ THỐNG CẢNH BÁO SỚM THỜI GIAN THỰC (< 500M) & TTS AUDIO

- Khi kích hoạt chế độ **Bắt đầu đi**, hệ thống chạy ngầm module giám sát.
- Nếu phát hiện điểm đen ngập mới phát sinh nằm cách xe < 500m:
  - Hiện popup khẩn cấp: nhãn `POPUP`, tiêu đề `CẢNH BÁO NGẬP`, khoảng cách và ước tính mực nước.
  - Web Audio API phát chuỗi âm thanh `Bíp bíp` tần số 880Hz / 440Hz.
  - SpeechSynthesis đọc to: *"Cảnh báo, phía trước ba trăm mét có điểm ngập sâu, bạn có muốn đổi tuyến?"*.
  - Bấm **Đổi tuyến**: Hệ thống tái định tuyến bẻ nhánh tức thì tại ngã rẽ kế tiếp.
  - Bấm **Tiếp tục**: Đóng popup, icon cảnh báo ngập tiếp tục nhấp nháy trên bản đồ.

---

## 6. ĐẶC TẢ RESTFUL API ENDPOINTS

- `POST /api/v1/navigation/routes`: Tính toán song song 2 phương án định tuyến né ngập.
- `POST /api/v1/navigation/early-warning`: Quét cảnh báo sớm điểm ngập phía trước (< 500m).
- `POST /api/v1/navigation/reroute`: Tái định tuyến bẻ nhánh khi gặp vũng ngập đột xuất.
- `GET /api/v1/navigation/autocomplete`: Gợi ý địa danh tự động khi gõ tại TP.HCM.

---

## 7. KIẾN TRÚC GIAO DIỆN FRONTEND (4 MÀN HÌNH)

- **Màn 1/4 (Nhập điểm đi / đến):** `Screen1Input.tsx` + `InteractiveMap.tsx`.
- **Màn 2/4 (So sánh 2 tuyến):** `Screen2Compare.tsx` + `InteractiveMap.tsx`.
- **Màn 3/4 (Chi tiết tuyến an toàn):** `Screen3Directions.tsx`.
- **Màn 4/4 (Popup cảnh báo khẩn cấp):** `Screen4EmergencyModal.tsx`.
- **Container điều phối:** `FloodNavigationContainer.tsx`.
- **Định dạng phong cách:** `navigation.scss` (Chuẩn SASS theo PROJECT_RULES.md).

---

## 8. BỘ KIỂM THỬ TỰ ĐỘNG (TDD)

- **Backend:** `tests/navigation/test_safe_navigation.py` (6/6 tests pass).
- **Frontend:** `src/features/navigation/__tests__/navigation.test.tsx` (5/5 tests pass).
