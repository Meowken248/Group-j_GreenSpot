# 📚 TÀI LIỆU KỸ THUẬT: TÍNH NĂNG 39 (STT 39)
# AI TÓM TẮT SỰ CỐ VÀ GỢI Ý MỨC ĐỘ ƯU TIÊN XỬ LÝ (AI INCIDENT TRIAGE & XAI PRIORITY)

> **Mã chức năng:** STT 39 (Phân hệ AI & Điều phối tác nghiệp môi trường GreenSpot)  
> **Phiên bản:** 1.0.0 (Tích hợp mô hình ngôn ngữ lớn Kira AI `kira-mini-1.0`)  
> **Tác giả:** Kỹ sư AI & Senior Backend Engineer  
> **Mục tiêu:** Rút ngắn 70% thời gian thẩm định hồ sơ, tự động tóm tắt 2-3 câu cô đọng, đánh giá điểm số rủi ro đa tiêu chí (TPS), giải trình minh bạch (XAI) và hỗ trợ cơ chế can thiệp có kiểm soát của con người (Human-in-the-loop).

---

## 📑 MỤC LỤC
1. [Tổng quan nghiệp vụ & Mục tiêu](#1-tổng-quan-nghiệp-vụ--mục-tiêu)
2. [Kiến trúc cơ sở dữ liệu & Mô hình dữ liệu](#2-kiến-trúc-cơ-sở-dữ-liệu--mô-hình-dữ-liệu)
3. [Tích hợp Mô hình Ngôn ngữ Lớn Kira AI](#3-tích-hợp-mô-hình-ngôn-ngữ-lớn-kira-ai)
4. [Thuật toán Chấm điểm Ưu tiên TPS & Giải trình XAI](#4-thuật-toán-chấm-điểm-ưu-tiên-tps--giải-trình-xai)
5. [Cơ chế Human-in-the-loop & Khóa lạc quan (OCC)](#5-cơ-chế-human-in-the-loop--khóa-lạc-quan-occ)
6. [Đặc tả RESTful API Endpoints](#6-đặc-tả-restful-api-endpoints)
7. [Kiến trúc Giao diện FrontEnd (3 Màn hình)](#7-kiến-trúc-giao-diện-frontend-3-màn-hình)
8. [Bộ kiểm thử tự động & Bằng chứng kiểm toán](#8-bộ-kiểm-thử-tự-động--bằng-chứng-kiểm-toán)

---

## 1. TỔNG QUAN NGHIỆP VỤ & MỤC TIÊU

### 1.1. Bối cảnh bài toán
Khi công dân gửi báo cáo phản ánh rác thải hoặc ô nhiễm môi trường (STT 18), nội dung văn bản thường rất dài, cảm tính và rời rạc. Cán bộ tiếp nhận phải mất nhiều thời gian đọc hiểu hiện trường. Tính năng STT 39 ứng dụng mô hình ngôn ngữ lớn (LLM) và thuật toán phân tích đa chiều để:
- **Đọc hiểu và trích xuất cô đọng**: Tóm tắt nội dung báo cáo thành đúng 2-3 câu ngắn gọn (< 50 từ).
- **Đánh giá rủi ro tức thì**: Tự động tính toán điểm số nguy cơ tổng hợp TPS (0 - 100 điểm) dựa trên loại chất thải, cự ly cơ sở nhạy cảm, quy mô bãi rác và mức độ khẩn cấp trong lời văn.
- **Minh bạch hóa thuật toán (Explainable AI - XAI)**: Công khai các yếu tố tác động (Risk Factors) và công thức tính điểm để cán bộ đối soát trước khi quyết định.
- **Duy trì quyền kiểm soát của con người (Human-in-the-loop)**: Cho phép cán bộ điều chỉnh mức độ ưu tiên, bắt buộc ghi chú lý do để lưu nhật ký kiểm toán (Audit Log) và làm giàu dữ liệu huấn luyện lại mô hình (Model Retraining).

### 1.2. Phân quyền vai trò (RBAC)
- **Quyền truy cập**: Dành riêng cho `ADMIN` (Quản trị viên), `COORDINATOR` (Điều phối viên môi trường), `OFFICER` (Cán bộ đô thị) và `RESPONDER` (Đội phản ứng nhanh).
- **Người dùng vãng lai / Citizen**: Bị chặn ở cả tầng điều hướng Frontend và tầng Guard API Backend (HTTP 403 Forbidden).

---

## 2. KIẾN TRÚC CƠ SỞ DỮ LIỆU & MÔ HÌNH DỮ LIỆU

### 2.1. Migration CSDL (Alembic)
- **Tập tin:** `BackEnd/alembic/versions/022_create_incident_triage_audit_tables.py`
- Bổ sung các cột phục vụ AI Triage vào bảng `incidents`.
- Tạo mới bảng nhật ký kiểm toán `incident_audit_logs`.

### 2.2. Chi tiết các trường trong bảng `incidents`
| Tên cột | Kiểu dữ liệu | Ràng buộc | Mục đích nghiệp vụ |
|:---|:---|:---|:---|
| `ai_summary` | `TEXT` | Nullable | Lưu trữ đoạn văn bản tóm tắt 2-3 câu do AI kết xuất |
| `ai_triage_score` | `NUMERIC(5,2)` | Nullable | Điểm rủi ro tổng hợp TPS từ 0.00 đến 100.00 |
| `ai_suggested_priority` | `VARCHAR(30)` | Nullable | Mức ưu tiên đề xuất: `Khẩn cấp`, `Cao`, `Trung bình`, `Thấp` |
| `ai_factors` | `JSONB` | Nullable | Lưu chi tiết điểm thành phần ($BaseSeverity, Proximity, Scale, Urgency$) |
| `ai_generated_at` | `TIMESTAMPTZ` | Nullable | Dấu thời gian khi mô hình AI hoàn tất phân tích |
| `priority_modified_by` | `UUID` | FK `users.user_id` | ID cán bộ can thiệp thay đổi mức ưu tiên (Human-in-the-loop) |
| `priority_modified_reason` | `VARCHAR(255)` | Nullable | Lý do giải trình bắt buộc của cán bộ (tối đa 200 ký tự) |
| `priority_modified_at` | `TIMESTAMPTZ` | Nullable | Thời điểm cán bộ ghi đè mức ưu tiên |
| `sla_response_deadline` | `TIMESTAMPTZ` | Nullable | Hạn chót cam kết giải quyết sự cố theo SLA |
| `version` | `INTEGER` | Default `1` | Phiên bản bản ghi phục vụ Khóa lạc quan (Quy tắc 7) |
| `deleted_at` | `TIMESTAMPTZ` | Nullable | Dấu thời gian xóa mềm Soft Delete (Quy tắc 6) |

### 2.3. Bảng Nhật ký kiểm toán `incident_audit_logs`
- **Model:** `BackEnd/app/models/audit_log.py` (Lớp `IncidentAuditLog`)
```python
class IncidentAuditLog(Base, TimestampMixin):
    __tablename__ = "incident_audit_logs"

    log_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    incident_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("incidents.incident_id", ondelete="CASCADE"), nullable=False, index=True)
    action: Mapped[str] = mapped_column(String(50), nullable=False) # AI_TRIAGE_GENERATED, AI_TRIAGE_REGENERATED, PRIORITY_ACCEPTED, PRIORITY_OVERRIDDEN
    old_priority: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    new_priority: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    risk_score: Mapped[Optional[float]] = mapped_column(Integer, nullable=True)
    reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True) # Tối đa 200 ký tự
    performed_by: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    metadata_json: Mapped[Optional[dict]] = mapped_column("metadata", JSONB, nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
```

---

## 3. TÍCH HỢP MÔ HÌNH NGÔN NGỮ LỚN KIRA AI

### 3.1. Cấu hình biến môi trường (`.env`)
Toàn bộ thông số kết nối AI được quản lý tập trung và nạp tự động qua [BackEnd/app/core/config.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/core/config.py), cho phép thay đổi mô hình hoặc dịch vụ mà không cần chỉnh sửa mã nguồn:

```env
# URL Endpoint API chuẩn OpenAI (/v1/chat/completions)
KIRA_API_URL=https://kiraai.vn/api/v1/chat/completions

# Tên mô hình AI
KIRA_MODEL=kira-mini-1.0

# API Key xác thực
KIRA_API_KEY=kira_8498c...31cd

# Thời gian chờ tối đa (giây)
KIRA_TIMEOUT_SECONDS=45.0
```

### 3.2. Hàm gọi AI bất đồng bộ `call_kira_ai`
- **Vị trí:** `BackEnd/app/services/triage/triage_ai_service.py` (Dòng 25 - 55)
- Sử dụng thư viện `httpx.AsyncClient` gửi POST request chuẩn OpenAI format.
- Thiết lập cơ chế `timeout` tùy biến từ `.env`.
- Bắt ngoại lệ và kích hoạt fallback an toàn nếu mất mạng hoặc dịch vụ bận.

### 3.3. Prompt Engineering cho tóm tắt sự cố môi trường
- **System Prompt:**
  ```text
  Bạn là trợ lý AI thẩm định môi trường của nền tảng GreenSpot. 
  Nhiệm vụ của bạn là đọc hiểu báo cáo phản ánh sự cố môi trường của công dân 
  và tóm tắt thành 2-3 câu cô đọng (dưới 50 từ). 
  Nêu rõ: 1. Loại chất thải chính, 2. Quy mô ước tính, 
  3. Tác động môi trường hoặc cản trở giao thông và đề xuất hướng xử lý. 
  Viết bằng tiếng Việt súc tích, văn phong hiện trường, không mở đầu rườm rà.
  ```
- **Xử lý ngoại lệ mô tả quá ngắn (< 10 ký tự):**
  Nếu `len(clean_description) < 10`, hệ thống không gửi request lên LLM mà trả về ngay cờ `is_too_short: True` kèm thông báo:
  `"Mô tả sự cố quá ngắn để AI tóm tắt"` và giữ nguyên văn bản gốc của công dân.
- **Cơ chế Fallback Heuristic nội bộ (Zero-Downtime):**
  Nếu LLM API gặp sự cố timeout (> 45s) hoặc trả mã lỗi, phương thức `generate_summary_ai()` tự động chuyển sang parser trích xuất câu nội bộ để giao diện không bị gián đoạn.

---

## 4. THUẬT TOÁN CHẤM ĐIỂM ƯU TIÊN TPS & GIẢI TRÌNH XAI

### 4.1. Công thức chuẩn hóa TPS (Triage Priority Score)
Điểm số rủi ro sự cố được chuẩn hóa trên thang điểm từ **0 đến 100 điểm**:

$$\text{TPS} = \min\left(100.0, \text{BaseSeverity} \times 0.40 + \text{ProximityRisk} \times 0.30 + \text{ScaleFactor} \times 0.20 + \text{UrgencyNLP} \times 0.10\right)$$

### 4.2. Bảng phân rã các trọng số thành phần
| Thành phần | Trọng số | Thang điểm | Thuật toán xác định |
|:---|:---:|:---:|:---|
| **BaseSeverity** | 40% | 0 - 100 | Dựa vào danh mục rác thải: Hóa chất/chất nguy hại: `100đ`; Cản trở cống thoát nước: `80đ`; Rác sinh hoạt ùn ứ: `60đ`; Cành cây/rác khô: `25đ`. |
| **ProximityRisk** | 30% | 0 - 100 | Khoảng cách đường chim bay đến cơ sở thiết yếu gần nhất (STT 40): $\le 50$m: `100đ`; $50 < d \le 150$m: `75đ`; $150 < d \le 300$m: `50đ`; $> 300$m: `0đ`. |
| **ScaleFactor** | 20% | 35 - 100 | Ước lượng diện tích ảnh hưởng: $> 20\text{ m}^2$: `100đ`; $5 - 20\text{ m}^2$: `70đ`; $< 5\text{ m}^2$: `35đ`. |
| **UrgencyNLP** | 10% | 0 - 100 | Trích xuất từ khóa khẩn cấp trong báo cáo: Phát hiện từ khóa báo động (`cháy`, `nổ`, `ngập sâu`, `hóa chất`): `80 - 100đ`; Từ khóa trung bình (`ùn ứ`, `bốc mùi`, `chắn lối`): `40 - 60đ`. |

### 4.3. Bảng ánh xạ Mức ưu tiên & Cam kết thời hạn xử lý (SLA)
| Mức ưu tiên | Khoảng điểm TPS | Nhãn màu | SLA Tiếp nhận | SLA Hoàn thành giải quyết |
|:---|:---:|:---:|:---:|:---:|
| **Khẩn cấp (Critical)** | $\text{TPS} \ge 80.0$ | Đỏ (`red`) | $< 30$ phút | **Trong 4 giờ** |
| **Cao (High)** | $60.0 \le \text{TPS} < 80.0$ | Cam (`orange`) | $< 2$ giờ | **Trong 12 giờ** |
| **Trung bình (Medium)** | $40.0 \le \text{TPS} < 60.0$ | Vàng (`yellow`) | $< 4$ giờ | **Trong 24 giờ** |
| **Thấp (Low)** | $\text{TPS} < 40.0$ | Xanh (`green`) | $< 8$ giờ | **Trong 48 giờ** |

---

## 5. CƠ CHẾ HUMAN-IN-THE-LOOP & KHÓA LẠC QUAN (OCC)

Hệ thống tuân thủ triệt để nguyên lý **Human-in-the-loop (Con người nắm quyền quyết định cuối cùng)**:
1. **Đồng thuận (Nút "Chấp nhận đề xuất"):**
   - Áp dụng trực tiếp mức đề xuất của AI vào phiếu việc (`severity = ai_suggested_priority`).
   - Thiết lập thời hạn cam kết xử lý: `sla_deadline = now() + timedelta(hours=sla_hours)`.
   - Ghi nhật ký `PRIORITY_ACCEPTED` vào `incident_audit_logs`.
2. **Can thiệp điều chỉnh (Màn 3 Popup "ĐỔI MỨC ƯU TIÊN?"):**
   - Cho phép chọn mức ưu tiên khác (VD: Từ `Trung bình` $\rightarrow$ `Cao`).
   - **Bắt buộc nhập lý do**: Khung ghi chú yêu cầu tối thiểu 1 ký tự, tối đa 200 ký tự. Nếu bỏ trống, viền ô chuyển đỏ kèm thông báo lỗi `"Vui lòng nhập lý do thay đổi mức ưu tiên"`.
   - Ghi nhận vào nhật ký kiểm toán với action `PRIORITY_OVERRIDDEN` làm dữ liệu quý giá cho Model Retraining.
3. **Bảo vệ toàn vẹn dữ liệu bằng Khóa lạc quan (Optimistic Locking - Quy tắc 7):**
   - Request bắt buộc gửi kèm trường `version`.
   - Nếu `inc.version != expected_version`, hệ thống chặn cập nhật và trả về `HTTP 409 Conflict` kèm thông báo:
     `"Dữ liệu sự cố đã bị cập nhật bởi người khác (Version conflict). Vui lòng tải lại!"`

---

## 6. ĐẶC TẢ RESTFUL API ENDPOINTS

Router chính: `BackEnd/app/api/v1/triage/incidents_triage.py` (Prefix: `/api/v1/incidents/triage`)

### 6.1. `GET /api/v1/incidents/triage/list`
- **Mục đích:** Lấy danh sách hồ sơ sự cố cần thẩm định AI Triage.
- **Query Params:** `limit: int = 20`.
- **Response:** Danh sách các object sự cố kèm tọa độ, tóm tắt hiện có và điểm số rủi ro.

### 6.2. `GET /api/v1/incidents/triage/{incident_id}`
- **Mục đích:** Màn 1 & Màn 2: Lấy chi tiết sự cố, kết quả tóm tắt AI và bảng giải trình rủi ro XAI.
- **Response Schema:** `TriageEvaluationResponse`
  - `ai_summary`: Chuỗi tóm tắt 2-3 câu.
  - `ai_triage_score`: Điểm TPS (0 - 100).
  - `ai_suggested_priority`: Khẩn cấp / Cao / Trung bình / Thấp.
  - `risk_factors`: Danh sách chuỗi mô tả các nguy cơ nhạy cảm.
  - `version`: Phiên bản OCC phục vụ khóa dữ liệu.

### 6.3. `POST /api/v1/incidents/triage/{incident_id}/regenerate`
- **Mục đích:** Nút "Tạo lại tóm tắt": Yêu cầu mô hình Kira AI phân tích và viết lại bản tóm tắt khác.
- **Response:** `RegenerateSummaryResponse` (`ai_summary`, `generated_at`).

### 6.4. `POST /api/v1/incidents/triage/{incident_id}/accept`
- **Mục đích:** Chấp nhận mức gợi ý của AI.
- **Payload:** `{"version": 1}`
- **Response:** `TriageActionResponse` (HTTP 200) hoặc HTTP 409 nếu xung đột phiên bản.

### 6.5. `POST /api/v1/incidents/triage/{incident_id}/override`
- **Mục đích:** Màn 3 Popup: Can thiệp đổi mức ưu tiên có giải trình.
- **Payload:** `{"new_priority": "Khẩn cấp", "reason": "Bãi rác chắn cổng trường học", "version": 1}`
- **Validation:** `reason` từ 1 đến 200 ký tự (HTTP 400 nếu vi phạm; HTTP 409 nếu conflict version).

### 6.6. `GET /api/v1/incidents/triage/{incident_id}/audit-logs`
- **Mục đích:** Truy xuất toàn bộ lịch sử can thiệp thuật toán và con người của sự cố.

---

## 7. KIẾN TRÚC GIAO DIỆN FRONTEND (3 MÀN HÌNH)

Toàn bộ giao diện được xây dựng bằng React + TypeScript tại [IncidentTriageView.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/triage/components/IncidentTriageView.tsx), tuân thủ 100% định dạng SCSS BEM tại [triage.scss](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/triage/styles/triage.scss), không sử dụng inline style:

```
┌────────────────────────────────────────────────────────────────────────┐
│ HEADER: Logo GreenSpot | Menu Quản trị | Chuông báo | Avatar Điều phối │
├────────────────────────────────────────────────────────────────────────┤
│ MÀN 1: THÔNG TIN SỰ CỐ (Trái) │ TÓM TẮT AI (Giữa) │ ƯU TIÊN (Phải)    │
│ - Mô tả chi tiết ban đầu      │ - 2-3 câu cô đọng │ - Gợi ý AI (Badge) │
│ - Ảnh/video hiện trường       │ - Nút "Tạo lại"   │ - Điểm rủi ro TPS  │
│ - GPS & Địa chỉ hành chính    │   (Loading 2s)    │ - Nút "Xem lý do"  │
├────────────────────────────────────────────────────────────────────────┤
│ MÀN 2: PHÂN TÍCH XAI (Trái)   │ QUYẾT ĐỊNH (Phải)                      │
│ - Yếu tố tác động Risk Factors│ - Gợi ý AI: Cao (Cam/Đỏ)               │
│ - Điểm số TPS & Công thức toán│ - Nút "✓ Chấp nhận đề xuất"            │
│                               │ - Nút "✎ Chọn mức khác" (Mở Màn 3)     │
├────────────────────────────────────────────────────────────────────────┤
│ MÀN 3: POPUP ĐỔI MỨC ƯU TIÊN? (Backdrop Overlay đè giữa màn hình)       │
│ - Mức thay đổi: Từ [Trung bình] → [Cao] (Dropdown)                     │
│ - Ô Ghi chú bắt buộc: max 200 ký tự (Validation viền đỏ nếu để trống)  │
│ - Nút "Xác nhận" (Loading) | Nút "Huỷ" / Nhấn phím Esc                 │
├────────────────────────────────────────────────────────────────────────┤
│ FOOTER: Bản quyền GreenSpot 2026 | Quy chế thẩm định SLA | Chính sách  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 8. BỘ KIỂM THỬ TỰ ĐỘNG & BẰNG CHỨNG KIỂM TOÁN

Tập tin kiểm thử: [BackEnd/tests/triage/test_ai_triage.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/tests/triage/test_ai_triage.py)  
Chạy kiểm thử: `pytest tests/triage/test_ai_triage.py` $\rightarrow$ **12/12 test case Passed (100%)**:

1. `test_01_tps_formula_calculation`: Kiểm tra tính toán công thức TPS và trần 100 điểm.
2. `test_02_proximity_risk_brackets`: Kiểm tra phân bậc cự ly cơ sở thiết yếu (50m, 150m, 300m).
3. `test_03_scale_factor_brackets`: Kiểm tra phân bậc diện tích bãi rác.
4. `test_04_urgency_nlp_extraction`: Kiểm tra phát hiện từ khóa nguy cấp trong văn bản.
5. `test_05_sla_brackets_mapping`: Kiểm tra ánh xạ SLA cam kết (4h, 12h, 24h, 48h).
6. `test_06_edge_case_short_description`: Kiểm tra xử lý chuỗi ngắn < 10 ký tự.
7. `test_07_get_incident_triage_detail_success`: Tích hợp API lấy dữ liệu thẩm định chi tiết.
8. `test_08_regenerate_summary_success`: Tích hợp API tạo lại tóm tắt AI.
9. `test_09_accept_ai_priority_success`: Tích hợp chấp nhận mức ưu tiên và kích hoạt SLA.
10. `test_10_override_priority_human_in_the_loop_with_reason`: Tích hợp can thiệp đổi mức có ghi chú giải trình.
11. `test_11_optimistic_locking_conflict`: Kiểm tra chặn xung đột phiên bản HTTP 409.
12. `test_12_http_api_endpoints_coverage`: Kiểm tra toàn diện HTTP client endpoints.
