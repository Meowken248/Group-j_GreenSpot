/**
 * Chuẩn hóa hệ thống đường dẫn URL (Clean & Professional Routing) cho GreenSpot.
 * Thay thế toàn bộ các hash xấu như #admin-dashboard, #dedup, #triage bằng URL chuẩn RESTful & ngữ nghĩa:
 *   - STT 37: /assistant/voice
 *   - STT 38: /reports/deduplication
 *   - STT 39 & 40: /incidents/ai-triage & /incidents/spatial-facilities
 *   - STT 41: /navigation/safe-route
 *   - STT 42: /analytics/urban-risk
 *   - STT 43: /operations/dispatch
 *   - STT 44: /analytics/hotspots
 *   - STT 45: /emergency/alerts & /emergency/safety-check
 *   - STT 46: /emergency/flood-sos
 *   - STT 47: /reports/incident-export
 *   - STT 48: /admin/activity-dashboard
 */

export type ActiveTab =
  | "map"
  | "dashboard"
  | "auth"
  | "rbac"
  | "users"
  | "profile"
  | "friends"
  | "voice"
  | "dedup"
  | "settings"
  | "penalties"
  | "penalty-reports"
  | "posts"
  | "triage"
  | "navigation"
  | "risk-dashboard"
  | "dispatch"
  | "hotspots"
  | "emergency-alert"
  | "safety-check"
  | "flood-sos"
  | "report"
  | "incidents"
  | "rewards"
  | "challenges"
  | "audit-logs"
  | "handbook"
  | "leaderboard"
  | "heatmap"
  | "qr-scan"
  | "lucky-wheel"
  | "milestone"
  | "incident-export"
  | "admin-dashboard"
  | "waste_categories"
  | "recycling_facilities"
  | "messages"
  | "groups"
  | "ai-assistant"
  | "events"
  | "fundraiser";

export interface RouteDefinition {
  tab: ActiveTab;
  path: string;
  label: string;
  aliases: string[];
  requiresAuth?: boolean;
}

