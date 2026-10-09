# 🧭 FILE ĐIỀU HƯỚNG CHÍNH: QUY TẮC PHÂN TÍCH, ĐỐI CHIẾU & TRIỂN KHAI CHỨC NĂNG

> **⚠️ QUAN TRỌNG:** File này dành cho **AI Antigravity IDE** và là **file điều hướng chính**.
> Nó được nạp **đầu tiên, luôn bật** (always-on) trong thư mục rules. Nó cho AI biết phải đọc file nào, theo thứ tự nào, và khi nào dùng file nào.
> Cả 4 file nằm **chung một thư mục rules**; 3 file còn lại được gọi theo tên file, không cần đường dẫn dài.

---

## 📖 THỨ TỰ ĐỌC BẮT BUỘC (TỰ ĐỘNG, KHÔNG CẦN XIN PHÉP)

```
1. FEATURE_ANALYSIS_RULES.md   ← File này (điều hướng, đã được nạp sẵn)
2. PROJECT_RULES.md            ← Đọc toàn bộ quy tắc + quét toàn bộ source dự án
3. FEATURE_LIST.md             ← Danh sách 48 chức năng, trạng thái, gợi ý phụ thuộc
4. spec-compliance-check.md    ← Chỉ ĐỌC để nắm quy tắc đối chiếu; CHƯA chạy
5. Đặc tả chức năng            ← Do người dùng gửi cùng yêu cầu
```

### Quy tắc nạp tự động
- Bước 1-4 được AI làm **tự động ngay khi bắt đầu phiên**, **không** cần cổng duyệt, **không** cần người dùng nhắc.
- Bước 2 gồm: đọc toàn bộ `PROJECT_RULES.md`, rồi **quét toàn bộ source** (cây thư mục, module, DB schema/migration, seeder, test, config, RBAC, search index) và đọc chi tiết các phần liên quan.
- Nếu dự án quá lớn để đọc hết trong ngữ cảnh: **nói thẳng** phần nào chưa đọc, không được giả vờ đã đọc.
- Giai đoạn nạp là **chỉ ĐỌC**. Tuyệt đối không sửa, không tạo file.
- Đã nạp trong phiên thì không nạp lại, trừ khi mất ngữ cảnh.
- Khi nạp xong, AI in đúng thông báo sau rồi chờ người dùng:

```
✅ Đã nạp: FEATURE_ANALYSIS_RULES, PROJECT_RULES, FEATURE_LIST, spec-compliance-check
📂 Đã quét source: [tóm tắt module / ghi rõ phần chưa đọc được]
Sẵn sàng. Mời bạn gửi đặc tả và chức năng cần làm.
```

### Vai trò từng file

| File | Vai trò | Dùng khi nào |
|------|---------|--------------|
| `FEATURE_ANALYSIS_RULES.md` | Điều hướng, quy trình, cổng duyệt, mẫu báo cáo | Luôn luôn |
| `PROJECT_RULES.md` | Workflow 7 bước, quy tắc kỹ thuật (Git, SASS, soft delete, optimistic locking, search engine) | Luôn luôn |
| `FEATURE_LIST.md` | Danh sách chức năng, trạng thái, gợi ý phụ thuộc | Giai đoạn 0, 1 và cập nhật cuối |
| `spec-compliance-check.md` | Đối chiếu code với đặc tả, **chỉ báo cáo** | Giai đoạn 3, sau Cổng 7 và khi người dùng đồng ý |

### Thuật ngữ dùng xuyên suốt
- **Đặc tả cũ**: bản đặc tả người dùng gửi lúc bắt đầu (ý định ban đầu). AI ghi nhận và giữ làm mốc, **không hỏi lại** trừ khi mất ngữ cảnh phiên.
- **Đặc tả mới**: bản đặc tả được cập nhật **sau khi** code đã được đối chiếu và người dùng quyết định từng điểm lệch.
- **Báo cáo 1**: báo cáo phân tích phụ thuộc (Giai đoạn 1).
- **Báo cáo 2**: báo cáo đối chiếu đặc tả (Giai đoạn 3). **Hai báo cáo này luôn tách riêng.**
- **Báo cáo tổng hợp**: báo cáo cuối cùng (Giai đoạn 6).

### Quy tắc xung đột
- Nếu file này **mâu thuẫn** với `PROJECT_RULES.md` hoặc `spec-compliance-check.md` → **dừng lại, báo và hỏi người dùng**, không tự chọn bên nào.
- Mọi quy tắc trong `PROJECT_RULES.md` (không đụng Git, SASS, soft delete, optimistic locking, search engine, báo cáo khi token ≤ 5%) **vẫn có hiệu lực đầy đủ** và áp dụng song song.
- Quy tắc "chỉ báo cáo, không sửa code" của `spec-compliance-check.md` **vẫn có hiệu lực đầy đủ** trong Giai đoạn 3.

---

## 🎯 MỤC ĐÍCH

Khi người dùng yêu cầu làm một chức năng, AI **không được code ngay**. AI phải:

1. **Xác định** chức năng đó là chức năng số mấy trong `FEATURE_LIST.md`, đối chiếu với đặc tả người dùng cung cấp.
2. **Kiểm tra hiện trạng** (đọc code, chạy test/lint hiện có để ghi mốc) và **phân tích** chức năng này có dính (phụ thuộc / đụng chạm) đến chức năng nào khác không.
3. **Báo cáo 1** cho người dùng biết: phải làm chức năng nào trước, hay có thể làm ngay, hay cần xây thêm thành phần mới.
4. **Chờ người dùng duyệt** rồi mới được làm từng bước (workflow 7 bước).
5. **Không đụng** đến code của chức năng đã làm nếu chưa được phép.
6. Sau khi code xong, **đề xuất đối chiếu code với đặc tả** (chỉ báo cáo) và để **người dùng quyết định** từng điểm lệch.
7. Sau khi mọi thứ khớp, **soạn đặc tả mới** kèm bảng khác biệt so với đặc tả cũ, để người dùng tự quyết định dùng.
8. **Tổng hợp báo cáo** cuối, chỉ rõ đã đụng chạm những phần nào.

