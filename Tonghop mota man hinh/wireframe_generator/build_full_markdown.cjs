// build_full_markdown.cjs - Generate the complete, standardized PHAC_THAO_GIAO_DIEN_48_CHUC_NANG.md
// strictly aligned with BAO_CAO_CHUC_NANG_DA_HOAN_THANH.md

const fs = require('fs');
const path = require('path');

const screensDat = require('./screens_dat.cjs');
const screensTu = require('./screens_tu.cjs');
const screensQuan = require('./screens_quan.cjs');
const screensTuan = require('./screens_tuan.cjs');

const allScreens = [
  ...screensDat,
  ...screensTu,
  ...screensQuan,
  ...screensTuan
];

const mdPath = path.resolve(__dirname, '../PHAC_THAO_GIAO_DIEN_48_CHUC_NANG.md');

let content = `# TÀI LIỆU THIẾT KẾ & PHÁC THẢO GIAO DIỆN (UI/UX WIREFRAMES) 48 CHỨC NĂNG
## HỆ THỐNG QUẢN TRỊ MÔI TRƯỜNG ĐÔ THỊ, BẢN ĐỒ SỐ WEBGIS & BÁO ĐỘNG NGẬP LỤT (GREENSPOT / ECOREPORT)

* **Dự án:** GreenSpot / EcoReport WebGIS
* **Tài liệu đối chiếu căn cứ:** \`BAO_CAO_CHUC_NANG_DA_HOAN_THANH.md\` & \`BANG_PHAN_CONG_48_CHUC_NANG_MOI.md\`
* **Mục đích:** Cung cấp tài liệu thiết kế cấu trúc giao diện Wireframe (màu đen trắng chuẩn mực), bố cục các thành phần UI, luồng thao tác người dùng và danh mục hình ảnh đồ họa chất lượng cao đánh số từ **Ảnh 01.1 đến Ảnh 48.2** phục vụ Báo cáo Đồ án chuyên đề và nghiệm thu phần mềm.

---

> [!IMPORTANT]
> **ĐÃ XUẤT ĐẦY ĐỦ 56 HÌNH ẢNH WIREFRAME ĐỒ HỌA TRẮNG ĐEN (ĐỘ PHÂN GIẢI CAO RETINA 2X):**
> * 🌐 **Bộ sưu tập trực quan (Xem & Tìm kiếm tất cả ảnh trên trình duyệt):** [DANH_MUC_ANH_WIREFRAME.html](file:///d:/Group-j_GreenSpot/DANH_MUC_ANH_WIREFRAME.html)
> * 📁 **Thư mục lưu trữ 56 file ảnh PNG:** [./wireframes/](file:///d:/Group-j_GreenSpot/wireframes/)
> * Khớp 100% với danh mục **48 chức năng toàn diện (STT 01 - STT 48)** trong Báo cáo kiểm toán mã nguồn thực tế.

---

## MỤC LỤC DANH MỤC 4 PHẦN PHÂN CÔNG THÀNH VIÊN

1. [Phần 1: Nguyễn Thành Đạt (STT 01 ➔ STT 12: Quản trị RBAC, Xác thực & Xử lý Sự cố)](#phần-1-nguyễn-thành-đạt-stt-01--stt-12)
2. [Phần 2: Huỳnh Anh Tú (STT 13 ➔ STT 24: Điều phối Tác nghiệp & Nền tảng WebGIS)](#phần-2-huỳnh-anh-tú-stt-13--stt-24)
3. [Phần 3: Bùi Nguyễn Minh Quân (STT 25 ➔ STT 36: Viễn trắc IoT, Bản đồ Nhiệt & Giám sát Ngập)](#phần-3-bùi-nguyễn-minh-quân-stt-25--stt-36)
4. [Phần 4: Lê Anh Tuấn (STT 37 ➔ STT 48: Phân tích Rủi ro, Tuyến đường An toàn & Big Data)](#phần-4-lê-anh-tuấn-stt-37--stt-48)

---

## BẢNG ĐỐI CHIẾU 56 ẢNH WIREFRAME CHO TOÀN BỘ 48 CHỨC NĂNG

| STT | Số Thứ Tự Ảnh | Tên Giao Diện / Màn Hình Wireframe | Phân Hệ Nghiệp Vụ | Thành Viên Phụ Trách | File Ảnh PNG |
|:---:|:---:|:---|:---|:---|:---:|
`;

allScreens.forEach(s => {
  const stt = s.id.split('_')[1];
  let phanHe = "WebGIS / Nghiệp vụ";
  const num = parseInt(stt, 10);
  if (num <= 6) phanHe = "Quản trị RBAC";
  else if (num <= 14) phanHe = "Xử lý Sự cố";
  else if (num <= 24) phanHe = "Bản đồ WebGIS";
  else if (num <= 26) phanHe = "Trạm Quan trắc IoT";
  else if (num <= 30) phanHe = "Bản đồ Nhiệt Đa dải";
  else if (num <= 36) phanHe = "Giám sát Ngập lụt";
  else if (num <= 38) phanHe = "Phân tích Sự cố";
  else if (num <= 40) phanHe = "Không gian Thông minh";
  else if (num <= 44) phanHe = "Giám sát Ngập lụt";
  else if (num === 45) phanHe = "Không gian Thông minh";
  else if (num === 46) phanHe = "Đa Ngôn Ngữ";
  else phanHe = "AI & Big Data";

  content += `| **${stt}** | **${s.numBadge}** | ${s.title} | ${phanHe} | ${s.member} | [Xem ảnh](./wireframes/${s.id}.png) |\n`;
});

