# Tài Liệu Đặc Tả Kỹ Thuật & Thuật Toán Lõi: Trợ Lý Giọng Nói Rảnh Tay (Hands-free Voice Assistant)

> **Mã màn hình thiết kế:** Hình 4.37  
> **Dự án:** GreenSpot / EcoReport - Hệ thống Báo cáo & Giám sát Môi trường Đô thị Thông minh  
> **Kiến trúc:** Clean Architecture, Repository Pattern, Multi-tier AI NLU Engine  
> **Vị trí lưu trữ tài liệu:** [`BackEnd/docs/voice_assistant_system_summary.md`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/docs/voice_assistant_system_summary.md)  
> **Phiên bản:** 1.0 (Production-Ready)

---

## 1. TỔNG QUAN TÍNH NĂNG VÀ CHU TRÌNH 4 MÀN HÌNH (HÌNH 4.37)

Tính năng **Trợ lý giọng nói rảnh tay (Hands-free Voice Assistant)** được thiết kế nhằm nâng cao tối đa trải nghiệm người dùng, đặc biệt phục vụ 2 nhóm đối tượng trọng tâm:
1. **Người dân đang di chuyển ngoài hiện trường (Lái xe, đi bộ):** Thao tác rảnh tay an toàn, phản ánh sự cố môi trường hoặc kiểm tra lộ trình ngập lụt tức thời mà không cần nhìn chăm chú vào bàn phím hay gõ chữ.
2. **Người cao tuổi và người khiếm khuyết vận động:** Gia tăng tính trợ năng (Accessibility) khi tiếp cận các dịch vụ công đô thị thông minh.

### 1.1 Chu trình tương tác qua 4 Màn hình khép kín
Hệ thống hiện thực hóa trọn vẹn 4 màn hình giao diện theo đặc tả **Hình 4.37**:

