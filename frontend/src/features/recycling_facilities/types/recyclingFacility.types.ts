export interface RecyclingFacilityItem {
  facility_id: number;
  name: string;
  address: string;
  unit_id: number;
  unit_name?: string | null;
  district_name?: string | null;
  latitude: number;
  longitude: number;
  facility_code: string;
  accepted_waste_types: string[];
  operating_hours?: string | null;
  open_time: string;
  close_time: string;
  qr_code?: string | null;
  contact_phone?: string | null;
  managing_org?: string | null;
  is_active: boolean;
  version?: number;
  created_at: string;
  updated_at: string;
}

export interface RecyclingFacilityCreateRequest {
  name: string;
  address: string;
  unit_id: number;
  latitude: number;
  longitude: number;
  accepted_waste_types: string[];
  open_time?: string;
  close_time?: string;
  contact_phone?: string;
  managing_org?: string;
}

export interface RecyclingFacilityUpdateRequest {
  name: string;
  address: string;
  unit_id: number;
  latitude: number;
  longitude: number;
  accepted_waste_types: string[];
  open_time?: string;
  close_time?: string;
  is_active?: boolean;
  version?: number;
  contact_phone?: string;
  managing_org?: string;
}

export interface RecyclingFacilityListResponse {
  items: RecyclingFacilityItem[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  active_count: number;
  inactive_count: number;
}

export interface FacilityValidationCheckResponse {
  is_valid: boolean;
  message?: string | null;
  conflict_facility_name?: string | null;
}

export interface DistrictItem {
  unit_id: number;
  unit_name?: string;
  name?: string;
  unit_code?: string;
  unit_level?: string;
  hcmc_district_name?: string;
}

export interface FacilityFilterParams {
  page?: number;
  limit?: number;
  status?: "ALL" | "ACTIVE" | "INACTIVE";
  search?: string;
  unit_id?: number;
}

export interface WasteTypeOption {
  code: string;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
}

export const AVAILABLE_WASTE_TYPES: WasteTypeOption[] = [
  { code: "PIN_CU", label: "Pin & Ắc quy cũ", icon: "🔋", color: "#b91c1c", bgColor: "#fef2f2" },
  { code: "THIET_BI_DIEN_TU", label: "Thiết bị điện tử (E-waste)", icon: "💻", color: "#1d4ed8", bgColor: "#eff6ff" },
  { code: "DO_DIEN_TU_LON", label: "Đồ gia dụng & E-waste", icon: "📺", color: "#0369a1", bgColor: "#f0f9ff" },
  { code: "MUC_IN", label: "Hộp mực in", icon: "🖨️", color: "#4f46e5", bgColor: "#eef2ff" },
  { code: "VO_HOP_SUA", label: "Vỏ hộp sữa Tetra", icon: "🧃", color: "#0d9488", bgColor: "#f0fdfa" },
  { code: "NHUA_PET", label: "Nhựa chai PET", icon: "🥤", color: "#d97706", bgColor: "#fffbeb" },
  { code: "NHUA", label: "Rác nhựa tái chế", icon: "♻️", color: "#d97706", bgColor: "#fffbeb" },
  { code: "NHUA_TAI_CHE", label: "Nhựa tái chế", icon: "♻️", color: "#d97706", bgColor: "#fffbeb" },
  { code: "RAC_NHUA_BIEN", label: "Rác nhựa ven biển", icon: "🌊", color: "#0284c7", bgColor: "#f0f9ff" },
  { code: "GIAY_BIA", label: "Giấy & Bìa carton", icon: "📦", color: "#7c3aed", bgColor: "#f5f3ff" },
  { code: "GIAY", label: "Giấy & Sách báo", icon: "📄", color: "#7c3aed", bgColor: "#f5f3ff" },
  { code: "NHOM_KIM_LOAI", label: "Nhôm & Kim loại", icon: "⚙️", color: "#475569", bgColor: "#f8fafc" },
  { code: "KIM_LOAI", label: "Kim loại phế liệu", icon: "🔩", color: "#475569", bgColor: "#f8fafc" },
  { code: "THUY_TINH", label: "Chai lọ thuỷ tinh", icon: "🍾", color: "#059669", bgColor: "#ecfdf5" },
  { code: "BONG_DEN", label: "Bóng đèn huỳnh quang", icon: "💡", color: "#ca8a04", bgColor: "#fefce8" },
  { code: "RAC_HUU_CO", label: "Rác hữu cơ tại nguồn", icon: "🍃", color: "#16a34a", bgColor: "#f0fdf4" },
];

export const getWasteTypeBadge = (code: string): WasteTypeOption => {
  const found = AVAILABLE_WASTE_TYPES.find((w) => w.code.toUpperCase() === code.toUpperCase());
  if (found) return found;

  const cleanLabel = code
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return {
    code,
    label: cleanLabel,
    icon: "♻️",
    color: "#475569",
    bgColor: "#f1f5f9",
  };
};
