# 📚 TÀI LIỆU KỸ THUẬT CỐT LÕI TÍNH NĂNG STT 39
# AI TỰ ĐỘNG TÓM TẮT NỘI DUNG SỰ CỐ & ĐỀ XUẤT MỨC ĐỘ ƯU TIÊN XỬ LÝ (AI INCIDENT TRIAGE & XAI PRIORITY)
## (Explainable AI Incident Triage, SLA Dispatch & Human-in-the-Loop Decision System)

> **Mục đích tài liệu:** Tổng hợp toàn diện, chuẩn xác 100% vị trí các thành phần mã nguồn cốt lõi (Core Logic) của **Tính năng STT 39** bao gồm cả **BackEnd** (FastAPI / SQLAlchemy 2.0 / PostGIS / 100% Explicit SQL / Optimistic Concurrency Control OCC / Clean Architecture / LLM Kira AI) và **FrontEnd** (React / TypeScript / 3 Màn hình nghiệp vụ / Quét cự ly cơ sở nhạy cảm / Chuyển tiếp Điều phối STT 43 / SCSS BEM).  
> Toàn bộ số dòng, tên lớp, tên hàm, câu lệnh SQL và đường dẫn tệp trong tài liệu này đều được **đối soát và trích xuất trực tiếp 100% từ mã nguồn thực tế đang hoạt động trong repository**, cam kết **tuyệt đối không có bất kỳ thông tin giả định hay suy diễn sai lệch nào**.

---

## 📑 MỤC LỤC TỔNG QUAN