content += `\n---\n\n`;

// Group screens by member
const sections = [
  {
    title: "PHẦN 1: NGUYỄN THÀNH ĐẠT (STT 01 ➔ STT 12)",
    desc: "Phân hệ: Quản trị RBAC, Xác thực bảo mật, Tài khoản người dùng & Nghiệp vụ Xử lý Sự cố môi trường đô thị",
    screens: screensDat
  },
  {
    title: "PHẦN 2: HUỲNH ANH TÚ (STT 13 ➔ STT 24)",
    desc: "Phân hệ: Phân công điều phối tác nghiệp, Tổng lượng sự cố đô thị & Nền tảng Bản đồ không gian số WebGIS",
    screens: screensTu
  },
  {
    title: "PHẦN 3: BÙI NGUYỄN MINH QUÂN (STT 25 ➔ STT 36)",
    desc: "Phân hệ: Quản trị mạng lưới viễn trắc IoT, Bản đồ nhiệt nội suy đa dải & Động cơ giải tích thủy triều ngập lụt",
    screens: screensQuan
  },
  {
    title: "PHẦN 4: LÊ ANH TUẤN (STT 37 ➔ STT 48)",
    desc: "Phân hệ: Mô hình giải tích rủi ro thông minh, Dò cụm DBSCAN, Tuyến đường an toàn né ngập & Big Data Dashboard",
    screens: screensTuan
  }
];

sections.forEach((sec, sIdx) => {
  content += `## ${sec.title}\n\n*${sec.desc}*\n\n---\n\n`;

  sec.screens.forEach(s => {
    content += `### ${s.numBadge}: ${s.title}\n\n`;
    content += `- **STT Chức năng trong Báo cáo:** STT ${s.id.split('_')[1]}\n`;
    content += `- **Thành viên phụ trách:** ${s.member} (${s.role})\n`;
    content += `- **Phân hệ nghiệp vụ:** ${s.activeNav}\n`;
    content += `- **Minh chứng mã nguồn:** Đối chiếu trực tiếp mã nguồn trong file \`BAO_CAO_CHUC_NANG_DA_HOAN_THANH.md\`\n\n`;

    content += `#### 1. Hình ảnh phác thảo giao diện Wireframe (Retina 2x):\n\n`;
    content += `![${s.numBadge}: ${s.title}](./wireframes/${s.id}.png)\n`;
    content += `*Hình: ${s.numBadge} - ${s.title} (Thành viên: ${s.member})*\n\n`;

    content += `#### 2. Phân tích thành phần giao diện & Bố cục UI/UX:\n`;
    content += `- **Khung tiêu đề (Header):** Hiển thị rõ danh mục tính năng, số hiệu ảnh và thành viên phụ trách.\n`;
    content += `- **Thẻ thông tin chính (Card Box):** Định dạng viền đen 2px sắc nét, phân vùng trực quan các khối dữ liệu, biểu mẫu hoặc bản đồ WebGIS.\n`;
    content += `- **Thao tác tương tác (Interactions):** Các nút bấm hành động chuẩn mực (Đen/Trắng), liên kết điều hướng mượt mà, phản hồi tức thì.\n\n`;

    content += `#### 3. Sơ đồ bố cục khung dây (ASCII Mockup Blueprint):\n\n`;
    content += "```text\n";
    content += `+-----------------------------------------------------------------------------------+\n`;
    content += `| [LOGO] GREENSPOT WEBGIS      ${s.title.padEnd(40, ' ')}   [${s.member}] |\n`;
    content += `+--------------------+--------------------------------------------------------------+\n`;
    content += `| [DASHBOARD]        |  TIÊU ĐỀ: ${s.title} \n`;
    content += `| [BÁO CÁO RÁC]      |  Phân hệ: ${s.activeNav} | Trạng thái: Sẵn sàng vận hành\n`;
    content += `| [BẢN ĐỒ WEBGIS]    |--------------------------------------------------------------|\n`;
    content += `| [NGẬP LỤT]         |  [ KHỐI HIỂN THỊ DỮ LIỆU / BẢN ĐỒ / FORM NHẬP LIỆU CHÍNH ]   |\n`;
    content += `| [CÀI ĐẶT]          |  • Thành phần: Đầy đủ các trường dữ liệu và nhãn trạng thái  |\n`;
    content += `|                    |  • Tương tác: Hỗ trợ tìm kiếm, lọc, phóng to và xuất dữ liệu |\n`;
    content += `+--------------------+--------------------------------------------------------------+\n`;
    content += "```\n\n---\n\n";
  });
});

fs.writeFileSync(mdPath, content, 'utf8');
console.log(`Successfully generated updated PHAC_THAO_GIAO_DIEN_48_CHUC_NANG.md with ${allScreens.length} screens!`);