---

## 🚦 NGUYÊN TẮC CỐT LÕI

| # | Nguyên tắc |
|---|-----------|
| 1 | ❌ **Không code** khi chưa có báo cáo phân tích được người dùng duyệt |
| 2 | ❌ **Không sang bước kế tiếp** khi người dùng chưa duyệt bước hiện tại |
| 3 | ❌ **Không sửa** (Mức A) chức năng cũ khi chưa được phép riêng cho việc đó |
| 4 | ✅ **Mọi sự phụ thuộc** (Mức B) phải được liệt kê trong báo cáo phân tích |
| 5 | ✅ **Không chắc thì hỏi**, không đoán |
| 6 | ✅ **Trung thực**: phát hiện đụng chạm ngoài kế hoạch phải dừng và báo ngay, không giấu |
| 7 | ❌ **Trong giai đoạn đối chiếu đặc tả, không sửa bất cứ thứ gì** (code, test, seeder, schema, đặc tả) |
| 8 | ✅ **Mỗi điểm lệch do NGƯỜI DÙNG quyết** (sửa code / sửa đặc tả / giữ nguyên). AI chỉ nêu điểm lệch và ý kiến tham khảo |
| 9 | ❌ **AI không tự kết luận** "code sai" hay "đặc tả sai". Chỉ nêu bằng chứng và ý kiến tham khảo |
| 10 | ❌ **AI không tự ghi đè / tự tạo file đặc tả**. Đặc tả mới chỉ được trình bày để người dùng tự quyết |

---

## 🔶 HAI MỨC ĐỤNG CHẠM

### 🔴 Mức A: SỬA (nghiêm trọng)

Là bất kỳ hành động nào **thay đổi** thứ đã thuộc về chức năng khác:

- Sửa / xoá / đổi tên code (function, class, component, endpoint) của chức năng cũ
- Sửa **bảng DB** đã có: thêm / xoá / đổi cột, đổi kiểu, đổi constraint, đổi index (migration `ALTER`)
- Đổi **API contract**: URL, method, request, response, mã lỗi của endpoint cũ
- Sửa **seeder**, **test**, **file SCSS** của chức năng cũ
- Sửa **file dùng chung**: middleware, guard, config, constants, utils, search index mapping, enum, route gốc
- Đổi cấu hình **RBAC / ma trận phân quyền** đang có

> 🛑 **Quy tắc:** Mức A **chỉ được làm sau khi người dùng cho phép riêng, rõ ràng, cho từng hạng mục**. Việc duyệt báo cáo phân tích chung **không** tự động bao gồm quyền sửa Mức A, trừ khi hạng mục đó được ghi rõ trong báo cáo và người dùng duyệt đúng hạng mục đó.

### 🟡 Mức B: PHỤ THUỘC (nhẹ)

Là hành động **chỉ dùng** thứ của chức năng cũ, **không thay đổi** nó:

- Gọi API / service / function của chức năng cũ
- Import module, type, hằng số của chức năng cũ
- Tạo khoá ngoại (FK) trỏ tới bảng cũ **mà không sửa bảng cũ**
- Đọc dữ liệu (JOIN / query) từ bảng của chức năng cũ
- Lắng nghe / phát event do chức năng cũ cung cấp

> ✅ **Quy tắc:** Mức B phải được **liệt kê đầy đủ trong báo cáo phân tích**. Khi người dùng duyệt báo cáo thì Mức B được phép thực hiện.

### 🧪 Cách phân biệt nhanh

| Câu hỏi | Nếu CÓ → |
|---------|----------|
| Sau khi làm, **file / bảng / API của chức năng cũ có bị thay đổi** nội dung không? | 🔴 Mức A |
| Chức năng cũ **có thể hỏng** nếu tôi làm sai không? | 🔴 Mức A |
| Tôi chỉ **gọi / đọc / import** mà không sửa gì của nó? | 🟡 Mức B |
| **Không biết** thuộc mức nào? | Coi là 🔴 Mức A và hỏi người dùng |

---

## 🔁 QUY TRÌNH TỔNG QUÁT

```
[TỰ ĐỘNG, KHÔNG CỔNG] Nạp: ANALYSIS → PROJECT_RULES (+ quét source) → FEATURE_LIST → spec-compliance (đọc quy tắc)
        │
        ▼
Người dùng gửi đặc tả + yêu cầu làm chức năng X   (= "đặc tả cũ", AI ghi nhận làm mốc)
        │
        ▼
┌─────────────────────────────────────┐
│ GIAI ĐOẠN 0: Nhận diện chức năng    │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│ GIAI ĐOẠN 1: Kiểm tra hiện trạng    │
│ (đọc code + chạy test/lint = mốc)   │
│ + Phân tích phụ thuộc → BÁO CÁO 1   │
└──────────────┬──────────────────────┘
               ▼
        ⏸️ CỔNG 0 (duyệt báo cáo phân tích)
               ▼
┌─────────────────────────────────────┐
│ GIAI ĐOẠN 2: Workflow 7 bước        │
│ Mỗi bước kết thúc bằng CỔNG 1-7     │
└──────────────┬──────────────────────┘
               ▼
   AI ĐỀ XUẤT đối chiếu → người dùng trả lời `ĐỒNG Ý ĐỐI CHIẾU`
               ▼
┌─────────────────────────────────────┐
│ GIAI ĐOẠN 3: Đối chiếu đặc tả       │◄──────────────┐
│ (CHỈ BÁO CÁO, KHÔNG SỬA) → BÁO CÁO 2│               │
└──────────────┬──────────────────────┘               │
               ▼                                      │
        ⏸️ CỔNG 8: người dùng quyết từng điểm         │
               │                                      │
      có điểm "SỬA CODE"?                             │
        ├── CÓ ─► GIAI ĐOẠN 4: sửa code ──────────────┘
        │         (chỉ các bước liên quan, có cổng,    (sau khi sửa xong,
        │          có hồi quy so với mốc)               chạy lại đối chiếu)
        └── KHÔNG
               ▼
┌─────────────────────────────────────┐
│ GIAI ĐOẠN 5: Soạn ĐẶC TẢ MỚI        │
│ + bảng khác biệt cũ → mới           │
└──────────────┬──────────────────────┘
               ▼
        ⏸️ CỔNG 9 (người dùng tự quyết định)
               ▼
┌─────────────────────────────────────┐
│ GIAI ĐOẠN 6: BÁO CÁO TỔNG HỢP       │
└─────────────────────────────────────┘
```