export const APP_ROUTES: Record<ActiveTab, RouteDefinition> = {
  // ── NHÓM TÍNH NĂNG STT 37 -> 48 ──────────────────────────────────────────
  "voice": {
    tab: "voice",
    path: "/assistant/voice",
    label: "Trợ lý điều khiển giọng nói AI",
    aliases: ["/assistant/voice", "/voice-assistant", "/voice", "#voice", "#assistant/voice", "#voice-assistant"],
    requiresAuth: true,
  },
  "dedup": {
    tab: "dedup",
    path: "/reports/deduplication",
    label: "Khử trùng lặp phản ánh môi trường",
    aliases: ["/reports/deduplication", "/deduplication", "/dedup", "#dedup", "#reports/deduplication", "#deduplication"],
    requiresAuth: true,
  },
  "triage": {
    tab: "triage",
    path: "/incidents/ai-triage",
    label: "Phân loại sự cố AI & Cơ sở trọng yếu",
    aliases: [
      "/incidents/ai-triage",
      "/ai-triage",
      "/triage",
      "/incidents/spatial-facilities",
      "#triage",
      "#incidents/ai-triage",
      "#ai-triage",
      "#spatial-facilities",
    ],
    requiresAuth: true,
  },
  "navigation": {
    tab: "navigation",
    path: "/navigation/safe-route",
    label: "Lộ trình an toàn tránh ngập lụt",
    aliases: ["/navigation/safe-route", "/safe-navigation", "/navigation", "#navigation", "#navigation/safe-route", "#safe-navigation"],
    requiresAuth: false,
  },
  "risk-dashboard": {
    tab: "risk-dashboard",
    path: "/analytics/urban-risk",
    label: "Bảng chỉ số rủi ro môi trường đô thị",
    aliases: ["/analytics/urban-risk", "/urban-risk", "/risk-dashboard", "#risk-dashboard", "#analytics/urban-risk", "#urban-risk"],
    requiresAuth: true,
  },
  "dispatch": {
    tab: "dispatch",
    path: "/operations/dispatch",
    label: "Điều phối tác nghiệp xử lý hiện trường",
    aliases: ["/operations/dispatch", "/operations-dispatch", "/dispatch", "#dispatch", "#operations/dispatch", "#operations-dispatch"],
    requiresAuth: true,
  },
  "hotspots": {
    tab: "hotspots",
    path: "/analytics/hotspots",
    label: "Phân tích điểm nóng & Dự báo 7 ngày",
    aliases: ["/analytics/hotspots", "/hotspot-analytics", "/hotspots", "#hotspots", "#analytics/hotspots", "#hotspot-analytics"],
    requiresAuth: true,
  },
  "emergency-alert": {
    tab: "emergency-alert",
    path: "/emergency/alerts",
    label: "Phát lệnh cảnh báo khẩn cấp Geofencing",
    aliases: ["/emergency/alerts", "/emergency-alert", "#emergency-alert", "#emergency/alerts", "#broadcast-alert"],
    requiresAuth: true,
  },
  "safety-check": {
    tab: "safety-check",
    path: "/emergency/safety-check",
    label: "Khảo sát an toàn cộng đồng (Safety Check)",
    aliases: ["/emergency/safety-check", "/safety-check", "#safety-check", "#emergency/safety-check"],
    requiresAuth: true,
  },
  "flood-sos": {
    tab: "flood-sos",
    path: "/emergency/flood-sos",
    label: "Cứu nạn ngập lụt khẩn cấp (Flood SOS)",
    aliases: ["/emergency/flood-sos", "/flood-sos", "#flood-sos", "#emergency/flood-sos", "#sos"],
    requiresAuth: false,
  },
  "incident-export": {
    tab: "incident-export",
    path: "/reports/incident-export",
    label: "Trích xuất & Báo cáo dữ liệu sự cố (Excel/PDF)",
    aliases: ["/reports/incident-export", "/incident-export", "#incident-export", "#reports/incident-export", "#export"],
    requiresAuth: false,
  },
  "admin-dashboard": {
    tab: "admin-dashboard",
    path: "/admin/activity-dashboard",
    label: "Thống kê hoạt động hệ thống toàn diện",
    aliases: [
      "/admin/activity-dashboard",
      "/admin/dashboard",
      "/admin-dashboard",
      "#admin-dashboard",
      "#admin/activity-dashboard",
      "#admin/dashboard",
      "#system-activity",
      "#admin-stats",
    ],
    requiresAuth: false,
  },

  // ── CÁC PHÂN HỆ NỀN TẢNG KHÁC ───────────────────────────────────────────
  "map": {
    tab: "map",
    path: "/map",
    label: "Bản đồ số WebGIS",
    aliases: ["/map", "/", "#map", ""],
    requiresAuth: false,
  },
  "dashboard": {
    tab: "dashboard",
    path: "/dashboard",
    label: "Chỉ số chất lượng không khí AQI",
    aliases: ["/dashboard", "#dashboard", "/aqi"],
    requiresAuth: true,
  },
  "auth": {
    tab: "auth",
    path: "/auth/login",
    label: "Xác thực tài khoản",
    aliases: ["/auth/login", "/auth", "/login", "/register", "#auth", "#login", "#register", "#devices", "/devices"],
    requiresAuth: false,
  },
  "rbac": {
    tab: "rbac",
    path: "/admin/rbac",
    label: "Phân quyền quản trị vai trò (RBAC)",
    aliases: ["/admin/rbac", "/rbac", "#rbac"],
    requiresAuth: true,
  },
  "users": {
    tab: "users",
    path: "/admin/users",
    label: "Quản lý người dùng hệ thống",
    aliases: ["/admin/users", "/users", "#users"],
    requiresAuth: true,
  },
  "profile": {
    tab: "profile",
    path: "/account/profile",
    label: "Hồ sơ cá nhân",
    aliases: ["/account/profile", "/profile", "#profile"],
    requiresAuth: true,
  },
  "friends": {
    tab: "friends",
    path: "/community/friends",
    label: "Mạng lưới kết nối bạn bè",
    aliases: ["/community/friends", "/friends", "#friends"],
    requiresAuth: true,
  },
  "settings": {
    tab: "settings",
    path: "/account/settings",
    label: "Cài đặt ứng dụng",
    aliases: ["/account/settings", "/settings", "#settings"],
    requiresAuth: true,
  },
  "penalties": {
    tab: "penalties",
    path: "/legal/penalties",
    label: "Tra cứu quy định & Chế tài xử phạt",
    aliases: ["/legal/penalties", "/penalties", "#penalties"],
    requiresAuth: true,
  },
  "penalty-reports": {
    tab: "penalty-reports",
    path: "/legal/penalty-reports",
    label: "Thống kê biên bản vi phạm",
    aliases: ["/legal/penalty-reports", "/penalty-reports", "#penalty-reports"],
    requiresAuth: true,
  },
  "posts": {
    tab: "posts",
    path: "/community/create-post",
    label: "Đăng tải bài viết cộng đồng",
    aliases: ["/community/create-post", "/posts", "/create-post", "#posts", "#create-post"],
    requiresAuth: true,
  },
  "report": {
    tab: "report",
    path: "/incidents/report",
    label: "Báo cáo sự cố môi trường",
    aliases: ["/incidents/report", "/report", "#report"],
    requiresAuth: true,
  },
  "incidents": {
    tab: "incidents",
    path: "/incidents/management",
    label: "Quản lý danh sách sự cố",
    aliases: ["/incidents/management", "/incidents", "#incidents"],
    requiresAuth: true,
  },
  "rewards": {
    tab: "rewards",
    path: "/rewards/wallet",
    label: "Ví điểm thưởng & Đổi quà sinh thái",
    aliases: ["/rewards/wallet", "/rewards", "/wallet", "#rewards", "#wallet", "#policy", "#catalog", "#vouchers"],
    requiresAuth: false,
  },
  "challenges": {
    tab: "challenges",
    path: "/community/challenges",
    label: "Thử thách sống xanh tuần",
    aliases: ["/community/challenges", "/challenges", "#challenges"],
    requiresAuth: false,
  },
  "audit-logs": {
    tab: "audit-logs",
    path: "/admin/audit-logs",
    label: "Nhật ký kiểm toán hệ thống",
    aliases: ["/admin/audit-logs", "/audit-logs", "#audit-logs", "#audit"],
    requiresAuth: false,
  },
  "handbook": {
    tab: "handbook",
    path: "/guide/waste-handbook",
    label: "Cẩm nang phân loại rác thải",
    aliases: ["/guide/waste-handbook", "/handbook", "#handbook", "#guide"],
    requiresAuth: false,
  },
  "leaderboard": {
    tab: "leaderboard",
    path: "/community/leaderboard",
    label: "Bảng vinh danh công dân xanh",
    aliases: ["/community/leaderboard", "/leaderboard", "#leaderboard", "#ranking"],
    requiresAuth: false,
  },
  "heatmap": {
    tab: "heatmap",
    path: "/analytics/climate-heatmap",
    label: "Bản đồ nhiệt đa chế độ",
    aliases: ["/analytics/climate-heatmap", "/heatmap", "#heatmap", "#climate-map"],
    requiresAuth: false,
  },
  "qr-scan": {
    tab: "qr-scan",
    path: "/scanner/qr-code",
    label: "Quét mã QR địa điểm",
    aliases: ["/scanner/qr-code", "/qr-scan", "#qr-scan", "#qr", "#scan"],
    requiresAuth: false,
  },
  "lucky-wheel": {
    tab: "lucky-wheel",
    path: "/rewards/lucky-wheel",
    label: "Vòng quay may mắn",
    aliases: ["/rewards/lucky-wheel", "/lucky-wheel", "#lucky-wheel", "#wheel", "#spin"],
    requiresAuth: false,
  },
  "milestone": {
    tab: "milestone",
    path: "/rewards/milestones",
    label: "Mốc điểm danh hiệu xanh",
    aliases: ["/rewards/milestones", "/milestone", "#milestone", "#tier-progress", "#tier"],
    requiresAuth: false,
  },
  "waste_categories": {
    tab: "waste_categories",
    path: "/admin/waste-categories",
    label: "Danh mục rác & SLA",
    aliases: ["/admin/waste-categories", "/waste-categories", "#waste-categories", "#waste_categories"],
    requiresAuth: true,
  },
  "recycling_facilities": {
    tab: "recycling_facilities",
    path: "/map/recycling-facilities",
    label: "Mạng lưới trạm tái chế",
    aliases: ["/map/recycling-facilities", "/recycling-facilities", "#recycling-facilities", "#recycling_facilities"],
    requiresAuth: false,
  },
  "messages": {
    tab: "messages",
    path: "/community/messages",
    label: "Tin nhắn & Đoạn chat",
    aliases: ["/community/messages", "/messages", "/chat", "#messages", "#chat"],
    requiresAuth: true,
  },
  "groups": {
    tab: "groups",
    path: "/community/groups",
    label: "Nhóm cộng đồng",
    aliases: ["/community/groups", "/groups", "#groups"],
    requiresAuth: true,
  },
  "ai-assistant": {
    tab: "ai-assistant",
    path: "/assistant/kira",
    label: "Trợ lý AI Kira",
    aliases: ["/assistant/kira", "/ai-assistant", "#ai-assistant", "#kira"],
    requiresAuth: false,
  },
  "events": {
    tab: "events",
    path: "/community/events",
    label: "Sự kiện Chủ Nhật Xanh",
    aliases: ["/community/events", "/events", "#events"],
    requiresAuth: false,
  },
  "fundraiser": {
    tab: "fundraiser",
    path: "/community/fundraiser",
    label: "Quỹ môi trường GreenSpot",
    aliases: ["/community/fundraiser", "/fundraiser", "/fundraiser-admin", "#fundraiser", "#fundraiser-admin", "#fundraiser/admin"],
    requiresAuth: false,
  },
};