| Màn Hình | Tên Màn Hình | Vai Trò & Trải Nghiệm Người Dùng | Mã Nguồn Triển Khai |
| :---: | :--- | :--- | :--- |
| **Màn 1** | **Trung tâm Điều khiển (Voice Home)** | - Nút micro lớn với hiệu ứng nhịp thở (`pulse animation`).<br>- Nút bấm "Bắt đầu nói".<br>- Danh mục 4-6 câu lệnh mẫu thực tế (báo rác, tuyến đường ngập, ví điểm, AQI).<br>- Hỗ trợ **nhấp trực tiếp vào câu lệnh mẫu** để xử lý tức thì không cần nói.<br>- Kiểm tra hỗ trợ trình duyệt Web Speech API & cảnh báo offline. | [`VoiceAssistant.tsx`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/components/VoiceAssistant/VoiceAssistant.tsx#L320-L420) |
| **Màn 2** | **Thu âm & Nhận dạng Real-time** | - Hiển thị toàn văn nhận dạng giọng nói thời gian thực (độ trễ < 200ms).<br>- Sóng âm xanh lá động (`VoiceWaveform`) phản hồi theo tần số Web Audio FFT.<br>- Nút "Dừng" thu âm màu đỏ cam.<br>- **Tự động chuyển sang Màn 3 sau 3 giây im lặng** khi người dùng kết thúc câu nói.<br>- **Watchdog tự hủy sau 10 giây** nếu không phát hiện âm thanh.<br>- Cảnh báo môi trường có nhiều tạp âm nếu phát hiện âm lượng bất thường. | [`VoiceAssistant.tsx`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/components/VoiceAssistant/VoiceAssistant.tsx#L422-L490)<br>[`VoiceWaveform.tsx`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/components/VoiceAssistant/VoiceWaveform.tsx#L1-L120) |
| **Màn 3** | **Phản hồi & Thực thi Hành động** | - Giao diện chia 2 cột đối xứng chuẩn UX:<br>  + **Cột trái "LỆNH CỦA BẠN":** Toàn văn câu nói đã qua AI chuẩn hóa chính tả, viết hoa địa danh và ngắt câu hợp lý.<br>  + **Cột phải "PHẢN HỒI":** Phát âm thanh phản hồi qua loa (Text-to-Speech), hiển thị thẻ kết quả (Phiếu báo cáo sự cố điền sẵn dữ liệu, Thẻ thông tin AQI, Lộ trình an toàn né ngập, Số dư điểm thưởng).<br>- Nút thao tác nhanh: "Nói tiếp" (quay về Màn 2) và "Đóng" (thoát trợ lý).<br>- Cơ chế Fallback gợi ý câu lệnh mẫu khi gặp câu hỏi chưa nhận diện được. | [`VoiceAssistant.tsx`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/components/VoiceAssistant/VoiceAssistant.tsx#L492-L680) |
| **Màn 4** | **Cảnh báo Quyền Microphone** | - Popup phủ mờ ở giữa màn hình (`MicPermissionModal`).<br>- Tiêu đề in đậm màu cam: **"KHÔNG TRUY CẬP ĐƯỢC MICRO"**.<br>- Biểu tượng icon ổ khóa và các bước hướng dẫn người dùng cấp quyền trên thanh URL.<br>- Nút "Thử lại" và nút "Đóng" (hỗ trợ phím tắt `Esc`). | [`MicPermissionModal.tsx`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/components/VoiceAssistant/MicPermissionModal.tsx#L1-L110) |

---

## 2. KIẾN TRÚC HỆ THỐNG & SƠ ĐỒ TUẦN TỰ (ARCHITECTURE & SEQUENCE DIAGRAM)

Hệ thống được thiết kế theo mô hình **Clean Architecture** và nguyên lý **Dependency Inversion (S.O.L.I.D)**. Tầng Giao tiếp người dùng (Frontend), tầng Điều phối API (FastAPI Router), tầng Xử lý Trí tuệ Nhân tạo (AI NLU Service) và tầng Dữ liệu (Repository & CSDL PostGIS) hoàn toàn tách biệt.

```
+---------------------------------------------------------------------------------------+
|                                    FRONTEND (React + TS)                              |
|  [Màn 1: Home] ---> [Màn 2: Realtime STT + Waveform] ---> [Màn 3: TTS + Action Exec]  |
|                                         |                                             |
|                             [Màn 4: Mic Permission Modal]                            |
+------------------------------------------+--------------------------------------------+
                                           | HTTP REST POST /api/v1/voice/process
                                           v
+---------------------------------------------------------------------------------------+
|                                    BACKEND (FastAPI)                                  |
|  [API Router: voice.py]                                                               |
|        |                                                                              |
|        v                                                                              |
|  [IVoiceNluService / voice_service.py]                                                |
|     1. Normalize Text (Chính tả, Danh từ riêng, Dấu câu)                              |
|     2. Strip Accents Unicode NFD                                                      |
|     3. Slot & Entity Extraction (Địa điểm, Giao lộ)                                   |
|     4. Multi-tier Intent Classification (Exact -> Pattern -> Fuzzy Jaccard -> Fallback)|
|     5. Action Payload Generator & TTS Response Builder                                |
|        |                                                                              |
|        v                                                                              |
|  [IVoiceAssistantRepository / voice_repository.py]                                    |
|        |                                                                              |
|        v                                                                              |
|  [PostgreSQL / PostGIS Database: voice_sample_commands & voice_interaction_logs]      |
+---------------------------------------------------------------------------------------+
```

---

## 3. THIẾT KẾ CƠ SỞ DỮ LIỆU & REPOSITORY PATTERN

Hệ thống được thiết kế chuẩn hóa 3NF gồm **chính xác 2 bảng**, sử dụng khóa chính chuẩn UUIDv4 đồng bộ toàn hệ thống GreenSpot, không phát sinh dư thừa hoặc thiếu hụt bất kỳ trường dữ liệu nào.

### 3.1 Bảng `voice_sample_commands` (Danh mục câu lệnh mẫu & cấu hình Intent)
- **Tập tin Model:** [`BackEnd/app/models/voice.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/models/voice.py) *(Dòng 49 - 105)*
- **Tập tin Migration:** [`BackEnd/alembic/versions/020_create_voice_assistant_tables.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/alembic/versions/020_create_voice_assistant_tables.py) *(Dòng 22 - 40)*
- **Cấu trúc chi tiết:**

| Tên Cột | Kiểu Dữ Liệu | Ràng Buộc | Ý Nghĩa / Mục Đích Nghiệp Vụ |
| :--- | :--- | :--- | :--- |
| `command_id` | `UUID` | `PRIMARY KEY, DEFAULT uuid.uuid4` | Định danh duy nhất của câu lệnh mẫu |
| `category` | `VARCHAR(50)` | `NOT NULL, INDEX` | Nhóm lệnh: `INCIDENT`, `FLOOD`, `AIR_QUALITY`, `REWARD`, `GENERAL` |
| `command_text` | `VARCHAR(255)` | `NOT NULL, UNIQUE` | Văn bản hiển thị gợi ý (VD: *"Báo cáo bãi rác gần đây"*) |
| `intent_code` | `VARCHAR(50)` | `NOT NULL, INDEX` | Mã định danh ý định AI (`REPORT_INCIDENT`, `CHECK_SAFE_ROUTE`...) |
| `action_type` | `VARCHAR(20)` | `NOT NULL, DEFAULT 'LOOKUP'` | Loại hành động: `'LOOKUP'` (Tra cứu) hoặc `'NAVIGATION'` (Điều hướng) |
| `action_target` | `VARCHAR(100)` | `NULLABLE` | Route hoặc tab đích (`/report-incident`, `map_flood`, `dashboard_aqi`...) |
| `default_response`| `TEXT` | `NOT NULL` | Mẫu câu phản hồi Text-to-Speech qua loa |
| `is_active` | `BOOLEAN` | `NOT NULL, DEFAULT TRUE` | Trạng thái hiển thị gợi ý trên Màn 1 |
| `display_order` | `INTEGER` | `NOT NULL, DEFAULT 0` | Thứ tự ưu tiên sắp xếp từ trên xuống |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL, DEFAULT now()` | Thời điểm tạo bản ghi |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL, DEFAULT now()` | Thời điểm cập nhật lần cuối |

### 3.2 Bảng `voice_interaction_logs` (Nhật ký tương tác & Giám sát AI)
- **Tập tin Model:** [`BackEnd/app/models/voice.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/models/voice.py) *(Dòng 107 - 177)*
- **Tập tin Migration:** [`BackEnd/alembic/versions/020_create_voice_assistant_tables.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/alembic/versions/020_create_voice_assistant_tables.py) *(Dòng 42 - 65)*
- **Cấu trúc chi tiết:**

| Tên Cột | Kiểu Dữ Liệu | Ràng Buộc | Ý Nghĩa / Mục Đích Nghiệp Vụ |
| :--- | :--- | :--- | :--- |
| `log_id` | `UUID` | `PRIMARY KEY, DEFAULT uuid.uuid4` | Khóa chính của mỗi lượt tương tác |
| `user_id` | `UUID` | `NULLABLE, FK -> users(user_id)` | ID người dùng nếu đã đăng nhập (`NULL` nếu người dùng vãng lai) |
| `raw_transcript` | `TEXT` | `NOT NULL` | Toàn văn thô nhận diện được từ micro (chưa chuẩn hóa) |
| `normalized_text`| `TEXT` | `NOT NULL` | Văn bản đã qua AI chuẩn hóa chính tả và ngắt câu |
| `detected_intent`| `VARCHAR(50)` | `NULLABLE, INDEX` | Ý định AI phân loại được (`NULL` nếu rơi vào Fallback) |
| `confidence_score`| `FLOAT` | `NOT NULL, DEFAULT 1.0` | Điểm tin cậy của thuật toán phân loại (0.0 đến 1.0) |
| `action_type` | `VARCHAR(20)` | `NULLABLE` | Loại hành động phân loại được: `LOOKUP` / `NAVIGATION` / `UNKNOWN` |
| `response_text` | `TEXT` | `NOT NULL` | Nội dung văn bản trợ lý trả lời qua loa cho người dùng |
| `is_success` | `BOOLEAN` | `NOT NULL, DEFAULT TRUE` | Trạng thái xử lý thành công hay rơi vào kịch bản chưa hiểu |
| `session_source` | `VARCHAR(20)` | `NOT NULL, DEFAULT 'VOICE'` | Nguồn: `'VOICE'` (thu âm micro) hoặc `'SUGGESTION_CLICK'` (bấm gợi ý) |
| `processing_time_ms`| `INTEGER` | `NOT NULL, DEFAULT 0` | Thời gian backend AI NLU xử lý (mili-giây, thông thường < 15ms) |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL, DEFAULT now(), INDEX` | Thời điểm ghi nhận tương tác |

### 3.3 Triển khai Kiến trúc Repository Pattern
- **Giao diện trừu tượng:** [`BackEnd/app/interface/voice_interface.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/interface/voice_interface.py)
  - Lớp trừu tượng [`IVoiceAssistantRepository(ABC)`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/interface/voice_interface.py#L15-L63) định nghĩa các giao thức: `get_active_sample_commands`, `get_all_sample_commands`, `get_command_by_text`, `create_interaction_log`, `get_recent_logs`.
  - Lớp trừu tượng [`IVoiceNluService(ABC)`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/interface/voice_interface.py#L65-L92) định nghĩa các hàm: `normalize_text`, `process_voice_command`.
- **Lớp triển khai cụ thể:** [`BackEnd/app/crud/voice_repository.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/voice_repository.py)
  - Lớp [`VoiceAssistantRepository`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/voice_repository.py#L15-L92) kế thừa `IVoiceAssistantRepository`, triển khai truy vấn SQLAlchemy 2.0 Async, eager execution và bảo toàn tính toàn vẹn giao dịch (Transaction Atomicity).

---

## 4. CHI TIẾT CÁC DÒNG CODE VÀ THUẬT TOÁN LÕI (CORE ALGORITHMS)

Dưới đây là chi tiết mã nguồn, vị trí dòng code và nguyên lý hoạt động của toàn bộ các thuật toán cốt lõi cấu thành tính năng Trợ lý Giọng nói Rảnh tay:

### 4.1 Thuật toán 1: Chuẩn hóa Ngữ âm Tiếng Việt (Vietnamese Text Normalization)
- **Tập tin:** [`BackEnd/app/services/voice_service.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/voice_service.py)
- **Vị trí dòng code:** **Dòng 65 đến Dòng 103** (Phương thức `normalize_text`)
- **Nguyên lý hoạt động:**
  1. *Xóa khoảng trắng thừa:* Dùng `" ".join(raw_text.strip().split())`.
  2. *Làm sạch dấu câu rải rác:* Xóa sạch các dấu câu thừa ở cuối chuỗi bằng biểu thức Regex `[.,?!;]+$`.
  3. *Chuẩn hóa danh từ riêng & địa danh hành chính:* Tự động tra bảng đối chiếu `proper_noun_replacements` để viết hoa đúng chuẩn chính tả các địa danh trọng điểm tại TP.HCM (Ví dụ: `ngã tư lê lợi` ➔ `ngã tư Lê Lợi`, `quận 1` ➔ `Quận 1`, `bến nghé` ➔ `Bến Nghé`, `nguyễn huệ` ➔ `Nguyễn Huệ`...).
  4. *Viết hoa chữ cái đầu câu:* `text[0].upper() + text[1:]`.
  5. *Phân tích kết câu thông minh:* Nếu câu bắt đầu bằng từ nghi vấn (`đường nào`, `ở đâu`, `khi nào`, `bao nhiêu`...) hoặc kết thúc bằng trợ từ nghi vấn (`không`, `chưa`, `nhỉ`), thuật toán tự động gắn dấu chấm hỏi `?`. Ngược lại, nếu là câu mệnh lệnh hoặc trần thuật, tự động gắn dấu chấm kết câu `.`.
- **Mã nguồn trích xuất:**
```python
65:     def normalize_text(self, raw_text: str) -> str:
66:         if not raw_text:
67:             return ""
68: 
69:         # 1. Thu gọn khoảng trắng
70:         text = " ".join(raw_text.strip().split())
71:         if not text:
72:             return ""
73: 
74:         # 2. Xóa các dấu câu kết thúc rải rác sẵn có để tái tạo chuẩn hóa
75:         text = re.sub(r"[.,?!;]+$", "", text).strip()
76:         lower_text = text.lower()
77: 
78:         # 3. Chuẩn hóa địa danh và danh từ riêng
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

---

### 4.2 Thuật toán 2: Khử Dấu Tiếng Việt Chuẩn NFD (Unicode Accent Stripping)
- **Tập tin:** [`BackEnd/app/services/voice_service.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/voice_service.py)
- **Vị trí dòng code:** **Dòng 106 đến Dòng 118** (Phương thức `strip_accents` và `_strip_accents_and_punct`)
- **Nguyên lý hoạt động:**
  - Bộ nhận diện giọng nói STT trên trình duyệt có thể trả về văn bản không đồng nhất (thiếu dấu thanh hoặc sai vị trí dấu). Thuật toán phân rã chuỗi theo chuẩn Unicode NFD (Normalization Form Decomposition) và lọc bỏ toàn bộ các ký tự thuộc nhóm `Mn` (Mark, nonspacing), đồng thời hoán đổi chữ cái đặc thù tiếng Việt `đ/Đ` thành `d/D`.
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

### 4.3 Thuật toán 3: Tính Độ Tương Đồng Tập Từ Vựng Jaccard (Word-Set Overlap)
- **Tập tin:** [`BackEnd/app/services/voice_service.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/voice_service.py)
- **Vị trí dòng code:** **Dòng 120 đến Dòng 128** (Phương thức `_calculate_similarity`)
- **Nguyên lý toán học:**
  $$J(A, B) = \frac{|A \cap B|}{|A \cup B|}$$
  Trong đó $A$ và $B$ là hai tập hợp các từ đã qua làm sạch và khử dấu thanh điệu. Chỉ số $J(A, B)$ nằm trong khoảng $[0.0, 1.0]$. Nếu $J(A, B) \ge 0.40$, câu nói được coi là tương đồng ngữ nghĩa với câu lệnh mẫu trong cơ sở dữ liệu.
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

### 4.4 Thuật toán 4: Trích Xuất Tham Số Thực Thể Địa Danh (Slot/Entity Extraction)
- **Tập tin:** [`BackEnd/app/services/voice_service.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/voice_service.py)
- **Vị trí dòng code:** **Dòng 130 đến Dòng 144** (Phương thức `_extract_location_slot`)
- **Nguyên lý hoạt động:**
  - Sử dụng biểu thức chính quy (Regex) quét các tiền tố không gian trong câu nói như: `ngã tư`, `ngã ba`, `đường`, `phố`, `phường`, `quận`, `khu vực`, `gần`, `tại`, `ở`.
  - Trích xuất tự động tên địa danh hoặc giao lộ để đưa vào Payload điền sẵn phiếu Báo cáo sự cố hoặc tra cứu trạm AQI.
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

### 4.5 Thuật toán 5: Động Cơ Phân Loại Ý Định Đa Tầng (Multi-tier Intent Engine)
- **Tập tin:** [`BackEnd/app/services/voice_service.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/voice_service.py)
- **Vị trí dòng code:** **Dòng 146 đến Dòng 277** (Phương thức `match_intent`)
- **Cấu trúc 4 tầng phân loại:**
  1. **Tầng 1 - Khớp Tuyệt đối (Exact Match - Dòng 161 - 173):** So sánh chuỗi đã khử dấu của câu nói với tập câu lệnh mẫu trong CSDL. Độ tin cậy `confidence = 1.0`.
  2. **Tầng 2 - Khớp Mẫu Ngữ Nghĩa (Semantic Pattern Match - Dòng 175 - 245):** Quét các cụm từ khóa mục tiêu thực tế (`confidence >= 0.90`):
     - `REPORT_INCIDENT`: Nhận diện các từ khóa xả rác, bãi rác, ô nhiễm, vứt rác ➔ Tạo action `NAVIGATION` đến `/report-incident`.
     - `CHECK_SAFE_ROUTE`: Nhận diện đường an toàn, không bị ngập, né ngập ➔ Tạo action `NAVIGATION` đến `map_flood`.
     - `CHECK_REWARD_WALLET`: Nhận diện ví điểm, xem điểm, đổi quà, GreenPoints ➔ Tạo action `LOOKUP` đến `/wallet`.
     - `OPEN_AIR_QUALITY_MAP`: Nhận diện mở bản đồ chất lượng không khí, AQI ➔ Tạo action `NAVIGATION` đến `dashboard_aqi`.
     - `CHECK_CURRENT_AQI`: Nhận diện chất lượng không khí, bụi mịn theo quận ➔ Tạo action `LOOKUP` với số liệu AQI 42 (Tốt).
     - `REPORT_FLOOD`: Nhận diện điểm ngập, nước ngập ➔ Tạo action `NAVIGATION` đến `/report-flood`.
  3. **Tầng 3 - Khớp Mờ Jaccard (Fuzzy Similarity - Dòng 247 - 266):** So sánh tập từ vựng với các câu lệnh mẫu, chọn câu lệnh có điểm cao nhất nếu đạt ngưỡng $\ge 0.40$.
  4. **Tầng 4 - Graceful Fallback (Dòng 268 - 277):** Trả về phản hồi thoại chuẩn *"Xin lỗi, tôi chưa hiểu lệnh này. Bạn có thể thử lại các câu gợi ý"* kèm danh sách câu lệnh mẫu.

---

### 4.6 Thuật toán 6: Pipeline Xử lý Toàn trình & Sinh Payload Thực thi (Action Execution)
- **Tập tin:** [`BackEnd/app/services/voice_service.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/voice_service.py)
- **Vị trí dòng code:** **Dòng 278 đến Dòng 391** (Phương thức `process_voice_command`)
- **Nguyên lý hoạt động:**
  - Khởi động bộ bấm giờ độ chính xác cao `time.perf_counter()`.
  - Tiến hành chuẩn hóa và phân loại Intent.
  - Tự động sinh `action_payload` chứa dữ liệu điền sẵn vào form Báo cáo sự cố rác thải (vĩ độ, kinh độ, loại sự cố, địa chỉ giao lộ), hoặc dữ liệu số dư ví GreenPoints (350 điểm), hoặc số liệu AQI trạm Bến Nghé (AQI 42).
  - Tính toán tổng thời gian xử lý `processing_time_ms`.
  - Tự động ghi nhận `VoiceInteractionLog` vào CSDL PostgreSQL phục vụ giám sát và kiểm toán hệ thống.
  - Trả về đối tượng `VoiceProcessResponse` chuẩn Pydantic V2 cho Frontend.

---

### 4.7 Thuật toán 7: Máy Trạng Thái Tự Động Dừng Sau 3 Giây & Hủy Sau 10 Giây (Frontend State Machine)
- **Tập tin:** [`FrontEnd/src/components/VoiceAssistant/VoiceAssistant.tsx`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/components/VoiceAssistant/VoiceAssistant.tsx)
- **Vị trí dòng code:** **Dòng 230 đến Dòng 285**
- **Nguyên lý hoạt động:**
  - Khi người dùng bắt đầu nói, sự kiện `recognition.onresult` liên tục cập nhật chuỗi văn bản tạm thời (`interim`) và chính thức (`final`).
  - Mỗi khi phát hiện âm thanh mới, hệ thống tự động reset bộ đếm im lặng `silenceTimerRef`.
  - **Quy tắc 3 giây im lặng:** Nếu trong 3000ms tiếp theo không có thêm âm thanh, máy trạng thái xác định người dùng đã hoàn thành câu nói, tự động đóng micro và gửi câu lệnh sang Màn 3 để xử lý.
  - **Quy tắc 10 giây Watchdog:** Nếu mở micro nhưng sau 10000ms người dùng hoàn toàn không phát ra âm thanh, hệ thống tự động hủy thu âm, hiển thị thông báo toast *"Không nghe thấy giọng nói của bạn"* và quay về Màn 1 để tiết kiệm tài nguyên.
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
```

---

### 4.8 Thuật toán 8: Phân Tích Tần Số Web Audio FFT & Vẽ Sóng Âm Động (Canvas Waveform)
- **Tập tin:** [`FrontEnd/src/components/VoiceAssistant/VoiceWaveform.tsx`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/components/VoiceAssistant/VoiceWaveform.tsx)
- **Vị trí dòng code:** **Dòng 20 đến Dòng 95**
- **Nguyên lý hoạt động:**
  - Nhận luồng âm thanh `MediaStream` từ micro của người dùng.
  - Tạo một thể hiện `AudioContext` và gắn vào `AnalyserNode` với kích thước cửa sổ biến đổi Fourier nhanh `fftSize = 64` (trích xuất 32 dải tần số).
  - Sử dụng hàm `requestAnimationFrame` lặp vẽ các thanh sóng âm dao động màu xanh lá (`#10b981` đến `#059669`) trên phần tử Canvas HTML5 theo biên độ âm thanh thực tế của người dùng.
- **Mã nguồn trích xuất:**
```typescript
35:         audioContext = new AudioCtx();
36:         analyser = audioContext.createAnalyser();
37:         analyser.fftSize = 64;
38:         source = audioContext.createMediaStreamSource(stream);
39:         source.connect(analyser);
40:         const dataArray = new Uint8Array(analyser.frequencyBinCount);
41: 
42:         const renderFrame = () => {
43:           if (!analyser || !ctx || !canvas) return;
44:           analyser.getByteFrequencyData(dataArray);
...
57:             const gradient = ctx.createLinearGradient(0, centerY - dynamicHeight / 2, 0, centerY + dynamicHeight / 2);
58:             gradient.addColorStop(0, "#10b981");
59:             gradient.addColorStop(0.5, "#34d399");
60:             gradient.addColorStop(1, "#059669");
61:             ctx.fillStyle = gradient;
62:             ctx.roundRect(i * (barWidth + spacing), centerY - dynamicHeight / 2, barWidth, dynamicHeight, 3);
63:             ctx.fill();
```

---

### 4.9 Thuật toán 9: Tổng Hợp Giọng Nói Text-to-Speech (TTS Engine)
- **Tập tin:** [`FrontEnd/src/components/VoiceAssistant/VoiceAssistant.tsx`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/components/VoiceAssistant/VoiceAssistant.tsx)
- **Vị trí dòng code:** **Dòng 102 đến Dòng 140** (Hàm `speakResponse`)
- **Nguyên lý hoạt động:**
  - Khởi tạo đối tượng `SpeechSynthesisUtterance` với mã ngôn ngữ tiếng Việt `vi-VN`, tốc độ nói tự nhiên `rate = 1.0`, cao độ `pitch = 1.0`.
  - Tự động hủy các câu nói cũ còn tồn đọng trong hàng đợi bằng `window.speechSynthesis.cancel()`.
  - Cập nhật trạng thái `isSpeaking` để hiển thị hiệu ứng sóng âm đang phát qua loa trên Màn 3, và lắng nghe sự kiện `utterance.onend` để dừng hiệu ứng khi đọc xong.

---

### 4.10 Thuật toán 10: Xử Lý Ngoại Lệ Quyền Micro & Khôi Phục An Toàn
- **Tập tin:** [`FrontEnd/src/components/VoiceAssistant/VoiceAssistant.tsx`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/components/VoiceAssistant/VoiceAssistant.tsx) *(Dòng 165 - 215)* và [`MicPermissionModal.tsx`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/components/VoiceAssistant/MicPermissionModal.tsx) *(Dòng 1 - 110)*
- **Nguyên lý hoạt động:**
  - Bắt các ngoại lệ `NotAllowedError` hoặc `PermissionDeniedError` từ hàm `navigator.mediaDevices.getUserMedia()`.
  - Ngăn chặn crash ứng dụng, tự động dọn dẹp các luồng stream và kích hoạt hiển thị Modal Màn 4.
  - Lắng nghe sự kiện bàn phím toàn cục (Global `keydown` listener) đối với phím `Escape` để cho phép người dùng đóng popup nhanh chóng.

---

## 5. BẢNG TỔNG HỢP ÁNH XẠ MÃ NGUỒN (PROJECT CODE MAPPING MATRIX)

| STT | Tập Tin (File Path) | Tầng Kiến Trúc | Các Hàm / Lớp / Logic Cốt Lõi | Dòng Mã (Lines) |
| :---: | :--- | :--- | :--- | :--- |
| **1** | [`BackEnd/app/models/voice.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/models/voice.py) | Domain Model | Khai báo `VoiceSampleCommand`, `VoiceInteractionLog`, `VoiceActionType`, `VoiceCategory` | 1 - 177 |
| **2** | [`BackEnd/alembic/versions/020_create_voice_assistant_tables.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/alembic/versions/020_create_voice_assistant_tables.py) | CSDL Migration | Khởi tạo bảng `voice_sample_commands`, `voice_interaction_logs` và các chỉ mục Index | 1 - 70 |
| **3** | [`BackEnd/app/interface/voice_interface.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/interface/voice_interface.py) | Interface Contract | Khai báo Abstract Base Classes `IVoiceAssistantRepository` và `IVoiceNluService` | 1 - 92 |
| **4** | [`BackEnd/app/crud/voice_repository.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/voice_repository.py) | Repository Pattern | Triển khai truy vấn async: `get_active_sample_commands`, `create_interaction_log`... | 1 - 95 |
| **5** | [`BackEnd/app/services/voice_service.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/voice_service.py) | Service / AI NLU | Thuật toán chuẩn hóa tiếng Việt, khử dấu NFD, trích xuất slot, phân loại Intent đa tầng | 1 - 396 |
| **6** | [`BackEnd/app/schemas/voice.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/schemas/voice.py) | DTO / Schemas | Pydantic V2 Schemas: `VoiceProcessRequest`, `VoiceProcessResponse`, `VoiceSampleCommandResponse` | 1 - 75 |
| **7** | [`BackEnd/app/api/v1/voice.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/voice.py) | API Router | Endpoints: `GET /suggestions`, `POST /process`, `GET /history` | 1 - 134 |
| **8** | [`BackEnd/tests/test_voice_assistant.py`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/tests/test_voice_assistant.py) | Unit Testing | 8 bài kiểm thử tự động toàn diện NLU, Normalization, Fallback, Mock Session, TestClient | 1 - 266 |
| **9** | [`FrontEnd/src/components/VoiceAssistant/VoiceAssistant.tsx`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/components/VoiceAssistant/VoiceAssistant.tsx) | UI Presentation | Bộ điều khiển trung tâm 4 Màn hình, Web Speech STT, Text-to-Speech playback, Timer 3s/10s | 1 - 699 |
| **10**| [`FrontEnd/src/components/VoiceAssistant/VoiceWaveform.tsx`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/components/VoiceAssistant/VoiceWaveform.tsx) | Audio Visualization | Canvas Web Audio API sóng âm dao động màu xanh lá | 1 - 120 |
| **11**| [`FrontEnd/src/components/VoiceAssistant/MicPermissionModal.tsx`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/components/VoiceAssistant/MicPermissionModal.tsx) | Modal Popup | Popup Màn 4: "KHÔNG TRUY CẬP ĐƯỢC MICRO", hướng dẫn icon ổ khóa, thử lại, đóng bằng Esc | 1 - 110 |
| **12**| [`FrontEnd/src/components/VoiceAssistant/VoiceAssistant.css`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/components/VoiceAssistant/VoiceAssistant.css) | UI / Styling | Thiết kế toàn màn hình, pulse animation, glassmorphism, responsive 2 cột | 1 - 680 |
| **13**| [`FrontEnd/src/services/voiceService.ts`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/services/voiceService.ts) | Frontend Service | Gọi API Backend Axios: `fetchVoiceSuggestions`, `processVoiceCommand` | 1 - 60 |
| **14**| [`FrontEnd/src/App.tsx`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/App.tsx) | Homepage Integration | Tích hợp tab `🎙️ Trợ lý Giọng nói` trên Navbar và nút nổi nhanh góc dưới trang chủ | 1 - 145 |
| **15**| [`FrontEnd/src/components/__tests__/VoiceAssistant.test.tsx`](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/components/__tests__/VoiceAssistant.test.tsx) | Frontend Testing | 4 bài kiểm thử Vitest/Testing-Library cho Màn 1, Màn 2, Màn 3, Màn 4 | 1 - 200 |

---

## 6. HƯỚNG DẪN KIỂM THỬ VÀ XÁC MINH CHẤT LƯỢNG (VERIFICATION)

### 6.1 Chạy kiểm thử tự động Backend (8/8 Tests Passed)
Mở cửa sổ PowerShell tại thư mục `BackEnd` và chạy lệnh:
```powershell
$env:PYTHONPATH="."
python tests/test_voice_assistant.py
```
**Kết quả thực tế đạt được:**
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

### 6.2 Chạy kiểm thử tự động Frontend (10/10 Tests Passed)
Mở cửa sổ terminal tại thư mục `FrontEnd` và chạy lệnh:
```bash
npm test
```
**Kết quả thực tế đạt được:**
```text
 ✓ src/hooks/__tests__/useFastGeolocation.test.ts (4 tests)
 ✓ src/components/__tests__/EcoMap.test.tsx (2 tests)
 ✓ src/components/__tests__/VoiceAssistant.test.tsx (4 tests)
   ✓ VoiceAssistant Component (Screens 1 to 4) > Screen 1: Renders pulse mic button and suggestions
   ✓ VoiceAssistant Component (Screens 1 to 4) > Screen 4: Displays permission denied modal when mic error occurs
   ✓ VoiceAssistant Component (Screens 1 to 4) > Screen 1: Clicking suggestion chip triggers processing directly
   ✓ VoiceAssistant Component (Screens 1 to 4) > Screen 3: Renders two-column command and response layout
 Test Files  3 passed (3)
      Tests  10 passed (10)
```

### 6.3 Biên dịch mã nguồn Production Bundle (Build Verification)
Kiểm tra tính an toàn kiểu dữ liệu TypeScript và tối ưu hóa gói bundle:
```bash
npm run build
```
**Kết quả thực tế đạt được:**
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
*Tài liệu được khởi tạo và lưu trữ đầy đủ tại: [`C:\Users\Admin\source\Group-j_GreenSpot\BackEnd\docs\voice_assistant_system_summary.md`](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/docs/voice_assistant_system_summary.md).*
