import api from "../api/client";

export type LanguageCode = "vi" | "en";

export interface I18nApiResponse {
  status: string;
  lang: string;
  engine: string;
  total_keys: number;
  translations: Record<string, string>;
}

// Bộ từ điển dự phòng (fallback) phòng khi Backend Python tạm thời offline
const FALLBACK_TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  vi: {
    "app.title": "GreenSpot WebGIS & Quan Trắc Môi Trường",
    "app.subtitle": "Nền tảng giám sát không gian xanh, ngập lụt & chất lượng không khí",
    "app.nav_map": "Bản đồ WebGIS",
    "app.nav_dashboard": "Phân tích AQI & Khí hậu",
    "app.btn_check_backend": "Kiểm tra Backend",
    "app.status_online": "Hệ thống đang hoạt động",
    "app.status_offline": "Mất kết nối máy chủ",
    "app.loading": "Đang tải dữ liệu...",
    "common.vietnamese": "Tiếng Việt",
    "common.english": "English",
    "common.language": "Ngôn ngữ",
    "common.powered_by": "Xử lý bởi Backend Python (python-i18n)",
  },
  en: {
    "app.title": "GreenSpot WebGIS & Environmental Monitoring",
    "app.subtitle": "Smart platform for green spaces, urban flooding & air quality surveillance",
    "app.nav_map": "WebGIS Map",
    "app.nav_dashboard": "AQI & Climate Analytics",
    "app.btn_check_backend": "Check Backend",
    "app.status_online": "System is online",
    "app.status_offline": "Server disconnected",
    "app.loading": "Loading data...",
    "common.vietnamese": "Tiếng Việt",
    "common.english": "English",
    "common.language": "Language",
    "common.powered_by": "Powered by Python Backend (python-i18n)",
  },
};

/**
 * Gọi API Backend FastAPI (sử dụng thư viện python-i18n) để nạp bộ từ điển
 */
export async function fetchBackendTranslations(lang: LanguageCode): Promise<{
  translations: Record<string, string>;
  isBackend: boolean;
}> {
  try {
    const response = await api.get<I18nApiResponse>(`/api/v1/i18n/translations?lang=${lang}&flat=true`, {
      timeout: 3000,
    });
    if (response.data && response.data.translations) {
      return {
        translations: response.data.translations,
        isBackend: true,
      };
    }
  } catch (err) {
    console.warn("[i18nService] Không thể kết nối tới Backend i18n API, sử dụng từ điển fallback nội bộ:", err);
  }

  return {
    translations: FALLBACK_TRANSLATIONS[lang] || FALLBACK_TRANSLATIONS.vi,
    isBackend: false,
  };
}

/**
 * Gọi hàm i18n.t() trực tiếp trên Backend Python thông qua API POST /api/v1/i18n/translate
 */
export async function translateSingleKeyOnBackend(key: string, lang: LanguageCode): Promise<string> {
  try {
    const response = await api.post("/api/v1/i18n/translate", { key, lang });
    if (response.data && response.data.translated) {
      return response.data.translated;
    }
  } catch (err) {
    console.warn(`[i18nService] Lỗi dịch key '${key}' trên backend:`, err);
  }
  return FALLBACK_TRANSLATIONS[lang]?.[key] || key;
}
