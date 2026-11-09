# 🏛️ BỘ QUY TẮC CHUẨN HÓA KIẾN TRÚC: CLEAN ARCHITECTURE & SOLID (DIP)

> **Cấp độ áp dụng:** Bắt buộc 100% trên toàn bộ codebase Backend (`app/`) và hệ thống tài liệu kỹ thuật (`BackEnd/docs/`).  
> **Phiên bản:** 2.0 (Đồng bộ sau đợt chuẩn hóa STT 37 - 41).  
> **Nguyên tắc cốt lõi:** Phân tầng độc lập, phụ thuộc trừu tượng (Dependency Inversion Principle), truy vấn SQL tường minh tuyệt đối, xử lý tương tranh OCC và xóa mềm Soft-Delete.

---

## 1. TỔNG QUAN KIẾN TRÚC & TRIẾT LÝ THIẾT KẾ

Hệ thống Backend áp dụng **Clean Architecture** kết hợp triệt để **5 nguyên lý thiết kế SOLID**, lấy **Dependency Inversion Principle (DIP)** làm trục trung tâm nhằm:
1. **Cách ly tối đa Business Logic (Domain/Service):** Nghiệp vụ không phụ thuộc vào framework HTTP (FastAPI) hay ORM cụ thể (SQLAlchemy).
2. **Kiểm thử độc lập (Testability):** 100% Service có thể kiểm thử đơn vị độc lập bằng Mock Repository mà không cần kết nối cơ sở dữ liệu thật.
3. **Truy vấn CSDL minh bạch & kiểm soát hiệu năng:** Loại bỏ triệt để các câu lệnh ORM ngầm định (magic queries), toàn bộ truy vấn CSDL phải là **SQL tường minh hoàn toàn (Explicit SQL)**.
4. **Nhất quán 100% với tài liệu kỹ thuật:** Mọi đường dẫn file, tên lớp, giao diện, và luồng gọi phải ánh xạ chính xác 1:1 với hệ thống tài liệu kỹ thuật đã ban hành tại `BackEnd/docs/`.

---

## 2. CẤU TRÚC THƯ MỤC TIÊU CHUẨN 5 TẦNG (5-TIER CLEAN ARCHITECTURE)

Mọi module/chức năng nghiệp vụ trong thư mục `BackEnd/app/` phải tuân thủ nghiêm ngặt cấu trúc phân tầng sau:

```
BackEnd/app/
├── models/                     # [TẦNG 1] Domain Entities & Cấu trúc bảng Database
│   ├── incident.py             # Entity Sự cố môi trường, Danh mục rác, Media
│   ├── spatial.py              # Entity Không gian địa lý PostGIS (Cơ sở thiết yếu, Đơn vị hành chính)
│   ├── flood.py                # Entity Ngập lụt (Điểm đen, Lộ trình an toàn né ngập)
│   ├── voice_assistant/        # Entity Trợ lý giọng nói (Sample Commands, Interaction Logs)
│   └── audit_log.py            # Entity Nhật ký kiểm toán thẩm định sự cố
│
├── schemas/                    # [TẦNG 2] Data Transfer Objects (DTO) & Pydantic Schemas
│   ├── deduplication/          # Request/Response schemas cho Phát hiện trùng lặp & Cụm sự cố
│   ├── triage/                 # Request/Response schemas cho AI Triage & Phân tích vùng đệm PostGIS
│   ├── navigation/             # Request/Response schemas cho Định tuyến an toàn né ngập
│   └── voice_assistant/        # Request/Response schemas cho Trợ lý giọng nói NLU
│
├── interface/                  # [TẦNG 3] Abstraction Layer (Giao diện trừu tượng - DIP)
│   ├── deduplication/          # IDeduplicationRepository, IClusteringRepository
│   ├── triage/                 # ITriageRepository, ISpatialFacilityRepository
│   ├── navigation/             # INavigationRepository, IFloodRoutingService
│   └── voice_assistant/        # IVoiceAssistantRepository
│
├── crud/ (hoặc repositories/)   # [TẦNG 4] Data Access / Persistence Layer (Explicit SQL)
│   ├── deduplication/          # DeduplicationRepository, ClusterRepository
│   ├── triage/                 # TriageRepository, SpatialFacilityRepository
│   ├── navigation/             # NavigationRepository
│   └── voice_assistant/        # VoiceAssistantRepository
│
├── services/                   # [TẦNG 5] Core Business Logic Layer (Use Cases)
│   ├── deduplication/          # DeduplicationService, ClusteringEngine
│   ├── triage/                 # AITriageService, SpatialFacilityService
│   ├── navigation/             # FloodNavigationEngine, SafeRouteService
│   └── voice_assistant/        # VoiceNluService, VoiceService
│
└── api/v1/                     # [TẦNG 6] Transport / Presentation Layer (FastAPI Routers)
    ├── deduplication/          # /api/v1/deduplication/ endpoints
    ├── triage/                 # /api/v1/triage/ endpoints
    ├── navigation/             # /api/v1/navigation/ endpoints
    └── voice_assistant/        # /api/v1/voice/ endpoints
```