---

## 🔎 GIAI ĐOẠN 0: NHẬN DIỆN CHỨC NĂNG

AI thực hiện:

1. Đọc yêu cầu và **đặc tả** do người dùng cung cấp.
2. Đối chiếu với `FEATURE_LIST.md` để tìm **STT** và **tên** chức năng.
3. Xử lý các tình huống:

| Tình huống | Hành động |
|-----------|-----------|
| Khớp đúng 1 chức năng | Xác nhận lại với người dùng: "Đây là chức năng STT X: [tên]" |
| Khớp **nhiều** chức năng (đặc tả trộn lẫn) | Liệt kê, hỏi người dùng làm cái nào trước, hoặc đề xuất tách |
| **Không khớp** chức năng nào trong danh sách | Dừng, báo người dùng: đây là chức năng ngoài danh sách, hỏi có thêm vào danh sách không |
| Đặc tả **mâu thuẫn / thiếu** so với tên chức năng | Nêu điểm lệch, hỏi lại |

4. Ghi rõ **phạm vi** chức năng: gồm những gì, **không gồm** những gì (để tránh làm lan sang chức năng khác).

---

## 🔬 GIAI ĐOẠN 1: PHÂN TÍCH PHỤ THUỘC

### 1.1 Thu thập thông tin hiện trạng (chỉ ĐỌC và CHẠY KIỂM TRA, không sửa gì)

AI phải **đọc thực tế** (không chỉ tin vào `FEATURE_LIST.md`):

- Cấu trúc thư mục dự án, các module đã có
- DB schema / migration / seeder hiện có
- Các endpoint, service, component đã có liên quan
- Cấu hình RBAC, search index, các file dùng chung
- Cột **Trạng thái** và **Gợi ý phụ thuộc** trong `FEATURE_LIST.md`

AI phải **tự kiểm tra code và lỗi hiện có** (không cần xin phép riêng, nhưng **không sửa gì**):

- **Chạy test hiện có** và **lint hiện có** của phần liên quan (hoặc toàn dự án nếu nhanh), rồi ghi lại: số pass / fail / tổng, cảnh báo lint, các lỗi **có sẵn từ trước**.
- Kết quả này là **MỐC HỒI QUY**. Cuối quy trình AI phải so sánh lại với mốc này.
- Lỗi **có sẵn từ trước** phải được ghi vào Báo cáo 1 để không bị nhầm là lỗi do AI gây ra.
- Nếu việc chạy test/lint có nguy cơ **ghi vào DB thật, gọi dịch vụ ngoài hoặc tốn tài nguyên** → dùng môi trường test; nếu không chắc môi trường nào an toàn thì **hỏi trước**, không chạy.
- Nếu test/lint **không chạy được** (thiếu cấu hình, thiếu DB test...) → ghi rõ trong báo cáo, không tự sửa cấu hình để cho chạy được.

> Nếu **trạng thái trong `FEATURE_LIST.md` khác với code thực tế** (ví dụ ghi ✅ nhưng không thấy code, hoặc ghi ⬜ nhưng đã có code) → **báo lại người dùng**, không tự quyết, không tự sửa file.

### 1.2 Xác định các loại phụ thuộc

| Loại | Ý nghĩa | Ví dụ |
|------|---------|-------|
| **Tiền đề cứng** | Chức năng khác **phải xong trước**, nếu không không thể code hoặc test | Chức năng bình luận (14) cần bài đăng (9) |
| **Phụ thuộc mềm** | Có thể làm trước, ghép sau, hoặc dùng dữ liệu giả tạm | Trang cá nhân (5) hiển thị huy hiệu, có thể ẩn phần đó trước |
| **Thành phần dùng chung** | Auth, RBAC, search engine, audit log, điểm xanh... | Mọi chức năng cần đăng nhập đều cần 1, 2 |
| **Thành phần mới cần xây thêm** | Chưa có trong danh sách nhưng cần để chức năng chạy được | Bảng phụ, service tiện ích, queue, bảng cấu hình |
| **Chức năng cũ bị ảnh hưởng ngược** | Làm chức năng này sẽ buộc phải sửa chức năng cũ | Cần thêm cột vào bảng `posts` đã có |

### 1.3 Kết luận một trong ba trạng thái

| Trạng thái | Biểu tượng | Ý nghĩa |
|-----------|:---:|---------|
| **BỊ CHẶN** | 🔴 | Có tiền đề cứng **chưa làm**. Phải làm các chức năng đó trước. AI nêu rõ thứ tự đề xuất |
| **LÀM ĐƯỢC SAU KHI BỔ SUNG** | 🟡 | Không bị chặn bởi chức năng khác, nhưng cần **xây thêm thành phần mới** (bảng, service, config...). Phải liệt kê rõ để người dùng duyệt |
| **ĐỘC LẬP** | 🟢 | Có thể code ngay, không đụng chạm Mức A, chỉ có Mức B (nếu có) |

> Nếu để làm được mà **buộc phải sửa** chức năng cũ (Mức A) → ghi rõ trong báo cáo, **vẫn phải chờ** người dùng cho phép riêng hạng mục đó.

### 1.4 Kiểm tra tuân thủ `PROJECT_RULES.md` ngay từ phân tích

AI phải nêu chức năng này **có áp dụng** các quy tắc nào:

