// generate_dashboard.cjs - Creates the comprehensive master Dashboard with full 48 functions in the sidebar

const fs = require('fs');
const path = require('path');

const screensDat = require('./Tonghop mota man hinh/wireframe_generator/screens_dat.cjs');
const screensTu = require('./Tonghop mota man hinh/wireframe_generator/screens_tu.cjs');
const screensQuan = require('./Tonghop mota man hinh/wireframe_generator/screens_quan.cjs');
const screensTuan = require('./Tonghop mota man hinh/wireframe_generator/screens_tuan.cjs');

const memberGroups = [
  {
    name: "Nguyễn Thành Đạt",
    roleTitle: "WebGIS Công Dân & Báo Cáo Hiện Trường",
    icon: "🗺️",
    badge: "12 Chức năng • 17 Màn hình",
    screens: screensDat
  },
  {
    name: "Huỳnh Anh Tú",
    roleTitle: "Khí Tượng, Radar & Gamification Điểm Xanh",
    icon: "🌦️",
    badge: "12 Chức năng • 14 Màn hình",
    screens: screensTu
  },
  {
    name: "Bùi Nguyễn Minh Quân",
    roleTitle: "Quản Trị Trung Tâm, RBAC & Đội Xe Thu Gom",
    icon: "🛡️",
    badge: "12 Chức năng • 15 Màn hình",
    screens: screensQuan
  },
  {
    name: "Lê Anh Tuấn",
    roleTitle: "Mô Hình Thủy Triều, Ngập Lụt & PostGIS",
    icon: "🌊",
    badge: "12 Chức năng • 15 Màn hình",
    screens: screensTuan
  }
];

const allScreens = [
  ...screensDat,
  ...screensTu,
  ...screensQuan,
  ...screensTuan
];

// Clean items for JSON embedding
const screensDataJson = JSON.stringify(allScreens.map(s => ({
  id: s.id,
  numBadge: s.numBadge,
  title: s.title,
  member: s.member,
  role: s.role,
  activeNav: s.activeNav,
  fileName: `${s.id}.png`
})));