---

## 3. BẢNG PHÂN ĐỊNH TRÁCH NHIỆM TỪNG TẦNG (SEPARATION OF CONCERNS)

| Tầng | Thư mục | Trách nhiệm chính | Điều CẤM kỵ |
|---|---|---|---|
| **Models** | `app/models/` | Định nghĩa SQLAlchemy Declarative Models, bảng CSDL, quan hệ Khóa ngoại, Mixin (Timestamp, Soft-delete, OCC Version). | ❌ Cấm chứa logic nghiệp vụ, cấm thực hiện query CSDL. |
| **Schemas** | `app/schemas/` | Định nghĩa Pydantic Models để validate dữ liệu đầu vào (Request DTO) và chuẩn hóa dữ liệu trả về (Response DTO). | ❌ Cấm chứa truy vấn DB, cấm phụ thuộc vào SQLAlchemy Models trực tiếp nếu không qua ORM mode. |
| **Interface** | `app/interface/` | Định nghĩa các lớp trừu tượng (Abstract Base Class - ABC) với `@abstractmethod` cho Repository & Service contract. | ❌ Cấm import thư viện thực thi CSDL cụ thể (ngoại trừ AsyncSession type annotation). Cấm viết implementation code. |
| **Repositories** | `app/crud/` | Kế thừa Interface tầng 3, thực hiện đọc/ghi CSDL. **Bắt buộc 100% câu truy vấn là Explicit SQL** (`text()`, `select().from_statement()`). | ❌ Cấm chứa Business Logic (tính điểm, phân luồng). Cấm phụ thuộc vào HTTP Request/Response. |
| **Services** | `app/services/` | Chứa toàn bộ Business Logic, giải thuật AI/NLU, tính toán không gian PostGIS, điều phối các Repositories qua Interface. | ❌ Cấm viết câu lệnh SQL trực tiếp. Cấm truy cập CSDL không thông qua Repository. |
| **Routers** | `app/api/v1/` | Tiếp nhận HTTP Request, xác thực Token/RBAC, gọi Service tương ứng, trả về HTTP Response mã lỗi chuẩn RESTful. | ❌ Cấm viết query DB, cấm thực hiện tính toán nghiệp vụ phức tạp trực tiếp trong hàm endpoint. |

---

## 4. BỘ NGUYÊN LÝ SOLID ÁP DỤNG TRONG DỰ ÁN

### 1. S - Single Responsibility Principle (Đơn trách nhiệm)
- Mỗi class/file chỉ chịu một trách nhiệm duy nhất:
  - `IncidentAuditLog` chỉ đại diện cho bảng CSDL audit.
  - `TriageRepository` chỉ lo thực thi câu lệnh SQL đọc/ghi audit và incident.
  - `AITriageService` chỉ lo giải thuật tính điểm TPS (Triage Priority Score) và XAI factors.
  - Router `triage/router.py` chỉ lo đón nhận request HTTP và serialize response.

