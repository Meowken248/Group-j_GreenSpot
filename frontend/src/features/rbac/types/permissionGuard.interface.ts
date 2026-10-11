import type { ReactNode } from "react";
import type { AclActionType } from "./rbac.types";

/**
 * 1. Interface đại diện cho trạng thái 7 cột quyền của một Module
 */
export interface IModulePermissionState {
  /** Cột 1: TRUY CẬP (Có quyền vào đường link / menu phân hệ) */
  hasAccess: boolean;

  /** Cột 2: XEM (Có quyền đọc và hiển thị dữ liệu / bản đồ) */
  hasView: boolean;

  /** Cột 3: THÊM (Có quyền tạo mới bản ghi / báo cáo sự cố) */
  canCreate: boolean;

  /** Cột 4: CẬP NHẬT (Có quyền chỉnh sửa thông tin / cập nhật trạng thái) */
  canUpdate: boolean;

  /** Cột 5: XOÁ (Có quyền xóa dữ liệu) */
  canDelete: boolean;

  /** Cột 6: IMPORT (Có quyền nhập file dữ liệu hàng loạt) */
  canImport: boolean;

  /** Cột 7: EXPORT (Có quyền xuất dữ liệu / tải file báo cáo) */
  canExport: boolean;

  /** Cờ tiện ích: Đang ở chế độ CHỈ XEM (Có View nhưng KHÔNG có bất kỳ quyền thao tác nào) */
  isViewOnly: boolean;

  /** Hàm kiểm tra linh hoạt theo tên hành động ACL */
  canDo: (action: AclActionType) => boolean;
}

/**
 * 2. Interface Props cho Component bảo vệ màn hình: <ModulePermissionGuard />
 */
export interface IModulePermissionGuardProps {
  /** Mã định danh duy nhất của module (ví dụ: 'GIS_MAP', 'INCIDENTS', 'CAMPAIGNS') */
  moduleCode: string;

  /** Tên tiếng Việt hiển thị của module (ví dụ: 'Bản đồ số WebGIS') */
  moduleName: string;

  /**
   * Tùy chọn: Giao diện thay thế khi tài khoản chỉ có quyền TRUY CẬP nhưng KHÔNG CÓ quyền XEM.
   * Nếu không truyền, hệ thống tự động hiển thị màn hình chuẩn <ModuleViewLockedView />.
   */
  fallbackLockedView?: ReactNode;

  /**
   * Nội dung bên trong của màn hình.
   * Có thể truyền trực tiếp ReactNode, hoặc truyền dạng Render Props function
   * để nhận về đối tượng IModulePermissionState kiểm soát các nút bấm.
   */
  children: ReactNode | ((perms: IModulePermissionState) => ReactNode);
}

/**
 * 3. Interface Props cho Màn hình thông báo khóa xem: <ModuleViewLockedView />
 */
export interface IModuleViewLockedViewProps {
  moduleCode: string;
  moduleName: string;
  onNavigateHome?: () => void;
  onNavigateToAuth?: () => void;
}

/**
 * 4. Interface cho Custom Hook kiểm tra quyền theo module
 */
export type IUseModulePermissionsHook = (moduleCode: string) => IModulePermissionState;

/**
 * 5. Interface định nghĩa cấu hình của một Module chuẩn trong hệ thống
 */
export interface IModuleMetadata {
  code: string;
  name: string;
  routePath: string;
  icon?: string;
  supportedActions: AclActionType[];
}

/**
 * Danh bạ siêu dữ liệu chuẩn hóa của 15 phân hệ GreenSpot
 */