const htmlContent = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BẢNG ĐIỀU KHIỂN TỔNG HỢP 48 CHỨC NĂNG - GREENSPOT / ECOREPORT WEBGIS</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-main: #0b0f19;
      --bg-sidebar: #111827;
      --bg-card: #1f2937;
      --border-color: #374151;
      --text-main: #f9fafb;
      --text-muted: #9ca3af;
      --accent-color: #3b82f6;
      --accent-hover: #2563eb;
      --success-color: #10b981;
      --sidebar-width: 380px;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Plus Jakarta Sans', sans-serif; }
    body { background: var(--bg-main); color: var(--text-main); display: flex; height: 100vh; overflow: hidden; }

    /* SIDEBAR */
    .sidebar {
      width: var(--sidebar-width);
      background: var(--bg-sidebar);
      border-right: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      height: 100vh;
      z-index: 20;
    }

    .sidebar-header {
      padding: 18px 20px;
      border-bottom: 1px solid var(--border-color);
      background: #0d131f;
    }

    .brand-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .brand-title {
      font-size: 16px;
      font-weight: 800;
      display: flex;
      align-items: center;
      gap: 10px;
      letter-spacing: -0.3px;
    }

    .brand-badge {
      background: #1e3a8a;
      color: #93c5fd;
      font-size: 10px;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 6px;
      border: 1px solid #2563eb;
    }

    .search-box {
      position: relative;
    }

    .search-input {
      width: 100%;
      background: #1f2937;
      border: 1px solid #4b5563;
      border-radius: 8px;
      padding: 9px 12px 9px 34px;
      color: #fff;
      font-size: 13px;
      outline: none;
      transition: all 0.2s;
    }

    .search-input:focus {
      border-color: var(--accent-color);
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }

    .search-icon {
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      color: #9ca3af;
      font-size: 14px;
    }

    .sidebar-stats {
      padding: 10px 20px;
      font-size: 11px;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border-color);
      background: #0f172a;
      display: flex;
      justify-content: space-between;
      font-weight: 600;
    }

    .sidebar-content {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
    }

    .sidebar-content::-webkit-scrollbar { width: 6px; }
    .sidebar-content::-webkit-scrollbar-thumb { background: #374151; border-radius: 3px; }

    /* Module Accordion */
    .module-group {
      margin-bottom: 14px;
      border: 1px solid var(--border-color);
      border-radius: 10px;
      background: rgba(31, 41, 55, 0.4);
      overflow: hidden;
    }

    .module-header {
      padding: 12px 14px;
      background: #1a2234;
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      align-items: center;
      user-select: none;
      border-bottom: 1px solid transparent;
      transition: background 0.2s;
    }

    .module-header:hover { background: #222d44; }
    .module-header.open { border-bottom-color: var(--border-color); }

    .module-title-box { display: flex; align-items: center; gap: 10px; }
    .module-icon { font-size: 18px; }
    .module-name { font-size: 13px; font-weight: 800; color: #fff; }
    .module-sub { font-size: 11px; color: #9ca3af; margin-top: 2px; }
    .chevron-icon { font-size: 12px; transition: transform 0.2s; color: #9ca3af; }
    .module-header.open .chevron-icon { transform: rotate(180deg); }

    .screen-list {
      display: none;
      padding: 6px;
      background: #111827;
    }

    .screen-list.open { display: block; }

    .screen-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border-radius: 6px;
      cursor: pointer;
      margin-bottom: 4px;
      transition: all 0.15s;
    }

    .screen-item:hover {
      background: #1f2937;
    }

    .screen-item.active {
      background: #2563eb;
      color: #fff;
    }

    .screen-badge {
      font-size: 10px;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      background: #374151;
      color: #e5e7eb;
      flex-shrink: 0;
    }

    .screen-item.active .screen-badge {
      background: #1e3a8a;
      color: #bfdbfe;
    }

    .screen-text {
      font-size: 12px;
      font-weight: 600;
      line-height: 1.3;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* MAIN VIEW */
    .main-view {
      flex: 1;
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
      background: #0f172a;
    }

    /* Header Nav */
    .top-navbar {
      height: 64px;
      background: #1e293b;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 24px;
      flex-shrink: 0;
    }

    .breadcrumbs {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 600;
      color: #cbd5e1;
    }

    .breadcrumb-active {
      color: #60a5fa;
      font-weight: 800;
    }

    .nav-controls {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .btn-nav {
      padding: 7px 14px;
      border-radius: 7px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      border: 1px solid #475569;
      background: #334155;
      color: #fff;
      transition: all 0.2s;
      text-decoration: none;
    }

    .btn-nav:hover { background: #475569; border-color: #64748b; }
    .btn-nav-primary { background: #2563eb; border-color: #1d4ed8; }
    .btn-nav-primary:hover { background: #1d4ed8; }

    /* CONTENT BODY */
    .content-body {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .content-body::-webkit-scrollbar { width: 8px; }
    .content-body::-webkit-scrollbar-thumb { background: #475569; border-radius: 4px; }

    /* DISPLAY HERO CARD */
    .wireframe-display-card {
      background: #1e293b;
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }

    .image-preview-wrapper {
      width: 100%;
      max-width: 1050px;
      background: #f1f5f9;
      border-radius: 10px;
      padding: 16px;
      display: flex;
      justify-content: center;
      align-items: center;
      box-shadow: inset 0 2px 8px rgba(0,0,0,0.06);
      cursor: zoom-in;
    }

    .image-preview-wrapper img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.12);
      transition: transform 0.2s;
    }

    .image-preview-wrapper img:hover {
      transform: scale(1.01);
    }

    /* METADATA BAR */
    .meta-box {
      width: 100%;
      max-width: 1050px;
      margin-top: 16px;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 10px;
      padding: 16px 20px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
    }

    .meta-item { display: flex; flex-direction: column; gap: 4px; }
    .meta-label { font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 700; letter-spacing: 0.5px; }
    .meta-val { font-size: 13px; font-weight: 700; color: #f8fafc; }

    /* MODAL LIGHTBOX */
    .lightbox-modal {
      display: none;
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.92);
      z-index: 999;
      justify-content: center;
      align-items: center;
      padding: 30px;
      cursor: zoom-out;
    }

    .lightbox-modal img {
      max-width: 95vw;
      max-height: 92vh;
      border-radius: 8px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.5);
    }

    .lightbox-modal.active { display: flex; }
  </style>
</head>
<body>

  <!-- LEFT SIDEBAR -->
  <div class="sidebar">
    <div class="sidebar-header">
      <div class="brand-row">
        <div class="brand-title">
          <span>🌿</span> GREENSPOT
        </div>
        <div class="brand-badge">DASHBOARD 48 CN</div>
      </div>
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input type="text" id="searchInput" class="search-input" placeholder="Tìm theo số ảnh (01, 14.2) hoặc tên chức năng..." onkeyup="searchScreens()">
      </div>
    </div>

    <div class="sidebar-stats">
      <span>TỔNG SỐ: 48 CHỨC NĂNG</span>
      <span style="color: #60a5fa;">61 BẢN VẼ WIREFRAME</span>
    </div>

    <div class="sidebar-content" id="sidebarContent">
      ${memberGroups.map((group, gIdx) => `
        <div class="module-group" data-group="${group.name}">
          <div class="module-header ${gIdx === 0 ? 'open' : ''}" onclick="toggleGroup(this)">
            <div class="module-title-box">
              <span class="module-icon">${group.icon}</span>
              <div>
                <div class="module-name">${group.name}</div>
                <div class="module-sub">${group.roleTitle}</div>
              </div>
            </div>
            <div class="chevron-icon">▼</div>
          </div>
          <div class="screen-list ${gIdx === 0 ? 'open' : ''}">
            ${group.screens.map((screen, sIdx) => `
              <div class="screen-item ${gIdx === 0 && sIdx === 0 ? 'active' : ''}" 
                   id="item-${screen.id}" 
                   onclick="selectScreen('${screen.id}')"
                   data-title="${screen.title.toLowerCase()}"
                   data-num="${screen.numBadge.toLowerCase()}">
                <span class="screen-badge">${screen.numBadge}</span>
                <span class="screen-text">${screen.title}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  </div>

  <!-- MAIN VIEW -->
  <div class="main-view">
    <!-- Top Navbar -->
    <div class="top-navbar">
      <div class="breadcrumbs">
        <span>Dashboard</span>
        <span>/</span>
        <span id="bcMember">Nguyễn Thành Đạt</span>
        <span>/</span>
        <span id="bcBadge" class="breadcrumb-active">Ảnh 01.1</span>
      </div>

      <div class="nav-controls">
        <button class="btn-nav" onclick="prevScreen()">◀ Trước</button>
        <button class="btn-nav" onclick="nextScreen()">Sau ▶</button>
        <button class="btn-nav" onclick="openLightbox()">🔍 Phóng to</button>
        <a id="btnDownload" href="./wireframes/Anh_01_1.png" download class="btn-nav btn-nav-primary">📥 Tải PNG</a>
      </div>
    </div>

    <!-- Content Body -->
    <div class="content-body">
      <div class="wireframe-display-card">
        <div style="width: 100%; max-width: 1050px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div>
            <h2 id="viewTitle" style="font-size: 18px; font-weight: 800; color: #fff;">Báo cáo điểm ô nhiễm - Định vị GPS tự động trên bản đồ</h2>
            <div id="viewSubtitle" style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Phân hệ: Báo cáo rác • Phụ trách: Nguyễn Thành Đạt</div>
          </div>
          <span id="viewTag" style="background: #2563eb; color: #fff; font-size: 12px; font-weight: 800; padding: 4px 12px; border-radius: 6px;">Ảnh 01.1</span>
        </div>

        <div class="image-preview-wrapper" onclick="openLightbox()">
          <img id="viewImage" src="./wireframes/Anh_01_1.png" alt="Wireframe Preview">
        </div>

        <!-- Metadata Bar -->
        <div class="meta-box">
          <div class="meta-item">
            <span class="meta-label">Thành viên đảm nhiệm</span>
            <span class="meta-val" id="metaMember">Nguyễn Thành Đạt</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Vai trò giao diện</span>
            <span class="meta-val" id="metaRole">Công dân (Citizen)</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Tab Sidebar tương ứng</span>
            <span class="meta-val" id="metaNav">Báo cáo rác</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Tên tệp hình ảnh</span>
            <span class="meta-val" id="metaFile" style="font-family: monospace;">Anh_01_1.png</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- LIGHTBOX MODAL -->
  <div class="lightbox-modal" id="lightboxModal" onclick="closeLightbox()">
    <img id="lightboxImg" src="./wireframes/Anh_01_1.png" alt="Zoomed Wireframe">
  </div>

  <script>
    const allScreens = ${screensDataJson};
    let currentIndex = 0;

    function selectScreen(id) {
      const idx = allScreens.findIndex(s => s.id === id);
      if (idx !== -1) {
        currentIndex = idx;
        renderActiveScreen();
      }
    }

    function renderActiveScreen() {
      const screen = allScreens[currentIndex];

      // Update sidebar active item
      document.querySelectorAll('.screen-item').forEach(el => el.classList.remove('active'));
      const activeEl = document.getElementById('item-' + screen.id);
      if (activeEl) {
        activeEl.classList.add('active');
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        // Ensure parent accordion is open
        const parentList = activeEl.closest('.screen-list');
        if (parentList) {
          parentList.classList.add('open');
          parentList.previousElementSibling.classList.add('open');
        }
      }

      // Update Header & Breadcrumbs
      document.getElementById('bcMember').innerText = screen.member;
      document.getElementById('bcBadge').innerText = screen.numBadge;
      document.getElementById('viewTitle').innerText = screen.title;
      document.getElementById('viewSubtitle').innerText = 'Phân hệ: ' + screen.activeNav + ' • Phụ trách: ' + screen.member;
      document.getElementById('viewTag').innerText = screen.numBadge;

      // Update Image
      const imgPath = './wireframes/' + screen.fileName;
      document.getElementById('viewImage').src = imgPath;
      document.getElementById('lightboxImg').src = imgPath;
      document.getElementById('btnDownload').href = imgPath;

      // Update Metadata
      document.getElementById('metaMember').innerText = screen.member;
      document.getElementById('metaRole').innerText = screen.role || 'Cán bộ';
      document.getElementById('metaNav').innerText = screen.activeNav;
      document.getElementById('metaFile').innerText = screen.fileName;
    }

    function nextScreen() {
      if (currentIndex < allScreens.length - 1) {
        currentIndex++;
        renderActiveScreen();
      }
    }

    function prevScreen() {
      if (currentIndex > 0) {
        currentIndex--;
        renderActiveScreen();
      }
    }

    // Keyboard arrow navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextScreen();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prevScreen();
      if (e.key === 'Escape') closeLightbox();
    });

    function toggleGroup(headerEl) {
      headerEl.classList.toggle('open');
      const list = headerEl.nextElementSibling;
      list.classList.toggle('open');
    }

    function searchScreens() {
      const q = document.getElementById('searchInput').value.toLowerCase().trim();
      const items = document.querySelectorAll('.screen-item');
      const groups = document.querySelectorAll('.module-group');

      if (!q) {
        items.forEach(it => it.style.display = 'flex');
        return;
      }

      groups.forEach(group => {
        let hasMatch = false;
        const groupItems = group.querySelectorAll('.screen-item');
        groupItems.forEach(it => {
          const title = it.getAttribute('data-title');
          const num = it.getAttribute('data-num');
          if (title.includes(q) || num.includes(q)) {
            it.style.display = 'flex';
            hasMatch = true;
          } else {
            it.style.display = 'none';
          }
        });

        const list = group.querySelector('.screen-list');
        const header = group.querySelector('.module-header');
        if (hasMatch) {
          list.classList.add('open');
          header.classList.add('open');
        }
      });
    }

    function openLightbox() {
      document.getElementById('lightboxModal').classList.add('active');
    }

    function closeLightbox() {
      document.getElementById('lightboxModal').classList.remove('active');
    }
  </script>
</body>
</html>
`;

// Write to both places
const outRoot = path.resolve(__dirname, 'DASHBOARD_TONG_HOP_48_CHUC_NANG.html');
const outFolder = path.resolve(__dirname, 'Tonghop mota man hinh/DASHBOARD_TONG_HOP_48_CHUC_NANG.html');
const outDanhBac = path.resolve(__dirname, 'DANH_MUC_ANH_WIREFRAME.html');
const outFolderDanhBac = path.resolve(__dirname, 'Tonghop mota man hinh/DANH_MUC_ANH_WIREFRAME.html');

fs.writeFileSync(outRoot, htmlContent, 'utf8');
fs.writeFileSync(outFolder, htmlContent, 'utf8');
fs.writeFileSync(outDanhBac, htmlContent, 'utf8');
fs.writeFileSync(outFolderDanhBac, htmlContent, 'utf8');

console.log("Successfully generated DASHBOARD_TONG_HOP_48_CHUC_NANG.html in root and Tonghop folder!");