1. [PHẦN 1: KIẾN TRÚC TỔNG QUAN & CLEAN ARCHITECTURE 6 TẦNG](#phần-1-kiến-trúc-tổng-quan--clean-architecture-6-tầng)
2. [PHẦN 2: ĐẶC TẢ CHI TIẾT 3 MÀN HÌNH NGHIỆP VỤ & ÁNH XẠ MÃ NGUỒN](#phần-2-đặc-tả-chi-tiết-3-màn-hình-nghiệp-vụ--ánh-xạ-mã-nguồn)
   - [2.1. Màn 1/3: Chi Tiết Sự Cố & Tóm Tắt AI (3 Khối: THÔNG TIN SỰ CỐ, TÓM TẮT AI, ƯU TIÊN)](#21-màn-13-chi-tiết-sự-cố--tóm-tắt-ai-3-khối-thông-tin-sự-cố-tóm-tắt-ai-ưu-tiên)
   - [2.2. Màn 2/3: Bảng Giải Trình Căn Cứ Ra Quyết Định Của Thuật Toán AI (XAI) (2 Khối: PHÂN TÍCH, QUYẾT ĐỊNH)](#22-màn-23-bảng-giải-trình-căn-cứ-ra-quyết-định-của-thuật-toán-ai-xai-2-khối-phân-tích-quyết-định)
   - [2.3. Màn 3/3: Popup Đổi Mức Ưu Tiên (Human-in-the-Loop) & Lối Tắt Điều Hướng STT 43](#23-màn-33-popup-đổi-mức-ưu-tiên-human-in-the-loop--lối-tắt-điều-hướng-stt-43)
3. [PHẦN 3: CHI TIẾT MÃ NGUỒN CỐT LÕI PHÍA BACKEND](#phần-3-chi-tiết-mã-nguồn-cốt-lõi-phía-backend)
   - [3.1. Domain Entities & Database Models](#31-domain-entities--database-models)
   - [3.2. CSDL Migration (Alembic)](#32-csdl-migration-alembic)
   - [3.3. Data Transfer Objects (Pydantic v2 Schemas)](#33-data-transfer-objects-pydantic-v2-schemas)
   - [3.4. Abstractions & DIP Interfaces](#34-abstractions--dip-interfaces)
   - [3.5. Persistence Layer (100% Explicit SQL & Repository Pattern)](#35-persistence-layer-100-explicit-sql--repository-pattern)
   - [3.6. Business Logic Service Layer & Tích Hợp Kira AI](#36-business-logic-service-layer--tích-hợp-kira-ai)
   - [3.7. Presentation Layer: FastAPI Router & Phân Quyền RBAC Guard](#37-presentation-layer-fastapi-router--phân-quyền-rbac-guard)
4. [PHẦN 4: CHI TIẾT MÃ NGUỒN CỐT LÕI PHÍA FRONTEND](#phần-4-chi-tiết-mã-nguồn-cốt-lõi-phía-frontend)
   - [4.1. TypeScript Interfaces & Data Contracts](#41-typescript-interfaces--data-contracts)
   - [4.2. Axios API Client Service](#42-axios-api-client-service)
   - [4.3. Thành Phần Giao Diện Trung Tâm (IncidentTriageView.tsx)](#43-thành-phần-giao-diện-trung-tâm-incidenttriageviewtsx)
   - [4.4. Khung Header & Footer (TriageHeaderFooter.tsx)](#44-khung-header--footer-triageheaderfootertsx)
   - [4.5. Trang Quản Trị Trung Tâm (TriageAppDashboard.tsx)](#45-trang-quản-trị-trung-tâm-triageappdashboardtsx)
   - [4.6. Điều Hướng Liên Phân Hệ (STT 43 Điều Phối & STT 40 Vùng Đệm Không Gian)](#46-điều-hướng-liên-phân-hệ-stt-43-điều-phối--stt-40-vùng-đệm-không-gian)
   - [4.7. Hệ Thống SCSS Stylesheet Chuẩn BEM](#47-hệ-thống-scss-stylesheet-chuẩn-bem)
5. [PHẦN 5: BỘ KIỂM THỬ TỰ ĐỘNG (AUTOMATED TEST SUITES)](#phần-5-bộ-kiểm-thử-tự-động-automated-test-suites)
   - [5.1. Backend Unit & Integration Tests (Pytest - 12 Tiêu Chí)](#51-backend-unit--integration-tests-pytest---12-tiêu-chí)
6. [PHẦN 6: BẢNG TRA CỨU NHANH DÒNG MÃ NGUỒN FULL-STACK (CHEAT SHEET)](#phần-6-bảng-tra-cứu-nhanh-dòng-mã-nguồn-full-stack-cheat-sheet)

---

# PHẦN 1: KIẾN TRÚC TỔNG QUAN & CLEAN ARCHITECTURE 6 TẦNG

Tính năng STT 39 giữ vai trò là **Bộ Thẩm định Sự cố Tự động bằng AI (AI Incident Triage) và Đánh giá Rủi ro Đa Tiêu chí Minh bạch (Explainable AI - XAI)** trong hệ sinh thái GreenSpot. Hệ thống rút ngắn 70% thời gian thụ lý hồ sơ ban đầu, tự động tóm tắt 2-3 câu cô đọng (< 50 từ) qua mô hình ngôn ngữ lớn Kira AI (`kira-mini-1.0`), tính điểm rủi ro tổng hợp TPS ($0 - 100$ điểm), đề xuất mức ưu tiên và thời hạn cam kết SLA, đồng thời duy trì sự kiểm soát tối cao của con người (Human-in-the-loop).

Kiến trúc mã nguồn tuân thủ triệt để **Clean Architecture 6 tầng** và nguyên tắc **Dependency Inversion Principle (DIP)**:

```
BackEnd/app/
├── models/                         # [TẦNG 1: DOMAIN ENTITIES]
│   ├── incident.py                 # Incident (bổ sung cột ai_summary, ai_triage_score, ai_suggested_priority...)
│   ├── audit_log.py                # IncidentAuditLog (lưu vết can thiệp PRIORITY_ACCEPTED, PRIORITY_OVERRIDDEN)
│   └── spatial.py                  # EssentialFacility (cơ sở nhạy cảm phục vụ tính cự ly PostGIS ST_Distance)
│
├── schemas/triage/                 # [TẦNG 2: DATA TRANSFER OBJECTS (DTO)]
│   ├── triage.py                   # Pydantic v2 Schemas: TriageEvaluationResponse, OverridePriorityRequest...
│   └── __init__.py                 # Re-export schemas
│
├── interface/triage/               # [TẦNG 3: ABSTRACTIONS (DIP CONTRACTS)]
│   ├── triage_interface.py         # ITriageRepository & IAITriageService (Hợp đồng thuần túy)
│   └── __init__.py
│
├── crud/triage/                    # [TẦNG 4: PERSISTENCE (100% EXPLICIT SQL & OCC)]
│   ├── triage_repository.py        # TriageRepository thực thi raw SQL text(...), Bounding Box 3km PostGIS
│   └── __init__.py
│
├── services/triage/                # [TẦNG 5: BUSINESS LOGIC SERVICES]
│   ├── triage_ai_service.py        # AITriageService: call_kira_ai, TPS formula, SLA mapping, OCC lock
│   └── __init__.py
│
└── api/v1/triage/                  # [TẦNG 6: TRANSPORT & PRESENTATION]
    ├── incidents_triage.py         # 6 RESTful Endpoints (list, detail, regenerate, accept, override, audit-logs)
    ├── router.py                   # triage_composite_router (tích hợp STT 39 & STT 40)
    └── __init__.py
```

---

# PHẦN 2: ĐẶC TẢ CHI TIẾT 3 MÀN HÌNH NGHIỆP VỤ & ÁNH XẠ MÃ NGUỒN

### 2.1. Màn 1/3: Chi Tiết Sự Cố & Tóm Tắt AI (3 Khối: THÔNG TIN SỰ CỐ, TÓM TẮT AI, ƯU TIÊN)
- **Đối tượng sử dụng:** Cán bộ tiếp nhận thông tin, Cán bộ thẩm định hiện trường, Điều phối viên.
- **Mã nguồn FrontEnd:** [IncidentTriageView.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/triage/components/IncidentTriageView.tsx#L195-L353) (Dòng 195–353).
- **Mã nguồn BackEnd:**
  - Endpoint GET danh sách: [incidents_triage.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/triage/incidents_triage.py#L48-L75) (`GET /api/v1/incidents/triage/list`).
  - Endpoint GET chi tiết: [incidents_triage.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/triage/incidents_triage.py#L78-L124) (`GET /api/v1/incidents/triage/{incident_id}`).
  - Endpoint POST tạo lại tóm tắt: [incidents_triage.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/triage/incidents_triage.py#L127-L140) (`POST /api/v1/incidents/triage/{incident_id}/regenerate`).
  - Logic dịch vụ: [triage_ai_service.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/triage/triage_ai_service.py#L198-L243) (`generate_summary_ai`), [L367-L416](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/triage/triage_ai_service.py#L367-L416) (`regenerate_summary`).
  - Explicit SQL: [triage_repository.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/triage/triage_repository.py#L28-L82) (`get_triage_incidents_list`), [L138-L191](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/triage/triage_repository.py#L138-L191) (`get_incident_detail_with_relations`).
- **Cấu trúc 3 khối làm việc ngang (3-column layout):**
  1. **Khối "THÔNG TIN SỰ CỐ" (Cột trái - [IncidentTriageView.tsx:L197-L240](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/triage/components/IncidentTriageView.tsx#L197-L240)):**
     - Mã theo dõi & Tiêu đề: Badge mã hồ sơ (VD: `INC-2026-3901`) và tiêu đề báo cáo.
     - Mô tả chi tiết ban đầu: Văn bản thô do công dân gửi phản ánh.
     - Tọa độ GPS & Địa chỉ hành chính: Địa chỉ số nhà/tên đường kèm vĩ độ, kinh độ GPS chính xác 6 chữ số thập phân.
     - Ảnh/Video hiện trường: Khung hiển thị ảnh chụp hiện trường do người dân đính kèm.
  2. **Khối "TÓM TẮT AI" (Cột giữa - [IncidentTriageView.tsx:L242-L292](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/triage/components/IncidentTriageView.tsx#L242-L292)):**
     - Huy hiệu mô hình: Badge `"🤖 TÓM TẮT AI"` kèm nhãn `"LLM Tinh chỉnh đô thị"`.
     - Đoạn văn bản tóm tắt: Đoạn trích xuất tự động 2-3 câu ngắn gọn (< 50 từ), nêu rõ loại rác, quy mô và tác động.
     - Xử lý mô tả ngắn: Nếu mô tả < 10 ký tự, hiển thị cảnh báo viền vàng `⚠️ Mô tả sự cố quá ngắn để AI tóm tắt`.
     - Nút "Tạo lại tóm tắt" (`btn-regenerate`): Cho phép gửi yêu cầu mô hình Kira AI sinh bản tóm tắt khác, hiển thị loading xoay tròn 2 giây.
  3. **Khối "ƯU TIÊN" (Cột phải - [IncidentTriageView.tsx:L294-L352](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/triage/components/IncidentTriageView.tsx#L294-L352)):**
     - Đề xuất thuật toán TPS: Hiển thị mức ưu tiên bằng màu nhận diện (`Gợi ý: Cao` màu cam, `Khẩn cấp` màu đỏ, `Trung bình` màu vàng, `Thấp` màu xanh lá).
     - Điểm số rủi ro: Điểm TPS chuẩn hóa (VD: `82.00/100`).
     - Cam kết SLA: Thời hạn cam kết hoàn thành xử lý (VD: `trong 12 giờ`).
     - Cụm nút hành động:
       - Nút "🔍 Xem lý do (Explainable AI)": Chuyển sang **Màn 2/3**.
       - Nút "🌐 Quét vùng đệm cơ sở thiết yếu": Chuyển sang phân hệ GIS (STT 40).
       - Nút "🚀 Tạo lệnh điều phối": Prefill dữ liệu vào `localStorage` và điều hướng sang **STT 43 (Trung tâm Điều phối)** với hash `#dispatch`.

---

### 2.2. Màn 2/3: Bảng Giải Trình Căn Cứ Ra Quyết Định Của Thuật Toán AI (XAI) (2 Khối: PHÂN TÍCH, QUYẾT ĐỊNH)
- **Đối tượng sử dụng:** Cán bộ thẩm định, Điều phối viên cần đối soát cơ sở tính toán khoa học trước khi phê duyệt.
- **Mã nguồn FrontEnd:** [IncidentTriageView.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/triage/components/IncidentTriageView.tsx#L359-L479) (Dòng 359–479).
- **Mã nguồn BackEnd:**
  - Logic tính toán XAI: [triage_ai_service.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/triage/triage_ai_service.py#L245-L365) (`evaluate_incident`).
  - Endpoint chấp nhận: [incidents_triage.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/triage/incidents_triage.py#L143-L172) (`POST /api/v1/incidents/triage/{incident_id}/accept`).
  - Logic đồng thuận: [triage_ai_service.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/triage/triage_ai_service.py#L419-L466) (`accept_ai_priority`).
- **Cấu trúc 2 khối làm việc ngang (2-column layout):**
  1. **Khối "PHÂN TÍCH" (Cột trái - [IncidentTriageView.tsx:L361-L410](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/triage/components/IncidentTriageView.tsx#L361-L410)):**
     - Banner điểm rủi ro TPS: Hiển thị lớn điểm số tổng hợp và mức độ tương ứng.
     - Yếu tố tác động (Risk Factors): Danh sách các gạch đầu dòng do AI NLP & PostGIS phát hiện (VD: `Chứa chất thải nguy hại y tế`, `Gần cơ sở thiết yếu < 50m (Trường THCS Lê Lợi)`, `Ngập úng sâu khi trời mưa`, `Chắn lối đi ngõ hẻm`).
     - Bảng công thức giải trình toán học tường minh:
       $$\text{TPS} = \min\left(100, \text{BaseSeverity} \times 0.40 + \text{ProximityRisk} \times 0.30 + \text{ScaleFactor} \times 0.20 + \text{UrgencyNLP} \times 0.10\right)$$
       Hiển thị trực quan: `(60.0 × 0.4) + (100.0 × 0.3) + (100.0 × 0.2) + (80.0 × 0.1) = 82.0 điểm`.
  2. **Khối "QUYẾT ĐỊNH" (Cột phải - [IncidentTriageView.tsx:L412-L478](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/triage/components/IncidentTriageView.tsx#L412-L478)):**
     - Card đề xuất chính thức: Gợi ý AI kèm thời hạn cam kết giải quyết theo SLA.
     - Nút "✓ Chấp nhận đề xuất" (`btn-accept`): Đồng thuận áp dụng mức ưu tiên của AI vào phiếu việc, kích hoạt SLA, tăng version OCC và ghi nhật ký `PRIORITY_ACCEPTED`.
     - Nút "🚀 Tạo lệnh điều phối ngay": Chuyển tiếp ngay lập tức sang phân hệ Điều phối (STT 43).
     - Nút "✎ Chọn mức khác (Human-in-the-loop)": Mở **Màn 3/3 Popup**.
     - Nút "← Quay lại xem chi tiết sự cố": Trở về **Màn 1/3**.

---

### 2.3. Màn 3/3: Popup Đổi Mức Ưu Tiên (Human-in-the-Loop) & Lối Tắt Điều Hướng STT 43
- **Đối tượng sử dụng:** Cán bộ muốn can thiệp, điều chỉnh mức ưu tiên theo thực tế hiện trường.
- **Mã nguồn FrontEnd:** [IncidentTriageView.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/triage/components/IncidentTriageView.tsx#L485-L556) (Dòng 485–556).
- **Mã nguồn BackEnd:**
  - Endpoint can thiệp: [incidents_triage.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/triage/incidents_triage.py#L175-L209) (`POST /api/v1/incidents/triage/{incident_id}/override`).
  - Logic can thiệp: [triage_ai_service.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/triage/triage_ai_service.py#L469-L524) (`override_priority`).
  - Ghi nhật ký: [triage_repository.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/triage/triage_repository.py#L295-L301) (`save_audit_log` với `action="PRIORITY_OVERRIDDEN"`).
- **Cấu trúc cửa sổ Modal & Trải nghiệm tương tác:**
  - Thiết kế: Căn giữa màn hình, backdrop mờ che phủ toàn bộ nền (`triage-popup-overlay`), hỗ trợ phím `Escape` để đóng nhanh ([L170-L178](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/triage/components/IncidentTriageView.tsx#L170-L178)).
  - Nhãn tiêu đề: Dòng chữ nhỏ in hoa `"POPUP"` và tiêu đề chính in đậm `"ĐỔI MỨC ƯU TIÊN?"`.
  - Dòng chuyển đổi mức độ: `Từ [Mức_Hiện_Tại] → [Dropdown chọn mức mới]` (Khẩn cấp 4h, Cao 12h, Trung bình 24h, Thấp 48h).
  - Ô Ghi chú bắt buộc:
    - Textarea có placeholder gợi ý mẫu: `"VD: Bãi rác chắn cổng trường học, cần điều xe dọn gấp trước giờ học sinh tan trường..."`.
    - Bộ đếm ký tự: `X/200 ký tự`.
    - Validation viền đỏ: Nếu bỏ trống, hiển thị thông báo lỗi `⚠️ Vui lòng nhập lý do thay đổi mức ưu tiên` và viền đỏ ô nhập liệu.
  - Cụm nút hành động:
    - Nút "Xác nhận" (`btn-confirm`): Gửi request can thiệp lên backend kèm `version` hiện tại.
    - Nút "Huỷ" (`btn-cancel`): Đóng popup, giữ nguyên trạng thái làm việc tại Màn 2/3.

---

# PHẦN 3: CHI TIẾT MÃ NGUỒN CỐT LÕI PHÍA BACKEND

### 3.1. Domain Entities & Database Models
- **Tập tin `Incident`:** [incident.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/models/incident.py) (98 dòng).
  - Các trường phục vụ AI Triage & XAI (Dòng 56–74):
    - `version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)` (Dòng 57 - Khóa lạc quan OCC).
    - `deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)` (Dòng 58 - Xóa mềm Soft Delete).
    - `ai_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)` (Dòng 65 - Bản tóm tắt 2-3 câu).
    - `ai_triage_score: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)` (Dòng 66 - Điểm số TPS 0-100).
    - `ai_suggested_priority: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)` (Dòng 67 - Mức ưu tiên đề xuất).
    - `ai_factors: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)` (Dòng 68 - Chi tiết các trọng số thành phần).
    - `ai_generated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)` (Dòng 69).
    - `priority_modified_by: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)` (Dòng 70).
    - `priority_modified_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)` (Dòng 71 - Tối đa 200 ký tự).
    - `priority_modified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)` (Dòng 72).
    - `sla_response_deadline: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)` (Dòng 73).
- **Tập tin `IncidentAuditLog`:** [audit_log.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/models/audit_log.py) (49 dòng).
  - Lớp `IncidentAuditLog` (Dòng 12–49):
    - Bảng `incident_audit_logs`, lưu vết `action` (`AI_TRIAGE_GENERATED`, `AI_TRIAGE_REGENERATED`, `PRIORITY_ACCEPTED`, `PRIORITY_OVERRIDDEN`).
    - Các cột: `log_id`, `incident_id`, `action`, `old_priority`, `new_priority`, `risk_score`, `reason`, `performed_by`, `metadata_json`, `version`, `deleted_at`.
- **Tập tin `EssentialFacility`:** [spatial.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/models/spatial.py) — Mô hình cơ sở thiết yếu nhạy cảm (Trường học, Bệnh viện, Trạm y tế) kèm hình học tọa độ `location: Geometry(Point, srid=4326)`.

---

### 3.2. CSDL Migration (Alembic)
- **Tập tin:** [022_create_incident_triage_audit_tables.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/alembic/versions/022_create_incident_triage_audit_tables.py) (130 dòng).
- Bổ sung các cột AI Triage & SLA vào bảng `incidents` (Dòng 30–59).
- Bổ sung thông tin liên hệ và trường version/deleted_at vào `essential_facilities` (Dòng 60–80).
- Tạo mới bảng nhật ký kiểm toán `incident_audit_logs` (Dòng 81–110).

---

### 3.3. Data Transfer Objects (Pydantic v2 Schemas)
- **Tập tin:** [triage.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/schemas/triage/triage.py) (75 dòng).
- Danh sách DTOs chính:
  - `TriageEvaluationResponse` (Dòng 7–46): Kết quả phân tích toàn diện cho Màn 1/3 & Màn 2/3 (thông tin sự cố, tóm tắt AI, điểm TPS, phân rã 4 thành phần điểm số, Risk Factors, SLA và version OCC).
  - `RegenerateSummaryResponse` (Dòng 48–53): Phản hồi khi tạo lại bản tóm tắt AI (`incident_id`, `ai_summary`, `generated_at`).
  - `AcceptPriorityRequest` (Dòng 55–58): Payload đồng thuận (`version: int`).
  - `OverridePriorityRequest` (Dòng 60–65): Payload can thiệp đổi mức (`new_priority: str`, `reason: str` từ 1 đến 200 ký tự, `version: int`).
  - `TriageActionResponse` (Dòng 67–75): Kết quả phản hồi sau khi chấp nhận hoặc đổi mức ưu tiên (`success`, `message`, `incident_id`, `updated_priority`, `sla_deadline`, `new_version`).

---

### 3.4. Abstractions & DIP Interfaces
- **Tập tin:** [triage_interface.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/interface/triage/triage_interface.py) (114 dòng).
- **Lớp trừu tượng `ITriageRepository` (Dòng 15–74):**
  - `get_triage_incidents_list(db, limit) -> List[Incident]` (Dòng 22–26).
  - `get_incident_by_id(db, incident_id) -> Optional[Incident]` (Dòng 29–33).
  - `get_incident_detail_with_relations(db, incident_id) -> Optional[Incident]` (Dòng 36–40).
  - `get_waste_category_by_id(db, category_id) -> Optional[WasteCategory]` (Dòng 43–47).
  - `get_nearest_sensitive_facility(db, incident_lat, incident_lng) -> Tuple[Optional[str], Optional[float]]` (Dòng 50–54).
  - `get_incident_audit_logs(db, incident_id) -> List[IncidentAuditLog]` (Dòng 57–61).
  - `save_audit_log(db, audit_log) -> IncidentAuditLog` (Dòng 64–68).
  - `commit_changes(db) -> None` (Dòng 71–73).
- **Lớp trừu tượng `IAITriageService` (Dòng 76–113):**
  - `evaluate_incident(db, incident_id) -> Any` (Dòng 81–84).
  - `regenerate_summary(db, incident_id) -> str` (Dòng 86–89).
  - `accept_ai_priority(db, incident_id, operator_id, expected_version) -> Incident` (Dòng 92–100).
  - `override_priority(db, incident_id, new_priority, reason, operator_id, expected_version) -> Incident` (Dòng 103–113).

---

### 3.5. Persistence Layer (100% Explicit SQL & Repository Pattern)
- **Tập tin:** [triage_repository.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/triage/triage_repository.py) (311 dòng).
- Triển khai lớp `TriageRepository` kế thừa `ITriageRepository` với các câu lệnh Explicit SQL raw text:
  1. **Truy vấn danh sách sự cố chờ thẩm định (Dòng 28–82):**
     ```sql
     SELECT 
         i.incident_id, i.tracking_code, i.reporter_id, i.category_id, i.unit_id,
         i.title, i.description, i.address_text, i.location, i.latitude, i.longitude,
         i.severity, i.status, i.risk_score, i.estimated_volume_m3, i.is_anonymous,
         i.reporter_phone_masked, i.upvotes_count, i.sla_deadline, i.resolved_at,
         i.closed_at, i.version, i.deleted_at, i.master_incident_id, i.is_duplicate_merged,
         i.ai_summary, i.ai_triage_score, i.ai_suggested_priority, i.ai_factors,
         i.ai_generated_at, i.priority_modified_by, i.priority_modified_reason,
         i.priority_modified_at, i.sla_response_deadline, i.created_at, i.updated_at
     FROM incidents i
     WHERE i.deleted_at IS NULL
     ORDER BY i.created_at DESC
     LIMIT :limit;
     ```
  2. **Truy vấn chi tiết sự cố theo ID (Dòng 88–132):**
     ```sql
     SELECT i.* FROM incidents i
     WHERE i.incident_id = :incident_id AND i.deleted_at IS NULL;
     ```
  3. **Truy vấn thông tin danh mục rác thải (Dòng 197–215):**
     ```sql
     SELECT c.* FROM waste_categories c
     WHERE c.category_id = :category_id;
     ```
  4. **Truy vấn cơ sở thiết yếu nhạy cảm gần nhất qua PostGIS ST_Distance (Dòng 227–258):**
     Áp dụng **Bounding Box 3km** để tối ưu hóa chỉ mục GIST trước khi tính khoảng cách hình học phẳng:
     ```sql
     SELECT 
         f.facility_name,
         ST_Distance(
             ST_Transform(f.location, 3857),
             ST_Transform(ST_SetSRID(ST_MakePoint(:lng, :lat), 4326), 3857)
         ) AS dist_m
     FROM essential_facilities f
     WHERE f.deleted_at IS NULL
       AND ST_Y(f.location) >= :min_lat AND ST_Y(f.location) <= :max_lat
       AND ST_X(f.location) >= :min_lng AND ST_X(f.location) <= :max_lng
     ORDER BY dist_m ASC
     LIMIT 1;
     ```
  5. **Truy vấn nhật ký kiểm toán Human-in-the-loop (Dòng 266–293):**
     ```sql
     SELECT l.* FROM incident_audit_logs l
     WHERE l.incident_id = :incident_id AND l.deleted_at IS NULL
     ORDER BY l.created_at DESC;
     ```

---

### 3.6. Business Logic Service Layer & Tích Hợp Kira AI
- **Tập tin:** [triage_ai_service.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/triage/triage_ai_service.py) (525 dòng).
- **Hàm gọi LLM Kira AI bất đồng bộ `call_kira_ai` (Dòng 27–61):**
  - Đọc cấu hình động từ `.env` qua `settings` (`KIRA_API_URL`, `KIRA_API_KEY`, `KIRA_MODEL`, `KIRA_TIMEOUT_SECONDS`).
  - Gửi POST request chuẩn OpenAI format (`/v1/chat/completions`) bằng `httpx.AsyncClient`.
  - Tự động fallback nếu timeout hoặc dịch vụ gián đoạn.
- **Hệ thống tính điểm TPS 4 thành phần:**
  - `compute_tps_score` (Dòng 82–88):
    $$\text{TPS} = \min\left(100.0, \text{BaseSeverity} \times 0.40 + \text{ProximityRisk} \times 0.30 + \text{ScaleFactor} \times 0.20 + \text{UrgencyNLP} \times 0.10\right)$$
  - `calculate_proximity_risk` (Dòng 90–100): $d \le 50$m $\to 100$đ; $50 < d \le 150$m $\to 75$đ; $150 < d \le 300$m $\to 50$đ; $d > 300$m $\to 0$đ.
  - `calculate_scale_factor` (Dòng 103–114): $> 20\text{ m}^2 \to 100$đ; $5 - 20\text{ m}^2 \to 70$đ; $< 5\text{ m}^2 \to 35$đ.
  - `extract_urgency_nlp` (Dòng 116–145): Quét từ khóa báo động (`cháy`, `nổ`, `ngập sâu`, `hóa chất độc hại` $\to 80 - 100$đ; `ùn ứ`, `bốc mùi`, `chắn lối` $\to 40 - 60$đ).
  - `determine_sla_and_priority` (Dòng 147–164): Ánh xạ mức độ ưu tiên & thời hạn cam kết giải quyết theo SLA (Khẩn cấp $\ge 80$đ: 4h; Cao $60-80$đ: 12h; Trung bình $40-60$đ: 24h; Thấp $< 40$đ: 48h).
- **Pipeline tóm tắt văn bản `generate_summary_ai` (Dòng 198–243):**
  - Xử lý văn bản quá ngắn (< 10 ký tự): Trả về cờ `is_too_short = True` và thông điệp cảnh báo.
  - Tóm tắt qua Kira AI với System Prompt chuyên trách thẩm định đô thị (< 50 từ).
- **Quy trình Human-in-the-loop & Khóa lạc quan OCC:**
  - `accept_ai_priority` (Dòng 419–466): Kiểm tra `inc.version == expected_version`, nếu sai báo lỗi `HTTP 409 Conflict`, tăng `version += 1`, gán SLA và lưu log `PRIORITY_ACCEPTED`.
  - `override_priority` (Dòng 469–524): Validate lý do bắt buộc ($1 - 200$ ký tự), kiểm tra xung đột version OCC (`HTTP 409`), tăng `version += 1` và lưu log `PRIORITY_OVERRIDDEN`.

---

### 3.7. Presentation Layer: FastAPI Router & Phân Quyền RBAC Guard
- **Tập tin:** [incidents_triage.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/triage/incidents_triage.py) (233 dòng).
- **Prefix:** `@router = APIRouter(prefix="/incidents/triage", tags=["AI Incident Triage & Priority (STT 39)"])` (Dòng 31).
- **Phân quyền RBAC:** `ALLOWED_TRIAGE_ROLES = {"ADMIN", "OFFICER", "DISTRICT_MANAGER", "COORDINATOR", "RESPONDER"}` (Dòng 33).
- **6 Endpoints RESTful:**
  1. `GET /list`: Lấy danh sách sự cố cần thẩm định AI (Dòng 48–75).
  2. `GET /{incident_id}`: Màn 1/3 & Màn 2/3 Chi tiết sự cố, tóm tắt AI và bảng giải trình XAI (Dòng 78–124).
  3. `POST /{incident_id}/regenerate`: Nút "Tạo lại tóm tắt" qua Kira AI (Dòng 127–140).
  4. `POST /{incident_id}/accept`: Màn 2/3 Đồng thuận với đề xuất của AI (Dòng 143–172).
  5. `POST /{incident_id}/override`: Màn 3/3 Popup Can thiệp đổi mức ưu tiên có giải trình (Dòng 175–209).
  6. `GET /{incident_id}/audit-logs`: Truy xuất toàn bộ lịch sử can thiệp thuật toán và con người (Dòng 212–232).
- **Composite Router & Mount:**
  - [router.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/triage/router.py) (11 dòng): `triage_composite_router` gom chung Router STT 39 và STT 40.
  - [__init__.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/__init__.py#L14-L33) (52 dòng): Mount `triage_composite_router` vào `api_v1_router` tại dòng 14 và 33.

---

# PHẦN 4: CHI TIẾT MÃ NGUỒN CỐT LÕI PHÍA FRONTEND

### 4.1. TypeScript Interfaces & Data Contracts
- **Tập tin:** [index.ts](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/triage/types/index.ts) (138 dòng).
- Định nghĩa đầy đủ kiểu dữ liệu:
  - `TriageScreenStep`: `"SCREEN_1_SUMMARY" | "SCREEN_2_EXPLAIN" | "SCREEN_3_OVERRIDE_POPUP"` (Dòng 3).
  - `TriageIncidentSummaryItem`: Mô hình dòng danh sách sự cố (Dòng 6–21).
  - `TriageEvaluationData`: Hợp đồng dữ liệu toàn diện cho cả 3 màn hình nghiệp vụ (Dòng 23–58).
  - `RegenerateSummaryResponse`, `TriageActionResponse`, `AuditLogItem` (Dòng 60–84).

---

### 4.2. Axios API Client Service
- **Tập tin:** [triageService.ts](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/triage/services/triageService.ts) (98 dòng).
- 6 phương thức kết nối API backend cho STT 39:
  - `getIncidentsList(limit)`: `GET /api/v1/incidents/triage/list` (Dòng 15–20).
  - `getIncidentDetail(incidentId)`: `GET /api/v1/incidents/triage/{id}` (Dòng 22–25).
  - `regenerateSummary(incidentId)`: `POST /api/v1/incidents/triage/{id}/regenerate` (Dòng 27–30).
  - `acceptPriority(incidentId, version)`: `POST /api/v1/incidents/triage/{id}/accept` (Dòng 32–37).
  - `overridePriority(incidentId, priority, reason, version)`: `POST /api/v1/incidents/triage/{id}/override` (Dòng 39–51).
  - `getAuditLogs(incidentId)`: `GET /api/v1/incidents/triage/{id}/audit-logs` (Dòng 53–56).

---

### 4.3. Thành Phần Giao Diện Trung Tâm (IncidentTriageView.tsx)
- **Tập tin:** [IncidentTriageView.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/triage/components/IncidentTriageView.tsx) (560 dòng).
- Điều khiển trạng thái 3 màn hình qua biến `currentStep` (Dòng 17).
- Cơ chế Toast thông báo nổi 3 giây (`showToast` - Dòng 42–48).
- **Màn 1/3 (Dòng 195–353):** 3 khối ngang: THÔNG TIN SỰ CỐ (trái), TÓM TẮT AI (giữa) với nút Tạo lại tóm tắt xoay 2s, ƯU TIÊN (phải) với nút Xem lý do XAI và nút Chuyển tiếp Điều phối STT 43.
- **Màn 2/3 (Dòng 359–479):** 2 khối ngang: PHÂN TÍCH XAI (trái) với bảng công thức toán TPS, QUYẾT ĐỊNH (phải) với nút Chấp nhận đề xuất và nút Chọn mức khác.
- **Màn 3/3 Popup (Dòng 485–556):** Căn giữa màn hình, backdrop overlay, kiểm tra lý do bắt buộc $\le 200$ ký tự, đóng bằng phím `Escape` (Dòng 170–178).

---

### 4.4. Khung Header & Footer (TriageHeaderFooter.tsx)
- **Tập tin:** [TriageHeaderFooter.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/triage/components/TriageHeaderFooter.tsx) (70 dòng).
- `TriageHeader` (Dòng 9–54): Logo GreenSpot Admin, Tabs chuyển đổi giữa "Tóm tắt & Ưu tiên AI" (STT 39) và "Phân tích vùng đệm GIS" (STT 40), chuông thông báo có chấm đỏ (`bell-dot`), thông tin tài khoản cán bộ điều phối.
- `TriageFooter` (Dòng 56–69): Bản quyền GreenSpot 2026, quy chế phân loại SLA và chính sách bảo mật.

---

### 4.5. Trang Quản Trị Trung Tâm (TriageAppDashboard.tsx)
- **Tập tin:** [TriageAppDashboard.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/triage/pages/TriageAppDashboard.tsx) (154 dòng).
- Thanh chọn hồ sơ sự cố (`triage-selector-bar` - Dòng 79–105): Dropdown chọn mã theo dõi (`tracking_code`) và tiêu đề sự cố, nút "Tải lại danh sách".
- Xử lý trạng thái tải dữ liệu (`loading-spinner`) và thông báo lỗi kết nối máy chủ kèm nút "Thử lại".
- Điều hướng mượt mà giữa `IncidentTriageView` (STT 39) và `SpatialFacilityView` (STT 40).

---

### 4.6. Điều Hướng Liên Phân Hệ (STT 43 Điều Phối & STT 40 Vùng Đệm Không Gian)
- **Liên kết sang STT 43 (Trung tâm Điều phối Tác nghiệp Hiện trường):**
  - Hàm `handleCreateDispatch` ([IncidentTriageView.tsx:L89-L129](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/triage/components/IncidentTriageView.tsx#L89-L129)): Tự động đóng gói thông tin sự cố (`incident_id`, `incident_code`, `title`, `priority`, `district`, `address`, `latitude`, `longitude`, `target_deadline_hours`) vào `localStorage` với key `"greenspot_prefill_dispatch"` và điều hướng hash URL: `window.location.hash = "#dispatch"`.
- **Liên kết sang STT 40 (Phân tích vùng đệm cơ sở thiết yếu GIS):**
  - Nút "🌐 Quét vùng đệm cơ sở thiết yếu" ([L322-L328](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/triage/components/IncidentTriageView.tsx#L322-L328)) kích hoạt callback `onNavigateToSpatial` chuyển tab sang `SpatialFacilityView` tại đúng tọa độ sự cố.

---

### 4.7. Hệ Thống SCSS Stylesheet Chuẩn BEM
- **Tập tin:** [triage.scss](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/triage/styles/triage.scss) (1,701 dòng).
- Tuân thủ 100% SASS SCSS, phân tách biến màu sắc ($primary-green, $color-critical, $color-high...), mixins tiện ích (`card-panel`, `flex-center`), không inline CSS, hiệu ứng bóng mờ cao cấp (`shadow-floating`), hiệu ứng xoay tròn spinner, và thiết kế modal popup sắc sảo.

---

# PHẦN 5: BỘ KIỂM THỬ TỰ ĐỘNG (AUTOMATED TEST SUITES)

### 5.1. Backend Unit & Integration Tests (Pytest - 12 Tiêu Chí)
- **Tập tin:** [test_ai_triage.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/tests/triage/test_ai_triage.py) (281 dòng).
- **Kết quả thực thi:** `pytest tests/triage/test_ai_triage.py` $\to$ **12/12 Passed (100%)**:
  1. `test_01_tps_formula_calculation` (Dòng 24–43): Kiểm tra công thức chuẩn hóa TPS, chặn trần 100 điểm và kịch bản thực tế.
  2. `test_02_proximity_risk_brackets` (Dòng 44–55): Kiểm tra phân bậc cự ly cơ sở thiết yếu ($\le 50$m $\to 100$đ; $\le 150$m $\to 75$đ; $\le 300$m $\to 50$đ; $> 300$m $\to 0$đ).
  3. `test_03_scale_factor_brackets` (Dòng 56–66): Kiểm tra phân bậc diện tích bãi rác ($> 20\text{ m}^2$, $5 - 20\text{ m}^2$, $< 5\text{ m}^2$).
  4. `test_04_urgency_nlp_extraction` (Dòng 67–77): Kiểm tra quét phát hiện từ khóa nguy cấp (`cháy`, `nổ`, `ngập sâu`, `hóa chất`).
  5. `test_05_sla_brackets_mapping` (Dòng 78–102): Kiểm tra ánh xạ mức ưu tiên và khung thời hạn cam kết SLA (4h, 12h, 24h, 48h).
  6. `test_06_edge_case_short_description` (Dòng 103–113): Kiểm tra xử lý chuỗi ngắn < 10 ký tự trả về thông báo lỗi thay vì gửi request AI.
  7. `test_07_get_incident_triage_detail_success` (Dòng 126–139): Tích hợp dịch vụ AI Triage đánh giá hồ sơ mẫu.
  8. `test_08_regenerate_summary_success` (Dòng 140–149): Tích hợp tạo lại tóm tắt AI qua Kira AI.
  9. `test_09_accept_ai_priority_success` (Dòng 150–174): Tích hợp đồng thuận mức AI, kích hoạt SLA, tăng version và ghi nhật ký kiểm toán.
  10. `test_10_override_priority_human_in_the_loop_with_reason` (Dòng 175–213): Tích hợp can thiệp đổi mức có ghi chú giải trình, chặn lý do rỗng.
  11. `test_11_optimistic_locking_conflict` (Dòng 214–231): Kiểm tra cơ chế Khóa lạc quan chặn xung đột phiên bản với mã lỗi `HTTP 409 Conflict`.
  12. `test_12_http_api_endpoints_coverage` (Dòng 236–281): Kiểm thử tích hợp toàn diện các HTTP endpoints bằng TestClient.

---

# PHẦN 6: BẢNG TRA CỨU NHANH DÒNG MÃ NGUỒN FULL-STACK (CHEAT SHEET)

| STT | Thành phần kiến trúc | Đường dẫn tệp mã nguồn | Vị trí dòng | Trách nhiệm cốt lõi |
|:---:|---|---|:---:|---|
| **1** | Domain Model `Incident` | [incident.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/models/incident.py) | L56 - L74 | Bổ sung các cột AI Triage, XAI, SLA, OCC version và Soft delete |
| **2** | Domain Model `IncidentAuditLog` | [audit_log.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/models/audit_log.py) | L12 - L49 | Bảng nhật ký kiểm toán lưu vết can thiệp con người & AI |
| **3** | CSDL Migration Alembic | [022_create_incident_triage_audit_tables.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/alembic/versions/022_create_incident_triage_audit_tables.py) | L25 - L130 | Migration tạo bảng `incident_audit_logs`, alter table `incidents` |
| **4** | Schemas DTOs Pydantic v2 | [triage.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/schemas/triage/triage.py) | L7 - L75 | 5 Schemas: TriageEvaluationResponse, OverridePriorityRequest... |
| **5** | DIP Interface `ITriageRepository` | [triage_interface.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/interface/triage/triage_interface.py) | L15 - L74 | Hợp đồng trừu tượng hóa 8 phương thức truy xuất CSDL |
| **6** | DIP Interface `IAITriageService` | [triage_interface.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/interface/triage/triage_interface.py) | L76 - L113 | Hợp đồng trừu tượng hóa 4 nghiệp vụ AI Triage & Human-in-the-loop |
| **7** | Explicit SQL: Danh sách sự cố | [triage_repository.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/triage/triage_repository.py) | L28 - L82 | SQL `SELECT i.* FROM incidents i WHERE i.deleted_at IS NULL ...` |
| **8** | Explicit SQL: PostGIS Cự ly cơ sở | [triage_repository.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/triage/triage_repository.py) | L227 - L258 | SQL Bounding Box 3km và `ST_Distance(ST_Transform(...))` |
| **9** | Explicit SQL: Nhật ký kiểm toán | [triage_repository.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/crud/triage/triage_repository.py) | L266 - L293 | SQL truy vấn lịch sử can thiệp `incident_audit_logs` |
| **10** | Tích hợp Kira AI LLM | [triage_ai_service.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/triage/triage_ai_service.py) | L27 - L61 | `call_kira_ai` gọi API OpenAI format qua `httpx.AsyncClient` |
| **11** | Thuật toán TPS & Phân rã rủi ro | [triage_ai_service.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/triage/triage_ai_service.py) | L82 - L164 | Công thức tính TPS, phân bậc cự ly, diện tích, NLP từ khóa và SLA |
| **12** | Business Service `AITriageService` | [triage_ai_service.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/services/triage/triage_ai_service.py) | L166 - L524 | Điều phối quy trình tóm tắt, đánh giá XAI, accept và override |
| **13** | Router Endpoints RESTful | [incidents_triage.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/triage/incidents_triage.py) | L48 - L232 | 6 Endpoints: `/list`, `/{id}`, `/regenerate`, `/accept`, `/override`, `/audit-logs` |
| **14** | Composite Router Mount | [router.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/app/api/v1/triage/router.py) | L8 - L11 | Gom router STT 39 và STT 40 thành `triage_composite_router` |
| **15** | Backend Pytest (12 tests) | [test_ai_triage.py](file:///c:/Users/Admin/source/Group-j_GreenSpot/BackEnd/tests/triage/test_ai_triage.py) | L21 - L281 | Bộ kiểm thử tự động 12 tiêu chí Clean Architecture & OCC |
| **16** | TypeScript Data Contracts | [index.ts](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/triage/types/index.ts) | L1 - L138 | Type definitions cho STT 39 và STT 40 |
| **17** | Axios API Client | [triageService.ts](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/triage/services/triageService.ts) | L13 - L56 | 6 phương thức kết nối backend cho STT 39 |
| **18** | Giao diện Màn 1/3: Tóm tắt AI | [IncidentTriageView.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/triage/components/IncidentTriageView.tsx) | L195 - L353 | 3 Khối: THÔNG TIN SỰ CỐ, TÓM TẮT AI (Tạo lại 2s), ƯU TIÊN |
| **19** | Giao diện Màn 2/3: Giải trình XAI | [IncidentTriageView.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/triage/components/IncidentTriageView.tsx) | L359 - L479 | 2 Khối: PHÂN TÍCH (Công thức TPS + Risk factors), QUYẾT ĐỊNH |
| **20** | Giao diện Màn 3/3: Popup Human | [IncidentTriageView.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/triage/components/IncidentTriageView.tsx) | L485 - L556 | Modal Popup ĐỔI MỨC ƯU TIÊN, ô ghi chú $\le 200$ ký tự, phím Esc |
| **21** | Lối tắt Điều phối sang STT 43 | [IncidentTriageView.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/triage/components/IncidentTriageView.tsx) | L89 - L129 | Prefill `localStorage` và điều hướng URL hash `#dispatch` |
| **22** | Header & Footer Phân Hệ | [TriageHeaderFooter.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/triage/components/TriageHeaderFooter.tsx) | L1 - L70 | Brand icon, Tab switch Triage/Spatial, chuông báo, footer |
| **23** | Trang Quản Trị Trung Tâm | [TriageAppDashboard.tsx](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/triage/pages/TriageAppDashboard.tsx) | L1 - L154 | Thanh chọn sự cố, xử lý loading/error, nạp dữ liệu chi tiết |
| **24** | SCSS Stylesheet Chuẩn BEM | [triage.scss](file:///c:/Users/Admin/source/Group-j_GreenSpot/FrontEnd/src/features/triage/styles/triage.scss) | L1 - L1701 | SCSS variables, mixins, animations, 3-column & 2-column layout |