| Quy tắc | Có áp dụng? | Cách tuân thủ dự kiến |
|---------|:---:|----------------------|
| Soft delete (có xoá dữ liệu?) | Có / Không | Cột `deleted_at`, gỡ khỏi search index |
| Optimistic locking (có cập nhật dữ liệu?) | Có / Không | Cột `version`, trả 409 khi xung đột |
| Search engine (có tìm kiếm / lọc văn bản?) | Có / Không | Elasticsearch / OpenSearch / Meilisearch, đồng bộ index |
| SASS (có giao diện?) | Có / Không | File `.scss`, không inline style, không CSS-in-JS |
| Git | Luôn có | **Không chạy lệnh Git**, chỉ báo file đã sửa |

---

## 📝 MẪU BÁO CÁO PHÂN TÍCH (GIAI ĐOẠN 1) — BÁO CÁO 1

AI phải trả lời **đúng khung sau** (không bỏ mục nào, mục nào trống ghi "Không có"):

```markdown
# 🔬 BÁO CÁO PHÂN TÍCH CHỨC NĂNG

## 1. Nhận diện
- Chức năng: STT [X] - [Tên chức năng]
- Người phụ trách (theo FEATURE_LIST): [Tên]
- Phạm vi bao gồm: [...]
- Phạm vi KHÔNG bao gồm: [...]

## 2. Kết luận nhanh
- Trạng thái: 🔴 BỊ CHẶN / 🟡 LÀM ĐƯỢC SAU KHI BỔ SUNG / 🟢 ĐỘC LẬP
- Tóm tắt 1-2 câu: [...]

## 3. Hiện trạng đã đọc
- Module / file liên quan đã có: [...]
- Bảng DB liên quan đã có: [...]
- Chênh lệch giữa FEATURE_LIST và code thực tế: [Có/Không, chi tiết]
- Mốc test/lint hiện có (chạy trước khi làm): [pass / fail / tổng; cảnh báo lint; lỗi có sẵn từ trước; hoặc "không chạy được" + lý do]
- Đặc tả cũ đã ghi nhận: [Có, tóm tắt số yêu cầu / Không]

## 4. Phụ thuộc
### 4.1 Tiền đề cứng (phải làm trước)
| STT | Chức năng | Trạng thái hiện tại | Lý do cần |
|-----|-----------|---------------------|-----------|

### 4.2 Phụ thuộc mềm
| STT | Chức năng | Cách xử lý tạm nếu chưa có |
|-----|-----------|----------------------------|

### 4.3 Thành phần dùng chung sẽ dùng
- [...]

### 4.4 Thành phần MỚI đề xuất xây thêm
| Thành phần | Loại (bảng/service/API/config) | Lý do cần |
|------------|--------------------------------|-----------|

## 5. Đụng chạm dự kiến
### 🔴 Mức A: SỬA (cần bạn cho phép riêng từng mục)
| # | Đối tượng bị sửa | Thuộc chức năng | Sửa gì | Vì sao bắt buộc | Có cách tránh không? |
|---|------------------|-----------------|--------|-----------------|----------------------|

### 🟡 Mức B: PHỤ THUỘC (chỉ dùng, không sửa)
| # | Đối tượng được dùng | Thuộc chức năng | Dùng như thế nào |
|---|---------------------|-----------------|------------------|

## 6. Tuân thủ PROJECT_RULES
| Quy tắc | Áp dụng? | Cách tuân thủ |
|---------|:---:|---------------|

## 7. Thứ tự đề xuất
1. [...]
2. [...]

## 8. Rủi ro & câu hỏi cần bạn quyết định
- [...]

---
⏸️ **CỔNG DUYỆT 0:** Đang chờ bạn duyệt báo cáo này. Tôi CHƯA code gì.
```

---

## ⏸️ GIAI ĐOẠN 2: XÉT DUYỆT TỪNG BƯỚC TRONG WORKFLOW 7 BƯỚC

Sau khi báo cáo phân tích được duyệt, AI thực hiện **đúng 7 bước** của `PROJECT_RULES.md`. **Mỗi bước kết thúc phải dừng và chờ người dùng duyệt** trước khi sang bước kế tiếp.

### Bảng cổng duyệt

| Cổng | Sau bước | Nội dung AI phải nộp để người dùng xem | Câu duyệt hợp lệ |
|:---:|----------|----------------------------------------|------------------|
| 0 | Phân tích | Báo cáo phân tích (mẫu ở trên) | `DUYỆT PHÂN TÍCH` |
| 1 | Bước 1: Đọc hạ tầng | Tóm tắt luồng theo mẫu của `PROJECT_RULES.md` mục 2 (Feature, bước hiện tại, module, file sẽ sửa) | `DUYỆT BƯỚC 1` |
| 2 | Bước 2: Tạo DB Schema | Schema đề xuất: bảng, cột, khoá, `deleted_at`, `version`, index. Nêu rõ có `ALTER` bảng cũ không | `DUYỆT BƯỚC 2` |
| 3 | Bước 3: Tạo Seeder | Nội dung seeder, dữ liệu test, có chạm seeder cũ không | `DUYỆT BƯỚC 3` |
| 4 | Bước 4: Viết test (TDD) | Danh sách test case dựa trên đặc tả, ánh xạ test ↔ yêu cầu | `DUYỆT BƯỚC 4` |
| 5 | Bước 5: Code Backend | Danh sách file đã tạo/sửa, tóm tắt logic, đối chiếu với kế hoạch đụng chạm | `DUYỆT BƯỚC 5` |
| 6 | Bước 6: Test Backend | Kết quả test (pass/fail, số lượng), test cũ có bị ảnh hưởng không | `DUYỆT BƯỚC 6` |
| 7 | Bước 7: Code Frontend | Danh sách file UI, file `.scss`, màn hình đã làm | `DUYỆT BƯỚC 7` |
| 8 | Giai đoạn 3: Đối chiếu đặc tả | **Báo cáo 2** (mẫu của `spec-compliance-check.md`, kèm "Ý kiến tham khảo của AI" cho mỗi điểm lệch) | Quyết định từng điểm, ví dụ: `R3: SỬA CODE; R5: SỬA ĐẶC TẢ; R7: GIỮ NGUYÊN` |
| 9 | Giai đoạn 5: Đặc tả mới | Đặc tả mới + bảng khác biệt cũ → mới | `DUYỆT ĐẶC TẢ MỚI` hoặc yêu cầu chỉnh cụ thể |

