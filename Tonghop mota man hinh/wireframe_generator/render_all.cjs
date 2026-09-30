// render_all.js - Master script to render all wireframe images using Puppeteer and Chrome

const fs = require('fs');
const path = require('path');
const puppeteer = require('../../frontend/node_modules/puppeteer-core');

const commonCss = require('./common_css.cjs');
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

const OUTPUT_DIR = path.resolve(__dirname, '../wireframes');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function generateHtml(screen) {
  const navItems = [
    { name: "Dashboard", icon: "📊" },
    { name: "Báo cáo rác", icon: "🗑️" },
    { name: "Bản đồ ô nhiễm", icon: "🗺️" },
    { name: "Điểm xanh", icon: "♻️" },
    { name: "Bản đồ ngập lụt", icon: "🌊" },
    { name: "Tìm đường né ngập", icon: "🧭" },
    { name: "Chất lượng không khí", icon: "🌬️" },
    { name: "Điều phối tác nghiệp", icon: "📋" },
    { name: "Đội xe thu gom", icon: "🚚" },
    { name: "Nghiệm thu", icon: "✅" },
    { name: "Mạng lưới IoT", icon: "📡" },
    { name: "Báo cáo thống kê", icon: "📈" },
    { name: "Quản trị hệ thống", icon: "⚙️" },
    { name: "Xác thực", icon: "🔐" }
  ];

  // Pick relevant 5-6 nav items based on activeNav
  let displayedNavs = [];
  const primaryNavs = ["Dashboard", "Báo cáo rác", "Bản đồ ô nhiễm", "Điểm xanh"];
  if (primaryNavs.includes(screen.activeNav)) {
    displayedNavs = primaryNavs;
  } else {
    displayedNavs = ["Dashboard", screen.activeNav, "Bản đồ ô nhiễm", "Bản đồ ngập lụt", "Cài đặt"];
  }

  const navHtml = displayedNavs.map(nav => {
    const isActive = nav === screen.activeNav;
    return `<div class="nav-item ${isActive ? 'active' : ''}">${nav}</div>`;
  }).join('');

  const badgesHtml = (screen.badges || []).map(b => {
    let style = '';
    if (b.top) style += `top: ${b.top}; `;
    if (b.bottom) style += `bottom: ${b.bottom}; `;
    if (b.left) style += `left: ${b.left}; `;
    if (b.right) style += `right: ${b.right}; `;
    return `<div class="badge-tag" style="${style}">${b.text}</div>`;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>${screen.numBadge} - ${screen.title}</title>
  <style>
    ${commonCss}
  </style>
</head>
<body>
  <div id="capture-wrapper" style="padding: 24px 30px; display: inline-block; background: #f0f2f5;">
    <div class="screen-card" id="capture-card">
      <!-- Top photo number badge -->
      <div class="photo-num-badge">${screen.numBadge}</div>

      <!-- Screen badges -->
      ${badgesHtml}

      <!-- Header -->
      <div class="header">
        <div class="header-left">
          <div class="logo-box">LOGO</div>
          <div class="header-title">Hệ thống Báo cáo & Theo dõi Điểm rác thải / Ô nhiễm</div>
        </div>
        <div class="header-user">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="7" r="4"/><path d="M4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2"/></svg>
          ${screen.member} (${screen.role || 'Cán bộ'}) ⌄
        </div>
      </div>

      <!-- Body -->
      <div class="layout-body">
        <div class="sidebar">
          ${navHtml}
        </div>

        <div class="content">
          ${screen.contentHtml}
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

async function run() {
  console.log(`Starting to render ${allScreens.length} wireframe screens...`);

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1140, height: 850, deviceScaleFactor: 2 });

  const galleryItems = [];

  for (let i = 0; i < allScreens.length; i++) {
    const screen = allScreens[i];
    const fileName = `${screen.id}.png`;
    const filePath = path.join(OUTPUT_DIR, fileName);

    const html = generateHtml(screen);
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    
    // Give a brief moment for fonts and layouts to settle
    await new Promise(r => setTimeout(r, 60));

    const element = await page.$('#capture-wrapper');
    if (element) {
      await element.screenshot({ path: filePath });
    } else {
      await page.screenshot({ path: filePath });
    }

    galleryItems.push({
      id: screen.id,
      numBadge: screen.numBadge,
      title: screen.title,
      member: screen.member,
      fileName: fileName
    });

    console.log(`[${i + 1}/${allScreens.length}] Rendered: ${screen.numBadge} -> ${fileName}`);
  }

  await browser.close();
  console.log("All wireframe images rendered successfully!");

  // Generate master gallery viewer HTML
  const galleryHtml = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>BỘ SƯU TẬP ẢNH PHÁC THẢO GIAO DIỆN (WIREFRAMES) - GREENSPOT / ECOREPORT</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: #f8fafc; color: #1e293b; padding: 24px; }
    .header-banner { background: #0f172a; color: #fff; padding: 28px; border-radius: 12px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
    .title { font-size: 22px; font-weight: 800; }
    .subtitle { font-size: 13px; color: #94a3b8; margin-top: 6px; }
    .filter-tabs { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
    .tab-btn { padding: 8px 16px; border-radius: 8px; border: 1.5px solid #cbd5e1; background: #fff; font-size: 13px; font-weight: 700; cursor: pointer; }
    .tab-btn.active { background: #0f172a; color: #fff; border-color: #0f172a; }
    .gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(460px, 1fr)); gap: 20px; }
    .gallery-card { background: #fff; border: 1.5px solid #e2e8f0; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.04); transition: transform 0.2s; }
    .gallery-card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
    .img-box { width: 100%; height: 310px; background: #f1f5f9; display: flex; align-items: center; justify-content: center; overflow: hidden; border-bottom: 1.5px solid #e2e8f0; }
    .img-box img { width: 100%; height: 100%; object-fit: contain; }
    .card-info { padding: 14px 16px; }
    .card-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .badge-num { background: #0f172a; color: #fff; font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 4px; }
    .badge-member { font-size: 11px; font-weight: 700; color: #475569; background: #e2e8f0; padding: 2px 8px; border-radius: 4px; }
    .card-title { font-size: 14px; font-weight: 700; color: #0f172a; line-height: 1.4; }
  </style>
</head>
<body>
  <div class="header-banner">
    <div>
      <div class="title">BỘ SƯU TẬP ẢNH PHÁC THẢO GIAO DIỆN (WIREFRAMES) 48 CHỨC NĂNG</div>
      <div class="subtitle">Đồ án: GreenSpot / EcoReport WebGIS • Phân công 4 thành viên • Độ phân giải cao Retina (2x)</div>
    </div>
    <div style="background: rgba(255,255,255,0.1); padding: 10px 18px; border-radius: 8px; text-align: right;">
      <div style="font-size: 20px; font-weight: 900;">${galleryItems.length} MÀN HÌNH</div>
      <div style="font-size: 11px; color: #cbd5e1;">Đã xuất định dạng PNG</div>
    </div>
  </div>

  <div class="gallery-grid">
    ${galleryItems.map(item => `
      <div class="gallery-card">
        <div class="img-box">
          <a href="./wireframes/${item.fileName}" target="_blank">
            <img src="./wireframes/${item.fileName}" alt="${item.numBadge}">
          </a>
        </div>
        <div class="card-info">
          <div class="card-meta">
            <span class="badge-num">${item.numBadge}</span>
            <span class="badge-member">${item.member}</span>
          </div>
          <div class="card-title">${item.title}</div>
        </div>
      </div>
    `).join('')}
  </div>
</body>
</html>
  `;

  fs.writeFileSync(path.resolve(__dirname, '../DANH_MUC_ANH_WIREFRAME.html'), galleryHtml, 'utf8');
  console.log("Created master gallery viewer: DANH_MUC_ANH_WIREFRAME.html");
}

run().catch(console.error);