export const MODULE_REGISTRY: Record<string, IModuleMetadata> = {
  GIS_MAP: {
    code: "GIS_MAP",
    name: "Bản đồ số WebGIS",
    routePath: "#map",
    icon: "🗺️",
    supportedActions: ["ACCESS", "VIEW", "CREATE", "UPDATE", "DELETE", "IMPORT", "EXPORT"],
  },
  INCIDENTS: {
    code: "INCIDENTS",
    name: "Báo cáo sự cố môi trường",
    routePath: "#incidents",
    icon: "🚨",
    supportedActions: ["ACCESS", "VIEW", "CREATE", "UPDATE", "DELETE", "IMPORT", "EXPORT"],
  },
  GREEN_SPOTS: {
    code: "GREEN_SPOTS",
    name: "Điểm xanh & Công viên sinh thái",
    routePath: "#green-spots",
    icon: "🌳",
    supportedActions: ["ACCESS", "VIEW", "CREATE", "UPDATE", "DELETE", "IMPORT", "EXPORT"],
  },
  RECYCLING_FACILITIES: {
    code: "RECYCLING_FACILITIES",
    name: "Trạm thu gom & Điểm tái chế",
    routePath: "#recycling",
    icon: "♻️",
    supportedActions: ["ACCESS", "VIEW", "CREATE", "UPDATE", "DELETE", "IMPORT", "EXPORT"],
  },
  IOT_SENSORS: {
    code: "IOT_SENSORS",
    name: "Trạm quan trắc IoT & Cảm biến",
    routePath: "#sensors",
    icon: "📡",
    supportedActions: ["ACCESS", "VIEW", "CREATE", "UPDATE", "DELETE", "IMPORT", "EXPORT"],
  },
  FLOOD_WARNINGS: {
    code: "FLOOD_WARNINGS",
    name: "Cảnh báo ngập lụt & Triều cường",
    routePath: "#flood",
    icon: "🌊",
    supportedActions: ["ACCESS", "VIEW", "CREATE", "UPDATE", "DELETE", "IMPORT", "EXPORT"],
  },
  AIR_QUALITY: {
    code: "AIR_QUALITY",
    name: "Chỉ số chất lượng không khí AQI",
    routePath: "#dashboard",
    icon: "💨",
    supportedActions: ["ACCESS", "VIEW", "CREATE", "UPDATE", "DELETE", "IMPORT", "EXPORT"],
  },
  WEATHER: {
    code: "WEATHER",
    name: "Khí tượng & Dự báo thời tiết",
    routePath: "#weather",
    icon: "☀️",
    supportedActions: ["ACCESS", "VIEW", "CREATE", "UPDATE", "DELETE", "IMPORT", "EXPORT"],
  },
  DISPATCH_TASKS: {
    code: "DISPATCH_TASKS",
    name: "Phân công & Điều phối hiện trường",
    routePath: "#dispatch",
    icon: "📋",
    supportedActions: ["ACCESS", "VIEW", "CREATE", "UPDATE", "DELETE", "IMPORT", "EXPORT"],
  },
  CITIZEN_FEEDBACK: {
    code: "CITIZEN_FEEDBACK",
    name: "Phản ánh & Đóng góp ý kiến",
    routePath: "#feedback",
    icon: "💬",
    supportedActions: ["ACCESS", "VIEW", "CREATE", "UPDATE", "DELETE", "IMPORT", "EXPORT"],
  },
  CAMPAIGNS: {
    code: "CAMPAIGNS",
    name: "Chiến dịch môi trường & Điểm xanh",
    routePath: "#campaigns",
    icon: "📢",
    supportedActions: ["ACCESS", "VIEW", "CREATE", "UPDATE", "DELETE", "IMPORT", "EXPORT"],
  },
  USER_MANAGEMENT: {
    code: "USER_MANAGEMENT",
    name: "Quản lý người dùng & Tài khoản",
    routePath: "#users",
    icon: "👥",
    supportedActions: ["ACCESS", "VIEW", "CREATE", "UPDATE", "DELETE", "IMPORT", "EXPORT"],
  },
  ROLE: {
    code: "ROLE",
    name: "Phân quyền vai trò",
    routePath: "#rbac",
    icon: "🛡️",
    supportedActions: ["ACCESS", "VIEW", "CREATE", "UPDATE", "DELETE", "IMPORT", "EXPORT"],
  },
  STATISTICS: {
    code: "STATISTICS",
    name: "Thống kê & Báo cáo tổng hợp",
    routePath: "#statistics",
    icon: "📊",
    supportedActions: ["ACCESS", "VIEW", "CREATE", "UPDATE", "DELETE", "IMPORT", "EXPORT"],
  },
  AUDIT_LOG: {
    code: "AUDIT_LOG",
    name: "Nhật ký kiểm toán hệ thống",
    routePath: "#audit",
    icon: "📜",
    supportedActions: ["ACCESS", "VIEW", "CREATE", "UPDATE", "DELETE", "IMPORT", "EXPORT"],
  },
};