/**
 * Phân tích URL hiện tại (ưu tiên pathname, fallback hash) để xác định Tab phù hợp.
 */
export function resolveTabFromUrl(
  pathname: string = window.location.pathname,
  hash: string = window.location.hash
): ActiveTab {
  const normPath = pathname.toLowerCase().replace(/\/+$/, "") || "/";
  const normHash = (hash.toLowerCase().split("?")[0] || "").replace(/\/+$/, "");

  // 1. Kiểm tra đối sánh chính xác pathname trước
  for (const tabKey of Object.keys(APP_ROUTES) as ActiveTab[]) {
    const route = APP_ROUTES[tabKey];
    if (route.path.toLowerCase() === normPath) {
      return route.tab;
    }
  }

  // 2. Kiểm tra đối sánh hash (nếu có)
  if (normHash && normHash !== "#" && normHash !== "#/") {
    for (const tabKey of Object.keys(APP_ROUTES) as ActiveTab[]) {
      const route = APP_ROUTES[tabKey];
      if (route.aliases.some((alias) => alias.toLowerCase() === normHash)) {
        return route.tab;
      }
    }
  }

  // 3. Kiểm tra đối sánh các bí danh (aliases) của pathname
  if (normPath !== "/") {
    for (const tabKey of Object.keys(APP_ROUTES) as ActiveTab[]) {
      const route = APP_ROUTES[tabKey];
      if (route.aliases.some((alias) => alias.toLowerCase() === normPath)) {
        return route.tab;
      }
    }
  }

  return "map";
}

/**
 * Điều hướng người dùng tới đường dẫn URL chuẩn đẹp (HTML5 History API không reload trang).
 */
export function navigateToRoute(
  tab: ActiveTab,
  searchParams?: Record<string, string | number | boolean | undefined>,
  replace: boolean = false
): void {
  const route = APP_ROUTES[tab];
  if (!route) return;

  let targetUrl = route.path;

  // Ghép các tham số truy vấn nếu có (VD: ?district=Quận+8)
  if (searchParams) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (v !== undefined && v !== null) {
        q.set(k, String(v));
      }
    }
    const qs = q.toString();
    if (qs) {
      targetUrl += `?${qs}`;
    }
  }

  // Cập nhật URL trên thanh địa chỉ trình duyệt không reload trang
  if (replace) {
    window.history.replaceState({ tab }, "", targetUrl);
  } else {
    window.history.pushState({ tab }, "", targetUrl);
  }

  // Bắn sự kiện popstate để các component lắng nghe tự đồng bộ trạng thái
  window.dispatchEvent(new PopStateEvent("popstate", { state: { tab } }));
}