### Quy tắc cổng duyệt

1. Sau mỗi bước AI phải **dừng** và in một dòng:
   ```
   ⏸️ CỔNG DUYỆT [số]: Đang chờ bạn duyệt. Tôi CHƯA sang bước tiếp theo.
   ```
2. **Chỉ coi là duyệt** khi người dùng nói rõ, ví dụ: `DUYỆT BƯỚC 2`, hoặc tương đương không mơ hồ như "ok bước 2, làm tiếp".
3. Những câu **không phải duyệt**: im lặng, "ừ", "hay đấy", "để xem", câu hỏi thêm, góp ý chưa chốt → AI **tiếp tục chờ** hoặc hỏi lại.
4. Người dùng **yêu cầu sửa** → AI sửa **trong phạm vi bước hiện tại**, nộp lại, chờ duyệt lại.
5. Duyệt bước N **không** đồng nghĩa duyệt bước N+1, và **không** đồng nghĩa cho phép Mức A mới chưa nêu trong kế hoạch.
6. **Bước 6 test FAILED** → quay lại bước 5 (như `PROJECT_RULES.md`). Vòng lặp sửa lỗi này vẫn phải **báo người dùng** kết quả mỗi lần, và chỉ qua cổng 6 khi test **100% OK** và người dùng duyệt.
7. **Không code Frontend** (bước 7) trước khi cổng 6 được duyệt.
8. **Cổng 8 và 9** có quy tắc riêng, xem Giai đoạn 3 và 5.
9. Trong **Giai đoạn 4** (sửa code sau đối chiếu), câu duyệt có thêm hậu tố `(SỬA)`, ví dụ `DUYỆT BƯỚC 5 (SỬA)`, để không nhầm với lần làm mới.

---

## 🚨 KHI PHÁT SINH ĐỤNG CHẠM NGOÀI KẾ HOẠCH

Trong lúc làm, nếu AI phát hiện **cần sửa thêm** thứ không có trong báo cáo đã duyệt (dù nhỏ):

1. ⛔ **DỪNG NGAY**, không sửa.
2. Báo người dùng theo mẫu:

```markdown
## 🚨 PHÁT SINH ĐỤNG CHẠM NGOÀI KẾ HOẠCH

- Đang ở: Bước [N] của chức năng STT [X]
- Phát hiện: [mô tả]
- Đối tượng cần sửa: [file / bảng / API]
- Thuộc chức năng: STT [Y] - [tên]
- Mức: 🔴 A / 🟡 B
- Lý do bắt buộc: [...]
- Phương án thay thế (nếu có): [...]
- Hệ quả nếu không sửa: [...]

⏸️ Đang chờ bạn quyết định. Tôi CHƯA sửa.
```

3. Chỉ tiếp tục khi người dùng cho phép rõ ràng.

---

## 🛡️ QUY TẮC BẢO VỆ CHỨC NĂNG ĐÃ LÀM

- ❌ Không **refactor**, không "tiện tay" dọn dẹp, đổi tên, format lại code của chức năng khác.
- ❌ Không sửa **test cũ** cho pass. Nếu test cũ fail vì thay đổi của mình → dừng và báo.
- ❌ Không đổi **dữ liệu seeder cũ**.
- ❌ Không `ALTER` bảng cũ khi chưa được phép Mức A.
- ✅ Muốn thêm dữ liệu cho bảng cũ: ưu tiên **tạo bảng mới** liên kết bằng FK (Mức B) thay vì sửa bảng cũ (Mức A), và nêu phương án này trong báo cáo.
- ✅ Thành phần dùng chung: ưu tiên **mở rộng bằng cách thêm mới** (file mới, hàm mới) thay vì sửa hàm cũ.
- ✅ Trước khi chạy test, ghi nhận test của chức năng cũ đang **pass** để so sánh sau khi làm xong (hồi quy).

---

## 🔍 GIAI ĐOẠN 3: ĐỐI CHIẾU ĐẶC TẢ (SPEC COMPLIANCE) — CHỈ BÁO CÁO

### 3.1 Điều kiện bắt đầu
- Chỉ bắt đầu **sau khi Cổng 7 đã được duyệt**.
- AI **không tự chạy**. AI **đề xuất** bằng mẫu sau và chờ:

```markdown
## 🔍 ĐỀ XUẤT ĐỐI CHIẾU ĐẶC TẢ
- Chức năng: STT [X] - [Tên]
- Đặc tả dùng để đối chiếu: đặc tả cũ (bản bạn gửi lúc bắt đầu)
- Chế độ: chỉ báo cáo, KHÔNG sửa bất cứ thứ gì

⏸️ Đang chờ bạn. Trả lời `ĐỒNG Ý ĐỐI CHIẾU` để tôi bắt đầu.
```

- Câu trả lời không phải `ĐỒNG Ý ĐỐI CHIẾU` hoặc tương đương không mơ hồ → tiếp tục chờ hoặc hỏi lại.

### 3.2 Hai chế độ làm việc, không được lẫn lộn

| | Giai đoạn 1 (Phân tích) | Giai đoạn 3 (Đối chiếu) |
|---|---|---|
| Mục tiêu | Xem chức năng dính chức năng nào, làm trước/sau | Xem code khớp đặc tả đến đâu |
| Phân tích phụ thuộc | **Có** (là việc chính) | **Không** làm lại. Chỉ đọc phần phụ thuộc đủ để xác minh (theo `spec-compliance-check.md`) |
| Được sửa gì không | Không | **Không** |
| Báo cáo | Báo cáo 1 | Báo cáo 2 |

