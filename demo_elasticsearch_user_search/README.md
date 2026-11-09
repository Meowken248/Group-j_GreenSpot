# DEMO TÌM KIẾM USER VỚI ELASTICSEARCH

> **Đề bài:** Từ câu SQL LIKE đến Elasticsearch — hướng dẫn từng bước cho sinh viên  
> **Mục tiêu:**  
> - **Phần 1 (SQL LIKE):** Gõ `"Messi"` có kết quả, gõ `"Mesi"` không có kết quả.  
> - **Phần 2 (Elasticsearch):** Gõ `"Mesi"` vẫn tìm ra `"Lionel Messi"` nhờ Fuzzy Matching (`fuzziness: AUTO`).

---

## 1. Cấu trúc thư mục

```
demo_elasticsearch_user_search/
├── setup_db_and_sync.php   # Script tự động tạo bảng users & sync dữ liệu sang Elasticsearch
├── users.db                # SQLite database (chứa Lionel Messi, Ronaldo, Mbappe,...)
├── user_list.php           # Trang chính (Hỗ trợ so sánh trực quan cả 2 chế độ cùng lúc)
├── user_list_sql.php       # Trang Phần 1 chuẩn: Chỉ dùng SQL LIKE
├── user_list_es.php        # Trang Phần 2 chuẩn: Dùng Elasticsearch fuzzy query
├── index.php               # Điểm vào mặc định
└── run_demo.bat            # Script khởi động nhanh Web Server PHP
```

---

## 2. Cách chạy và test thử

### Bước 1: Khởi động Server (Hiện đang chạy sẵn ở cổng 8090)
Nếu sau này cần chạy lại, mở PowerShell / CMD tại thư mục này và gõ:
```bash
php -S localhost:8090
```
*(Hoặc click đúp vào file `run_demo.bat`)*

### Bước 2: Mở trình duyệt để test

1. **Trang so sánh trực quan (Khuyên dùng để demo/chụp ảnh báo cáo):**  
   👉 [http://localhost:8090/user_list.php](http://localhost:8090/user_list.php)

2. **Trang Phần 1 (SQL LIKE):**  
   👉 [http://localhost:8090/user_list_sql.php](http://localhost:8090/user_list_sql.php)  
   - Thử gõ `Messi` ➔ Trả về: **Lionel Messi**
   - Thử gõ `Mesi` (thiếu chữ s) ➔ Báo: **Không tìm thấy kết quả nào**

3. **Trang Phần 2 (Elasticsearch):**  
   👉 [http://localhost:8090/user_list_es.php](http://localhost:8090/user_list_es.php)  
   - Thử gõ `Mesi` (thiếu chữ s) ➔ Kết quả: **Vẫn tìm thấy Lionel Messi!**
   - Thử gõ `Ranoldo` (sai chính tả Ronaldo) ➔ Kết quả: **Vẫn tìm thấy Cristiano Ronaldo!**

---

## 3. Bản chất kỹ thuật

- **SQL `LIKE '%Mesi%'`:** Chỉ so khớp chuỗi con chính xác từng ký tự. Khi người dùng gõ thiếu hoặc sai ký tự, SQL không thể nhận diện được.
- **Elasticsearch `match` với `"fuzziness": "AUTO"`:** Sử dụng thuật toán khoảng cách Levenshtein (Damerau–Levenshtein Distance) để tự động chấp nhận 1 đến 2 thao tác sai sót (thêm ký tự, thiếu ký tự, đổi chỗ ký tự), giúp tìm ra document phù hợp nhất.

