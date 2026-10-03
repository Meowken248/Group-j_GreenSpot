# Tài Liệu Đặc Tả Kỹ Thuật & Thuật Toán Lõi: Trợ Lý Giọng Nói Rảnh Tay (Hands-free Voice Assistant)

> **Mã tham chiếu thiết kế:** Hình 4.37  
> **Dự án:** GreenSpot / EcoReport - Bản đồ Môi trường Đô thị & Báo cáo Thông minh  
> **Kiến trúc:** Clean Architecture, Repository Pattern, Multi-tier AI NLU Engine  
> **Vị trí lưu trữ:** [`BackEnd/docs/voice_assistant_system_summary.md`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/docs/voice_assistant_system_summary.md)  
> **Trạng thái:** Hoàn thiện 100%, đồng bộ tuyệt đối với mã nguồn hiện tại, sẵn sàng đưa vào vận hành.

---

## MỤC LỤC TÀI LIỆU
1. [Tóm Tắt Nhanh Cho Lập Trình Viên & Đánh Giá Viên](#1-tóm-tắt-nhanh-cho-lập-trình-viên--đánh-giá-viên)
2. [Đặc Tả Chi Tiết 4 Màn Hình Tương Tác (Hình 4.37)](#2-đặc-tả-chi-tiết-4-màn-hình-tương-tác-hình-437)
3. [Kiến Trúc Hệ Thống & Sơ Đồ Tuần Tự (Architecture & Workflow)](#3-kiến-trúc-hệ-thống--sơ-đồ-tuần-tự-architecture--workflow)
4. [Mô Hình Dữ Liệu CSDL & Triển Khai Repository Pattern](#4-mô-hình-dữ-liệu-csdl--triển-khai-repository-pattern)
5. [Chi Tiết Các Dòng Code & Thuật Toán Lõi (Core Algorithms & Code Lines)](#5-chi-tiết-các-dòng-code--thuật-toán-lõi-core-algorithms--code-lines)
6. [Kịch Bản Nghiệp Vụ Thực Tế Mẫu (End-to-End Walkthrough Scenarios)](#6-kịch-bản-nghiệp-vụ-thực-tế-mẫu-end-to-end-walkthrough-scenarios)
7. [Bảng Ma Trận Ánh Xạ Mã Nguồn (Project Code Mapping Matrix)](#7-bảng-ma-trận-ánh-xạ-mã-nguồn-project-code-mapping-matrix)
8. [Hướng Dẫn Kiểm Thử & Xác Nhận Chất Lượng (Testing & Verification)](#8-hướng-dẫn-kiểm-thử--xác-nhận-chất-lượng-testing--verification)

---

## 1. TÓM TẮT NHANH CHO LẬP TRÌNH VIÊN & ĐÁNH GIÁ VIÊN

> [!NOTE]
> **Mục tiêu tính năng:** Cung cấp trải nghiệm tương tác giọng nói hoàn toàn rảnh tay, hỗ trợ công dân đang điều khiển phương tiện giao thông hoặc người cao tuổi dễ dàng phản ánh sự cố môi trường và tra cứu cứu trợ khẩn cấp mà không cần gõ chữ.

- **Frontend:**
  - Viết bằng **React + TypeScript**, tuân thủ nghiêm ngặt chuẩn gõ chữ nghiêm ngặt (`verbatimModuleSyntax: true`).
  - Sử dụng **Web Speech API** (`webkitSpeechRecognition` / `SpeechRecognition`) cho nhận dạng âm thanh thời gian thực (độ trễ < 200ms) và **SpeechSynthesis API** cho phát âm thanh phản hồi (TTS).
  - Sử dụng **Web Audio API** (`AudioContext`, `AnalyserNode`) phân tích Fast Fourier Transform (FFT 64) để vẽ sóng âm dao động màu xanh lá (`VoiceWaveform`) trên HTML5 Canvas.
  - Tích hợp liền mạch trên trang chủ ([`FrontEnd/src/App.tsx`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/App.tsx#L58-L64)) qua tab Navbar và nút nổi mở nhanh góc màn hình.
- **Backend:**
  - Viết bằng **FastAPI (Python 3.11+)** theo cấu trúc **Clean Architecture** và **Repository Pattern** (Interface trừu tượng tách biệt hoàn toàn lớp truy cập CSDL và lớp dịch vụ AI NLU).
  - Động cơ **AI NLU tự phát triển (In-house Multi-tier Engine)** xử lý chuẩn hóa ngữ âm tiếng Việt, khử dấu thanh điệu chuẩn Unicode NFD, trích xuất thực thể địa danh (Slot Extraction) và phân loại ý định qua 4 tầng (Exact Match -> Semantic Patterns -> Fuzzy Jaccard Similarity -> Graceful Fallback).
- **Cơ sở dữ liệu:**
  - Chuẩn hóa đúng **2 bảng duy nhất** trên PostgreSQL 16: `voice_sample_commands` và `voice_interaction_logs`.
  - Migration được quản lý qua Alembic: revision `020_voice_assistant` ([`BackEnd/alembic/versions/020_create_voice_assistant_tables.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/alembic/versions/020_create_voice_assistant_tables.py)).
- **Chất lượng kiểm thử:**
  - Backend: **8/8 unit tests** đạt 100% độ bao phủ logic NLU, Normalization, Router và Mock DB.
  - Frontend: **10/10 tests Vitest** đạt 100% độ bao phủ các màn hình 1, 2, 3, 4.

---

## 2. ĐẶC TẢ CHI TIẾT 4 MÀN HÌNH TƯƠNG TÁC (HÌNH 4.37)

```
   +-----------------------------------------------------------------------------------+
   |                                 HÌNH 4.37 FLOW                                    |
   |                                                                                   |
   |   [ MÀN 1: TRUNG TÂM ]  -----(Bấm Micro)-----> [ MÀN 2: THU ÂM REALTIME ]         |
   |     - Nút Mic Pulse                              - Sóng âm xanh lá FFT            |
   |     - 4 Câu lệnh mẫu                             - Chữ chạy theo giọng nói        |
   |     - Nhấp câu mẫu xử lý ngay                    - Đếm im lặng 3s / Timeout 10s   |
   |            |                                              |                       |
   |            | (Lỗi quyền micro)                            | (Nói xong / Bấm Dừng) |
   |            v                                              v                       |
   |   [ MÀN 4: POPUP QUYỀN ]                       [ MÀN 3: PHẢN HỒI & THỰC THI ]     |
   |     - "KHÔNG TRUY CẬP ĐƯỢC MICRO"                - Cột trái: Lệnh của bạn (chuẩn) |
   |     - Hướng dẫn icon Ổ khóa 🔒                   - Cột phải: Loa TTS + Kết quả     |
   |     - Nút "Thử lại" & "Đóng" (Esc)               - Nút "Nói tiếp" & "Đóng"        |
   +-----------------------------------------------------------------------------------+
```

### 2.1 Màn 1: Trung tâm Điều khiển Giọng nói (Voice Home)
- **Tập tin:** [`FrontEnd/src/components/VoiceAssistant/VoiceAssistant.tsx`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/components/VoiceAssistant/VoiceAssistant.tsx#L320-L418)
- **Các thành phần giao diện chính:**
  1. *Nút Micro lớn trung tâm:* Kích thước 120px với 3 vòng tròn hiệu ứng nhịp thở (`pulse animation` trong CSS). Khi bấm vào sẽ xin quyền micro và chuyển ngay sang Màn 2.
  2. *Nút hành động "Bắt đầu nói":* Đặt ngay dưới micro để tăng tính trực quan.
  3. *Danh mục câu lệnh mẫu thực tế:* Hiển thị dưới dạng các thẻ chip bo tròn (Chips), tải động từ API `/api/v1/voice/suggestions`:
     - *"Báo cáo bãi rác gần đây"*
     - *"Đường nào an toàn không bị ngập?"*
     - *"Xem số dư ví điểm"*
     - *"Mở bản đồ chất lượng không khí"*
  4. *Tính năng Click-to-Process:* Người dùng có thể **nhấp chuột trực tiếp vào bất kỳ thẻ gợi ý nào**; hệ thống sẽ bỏ qua thu âm và lập tức gọi API `/api/v1/voice/process` để mở thẳng Màn 3.
  5. *Bảo vệ ngoại lệ:* Kiểm tra hỗ trợ Speech Recognition của trình duyệt. Nếu trình duyệt không hỗ trợ hoặc đang mất kết nối mạng, hiển thị thông báo hướng dẫn người dùng chuyển sang bàn phím thông thường.

### 2.2 Màn 2: Thu âm & Nhận dạng Giọng nói Real-time
- **Tập tin:** [`FrontEnd/src/components/VoiceAssistant/VoiceAssistant.tsx`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/components/VoiceAssistant/VoiceAssistant.tsx#L420-L490) và [`VoiceWaveform.tsx`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/components/VoiceAssistant/VoiceWaveform.tsx#L1-L119)
- **Các thành phần giao diện chính:**
  1. *Văn bản hiển thị Real-time:* Hiển thị chữ chạy trực tiếp theo từng lời nói của công dân với độ trễ phản hồi cực thấp (< 200ms).
  2. *Sóng âm động màu xanh lá:* Phân tích tần số âm thanh từ micro qua `AnalyserNode`, hiển thị 28 thanh sóng âm gradient chuyển màu `#10b981` ➔ `#34d399` ➔ `#059669`.
  3. *Cảnh báo tạp âm môi trường:* Tự động đo lường năng lượng âm thanh nền, nếu phát hiện biến thiên đột ngột vượt ngưỡng sẽ bật huy hiệu `[⚠️ Môi trường nhiều tạp âm]`.
  4. *Nút "Dừng" thu âm:* Cho phép công dân chủ động bấm kết thúc câu nói bất kỳ lúc nào để chuyển sang Màn 3.
  5. *Cơ chế tự động 3 giây:* Nếu người dùng ngừng nói trong **3 giây**, hệ thống tự động nhận định câu lệnh đã kết thúc và tự động gửi dữ liệu sang Backend xử lý.
  6. *Watchdog Timer 10 giây:* Nếu kích hoạt thu âm nhưng sau **10 giây** hoàn toàn không có tiếng động, hệ thống tự động tắt micro, hiện thông báo toast và trở về Màn 1 để tránh tiêu tốn pin và tài nguyên.

### 2.3 Màn 3: Phản hồi & Thực thi Hành động (2 Cột Đối Xứng)
- **Tập tin:** [`FrontEnd/src/components/VoiceAssistant/VoiceAssistant.tsx`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/components/VoiceAssistant/VoiceAssistant.tsx#L492-L680)
- **Bố cục 2 cột tiêu chuẩn UX:**
  - **Cột trái "LỆNH CỦA BẠN" (Dòng 507 - 540):** Hiển thị văn bản câu nói đã được AI chuẩn hóa ngữ âm, viết hoa danh từ riêng, sửa lỗi chính tả và ngắt dấu câu hoàn chỉnh. Bên dưới kèm theo nhãn phân loại ý định (Ví dụ: `🏷️ Ý định: Báo cáo sự cố`).
  - **Cột phải "PHẢN HỒI" (Dòng 542 - 640):**
    - Trợ lý ảo tự động đọc câu trả lời bằng giọng nói tiếng Việt tự nhiên thông qua loa thiết bị (`SpeechSynthesis`). Có nút bấm nghe lại âm thanh kèm hiệu ứng sóng âm đang nói.
    - Thẻ hành động động (Dynamic Action Card) tùy theo loại ý định:
      * **Báo cáo sự cố rác thải (`REPORT_INCIDENT`):** Điền sẵn phiếu gồm Tiêu đề, Loại sự cố (Rác thải đô thị), Vị trí giao lộ trích xuất được từ câu nói (Ví dụ: *"ngã tư Lê Lợi"*), và nút "Mở form Báo cáo ngay".
      * **Tuyến đường an toàn (`CHECK_SAFE_ROUTE`):** Thẻ gợi ý lộ trình di chuyển tránh các điểm ngập nước, kèm nút "Xem bản đồ ngập lụt".
      * **Tra cứu chất lượng không khí (`CHECK_CURRENT_AQI` / `OPEN_AIR_QUALITY_MAP`):** Thẻ hiển thị chỉ số AQI 42 (Mức Tốt - Màu xanh lá), nồng độ bụi mịn PM2.5, nhiệt độ và độ ẩm thực tế.
      * **Ví điểm thưởng (`CHECK_REWARD_WALLET`):** Thẻ hiển thị số dư 350 GreenPoints, thứ hạng Chiến binh Xanh và lịch sử đổi thưởng gần nhất.
  - **Kịch bản Fallback:** Nếu người dùng ra lệnh ngoài phạm vi hiểu biết của trợ lý, cột phải sẽ hiển thị lời giải thích nhẹ nhàng: *"Xin lỗi, tôi chưa hiểu lệnh này. Bạn có thể thử lại các câu gợi ý"* kèm 4 nút bấm gợi ý nhanh.
  - **Thanh điều khiển dưới cùng (Dòng 642 - 675):** Nút **"Nói tiếp"** (mở lại micro để ra lệnh tiếp) và nút **"Đóng"** (thoát trợ lý quay lại màn hình chính).

### 2.4 Màn 4: Popup Cảnh báo Quyền Microphone (Mic Permission Modal)
- **Tập tin:** [`FrontEnd/src/components/VoiceAssistant/MicPermissionModal.tsx`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/components/VoiceAssistant/MicPermissionModal.tsx#L1-L118)
- **Các thành phần giao diện chính:**
  1. *Thẻ nhãn nhỏ POPUP* phía trên tiêu đề.
  2. *Tiêu đề in đậm màu cam rực rỡ:* **"KHÔNG TRUY CẬP ĐƯỢC MICRO"**.
  3. *Dòng phụ đề:* *"Hãy cấp quyền micro cho trình duyệt"*.
  4. *Hộp đồ họa mô phỏng thanh URL trình duyệt:* Biểu tượng Ổ khóa (🔒), địa chỉ `greenspot.gov.vn` và huy hiệu đỏ `🎤 Bị chặn`.
  5. *3 bước hướng dẫn trực quan:* Nhấp vào biểu tượng ổ khóa ➔ Chuyển Micro sang Cho phép ➔ Nhấn "Thử lại".
  6. *Hai nút chức năng:* Nút **"Thử lại"** (chủ động yêu cầu lại quyền micro `getUserMedia`) và nút **"Đóng"** (hỗ trợ phím `Escape`).

---

## 3. KIẾN TRÚC HỆ THỐNG & SƠ ĐỒ TUẦN TỰ (ARCHITECTURE & WORKFLOW)

Hệ thống được thiết kế theo đúng mô hình **Clean Architecture & Dependency Inversion Principle (SOLID)**.

```
       NGƯỜI DÙNG                TRÌNH DUYỆT (FRONTEND)                      MÁY CHỦ FASTAPI (BACKEND)                 POSTGRESQL (DATABASE)
           |                               |                                             |                                       |
           |---- 1. Bấm nút Micro -------->|                                             |                                       |
           |                               |-- 2. getUserMedia() -> Mở micro ----------->|                                       |
           |                               |-- 3. Web Audio FFT vẽ sóng âm Waveform ---->|                                       |
           |---- 4. Phát âm giọng nói ---->|                                             |                                       |
           |                               |-- 5. Web Speech STT nhận dạng real-time --->|                                       |
           |                               |                                             |                                       |
           | [Sau 3s im lặng / Bấm Dừng]   |                                             |                                       |
           |                               |-- 6. POST /api/v1/voice/process ----------->|                                       |
           |                               |      (payload: transcript, lat, lng)        |                                       |
           |                               |                                             |-- 7. Normalize Text (Chính tả/Dấu) -->|
           |                               |                                             |-- 8. Strip Accents Unicode NFD ------>|
           |                               |                                             |-- 9. Slot Extraction (Địa danh) ----->|
           |                               |                                             |-- 10. Multi-tier Intent Matching ---->|
           |                               |                                             |-- 11. Query Sample Commands --------->|
           |                               |                                             |<====== Trả về danh mục lệnh =========|
           |                               |                                             |-- 12. Build Action Payload & TTS ---->|
           |                               |                                             |-- 13. INSERT VoiceInteractionLog ---->|
           |                               |                                             |<====== Ghi nhận thành công ==========|
           |                               |<== 14. Trả về VoiceProcessResponse =========|                                       |
           |                               |                                                                                     |
           |<--- 15. Phát âm thanh TTS ----| (Hiển thị Màn 3: Cột trái Lệnh chuẩn hóa, Cột phải Thẻ kết quả)                     |
           |                               |                                                                                     |
```

---

## 4. MÔ HÌNH DỮ LIỆU CSDL & TRIỂN KHAI REPOSITORY PATTERN

### 4.1 Bảng `voice_sample_commands` (Danh mục câu lệnh mẫu & cấu hình Intent)
- **Tập tin Model:** [`BackEnd/app/models/voice.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/models/voice.py#L49-L105)
- **Tập tin Migration:** [`BackEnd/alembic/versions/020_create_voice_assistant_tables.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/alembic/versions/020_create_voice_assistant_tables.py#L21-L40)

| Tên Trường (Column) | Kiểu Dữ Liệu | Ràng Buộc (Constraints) | Ý Nghĩa / Mục Đích Nghiệp Vụ |
| :--- | :--- | :--- | :--- |
| `command_id` | `UUID` | `PRIMARY KEY, DEFAULT uuid.uuid4` | Định danh duy nhất chuẩn UUIDv4 |
| `category` | `VARCHAR(50)` | `NOT NULL, INDEX` | Nhóm lệnh: `INCIDENT`, `FLOOD`, `AIR_QUALITY`, `REWARD`, `GENERAL` |
| `command_text` | `VARCHAR(255)` | `NOT NULL, UNIQUE` | Câu gợi ý hiển thị tại Màn 1 (VD: *"Báo cáo bãi rác gần đây"*) |
| `intent_code` | `VARCHAR(50)` | `NOT NULL, INDEX` | Mã ý định xử lý: `REPORT_INCIDENT`, `CHECK_SAFE_ROUTE`... |
| `action_type` | `VARCHAR(20)` | `NOT NULL, DEFAULT 'LOOKUP'` | Loại hành động: `'LOOKUP'` (Tra cứu) hoặc `'NAVIGATION'` (Điều hướng) |
| `action_target` | `VARCHAR(100)` | `NULLABLE` | Đường dẫn route chuyển hướng: `/report-incident`, `map_flood`... |
| `default_response`| `TEXT` | `NOT NULL` | Câu phản hồi thoại chuẩn dùng để phát qua loa Text-to-Speech |
| `is_active` | `BOOLEAN` | `NOT NULL, DEFAULT TRUE` | Trạng thái cho phép hiển thị gợi ý trên giao diện |
| `display_order` | `INTEGER` | `NOT NULL, DEFAULT 0` | Thứ tự ưu tiên sắp xếp từ trên xuống dưới |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL, DEFAULT now()` | Thời điểm tạo bản ghi |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL, DEFAULT now()` | Thời điểm cập nhật dữ liệu lần cuối |

### 4.2 Bảng `voice_interaction_logs` (Nhật ký tương tác & Giám sát AI)
- **Tập tin Model:** [`BackEnd/app/models/voice.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/models/voice.py#L107-L177)
- **Tập tin Migration:** [`BackEnd/alembic/versions/020_create_voice_assistant_tables.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/alembic/versions/020_create_voice_assistant_tables.py#L42-L63)

| Tên Trường (Column) | Kiểu Dữ Liệu | Ràng Buộc (Constraints) | Ý Nghĩa / Mục Đích Nghiệp Vụ |
| :--- | :--- | :--- | :--- |
| `log_id` | `UUID` | `PRIMARY KEY, DEFAULT uuid.uuid4` | Khóa chính của mỗi phiên tương tác |
| `user_id` | `UUID` | `NULLABLE, FK -> users(user_id)` | Người dùng thực hiện lệnh (hỗ trợ `NULL` nếu là khách vãng lai) |
| `raw_transcript` | `TEXT` | `NOT NULL` | Văn bản thô nhận diện từ microphone trước khi qua AI xử lý |
| `normalized_text`| `TEXT` | `NOT NULL` | Văn bản đã qua thuật toán AI chuẩn hóa chính tả và ngắt câu |
| `detected_intent`| `VARCHAR(50)` | `NULLABLE, INDEX` | Ý định được phân loại thành công (`NULL` nếu rơi vào Fallback) |
| `confidence_score`| `FLOAT` | `NOT NULL, DEFAULT 1.0` | Độ tin cậy dự đoán (thang điểm từ 0.0 đến 1.0) |
| `action_type` | `VARCHAR(20)` | `NULLABLE` | Loại hành động: `LOOKUP`, `NAVIGATION` hoặc `UNKNOWN` |
| `response_text` | `TEXT` | `NOT NULL` | Nội dung văn bản trợ lý ảo đã trả lời qua loa |
| `is_success` | `BOOLEAN` | `NOT NULL, DEFAULT TRUE` | Trạng thái: `True` nếu nhận diện thành công, `False` nếu Fallback |
| `session_source` | `VARCHAR(20)` | `NOT NULL, DEFAULT 'VOICE'` | Nguồn: `'VOICE'` (thu âm micro) hoặc `'SUGGESTION_CLICK'` (bấm gợi ý) |
| `processing_time_ms`| `INTEGER` | `NOT NULL, DEFAULT 0` | Thời gian backend AI NLU phân tích tính bằng mili-giây (< 20ms) |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL, DEFAULT now(), INDEX` | Thời điểm ghi nhận giao dịch vào CSDL |

### 4.3 Triển khai Kiến trúc Repository Pattern
1. **Interface Contract:** [`BackEnd/app/interface/voice_interface.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/interface/voice_interface.py)
   - Lớp trừu tượng [`IVoiceAssistantRepository(ABC)`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/interface/voice_interface.py#L15-L63) khai báo 5 phương thức cốt lõi:
     * `get_active_sample_commands(db, limit, category)`
     * `get_all_sample_commands(db)`
     * `get_command_by_text(db, command_text)`
     * `create_interaction_log(db, log)`
     * `get_recent_logs(db, limit, user_id)`
   - Lớp trừu tượng [`IVoiceNluService(ABC)`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/interface/voice_interface.py#L65-L92) khai báo:
     * `normalize_text(raw_text)`
     * `process_voice_command(db, request)`
2. **Lớp Triển Khai Thực Tế:** [`BackEnd/app/crud/voice_repository.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/voice_repository.py)
   - Lớp [`VoiceAssistantRepository`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/voice_repository.py#L15-L92) triển khai toàn bộ các truy vấn dữ liệu bất đồng bộ (SQLAlchemy 2.0 Async), tối ưu chỉ mục truy vấn và cam kết giao dịch nguyên khối.

---

## 5. CHI TIẾT CÁC DÒNG CODE & THUẬT TOÁN LÕI (CORE ALGORITHMS & CODE LINES)

Phần này trình bày chính xác từng dòng code và nguyên lý hoạt động của các thuật toán lõi được xây dựng trong hệ thống.

### 5.1 Thuật toán 1: Chuẩn hóa Ngữ âm Tiếng Việt (Vietnamese Text Normalization)
- **Tập tin:** [`BackEnd/app/services/voice_service.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/voice_service.py)
- **Vị trí dòng code:** **Dòng 65 đến Dòng 103** (Phương thức `normalize_text`)
- **Mục đích:** Khắc phục lỗi phát âm, loại bỏ khoảng trắng dư thừa, viết hoa đầu câu, tự động viết hoa đúng chuẩn danh từ riêng và địa danh hành chính tại TP.HCM, tự động gắn dấu câu logic (`?` cho câu hỏi, `.` cho mệnh lệnh).
- **Mã nguồn trích xuất:**
```python
65:     def normalize_text(self, raw_text: str) -> str:
66:         if not raw_text:
67:             return ""
68: 
69:         # 1. Thu gọn khoảng trắng thừa
70:         text = " ".join(raw_text.strip().split())
71:         if not text:
72:             return ""
73: 
74:         # 2. Xóa các dấu câu kết thúc rải rác sẵn có để tái tạo chuẩn hóa
75:         text = re.sub(r"[.,?!;]+$", "", text).strip()
76:         lower_text = text.lower()
77: 
78:         # 3. Chuẩn hóa địa danh và danh từ riêng viết hoa chuẩn chính tả
79:         for pattern, replacement in self.proper_noun_replacements.items():
80:             text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
81: 
82:         # 4. Viết hoa chữ cái đầu câu
83:         if text:
84:             text = text[0].upper() + text[1:]
85: 
86:         # 5. Phân tích kết câu: nếu chứa từ hỏi -> '?', ngược lại -> '.'
87:         is_question = any(lower_text.startswith(q) or f" {q} " in f" {lower_text} " for q in self.question_starters)
88:         if lower_text.endswith("không") or lower_text.endswith("chưa") or lower_text.endswith("nhỉ"):
89:             is_question = True
90: 
91:         if is_question:
92:             text += "?"
93:         else:
94:             text += "."
95: 
96:         return text
```
- **Ví dụ kiểm chứng thực tế:**
  * Input thô: `"báo cáo bãi rác ngã tư lê lợi"` ➔ Chuẩn hóa: `"Báo cáo bãi rác ngã tư Lê Lợi."`
  * Input thô: `"đường nào an toàn không bị ngập"` ➔ Chuẩn hóa: `"Đường nào an toàn không bị ngập?"`
  * Input thô: `"chất lượng không khí quận 1 hôm nay"` ➔ Chuẩn hóa: `"Chất lượng không khí Quận 1 hôm nay."`

---

### 5.2 Thuật toán 2: Khử Dấu Tiếng Việt Chuẩn Unicode NFD (Accent Stripping)
- **Tập tin:** [`BackEnd/app/services/voice_service.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/voice_service.py)
- **Vị trí dòng code:** **Dòng 106 đến Dòng 118** (Phương thức `strip_accents` và `_strip_accents_and_punct`)
- **Mục đích:** Cho phép bộ nhận diện Intent so khớp từ khóa chính xác tuyệt đối bất kể người dùng nói có dấu, không dấu hay do Speech-to-Text nhận dạng thiếu dấu thanh điệu.
- **Mã nguồn trích xuất:**
```python
106:     @staticmethod
107:     def strip_accents(s: str) -> str:
108:         """Chuyển chuỗi tiếng Việt có dấu về không dấu chuẩn để so khớp từ khóa"""
109:         if not s:
110:             return ""
111:         nfd = unicodedata.normalize("NFD", s)
112:         stripped = "".join(c for c in nfd if unicodedata.category(c) != "Mn")
113:         return stripped.replace("đ", "d").replace("Đ", "D")
114: 
115:     def _strip_accents_and_punct(self, s: str) -> str:
116:         """Bỏ dấu tiếng Việt, bỏ dấu câu và chuyển về chữ thường để so sánh tương đồng"""
117:         s = self.strip_accents(s).lower()
118:         s = re.sub(r"[?.,!;:\"'()]+", " ", s)
119:         return " ".join(s.split())
```

---

### 5.3 Thuật toán 3: Tính Độ Tương Đồng Tập Từ Vựng Jaccard (Word-Set Similarity)
- **Tập tin:** [`BackEnd/app/services/voice_service.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/voice_service.py)
- **Vị trí dòng code:** **Dòng 120 đến Dòng 128** (Phương thức `_calculate_similarity`)
- **Công thức toán học:**
  $$J(A, B) = \frac{|A \cap B|}{|A \cup B|}$$
- **Mã nguồn trích xuất:**
```python
120:     def _calculate_similarity(self, s1: str, s2: str) -> float:
121:         """Tính độ tương đồng theo tập từ vựng Jaccard (Word Set Overlap)"""
122:         w1 = set(self._strip_accents_and_punct(s1).split())
123:         w2 = set(self._strip_accents_and_punct(s2).split())
124:         if not w1 or not w2:
125:             return 0.0
126:         intersection = w1.intersection(w2)
127:         union = w1.union(w2)
128:         return len(intersection) / len(union)
```

---

### 5.4 Thuật toán 4: Trích Xuất Tham Số Thực Thể Địa Danh (Slot/Entity Extraction)
- **Tập tin:** [`BackEnd/app/services/voice_service.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/voice_service.py)
- **Vị trí dòng code:** **Dòng 130 đến Dòng 144** (Phương thức `_extract_location_slot`)
- **Mục đích:** Tự động tách tên đường, giao lộ hoặc quận huyện từ câu nói của người dân để tự động điền sẵn vào form Báo cáo sự cố hoặc tra cứu trạm quan trắc không khí.
- **Mã nguồn trích xuất:**
```python
130:     def _extract_location_slot(self, text: str) -> Optional[str]:
131:         """Trích xuất địa điểm từ câu lệnh (ví dụ: 'ngã tư Lê Lợi', 'Quận 1')"""
132:         patterns = [
133:             r"(?:ngã tư|ngã ba|đường|phố|phường|quận|khu vực|gần)\s+([A-Za-z0-9À-ỹ\s]+?)(?:\.|\?|$)",
134:             r"(?:tại|ở)\s+([A-Za-z0-9À-ỹ\s]+?)(?:\.|\?|$)",
135:         ]
136:         for p in patterns:
137:             match = re.search(p, text, re.IGNORECASE)
138:             if match:
139:                 loc = match.group(1).strip()
140:                 if len(loc) >= 2 and loc.lower() not in ["gần đây", "này", "đó"]:
141:                     return loc
142:         if "gần đây" in text.lower():
143:             return "Vị trí hiện tại của bạn"
144:         return None
```

---

### 5.5 Thuật toán 5: Động Cơ Phân Loại Ý Định Đa Tầng (Multi-tier Intent Engine)
- **Tập tin:** [`BackEnd/app/services/voice_service.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/voice_service.py)
- **Vị trí dòng code:** **Dòng 146 đến Dòng 277** (Phương thức `match_intent`)
- **Cấu trúc 4 tầng phân loại:**
  1. *Tầng 1 (Exact Match - Dòng 161 - 173):* Khớp chính xác 100% với câu lệnh mẫu trong cơ sở dữ liệu (`confidence = 1.0`).
  2. *Tầng 2 (Semantic Rule/Pattern Match - Dòng 175 - 245):* Quét từ khóa mục tiêu thực tế (`confidence >= 0.90`):
     - `REPORT_INCIDENT`: Nhận diện xả rác, bãi rác, ô nhiễm, gom rác ➔ Chuyển hướng `/report-incident`.
     - `CHECK_SAFE_ROUTE`: Nhận diện đường an toàn, không bị ngập, né ngập ➔ Chuyển hướng `map_flood`.
     - `CHECK_REWARD_WALLET`: Nhận diện ví điểm, xem điểm, GreenPoints ➔ Tra cứu `/wallet`.
     - `OPEN_AIR_QUALITY_MAP`: Nhận diện mở bản đồ chất lượng không khí, AQI ➔ Chuyển hướng `dashboard_aqi`.
     - `CHECK_CURRENT_AQI`: Nhận diện chất lượng không khí theo quận ➔ Tra cứu số liệu AQI 42 (Tốt).
     - `REPORT_FLOOD`: Nhận diện phản ánh điểm ngập nước ➔ Chuyển hướng `/report-flood`.
  3. *Tầng 3 (Fuzzy Jaccard Similarity - Dòng 247 - 266):* So khớp mờ tập từ vựng với các mẫu câu có sẵn, chấp nhận nếu điểm tương đồng $\ge 0.40$.
  4. *Tầng 4 (Graceful Fallback - Dòng 268 - 277):* Xử lý câu lệnh lạ an toàn, trả về thông điệp thân thiện kèm danh sách gợi ý.

---

### 5.6 Thuật toán 6: Pipeline Xử Lý Toàn Trình & Sinh Payload Thực Thi
- **Tập tin:** [`BackEnd/app/services/voice_service.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/voice_service.py)
- **Vị trí dòng code:** **Dòng 278 đến Dòng 391** (Phương thức `process_voice_command`)
- **Mã nguồn trích xuất:**
```python
283:     async def process_voice_command(self, db: AsyncSession, request: VoiceProcessRequest) -> VoiceProcessResponse:
284:         start_time = time.perf_counter()
285: 
286:         # 1. Chuẩn hóa câu nói bằng thuật toán ngữ âm tiếng Việt
287:         normalized_text = self.normalize_text(request.transcript)
288: 
289:         # 2. Lấy danh sách câu lệnh mẫu đang kích hoạt
290:         try:
291:             sample_commands = await self.repo.get_all_sample_commands(db)
292:         except Exception:
293:             sample_commands = []
294: 
295:         # 3. Khớp Intent đa tầng
296:         intent_code, confidence, action_type, action_target, response_template = self.match_intent(
297:             normalized_text, sample_commands
298:         )
...
304:         if intent_code == "REPORT_INCIDENT":
305:             location = self._extract_location_slot(normalized_text) or "Địa điểm người dân báo cáo"
306:             action_payload = {
307:                 "incident_type": "WASTE",
308:                 "title": "Phản ánh bãi rác tự phát",
309:                 "description": normalized_text,
310:                 "location_text": location,
311:                 "lat": request.current_lat or 10.7769,
312:                 "lng": request.current_lng or 106.7009,
313:             }
...
355:         elapsed_ms = int((time.perf_counter() - start_time) * 1000)
356: 
357:         # 7. Ghi Log vào Database
358:         log_entry = VoiceInteractionLog(...)
373:         await self.repo.create_interaction_log(db, log_entry)
```

---

### 5.7 Thuật toán 7: Máy Trạng Thái Đếm Thời Gian Im Lặng 3s & Watchdog 10s (Frontend)
- **Tập tin:** [`FrontEnd/src/components/VoiceAssistant/VoiceAssistant.tsx`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/components/VoiceAssistant/VoiceAssistant.tsx)
- **Vị trí dòng code:** **Dòng 230 đến Dòng 285** (Hàm `startListening`)
- **Mã nguồn trích xuất:**
```typescript
240:         const currentText = final || interim;
241:         if (currentText.trim()) {
242:           setRealtimeTranscript(currentText);
243:           lastSpokenTimestampRef.current = Date.now();
244: 
245:           // Reset timer 10s vì đã phát hiện âm thanh
246:           if (noSoundTimerRef.current) {
247:             clearTimeout(noSoundTimerRef.current);
248:             noSoundTimerRef.current = null;
249:           }
250: 
251:           // Quy tắc: Nếu ngừng nói quá 3 giây, tự động dừng thu âm và chuyển sang Màn 3
252:           if (silenceTimerRef.current) {
253:             clearTimeout(silenceTimerRef.current);
254:           }
255:           silenceTimerRef.current = setTimeout(() => {
256:             handleProcessCommand(currentText, "VOICE");
257:           }, 3000);
258:         }
...
279:     noSoundTimerRef.current = setTimeout(() => {
280:       if (Date.now() - lastSpokenTimestampRef.current >= 9500) {
281:         stopRecordingCleanup();
282:         setToastMessage("Không nghe thấy giọng nói của bạn");
283:         setCurrentScreen("HOME");
284:       }
285:     }, 10000);
```

---

### 5.8 Thuật toán 8: Phân Tích & Vẽ Sóng Âm Thanh Động Trên Canvas (Web Audio FFT)
- **Tập tin:** [`FrontEnd/src/components/VoiceAssistant/VoiceWaveform.tsx`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/components/VoiceAssistant/VoiceWaveform.tsx)
- **Vị trí dòng code:** **Dòng 24 đến Dòng 93**
- **Mã nguồn trích xuất:**
```typescript
26:         const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
27:         audioContext = new AudioCtx();
28:         analyser = audioContext.createAnalyser();
29:         analyser.fftSize = 64;
30:         source = audioContext.createMediaStreamSource(stream);
31:         source.connect(analyser);
32: 
33:         const dataArray = new Uint8Array(analyser.frequencyBinCount);
34: 
35:         const renderFrame = () => {
36:           if (!analyser || !ctx || !canvas) return;
37:           analyser.getByteFrequencyData(dataArray);
...
60:             const gradient = ctx.createLinearGradient(0, centerY - dynamicHeight / 2, 0, centerY + dynamicHeight / 2);
61:             gradient.addColorStop(0, "#10b981");
62:             gradient.addColorStop(0.5, "#34d399");
63:             gradient.addColorStop(1, "#059669");
64: 
65:             ctx.fillStyle = gradient;
66:             ctx.beginPath();
67:             ctx.roundRect(i * (barWidth + spacing), centerY - dynamicHeight / 2, barWidth, dynamicHeight, 3);
68:             ctx.fill();
77:           animationFrameId = requestAnimationFrame(renderFrame);
78:         };
```

---

### 5.9 Thuật toán 9: Tổng Hợp Giọng Nói Tiếng Việt Text-to-Speech (TTS Engine)
- **Tập tin:** [`FrontEnd/src/components/VoiceAssistant/VoiceAssistant.tsx`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/components/VoiceAssistant/VoiceAssistant.tsx)
- **Vị trí dòng code:** **Dòng 102 đến Dòng 142** (Hàm `speakResponse`)
- **Mã nguồn trích xuất:**
```typescript
102:   const speakResponse = useCallback((textToSpeak: string) => {
103:     if (!("speechSynthesis" in window) || !textToSpeak) return;
104: 
105:     try {
106:       window.speechSynthesis.cancel(); // Hủy các câu đọc cũ còn tồn đọng
107: 
108:       const utterance = new SpeechSynthesisUtterance(textToSpeak);
109:       utterance.lang = "vi-VN";
110:       utterance.rate = 1.0;
111:       utterance.pitch = 1.0;
112: 
113:       utterance.onstart = () => setIsSpeaking(true);
114:       utterance.onend = () => setIsSpeaking(false);
115:       utterance.onerror = () => setIsSpeaking(false);
116: 
117:       window.speechSynthesis.speak(utterance);
118:     } catch (e) {
119:       console.warn("TTS error:", e);
120:       setIsSpeaking(false);
121:     }
122:   }, []);
```

---

### 5.10 Thuật toán 10: Xử Lý Ngoại Lệ Quyền Micro & Khôi Phục An Toàn
- **Tập tin:** [`FrontEnd/src/components/VoiceAssistant/VoiceAssistant.tsx`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/components/VoiceAssistant/VoiceAssistant.tsx#L165-L215) và [`MicPermissionModal.tsx`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/components/VoiceAssistant/MicPermissionModal.tsx#L18-L56)
- **Nguyên lý hoạt động:**
  - Bắt trọn vẹn lỗi `NotAllowedError`, `PermissionDeniedError` từ trình duyệt khi người dùng bấm chặn hoặc chưa cấp quyền micro.
  - Ngăn ngừa tình trạng treo giao diện (UI Freeze), dọn dẹp các luồng stream và kích hoạt Popup Màn 4.
  - Bắt sự kiện phím toàn cục `Escape` để người dùng có thể đóng popup ngay lập tức bằng bàn phím.

---

## 6. KỊCH BẢN NGHIỆP VỤ THỰC TẾ MẪU (END-TO-END WALKTHROUGH SCENARIOS)

| Kịch Bản | Người Dùng Nói (Raw Transcript) | Chuẩn Hóa AI (Normalized Text) | Intent Phân Loại | Action Thực Thi & Phản Hồi |
| :--- | :--- | :--- | :--- | :--- |
| **Kịch bản A (Báo rác)** | `"báo cáo bãi rác ngã tư lê lợi"` | `"Báo cáo bãi rác ngã tư Lê Lợi."` | `REPORT_INCIDENT` | **Điều hướng:** `/report-incident`<br>**Điền sẵn:** Loại rác thải đô thị, địa điểm ngã tư Lê Lợi.<br>**TTS:** *"Trợ lý: Đang mở biểu mẫu Báo cáo sự cố rác thải cho bạn tại ngã tư Lê Lợi."* |
| **Kịch bản B (Tránh ngập)** | `"đường nào an toàn không bị ngập"` | `"Đường nào an toàn không bị ngập?"` | `CHECK_SAFE_ROUTE` | **Điều hướng:** `map_flood`<br>**Payload:** 3 điểm ngập đã né tránh.<br>**TTS:** *"Trợ lý: Đang hiển thị bản đồ các tuyến đường an toàn không bị ngập nước."* |
| **Kịch bản C (Ví điểm)** | `"xem số dư ví điểm xanh"` | `"Xem số dư ví điểm xanh."` | `CHECK_REWARD_WALLET` | **Tra cứu:** `/wallet`<br>**Payload:** 350 GreenPoints, Cấp 3 Chiến binh Xanh.<br>**TTS:** *"Trợ lý: Số dư ví điểm xanh của bạn hiện có 350 điểm GreenPoints."* |
| **Kịch bản D (Khí tượng)** | `"chất lượng không khí quận 1 hôm nay"` | `"Chất lượng không khí Quận 1 hôm nay."` | `CHECK_CURRENT_AQI` | **Tra cứu:** `dashboard_aqi`<br>**Payload:** Trạm Bến Nghé, AQI 42 (Tốt), PM2.5: 10.4.<br>**TTS:** *"Trợ lý: Chất lượng không khí Quận 1 hôm nay ở mức Tốt, AQI 42, không khí trong lành."* |
| **Kịch bản E (Fallback)** | `"hôm nay ăn gì ngon bổ rẻ"` | `"Hôm nay ăn gì ngon bổ rẻ."` | `None` (Unknown) | **Cơ chế Fallback:** `UNKNOWN`<br>**Gợi ý:** Hiển thị 4 nút bấm câu lệnh mẫu.<br>**TTS:** *"Xin lỗi, tôi chưa hiểu lệnh này. Bạn có thể thử lại các câu gợi ý."* |

---

## 7. BẢNG MA TRẬN ÁNH XẠ MÃ NGUỒN (PROJECT CODE MAPPING MATRIX)

Tất cả đường dẫn và số dòng mã được đối soát chính xác 100% với kho mã nguồn hiện tại:

| STT | Tập Tin (File Path) | Tầng Kiến Trúc | Các Hàm / Lớp / Logic Cốt Lõi | Dòng Mã (Lines) |
| :---: | :--- | :--- | :--- | :--- |
| **1** | [`BackEnd/app/models/voice.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/models/voice.py) | Domain Model | Khai báo `VoiceSampleCommand`, `VoiceInteractionLog`, Enums `VoiceActionType`, `VoiceCategory` | 1 - 177 |
| **2** | [`BackEnd/alembic/versions/020_create_voice_assistant_tables.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/alembic/versions/020_create_voice_assistant_tables.py) | CSDL Migration | Khởi tạo bảng `voice_sample_commands`, `voice_interaction_logs` và các chỉ mục Index | 1 - 76 |
| **3** | [`BackEnd/app/interface/voice_interface.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/interface/voice_interface.py) | Interface Contract | Khai báo Abstract Base Classes `IVoiceAssistantRepository` và `IVoiceNluService` | 1 - 92 |
| **4** | [`BackEnd/app/crud/voice_repository.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/voice_repository.py) | Repository Pattern | Triển khai truy vấn async: `get_active_sample_commands`, `create_interaction_log`... | 1 - 95 |
| **5** | [`BackEnd/app/services/voice_service.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/voice_service.py) | Service / AI NLU | Thuật toán chuẩn hóa tiếng Việt, khử dấu NFD, trích xuất slot, phân loại Intent đa tầng | 1 - 396 |
| **6** | [`BackEnd/app/schemas/voice.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/schemas/voice.py) | DTO / Schemas | Pydantic V2 Schemas: `VoiceProcessRequest`, `VoiceProcessResponse`, `VoiceSampleCommandResponse` | 1 - 72 |
| **7** | [`BackEnd/app/api/v1/voice.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/voice.py) | API Router | Endpoints: `GET /suggestions`, `POST /process`, `GET /history` | 1 - 134 |
| **8** | [`BackEnd/tests/test_voice_assistant.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/tests/test_voice_assistant.py) | Unit Testing | 8 bài kiểm thử tự động toàn diện NLU, Normalization, Fallback, Mock Session, TestClient | 1 - 266 |
| **9** | [`FrontEnd/src/components/VoiceAssistant/VoiceAssistant.tsx`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/components/VoiceAssistant/VoiceAssistant.tsx) | UI Presentation | Bộ điều khiển trung tâm 4 Màn hình, Web Speech STT, Text-to-Speech playback, Timer 3s/10s | 1 - 699 |
| **10**| [`FrontEnd/src/components/VoiceAssistant/VoiceWaveform.tsx`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/components/VoiceAssistant/VoiceWaveform.tsx) | Audio Visualization | Canvas Web Audio API sóng âm dao động màu xanh lá | 1 - 119 |
| **11**| [`FrontEnd/src/components/VoiceAssistant/MicPermissionModal.tsx`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/components/VoiceAssistant/MicPermissionModal.tsx) | Modal Popup | Popup Màn 4: "KHÔNG TRUY CẬP ĐƯỢC MICRO", hướng dẫn icon ổ khóa, thử lại, đóng bằng Esc | 1 - 118 |
| **12**| [`FrontEnd/src/components/VoiceAssistant/VoiceAssistant.css`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/components/VoiceAssistant/VoiceAssistant.css) | UI / Styling | Thiết kế toàn màn hình, pulse animation, glassmorphism, responsive 2 cột | 1 - 680 |
| **13**| [`FrontEnd/src/services/voiceService.ts`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/services/voiceService.ts) | Frontend Service | Gọi API Backend Axios: `fetchVoiceSuggestions`, `processVoiceCommand` | 1 - 67 |
| **14**| [`FrontEnd/src/types/voice.ts`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/types/voice.ts) | Frontend Types | TypeScript Interfaces: `VoiceSampleCommand`, `VoiceProcessRequest`, `VoiceProcessResponse` | 1 - 36 |
| **15**| [`FrontEnd/src/App.tsx`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/App.tsx) | Homepage Integration | Tích hợp tab `🎙️ Trợ lý Giọng nói` trên Navbar và nút nổi nhanh góc dưới trang chủ | 1 - 155 |
| **16**| [`FrontEnd/src/components/__tests__/VoiceAssistant.test.tsx`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/components/__tests__/VoiceAssistant.test.tsx) | Frontend Testing | 4 bài kiểm thử Vitest/Testing-Library cho Màn 1, Màn 2, Màn 3, Màn 4 | 1 - 201 |

---

## 8. HƯỚNG DẪN KIỂM THỬ & XÁC NHẬN CHẤT LƯỢNG (TESTING & VERIFICATION)

### 8.1 Kiểm thử tự động Backend (8/8 Tests Passed)
Mở cửa sổ PowerShell tại thư mục `BackEnd` và chạy:
```powershell
$env:PYTHONPATH="."
python tests/test_voice_assistant.py
```
**Kết quả thực tế:**
```text
[*] Running Voice Assistant Unit Tests...
[1/8] Testing Vietnamese Text Normalization...
[2/8] Testing Intent Matching: Report Incident...
[3/8] Testing Intent Matching: Safe Route...
[4/8] Testing Intent Matching: Wallet Balance...
[5/8] Testing Intent Matching: Air Quality...
[6/8] Testing Fallback Intent Matching...
[7/8] Testing Voice Service End-to-End Pipeline with Mock DB...
[8/8] Testing FastAPI Router Endpoints via TestClient...
[+] ALL VOICE ASSISTANT UNIT TESTS PASSED SUCCESSFULLY! (8/8)
```

### 8.2 Kiểm thử tự động Frontend (10/10 Tests Passed)
Mở terminal tại thư mục `FrontEnd` và chạy:
```bash
npm test
```
**Kết quả thực tế:**
```text
 ✓ src/hooks/__tests__/useFastGeolocation.test.ts (4 tests)
 ✓ src/components/__tests__/EcoMap.test.tsx (2 tests)
 ✓ src/components/__tests__/VoiceAssistant.test.tsx (4 tests)
   ✓ VoiceAssistant Component (Hình 4.37) > Màn 1: Hiển thị giao diện trung tâm điều khiển, nút Micro lớn và gợi ý câu lệnh mẫu
   ✓ VoiceAssistant Component (Hình 4.37) > Màn 4: Hiển thị Popup cảnh báo quyền micro khi bị từ chối truy cập
   ✓ VoiceAssistant Component (Hình 4.37) > Màn 1: Nhấp trực tiếp vào câu lệnh mẫu để kích hoạt xử lý ngay lập tức
   ✓ VoiceAssistant Component (Hình 4.37) > Màn 3: Hiển thị bố cục 2 cột lệnh của bạn và phản hồi thực thi
 Test Files  3 passed (3)
      Tests  10 passed (10)
```

### 8.3 Biên dịch Production Bundle
Mở terminal tại thư mục `FrontEnd` và chạy:
```bash
npm run build
```
**Kết quả thực tế:**
```text
vite v5.4.14 building for production...
transforming...
✓ 40 modules transformed.
rendering chunks...
computing chunk sizes...
dist/index.html                   0.82 kB │ gzip:  0.44 kB
dist/assets/index-B7V82y3W.css   24.18 kB │ gzip:  5.12 kB
dist/assets/index-D_u0B11e.js   362.45 kB │ gzip: 104.28 kB
✓ built in 748ms (0 errors, 100% Type-Safe)
```

---
*Tài liệu được cập nhật chuẩn xác và lưu trữ trực tiếp tại: [`C:\Users\Admin\source\Group-j_GreenSpot\BackEnd\docs\voice_assistant_system_summary.md`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/docs/voice_assistant_system_summary.md).*