### 3.3 Cách thực hiện
1. Làm đúng theo `spec-compliance-check.md` (trích R1, R2..., đối chiếu từng yêu cầu, dẫn chứng file:dòng, trích nguyên văn đặc tả).
2. Đặc tả dùng là **đặc tả cũ**. Không hỏi lại bản đặc tả trừ khi mất ngữ cảnh.
3. Nếu đặc tả mơ hồ → làm đúng mục "Quy tắc hỏi lại" của `spec-compliance-check.md` (đánh ❓, gom câu hỏi, chờ trả lời) **trước** khi kết luận.
4. **Cấm** sửa code, test, seeder, schema, SCSS, config, kể cả "sửa nhỏ cho tiện". Được **chạy** test/lint (chỉ đọc kết quả) để lấy bằng chứng.
5. Phạm vi: chỉ đúng chức năng STT đang làm. Ngoài phạm vi → tối đa 1-2 dòng ở mục "Ghi chú ngoài phạm vi".

### 3.4 Bổ sung cho Báo cáo 2 (trong luồng tích hợp)
Với **mỗi điểm** ⚠️ Lệch / ❌ Thiếu / ➕ Thừa ở mục 4 của mẫu, thêm 2 dòng:

- **Ý kiến tham khảo của AI**: nghiêng về `sửa code` / `sửa đặc tả` / `chưa đủ cơ sở`, kèm lý do ngắn (logic nghiệp vụ, tính nhất quán, dữ liệu, `FEATURE_LIST`...). Đây chỉ là **tham khảo, không ràng buộc**.
- **Quyết định của bạn**: ☐ SỬA CODE  ☐ SỬA ĐẶC TẢ  ☐ GIỮ NGUYÊN  (**để trống**, AI **không được tự điền**)

Nếu thấy đặc tả cũ **chưa hợp lý hoặc mâu thuẫn logic**, AI nêu rõ ở mục 6 của mẫu ("Điểm đặc tả chưa rõ, cần tôi xác nhận") kèm lý do. Chỉ là ý kiến, không kết luận "đặc tả sai".

### 3.5 ⏸️ CỔNG 8: Người dùng quyết định từng điểm
- AI in: `⏸️ CỔNG DUYỆT 8: Đang chờ bạn quyết định từng điểm lệch. Tôi CHƯA sửa gì.`
- Chỉ coi là hợp lệ khi người dùng nêu quyết định **cho từng điểm**. Điểm chưa được quyết, hoặc câu hỏi ❓ chưa được trả lời → AI tiếp tục chờ.
- Ý nghĩa mỗi lựa chọn:

| Quyết định | Hệ quả |
|-----------|--------|
| `SỬA CODE` | Điểm đó đi vào Giai đoạn 4. Đặc tả giữ nguyên |
| `SỬA ĐẶC TẢ` | Không đụng code. Điểm đó được ghi vào Đặc tả mới (Giai đoạn 5) |
| `GIỮ NGUYÊN` | Không đụng code, không đổi đặc tả. Ghi vào Báo cáo tổng hợp là "chấp nhận lệch" |

- Nếu **không có** điểm `SỬA CODE` → bỏ qua Giai đoạn 4, sang Giai đoạn 5.
- **Vòng lặp:** sau mỗi lần Giai đoạn 4 xong, AI **chạy lại đối chiếu** (cập nhật Báo cáo 2, không làm lại từ đầu, đánh dấu điểm nào đã đổi trạng thái) rồi quay lại Cổng 8. Lặp đến khi không còn điểm `SỬA CODE` nào chưa khớp.

---

## 🔧 GIAI ĐOẠN 4: SỬA CODE THEO QUYẾT ĐỊNH (CHỈ CÁC BƯỚC LIÊN QUAN)

Chỉ làm các điểm người dùng đã chọn `SỬA CODE` ở Cổng 8. Không làm điểm nào khác.

### 4.1 Kế hoạch sửa (nộp trước khi sửa)
```markdown
## 🔧 KẾ HOẠCH SỬA THEO ĐỐI CHIẾU
- Các điểm sẽ sửa: [R#, ...]
- Các bước liên quan: [chọn trong 2-7, kèm lý do bỏ qua bước còn lại]
- File sẽ sửa / tạo: [...]
- Đụng chạm: 🔴 Mức A [liệt kê từng hạng mục] / 🟡 Mức B [...]
- Test của chính chức năng này cần chỉnh: [Không / liệt kê test + lý do]

⏸️ Đang chờ bạn. Trả lời `DUYỆT KẾ HOẠCH SỬA`. Tôi CHƯA sửa.
```
Mức A chỉ được làm khi hạng mục đó **được ghi rõ ở đây và người dùng duyệt**.

### 4.2 Các bước liên quan

| Bước | Khi nào phải làm |
|------|------------------|
| 2 DB Schema | **Chỉ khi** điểm sửa buộc đổi bảng, cột, constraint, index |
| 3 Seeder | **Chỉ khi** điểm sửa buộc đổi dữ liệu seeder |
| 4 Viết test | Thêm / chỉnh test cho đúng điểm sửa (TDD) |
| 5 Code Backend | Sửa logic cho đúng điểm sửa |
| 6 Test Backend | Chạy test, **so hồi quy với mốc ở Giai đoạn 1**. Chỉ qua khi 100% OK |
| 7 Code Frontend | **Chỉ khi** điểm sửa thuộc giao diện, và chỉ sau khi Cổng 6 duyệt |

- **Mỗi bước vẫn có cổng duyệt** như Giai đoạn 2, câu duyệt kèm hậu tố `(SỬA)`.
- Bước nào bị bỏ qua phải được nêu và được duyệt trong kế hoạch sửa.
- Mọi quy tắc của `PROJECT_RULES.md` (soft delete, optimistic locking, search engine, SASS, không Git) vẫn áp dụng.

### 4.3 Quy tắc về test trong giai đoạn sửa
- ✅ Được **thêm** test mới.
- ✅ Test của **chính chức năng này** chỉ được **chỉnh** khi test đó đang mã hoá đúng hành vi mà người dùng đã quyết định sửa, và phải được **liệt kê trong kế hoạch sửa** đã duyệt.
- ❌ Test của **chức năng khác** → Mức A, cần phép riêng.
- ❌ Không bao giờ sửa test chỉ để cho "xanh".