### 2. O - Open/Closed Principle (Đóng mở)
- Các module mở rộng hành vi thông qua việc triển khai Interface mới thay vì sửa đổi code cũ.
- Ví dụ: Khi muốn đổi từ `SpatialFacilityRepository` cục bộ sang kết nối dịch vụ GIS ngoài, chỉ cần tạo `ExternalGisFacilityRepository(ISpatialFacilityRepository)` mà không làm thay đổi một dòng code nào trong `SpatialFacilityService`.

### 3. L - Liskov Substitution Principle (Thay thế Liskov)
- Mọi triển khai con của Interface phải hoàn toàn có thể thay thế cho Interface mà không làm sụp đổ hệ thống.
- Bất kỳ class nào kế thừa `IVoiceAssistantRepository` đều phải cung cấp đầy đủ các phương thức `get_active_sample_commands`, `create_interaction_log` với đúng chữ ký kiểu (type signatures).

### 4. I - Interface Segregation Principle (Phân tách giao diện)
- Không tạo một "God Repository Interface" chung chung chứa hàng trăm phương thức cho toàn bộ hệ thống.
- Giao diện phải được chia nhỏ theo domain cụ thể:
  - `ITriageRepository` cho thẩm định sự cố.
  - `ISpatialFacilityRepository` cho phân tích vùng đệm PostGIS.
  - `IDeduplicationRepository` cho thuật toán trùng lặp.
  - `INavigationRepository` cho lộ trình an toàn ngập lụt.

### 5. D - Dependency Inversion Principle (Đảo ngược phụ thuộc - DIP)
- **Quy tắc cốt lõi:**
  1. *High-level modules (Services)* không được phụ thuộc trực tiếp vào *Low-level modules (Repositories/CRUD)*. Cả hai phải phụ thuộc vào *Abstractions (Interfaces)*.
  2. *Abstractions* không phụ thuộc vào chi tiết. Chi tiết phải phụ thuộc vào trừu tượng.
- **Mẫu Dependency Injection chuẩn:**
  ```python
  # 1. Interface (app/interface/triage/spatial_facility_interface.py)
  class ISpatialFacilityRepository(ABC):
      @abstractmethod
      async def get_incident_by_id(self, db: AsyncSession, incident_id: uuid.UUID) -> Optional[Incident]:
          pass

  # 2. Repository triển khai (app/crud/triage/spatial_facility_repository.py)
  class SpatialFacilityRepository(ISpatialFacilityRepository):
      async def get_incident_by_id(self, db: AsyncSession, incident_id: uuid.UUID) -> Optional[Incident]:
          # Explicit SQL
          ...

  # 3. Service phụ thuộc vào Interface (app/services/triage/spatial_facility_service.py)
  class SpatialFacilityService:
      def __init__(self, repository: ISpatialFacilityRepository = spatial_facility_repository):
          self.repo = repository
  ```

---

## 5. BỘ QUY CHUẨN TRUY VẤN SQL TƯỜNG MINH (EXPLICIT SQL STANDARDS)

Nhằm đảm bảo hiệu năng tối ưu, minh bạch kế hoạch thực thi (Query Execution Plan) và dễ dàng debug chỉ mục PostGIS, toàn bộ các truy vấn CSDL phải tuân thủ các quy tắc sau:

### 1. Bắt buộc liệt kê danh sách cột tường minh
- ❌ **Tuyệt đối cấm:** `SELECT * FROM incidents` hoặc phụ thuộc ORM auto-generate columns ngầm định không kiểm soát.
- ✅ **Bắt buộc:** Nêu rõ từng cột cần truy vấn kèm alias bảng:
  ```python
  sql = text("""
      SELECT 
          i.incident_id,
          i.tracking_code,
          i.title,
          i.severity,
          i.latitude,
          i.longitude,
          i.version
      FROM incidents i
      WHERE i.incident_id = :incident_id
        AND i.deleted_at IS NULL
  """)
  ```

