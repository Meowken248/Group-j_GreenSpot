# 📋 QUY TẮC DỰ ÁN - HƯỚNG DẪN HOÀN CHỈNH

> **⚠️ QUAN TRỌNG:** AI PHẢI đọc toàn bộ file này TRƯỚC KHI viết, sửa hoặc xóa bất kỳ dòng code nào.
> Nếu yêu cầu mâu thuẫn với quy tắc này, phải báo lại và hỏi, không được tự ý bỏ qua.

---

## 🔄 WORKFLOW QUY TRÌ PHÁT TRIỂN

```
┌─────────────────────────────────────┐
│ 1. Đọc toàn bộ cấu trúc hạ tầng    │
│    dự án                            │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│ 2. Tạo Database schema              │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│ 3. Tạo Seeder (dữ liệu test)        │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│ 4. Viết test dựa trên đặc tả (TDD)  │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│ 5. Code Backend                     │
└──────────────┬──────────────────────┘
               │
        ◄──────┴──────────────┐
        │                     │
        │  ┌─────────────────▼──────────┐
        │  │ 6. Chạy test Backend       │
        │  └────────────┬───────────────┘
        │               │
        │        ┌──────▼──────┐
        │        │ Test OK?    │
        │        └──────┬──────┘
        │               │
        │          YES  │  NO
        │               │
        └───────────────┘
               │
┌──────────────▼──────────────────────┐
│ 7. Code Frontend                    │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│ ✓ Hoàn thành                        │
└─────────────────────────────────────┘
```

### 📍 Giải thích từng bước:

| Bước | Tên | Mô tả | Người phụ trách |
|------|-----|-------|-----------------|
| 1 | **Đọc hạ tầng** | Hiểu toàn bộ cấu trúc dự án, module, dependencies, luồng dữ liệu | Tất cả |
| 2 | **Tạo DB Schema** | Thiết kế bảng, các trường, khóa chính, khóa ngoại, constraints | Backend + DB |
| 3 | **Tạo Seeder** | Viết migration/seeder để tạo dữ liệu test | Backend + QA |
| 4 | **Viết test (TDD)** | Viết unit test dựa trên đặc tả trước khi code logic | Backend |
| 5 | **Code Backend** | Viết API, endpoints, business logic | Backend |
| 6 | **Test Backend** | Chạy unit test, integration test | Backend + QA Pro |
| 7 | **Code Frontend** | Viết UI, logic client (chỉ sau khi backend test OK) | Frontend |
| ✓ | **Hoàn thành** | Merge, code review, deploy | Team |

### ⚠️ Quy tắc quan trọng:
- ✅ **Bước 6 test FAILED** → Quay lại **Bước 5** (sửa code Backend)
- ✅ **Bước 6 test OK** → Tiến tới **Bước 7** (Code Frontend)
- ❌ **KHÔNG được** skip bất kỳ bước nào
- ❌ **KHÔNG được** code Frontend trước khi Backend test 100% OK

---

## 🔐 PHẦN A: QUY TẮC LÀM VIỆC

### 1️⃣ Không được đụng đến Git

**Lệnh BẢN BIỂU giới hạn:**
```bash
# ❌ KHÔNG ĐƯỢC chạy:
git add .
git commit -m "..."
git push
git pull
git checkout
git reset
git stash
git merge
git rebase
git branch -D ...
git cherry-pick
git tag
git remote ...
```

**Cập nhật .git/ hoặc .gitignore:**
- ❌ KHÔNG được sửa hoặc xóa các file trong thư mục `.git/`
- ❌ KHÔNG được sửa file `.gitignore`
- ✅ Việc quản lý Git do **con người làm thủ công**

**Thay vào đó, hãy:**
1. Sửa code trong thư mục làm việc
2. Báo lại cho người dùng những file đã sửa
3. Người dùng tự chạy `git add`, `git commit`, `git push`

---

### 2️⃣ Phải nắm toàn bộ luồng xử lý trước khi code

**Trước khi sửa bất kỳ dòng code nào:**

1. **Đọc cấu trúc thư mục**
   - Tìm hiểu layout: `src/`, `components/`, `services/`, `controllers/`, `models/`, etc.
   - Xác định file sẽ sửa nằm ở đâu

2. **Hiểu luồng dữ liệu**
   - Trường hợp UI → API → Service → Database
   - Hoặc: Database → Service → API → Frontend
   - Có dependencies nào với phần khác không?

3. **Xác định tính năng & bước hiện tại**
   - Đang làm feature nào?
   - Đang ở bước nào (từ 1-7)?
   - Ảnh hưởng đến module/file nào?

4. **Tóm tắt cho người dùng**
   ```
   Tôi hiểu luồng như sau:
   - Feature: [tên tính năng]
   - Bước hiện tại: [bước nào]
   - Module đang làm: [tên module]
   - File sẽ sửa: [danh sách file]
   
   Bắt đầu code...
   ```