### 4.4 Khi phát sinh ngoài kế hoạch
Áp dụng mục "KHI PHÁT SINH ĐỤNG CHẠM NGOÀI KẾ HOẠCH" như cũ: dừng, báo, chờ.

---

## 📝 GIAI ĐOẠN 5: SOẠN ĐẶC TẢ MỚI

### 5.1 Điều kiện
Cổng 8 lần cuối đã xong và **không còn điểm `SỬA CODE` nào chưa khớp**.

### 5.2 Nguyên tắc soạn
1. Đặc tả mới **chỉ** chứa các thay đổi đến từ **quyết định của người dùng ở Cổng 8**:
   - `SỬA ĐẶC TẢ` → sửa đặc tả theo quyết định đó.
   - `SỬA CODE` → đặc tả cũ **giữ nguyên** (vì code đã được sửa cho khớp).
   - `GIỮ NGUYÊN` → đặc tả cũ **giữ nguyên**.
2. **Không** tự thêm, bớt hay diễn đạt lại phần nào mà người dùng không quyết định.
3. Chỗ nào không đủ cơ sở để viết lại (ví dụ người dùng chọn `SỬA ĐẶC TẢ` nhưng chưa nói viết thế nào) → **hỏi**, không đoán.
4. Những chỗ đặc tả **thiếu hẳn** thông tin (validation, phân quyền...) AI chỉ **đề xuất** trong phần riêng, đánh dấu `[ĐỀ XUẤT - CHỜ BẠN QUYẾT]`, **không đưa vào bản chính** khi chưa được duyệt.
5. **Không tạo file, không ghi đè** đặc tả gốc. Chỉ trình bày trong chat.

### 5.3 Nội dung phải nộp
```markdown
# 📝 ĐẶC TẢ MỚI — STT [X] - [Tên]

## A. Đặc tả mới (để bạn copy)
[Toàn bộ đặc tả trong MỘT khối markdown. Mỗi chỗ thay đổi gắn nhãn [ĐỔI] / [THÊM] / [BỎ]]

## B. Bảng khác biệt: Đặc tả cũ → Đặc tả mới
| # | Mã R | Đặc tả cũ ghi | Đặc tả mới ghi | Lý do | Nguồn quyết định (Cổng 8) |
|---|------|---------------|----------------|-------|---------------------------|

## C. Điểm đề xuất bổ sung (chưa đưa vào bản A)
| # | Nội dung đề xuất | Lý do |
|---|------------------|-------|
> Nếu không có: ghi "Không có."

## D. Điểm giữ nguyên dù code lệch (người dùng chọn GIỮ NGUYÊN)
| Mã R | Nội dung | Ghi chú |
|------|----------|---------|
> Nếu không có: ghi "Không có."

---
⏸️ **CỔNG DUYỆT 9:** Đã báo bạn. Bạn tự quyết định dùng bản này ra sao. Tôi KHÔNG tự cập nhật tài liệu nào.
```

### 5.4 ⏸️ CỔNG 9
- Người dùng tự quyết: dùng nguyên, yêu cầu chỉnh, hoặc không dùng.
- Người dùng yêu cầu chỉnh → AI sửa trong phạm vi Giai đoạn 5 rồi nộp lại.
- Chỉ sang Giai đoạn 6 khi người dùng nói `DUYỆT ĐẶC TẢ MỚI` (hoặc tương đương không mơ hồ).

---

## 🏁 GIAI ĐOẠN 6: BÁO CÁO TỔNG HỢP

Khi hoàn thành (hoặc dừng giữa chừng), AI **phải** nộp báo cáo sau. Không được bỏ mục nào; mục trống ghi "Không có". Báo cáo này **tóm tắt và dẫn chiếu** Báo cáo 1 và Báo cáo 2, **không** thay thế hai báo cáo đó.

```markdown
# ✅ BÁO CÁO TỔNG HỢP CHỨC NĂNG

## 1. Thông tin
- Chức năng: STT [X] - [Tên]
- Đặc tả cũ: [đã ghi nhận lúc bắt đầu]
- Các bước đã hoàn thành (lần làm mới): [1..7]
- Số vòng đối chiếu - sửa: [N]
- Giai đoạn hiện tại / lý do dừng (nếu dừng giữa chừng): [...]

## 2. Kết quả test & lint
| Thời điểm | Test (pass/fail/tổng) | Lint | Ghi chú |
|-----------|-----------------------|------|---------|
| Mốc ban đầu (Giai đoạn 1) | | | Lỗi có sẵn từ trước: [...] |
| Sau khi làm mới (Bước 6) | | | |
| Sau lần sửa cuối (nếu có) | | | |
- Hồi quy chức năng cũ so với mốc: [pass / fail, chi tiết]

## 3. File đã TẠO MỚI
| File | Mục đích | Giai đoạn (làm mới / sửa sau đối chiếu) |
|------|----------|------------------------------------------|

## 4. File đã SỬA
| File | Thuộc chức năng | Sửa gì | Có trong kế hoạch được duyệt? | Giai đoạn |
|------|-----------------|--------|:---:|-----------|

## 5. 🔍 ĐỤNG CHẠM CHỨC NĂNG CŨ

### 🔴 Mức A: Đã SỬA chức năng cũ
| # | Chức năng cũ (STT) | Đối tượng | Dòng / phần cụ thể | Nội dung đã sửa | Ngày/bước được cho phép |
|---|--------------------|-----------|--------------------|-----------------|--------------------------|
> Nếu không có: ghi "✅ Không sửa bất kỳ chức năng cũ nào."

### 🟡 Mức B: Đã PHỤ THUỘC chức năng cũ
| # | Chức năng cũ (STT) | Đối tượng được dùng | Dùng như thế nào |
|---|--------------------|---------------------|------------------|
> Nếu không có: ghi "✅ Không phụ thuộc chức năng cũ nào."

### ⚠️ Đụng chạm phát sinh ngoài kế hoạch (nếu có)
- [...] (đã được bạn cho phép lúc nào)

## 6. Thành phần mới đã xây thêm
| Thành phần | Loại | Chức năng khác có thể dùng lại không? |
|------------|------|----------------------------------------|

## 7. Kết quả đối chiếu đặc tả (tóm tắt Báo cáo 2)
| Lần đối chiếu | ✅ Khớp | ⚠️ Lệch | ❌ Thiếu | ➕ Thừa | ❓ Chưa rõ |
|---------------|:---:|:---:|:---:|:---:|:---:|
| Lần 1 | | | | | |
| Lần cuối | | | | | |

| Mã R | Điểm lệch | Quyết định của bạn | Kết quả |
|------|-----------|--------------------|---------|
> Ví dụ cột "Kết quả": đã sửa code / đã đưa vào đặc tả mới / chấp nhận lệch.

## 8. Thay đổi đặc tả (tóm tắt Giai đoạn 5)
- Số điểm đổi / thêm / bỏ: [...]
- Bảng khác biệt: [dẫn chiếu Giai đoạn 5, mục B]
- Điểm đề xuất bổ sung còn chờ bạn quyết: [...]
- Trạng thái Cổng 9: [đã duyệt / chưa duyệt]

## 9. Tuân thủ PROJECT_RULES
- [ ] Không chạy lệnh Git
- [ ] CSS chỉ dùng `.scss`
- [ ] Soft delete (nếu có xoá)
- [ ] Optimistic locking, trả 409 (nếu có cập nhật)
- [ ] Search engine, đồng bộ index (nếu có tìm kiếm)

## 10. Đề xuất cập nhật FEATURE_LIST.md
- STT [X]: ⬜ → ✅ (chờ bạn tự cập nhật)
- Ảnh hưởng đến chức năng khác: [...]

## 11. Việc còn tồn đọng / lưu ý
- [...]

## 12. Danh sách file để bạn tự commit Git
- [...]
```

