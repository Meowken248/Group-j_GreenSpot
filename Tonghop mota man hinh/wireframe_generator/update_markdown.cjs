// update_markdown.cjs - Embed rendered PNG images and master index into PHAC_THAO_GIAO_DIEN_48_CHUC_NANG.md

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
let mdContent = fs.readFileSync(mdPath, 'utf8');

// Build master index table
let indexTable = `
> [!IMPORTANT]
> **ĐÃ XUẤT ĐẦY ĐỦ 61 HÌNH ẢNH WIREFRAME ĐỒ HỌA TRẮNG ĐEN (ĐỘ PHÂN GIẢI CAO 2X):**
> * 🌐 **Bộ sưu tập trực quan (Xem & Tìm kiếm tất cả ảnh trên trình duyệt):** [DANH_MUC_ANH_WIREFRAME.html](file:///d:/Group-j_GreenSpot/DANH_MUC_ANH_WIREFRAME.html)
> * 📁 **Thư mục lưu trữ 61 file ảnh PNG:** [./wireframes/](file:///d:/Group-j_GreenSpot/wireframes/)
> * Mỗi chức năng đều có ảnh Wireframe đồ họa tương ứng được đánh số thứ tự chuẩn (\`Ảnh 01.1\`, \`Ảnh 01.2\`,..., \`Ảnh 48.2\`).

### BẢNG ĐỐI CHIẾU 61 ẢNH WIREFRAME CHO 48 CHỨC NĂNG

| STT | Số Thứ Tự Ảnh | Tên Giao Diện / Màn Hình Wireframe | Thành Viên Phụ Trách | File Ảnh PNG |
|:---:|:---:|:---|:---|:---:|
`;

allScreens.forEach((s, idx) => {
  const stt = s.id.split('_')[1];
  indexTable += `| ${stt} | **${s.numBadge}** | ${s.title} | ${s.member} | [Xem ảnh](${encodeURI(`./wireframes/${s.id}.png`)}) |\n`;
});

indexTable += `\n---\n\n`;

// Insert the master index table after line 16 (after the old Table of Contents)
const tocMarker = "## MỤC LỤC DANH MỤC 48 ẢNH PHÁC THẢO GIAO DIỆN";
if (mdContent.includes(tocMarker)) {
  const parts = mdContent.split(tocMarker);
  const afterToc = parts[1].indexOf("---");
  if (afterToc !== -1) {
    const headerPart = parts[0] + tocMarker + parts[1].substring(0, afterToc + 3) + "\n\n" + indexTable;
    const bodyPart = parts[1].substring(afterToc + 3);
    mdContent = headerPart + bodyPart;
  }
}

// Now, for each screen, embed the image above its text section if not already embedded
allScreens.forEach(s => {
  const imgTag = `\n\n![${s.numBadge}: ${s.title}](./wireframes/${s.id}.png)\n*Hình: ${s.numBadge} - ${s.title} (Thành viên: ${s.member})*\n`;
  
  // Look for header with this number e.g. "### Ảnh 01:" or "### Ảnh 13:"
  const idPrefix = s.id.replace('Anh_', '');
  const baseNum = idPrefix.split('_')[0]; // e.g. "01"
  
  // Regex to find "### Ảnh baseNum:"
  const regex = new RegExp('(### Ảnh ' + baseNum + '[^\\n]*\\n)([\\s\\S]*?)(```text)', 'g');
  
  // We can inject the image right after the info header and before ```text
  mdContent = mdContent.replace(regex, (match, p1, p2, p3) => {
    if (!match.includes(`./wireframes/${s.id}.png`)) {
      return `${p1}${p2}${imgTag}\n${p3}`;
    }
    return match;
  });
});

fs.writeFileSync(mdPath, mdContent, 'utf8');
console.log("Successfully updated PHAC_THAO_GIAO_DIEN_48_CHUC_NANG.md with image embeds and master index!");