---

### 3️⃣ Quản lý token / ngữ cảnh

**Khi token còn lại ≤ 5%:**
- ⚠️ PHẢI DỪNG ngay lập tức
- 📝 Báo cáo:
  - ✅ Những việc đã hoàn thành
  - 🔧 Những việc **đang làm dở** (file nào? dòng nào? dừng ở đâu?)
  - 📌 Những việc **còn lại** và bước tiếp theo

**Format báo cáo:**
```markdown
## 📊 Báo cáo tiến độ

### ✅ Đã hoàn thành
- [ ] File A: Sửa function X
- [ ] File B: Thêm component Y

### 🔧 Đang làm dở
- File C (controller.ts): Sửa endpoint `/api/users`
  - Dừng ở: Chưa viết business logic cho validation
  - Dòng code: 45-60
  
### 📌 Còn lại
- [ ] Viết test cho endpoint trên
- [ ] Sửa file D
- Bước tiếp theo: Chạy test
```

---

## 🛠️ PHẦN B: QUY TẮC KỸ THUẬT

### 4️⃣ CSS: Chỉ dùng SASS (`.scss`)

**✅ ĐƯỢC:**
```scss
// ✅ Sử dụng variables
$primary-color: #007bff;
$spacing-unit: 8px;

// ✅ Sử dụng mixins
@mixin flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

// ✅ Sử dụng nesting
.button {
  background-color: $primary-color;
  padding: $spacing-unit;
  
  &:hover {
    opacity: 0.8;
  }
  
  &.primary {
    color: white;
  }
}

// ✅ Tái sử dụng
.container {
  @include flex-center;
}
```

**❌ KHÔNG ĐƯỢC:**
```css
/* ❌ Viết file .css thuần */
.button { color: blue; }

/* ❌ Inline style */
<div style="color: red; padding: 10px;"></div>

/* ❌ CSS-in-JS */
const styles = { color: 'red' };
```

---

### 5️⃣ Tìm kiếm: Phải dùng search engine

**❌ KHÔNG ĐƯỢC dùng:**
```sql
-- ❌ Lọc thủ công bằng LIKE
SELECT * FROM users WHERE name LIKE '%john%';

-- ❌ Lọc trên mảng trong code
const results = users.filter(u => u.name.includes('john'));
```

**✅ PHẢI DÙNG:**
```sql
-- ✅ Elasticsearch, OpenSearch, Meilisearch
GET /users/_search
{
  "query": {
    "match": { "name": "john" }
  }
}
```

**Yêu cầu:**
1. Chọn search engine: **Elasticsearch** / **OpenSearch** / **Meilisearch**
2. **Đồng bộ dữ liệu** giữa DB và search index
3. Khi thêm/sửa/xóa record → cập nhật search index

---

### 6️⃣ Xóa: Phải là soft delete

**❌ KHÔNG ĐƯỢC:**
```sql
-- ❌ Xóa thật (hard delete)
DELETE FROM users WHERE id = 123;
```

**✅ PHẢI DÙNG:**
```sql
-- ✅ Soft delete: đánh dấu deleted_at
UPDATE users SET deleted_at = NOW() WHERE id = 123;

-- ✅ Mọi truy vấn mặc định loại bỏ bản ghi đã xóa
SELECT * FROM users WHERE deleted_at IS NULL;
```

**Yêu cầu:**
1. Thêm cột `deleted_at` (hoặc `is_deleted`) vào các bảng
2. Mọi query mặc định phải filter: `WHERE deleted_at IS NULL`
3. Bản ghi soft delete cũng phải bị **gỡ khỏi search index**

**Ví dụ code:**
```typescript
// ✅ Service: soft delete
async deleteUser(userId: string) {
  await db.update(users)
    .set({ deletedAt: new Date() })
    .where({ id: userId });
    
  // Gỡ khỏi search index
  await searchEngine.delete('users', userId);
}

// ✅ Query: mặc định loại bỏ xóa mềm
async getUsers() {
  return db.select()
    .from(users)
    .where({ deletedAt: null });
}
```

---

### 7️⃣ Cập nhật: Phải dùng optimistic locking

**❌ KHÔNG ĐƯỢC:**
```sql
-- ❌ Cập nhật đơn giản (có race condition)
UPDATE users SET name = 'John' WHERE id = 123;
```

**✅ PHẢI DÙNG:**
```sql
-- ✅ Optimistic locking: kiểm tra version trước update
UPDATE users 
SET name = 'John', version = version + 1 
WHERE id = 123 AND version = 5;

-- Nếu không có row nào affected → conflict (HTTP 409)
```

