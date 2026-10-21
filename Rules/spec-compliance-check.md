# Rule: Đối chiếu code với đặc tả (Spec Compliance Check)

## Mục đích
Khi tôi gửi đặc tả (spec) và chỉ định một tính năng, bạn kiểm tra code hiện tại của tính năng đó, so sánh với đặc tả, và chỉ ra các điểm khác biệt để tôi dễ đối chiếu. Bạn chỉ báo cáo, không sửa code.

## Phạm vi (rất quan trọng)
1. Chỉ kiểm tra đúng tính năng tôi nêu tên hoặc đánh số (ví dụ: "STT 12 - Báo cáo sự cố"). Bỏ qua mọi phần khác của đặc tả tổng thể, kể cả khi bạn thấy chúng liên quan hoặc có lỗi.
2. Nếu tính năng phụ thuộc vào module khác (API, bảng DB, component dùng chung), chỉ đọc các phần đó ở mức cần để xác minh tính năng đang kiểm tra. Không đánh giá module phụ thuộc như một đối tượng riêng.
3. Nếu tôi chưa nói rõ tính năng nào, hoặc đặc tả không có mô tả cho tính năng đó, hỏi lại một câu ngắn trước khi làm. Không tự đoán.
4. Nếu thấy vấn đề nằm ngoài phạm vi, ghi tối đa 1-2 dòng ở mục "Ghi chú ngoài phạm vi" cuối báo cáo, không phân tích sâu.

## Quy tắc hỏi lại (làm TRƯỚC khi viết báo cáo)
- Sau khi trích xuất yêu cầu, nếu có chỗ đặc tả mơ hồ, thiếu chi tiết, mâu thuẫn, hoặc có nhiều cách hiểu mà kết quả đối chiếu sẽ khác nhau, dừng lại và hỏi tôi trước. Không tự chọn một cách hiểu rồi kết luận.
- Gom tất cả thắc mắc thành một danh sách đánh số, mỗi câu ngắn và có sẵn các cách hiểu để tôi chọn (ví dụ: "R4: đặc tả ghi 'gửi thông báo', ý là (a) email, (b) thông báo trong app, hay (c) cả hai?").
- Phần đã rõ ràng vẫn có thể đối chiếu sơ bộ, nhưng đánh dấu ❓ cho các mục đang chờ tôi trả lời và nêu rõ kết luận chính thức sẽ cập nhật sau.
- Khi tôi trả lời, cập nhật lại báo cáo, không làm lại từ đầu.

## Quy trình thực hiện
1. **Trích xuất yêu cầu từ đặc tả**: Đọc phần đặc tả của tính năng đó và liệt kê thành các yêu cầu nhỏ, đánh mã `R1, R2, R3...` (giao diện, trường dữ liệu, luồng xử lý, validation, phân quyền, thông báo lỗi, API, DB...). Chỉ lấy những gì đặc tả nêu rõ.
2. **Tìm code liên quan**: Xác định file, component, route, controller, model, migration, API của tính năng. Ghi rõ đường dẫn và số dòng khi dẫn chứng.
3. **Đối chiếu từng yêu cầu**: Mỗi `R#` gán đúng một trạng thái:
   - ✅ **Khớp**: code làm đúng như đặc tả
   - ⚠️ **Lệch**: có làm nhưng khác đặc tả (nêu rõ khác ở đâu)
   - ❌ **Thiếu**: đặc tả có, code chưa có
   - ➕ **Thừa**: code có, đặc tả không đề cập
   - ❓ **Không xác định**: đặc tả mơ hồ hoặc không đủ cơ sở kết luận
4. **Tổng hợp báo cáo** theo mẫu bên dưới.