### 2. Sử dụng `select(Model).from_statement(...)` khi cần ORM Tracking & Eager-loading
- Để vừa đảm bảo câu lệnh SQL là thuần túy tường minh, vừa tận dụng cơ chế quản lý vòng đời session (Identity Map) và nạp quan hệ liên kết (`selectinload`), áp dụng mẫu chuẩn:
  ```python
  stmt = (
      select(Incident)
      .from_statement(sql)
      .params(incident_id=incident_id)
      .options(
          selectinload(Incident.category),
          selectinload(Incident.media),
      )
  )
  res = await db.execute(stmt)
  return res.scalars().first()
  ```

### 3. Tường minh hóa các hàm không gian địa lý PostGIS
- Khi xử lý dữ liệu GIS (Geometry/Point/SRID 4326/3857):
  - Ép kiểu rõ ràng: `ST_X(h.location)::float AS lng`, `ST_Y(h.location)::float AS lat`.
  - Tính khoảng cách theo hệ tọa độ phẳng mét: `ST_Distance(ST_Transform(f.location, 3857), ST_Transform(ST_SetSRID(ST_MakePoint(:lng, :lat), 4326), 3857))`.
  - Tối ưu hóa bằng Bounding Box trước khi tính khoảng cách chi tiết để kích hoạt GIST Spatial Index.

### 4. Đồng bộ hóa Identity Map khi thực thi Raw SQL `UPDATE`
- Khi chạy câu lệnh `UPDATE` bằng raw SQL `text(...)`, phiên làm việc SQLAlchemy trong cùng transaction cần cập nhật thuộc tính in-memory hoặc dùng `session.refresh()` để tránh đọc lại dữ liệu cũ từ cache session.

---

## 6. QUY CHUẨN XỬ LÝ DỮ LIỆU: SOFT-DELETE & OPTIMISTIC LOCKING (OCC)

Mọi bảng nghiệp vụ trong hệ thống phải tuân thủ nghiêm ngặt hai quy tắc toàn vẹn dữ liệu:

### 1. Quy tắc Xóa mềm (Soft Delete)
- Mọi bảng chính (`incidents`, `essential_facilities`, `flood_hotspots`, `incident_duplicate_clusters`, `incident_audit_logs`) bắt buộc có cột:
  ```python
  deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
  ```
- **Mọi câu lệnh truy vấn SELECT** bắt buộc phải có điều kiện:
  ```sql
  WHERE table_alias.deleted_at IS NULL
  ```
- Thao tác xóa bản ghi: Cập nhật `deleted_at = NOW()`, tuyệt đối cấm câu lệnh `DELETE FROM ...`.

### 2. Quy tắc Khóa lạc quan (Optimistic Concurrency Control - OCC)
- Mọi bảng có nghiệp vụ cập nhật trạng thái đồng thời (thẩm định sự cố, gộp trùng lặp, cập nhật lộ trình) bắt buộc có cột:
  ```python
  version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
  ```
- **Khi cập nhật:** Client phải gửi kèm `version` hiện tại. Câu lệnh UPDATE kiểm tra chính xác version:
  ```sql
  UPDATE incidents
  SET status = :new_status, version = version + 1, updated_at = NOW()
  WHERE incident_id = :incident_id AND version = :current_version;
  ```
- Nếu số hàng bị ảnh hưởng `affected_rows == 0` (hoặc model version không khớp), lập tức rollback và ném lỗi **HTTP 409 Conflict**.

---

## 7. MA TRẬN ĐỐI CHIẾU 8 TÍNH NĂNG ĐÃ CHUẨN HÓA (STT 37 - 44)

Bảng đối chiếu đảm bảo **tính nhất quán 100%** giữa tài liệu đặc tả kỹ thuật và cấu trúc mã nguồn Backend:

| STT | Tên tính năng | File Đặc tả kỹ thuật | Interface Layer | Persistence Layer (Explicit SQL) | Business Logic Service | API Router Layer |
|:---:|---|---|---|---|---|---|
| **37** | Hands-free Voice Assistant | `docs/37_voice_assistant_system_summary.md` | `app/interface/voice_assistant/voice_interface.py` | `app/crud/voice_assistant/voice_repository.py` | `app/services/voice_assistant/voice_service.py` | `app/api/v1/voice_assistant/router.py` |
| **38** | AI Incident Deduplication & Clustering | `docs/38_CORE_ARCHITECTURE_AND_CODE_REFERENCE.md` | `app/interface/deduplication/deduplication_interface.py` | `app/crud/deduplication/deduplication_repository.py` | `app/services/deduplication/deduplication_service.py` | `app/api/v1/deduplication/router.py` |
| **39** | AI Incident Triage & XAI Priority Scoring | `docs/39_ai_incident_triage_priority.md` | `app/interface/triage/triage_interface.py` | `app/crud/triage/triage_repository.py` | `app/services/triage/triage_service.py` | `app/api/v1/triage/router.py` |
| **40** | Spatial Facility Analysis (Buffer Zone) | `docs/40_spatial_facility_analysis.md` | `app/interface/triage/spatial_facility_interface.py` | `app/crud/triage/spatial_facility_repository.py` | `app/services/triage/spatial_facility_service.py` | `app/api/v1/triage/router.py` (tích hợp) |
| **41** | Flood-Aware Safe Navigation | `docs/41_flood_aware_safe_navigation.md` | `app/interface/navigation/navigation_interface.py` | `app/crud/navigation/navigation_repository.py` | `app/services/navigation/navigation_service.py` | `app/api/v1/navigation/router.py` |
| **42** | Urban Environmental Risk Dashboard | `docs/42_urban_risk_dashboard.md` | `app/interface/risk_dashboard/risk_dashboard_interface.py` | `app/crud/risk_dashboard/risk_dashboard_repository.py` | `app/services/risk_dashboard/risk_dashboard_service.py` | `app/api/v1/risk_dashboard/router.py` |
| **43** | Operations Dispatch Center | `docs/43_operations_dispatch.md` | `app/interface/dispatch/dispatch_interface.py` | `app/crud/dispatch/dispatch_repository.py` | `app/services/dispatch/dispatch_service.py` | `app/api/v1/dispatch/router.py` |
| **44** | Hotspot Spatial Analytics & 7-Day Forecast | `docs/44_hotspot_analytics_forecast.md` | `app/interface/hotspots/hotspot_interface.py` | `app/crud/hotspots/hotspot_repository.py` | `app/services/hotspots/hotspot_service.py` | `app/api/v1/hotspots/router.py` |


---

## 8. KỶ LUẬT PHÁT TRIỂN & QUẢN TRỊ WORKTREE (GIT HYGIENE)

Nhằm đảm bảo an toàn mã nguồn, tránh nghẽn context và dễ dàng truy vết thay đổi:
1. **Nguyên tắc "Làm tới đâu commit gọn tới đó":**
   - Mỗi commit chứa tối đa **$\le 4$ tệp tin** có liên quan chặt chẽ với nhau.
   - Không bao giờ để quá **5 node tồn đọng** (uncommitted files) trong Git worktree tại bất kỳ thời điểm nào.
2. **Quy chuẩn thông điệp Commit (Conventional Commits):**
   - `refactor(scope): Chuyển đổi toàn bộ truy vấn sang SQL tường minh...`
   - `feat(scope): Bổ sung phương thức Interface và Service...`
   - `test(scope): Bổ sung kiểm thử TDD cho nghiệp vụ...`
   - `docs(scope): Chuẩn hóa cấu trúc thư mục và tài liệu kiến trúc...`
3. **Quy trình kiểm thử trước khi bàn giao:**
   - 100% Unit test & Integration test phải PASS trước khi tạo commit hoàn tất tính năng.
   - Chạy test toàn bộ dự án (`pytest tests/ -v`) đảm bảo 0 lỗi hồi quy (zero regression).

---

**Trạng thái tài liệu:** ✅ ĐÃ BAN HÀNH VÀ CÓ HIỆU LỰC BẮT BUỘC TRÊN TOÀN BỘ CODEBASE.