**Quy trình:**
1. **Mỗi bảng có cột `version`** (hoặc `updated_at`)
2. **Client gửi kèm version hiện tại** khi cập nhật:
   ```json
   {
     "id": 123,
     "name": "John",
     "version": 5
   }
   ```
3. **Server kiểm tra version:**
   - ✅ Nếu version khớp → cập nhật + tăng version
   - ❌ Nếu version khác → trả error **HTTP 409 Conflict**
4. **Client phải tải lại dữ liệu** khi có conflict

**Ví dụ code:**
```typescript
// ✅ Controller
async updateUser(id: string, body: UpdateUserDto, currentVersion: number) {
  const result = await db.update(users)
    .set({ ...body, version: currentVersion + 1 })
    .where({ id, version: currentVersion });
  
  // Nếu 0 rows affected → conflict
  if (result.affectedRows === 0) {
    throw new ConflictException('Data has been modified, please reload');
  }
  
  return { success: true, newVersion: currentVersion + 1 };
}

// ✅ Frontend: gửi kèm version
async function updateUser(id, newName, currentVersion) {
  const response = await fetch(`/api/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      name: newName,
      version: currentVersion
    })
  });
  
  if (response.status === 409) {
    // Conflict → reload dữ liệu
    alert('Data changed by someone else. Reloading...');
    location.reload();
  }
}
```

---

## 📝 CHECKLIST TRƯỚC KHI CODE

Trước khi bắt đầu viết code, kiểm tra:

- [ ] Đã đọc toàn bộ file PROJECT_RULES.md này
- [ ] Đã xác định đang ở **bước nào** (1-7) trong workflow
- [ ] Đã hiểu **luồng dữ liệu** từ UI đến DB (hoặc ngược lại)
- [ ] Đã danh sách rõ **các file cần sửa**
- [ ] **KHÔNG chạy** bất kỳ lệnh git nào (`git add`, `git commit`, etc.)
- [ ] CSS sẽ dùng **SASS (`.scss`)**
- [ ] Database: sẽ dùng **soft delete** (nếu có xóa)
- [ ] API update: sẽ dùng **optimistic locking** (nếu có cập nhật)
- [ ] Search: sẽ dùng **search engine** (nếu có tìm kiếm)

---

## 🚀 HƯỚNG DẪN GIT THỦ CÔNG

### Sau khi AI hoàn thành code, bạn thực hiện:

#### 1️⃣ Kiểm tra thay đổi
```bash
# Xem các file đã sửa
git status

# Xem chi tiết thay đổi
git diff
```

#### 2️⃣ Stage các file
```bash
# Stage tất cả file đã sửa
git add .

# Hoặc stage file cụ thể
git add src/components/Button.tsx
git add src/services/userService.ts
```

#### 3️⃣ Commit
```bash
# Commit với message rõ ràng
git commit -m "feat: Thêm tính năng user authentication

- Tạo database schema cho users
- Viết unit test
- Implement login endpoint
- Thêm middleware authentication"
```

**Format commit message:**
```
<type>: <subject>

<body>

<footer>
```

**Types:**
- `feat:` Tính năng mới
- `fix:` Sửa lỗi
- `refactor:` Sửa lại code
- `docs:` Sửa documentation
- `test:` Thêm test
- `chore:` Thay đổi cấu hình, dependencies

#### 4️⃣ Push lên branch
```bash
# Push lên branch hiện tại
git push origin <branch-name>

# Hoặc push lên origin nếu branch đã track
git push
```

#### 5️⃣ Tạo Pull Request (PR)
1. Vào GitHub / GitLab / Gitea
2. Click **"New Pull Request"** / **"Merge Request"**
3. Điền mô tả:
   ```markdown
   ## 📝 Mô tả
   Tính năng gì đã hoàn thành?
   
   ## 🔗 Liên kết task
   Closes #123
   
   ## 📋 Checklist
   - [x] Code hoàn thành
   - [x] Test passed
   - [x] Không có lỗi lint
   
   ## 🧪 Cách test
   1. Bước 1...
   2. Bước 2...
   ```
4. Chờ **code review** từ team
5. Fix feedback (nếu có)
6. **Merge** khi approved

#### 6️⃣ Cleanup (tùy chọn)
```bash
# Xóa branch local sau khi merge
git branch -d <branch-name>

# Lấy cập nhật từ remote
git pull origin main
```

---

## 📞 LIÊN HỆ & HỖ TRỢ

Nếu có bất kỳ câu hỏi về:
- **Quy tắc code**: Xem phần B
- **Workflow**: Xem phần Workflow ở trên
- **Git commands**: Xem phần "Hướng dẫn Git thủ công"

---

**Cập nhật lần cuối:** $(date)
**Version:** 1.0
**Status:** ✅ Hiệu lực