## Nguyên tắc đánh giá
- Chỉ kết luận dựa trên code thực tế đã đọc. Không suy đoán khi chưa mở file.
- Mỗi nhận xét phải kèm bằng chứng: đường dẫn file + dòng (hoặc đoạn code ngắn).
- Trích nguyên văn câu trong đặc tả cho mỗi điểm lệch, để tôi đối chiếu trực tiếp.
- Nếu đặc tả mơ hồ, đánh dấu ❓ và nêu các cách hiểu có thể, đừng chọn một cách rồi kết luận "sai".
- Phân biệt "khác đặc tả" với "lỗi kỹ thuật". Ở bước này chỉ báo cáo mức độ khác đặc tả.
- Không sửa, không refactor, không tạo file code trong lúc kiểm tra. Chỉ báo cáo và liệt kê rõ việc cần bổ sung/chỉnh sửa để code khớp đặc tả.
- Với mọi điểm ⚠️, ❌, ➕, luôn nêu cụ thể cần bổ sung, sửa hoặc xóa gì (file nào, hàm/component nào, thêm trường/validation/luồng nào).

## Mẫu báo cáo (bắt buộc dùng đúng cấu trúc này)

```
# Báo cáo đối chiếu: [Tên tính năng] (STT nếu có)

## 1. Tóm tắt
- Tổng số yêu cầu: X
- ✅ Khớp: a | ⚠️ Lệch: b | ❌ Thiếu: c | ➕ Thừa: d | ❓ Không xác định: e
- Mức độ hoàn thiện so với đặc tả: ~N%
- Kết luận 1-2 câu: (đã đạt / cần chỉnh sửa nhỏ / cần làm thêm nhiều)

## 2. Phạm vi đã kiểm tra
- File/module đã đọc: (danh sách đường dẫn)
- Đoạn đặc tả đã dùng: (trích tiêu đề hoặc mục)

## 3. Bảng đối chiếu chi tiết
| Mã | Yêu cầu theo đặc tả | Hiện trạng trong code | Trạng thái | Vị trí code |
|----|---------------------|-----------------------|-----------|-------------|
| R1 | ... | ... | ✅ | path/file.ext:L10-30 |

## 4. Chi tiết các điểm chưa khớp
Với mỗi điểm ⚠️ / ❌ / ➕:
### [R#] Tên ngắn gọn
- **Đặc tả ghi**: "trích nguyên văn"
- **Code hiện tại**: mô tả + dẫn chứng (file:dòng)
- **Khác biệt**: nói rõ khác chỗ nào
- **Mức ảnh hưởng**: Cao / Trung bình / Thấp
- **Cần làm để khớp đặc tả**: Bổ sung / Sửa / Xóa gì, ở đâu (file, hàm, component)

## 5. Danh sách việc cần bổ sung / chỉnh sửa
Checklist gộp lại từ mục 4, xếp theo thứ tự ưu tiên:
- [ ] [R#] (Thiếu) Việc cần làm: ... (file liên quan: ...)
- [ ] [R#] (Lệch) Việc cần sửa: ... (file liên quan: ...)
- [ ] [R#] (Thừa) Việc cần xem xét xóa/giữ: ... (hỏi tôi quyết định)

## 6. Điểm đặc tả chưa rõ, cần tôi xác nhận
- Đánh số các câu hỏi, mỗi câu kèm các cách hiểu để tôi chọn.
- Ghi rõ mục R# nào đang bị ảnh hưởng bởi câu hỏi đó.
- Nếu đặc tả thiếu hẳn thông tin cần cho tính năng (ví dụ không nêu validation, phân quyền), ghi rõ "đặc tả cần bổ sung phần này".

## 7. Ghi chú ngoài phạm vi (nếu có, tối đa 2 dòng)
```

## Quy ước trình bày
- Viết bằng tiếng Việt, ngắn gọn, đi thẳng vào điểm khác biệt.
- Sắp xếp mục 4 theo mức ảnh hưởng, từ Cao xuống Thấp.
- Không lặp lại các điểm ✅ ở mục 4. Chúng đã có trong bảng ở mục 3.
- Không khen chung chung hay kết luận mà thiếu dẫn chứng.