---

## 🔋 KẾT HỢP VỚI QUY TẮC TOKEN

Khi token còn ≤ 5% (theo `PROJECT_RULES.md` mục 3), ngoài báo cáo tiến độ thông thường AI phải ghi thêm:

- Đang ở **cổng duyệt / bước** nào của chức năng STT nào
- Những **đụng chạm** (Mức A / B) đã thực hiện cho đến lúc dừng
- Phần **đang làm dở** có chạm vào chức năng cũ không (file, dòng)
- Đang ở **giai đoạn nào** (1-6) và, nếu đang ở Giai đoạn 3-5, **vòng đối chiếu** thứ mấy, **các điểm R# đã được bạn quyết** và điểm nào còn chờ

---

## ✅ CHECKLIST CỦA AI TRƯỚC KHI TRẢ LỜI BẤT KỲ YÊU CẦU CHỨC NĂNG NÀO

- [ ] Đã nạp đủ 4 file theo thứ tự (ANALYSIS → PROJECT_RULES → FEATURE_LIST → spec-compliance) và đã in thông báo nạp
- [ ] Đã quét source (hoặc nói rõ phần chưa đọc được)
- [ ] Đã ghi nhận **đặc tả cũ** của người dùng
- [ ] Đã xác định yêu cầu thuộc **chức năng STT nào**
- [ ] Đã **đọc hiện trạng thực tế** (không chỉ tin FEATURE_LIST) và **chạy test/lint hiện có để ghi mốc**
- [ ] Đã phân loại phụ thuộc: tiền đề cứng / mềm / dùng chung / thành phần mới
- [ ] Đã phân loại đụng chạm: 🔴 Mức A / 🟡 Mức B
- [ ] Đã kết luận: 🔴 BỊ CHẶN / 🟡 LÀM ĐƯỢC SAU KHI BỔ SUNG / 🟢 ĐỘC LẬP
- [ ] Đã nộp **Báo cáo 1** và **đang chờ duyệt**
- [ ] **Chưa viết** bất kỳ dòng code nào khi chưa có `DUYỆT PHÂN TÍCH`
- [ ] Chỉ **đề xuất** đối chiếu sau Cổng 7, và chỉ chạy khi có `ĐỒNG Ý ĐỐI CHIẾU`
- [ ] Trong đối chiếu: **không sửa gì**, **không tự điền quyết định** của người dùng
- [ ] Đặc tả mới chỉ chứa thay đổi từ quyết định của người dùng, chưa tạo file hay ghi đè

---

## ⛔ DANH SÁCH ĐIỀU CẤM TỔNG HỢP

1. Code khi chưa có `DUYỆT PHÂN TÍCH` và duyệt của bước tương ứng
2. Tự sang bước kế tiếp khi chưa được duyệt bước hiện tại
3. Sửa chức năng cũ (Mức A) khi chưa được phép riêng
4. Giấu hoặc bỏ sót đụng chạm trong báo cáo
5. Tự sửa `FEATURE_LIST.md` (chỉ được **đề xuất**)
6. Tự sửa test / seeder cũ để cho "xanh"
7. Chạy bất kỳ lệnh Git nào (theo `PROJECT_RULES.md`)
8. Đoán khi đặc tả mơ hồ: **phải hỏi lại**
9. Làm lan sang chức năng khác ngoài phạm vi đã duyệt
10. Tự chạy đối chiếu đặc tả khi chưa có `ĐỒNG Ý ĐỐI CHIẾU`
11. Sửa bất cứ thứ gì trong Giai đoạn 3 (đối chiếu)
12. Tự điền quyết định thay người dùng ở Cổng 8, hoặc tự kết luận "code sai" / "đặc tả sai"
13. Tự cập nhật, ghi đè hoặc tạo file đặc tả. Chỉ trình bày để người dùng tự quyết
14. Tự sửa lỗi chính tả / lỗi nhỏ trong các file rule. Chỉ **đề xuất** và chờ người dùng
15. Sửa cấu hình để ép test/lint chạy được. Chỉ báo "không chạy được" và lý do

---

**Version:** 2.0
**Liên kết:** `FEATURE_ANALYSIS_RULES.md` (điều hướng) → `PROJECT_RULES.md` → `FEATURE_LIST.md` → `spec-compliance-check.md`
**Status:** ✅ Hiệu lực
