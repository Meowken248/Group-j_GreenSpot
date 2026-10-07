import { useState, useEffect, useCallback } from 'react';
import api from '../../../api/client';
import { AUTH_STORAGE_KEYS } from '../../auth/types/auth.types';
import type { IModulePermissionState } from '../types/permissionGuard.interface';
import type { AclActionType } from '../types/rbac.types';

export const PERMISSION_STORAGE_KEY = 'eco_user_permissions';

/**
 * Ánh xạ giữa danh mục môi trường (WebGIS) và mã Module RBAC
 */
export const CATEGORY_TO_MODULE: Record<string, string> = {
  incident: 'INCIDENTS',
  green_spot: 'GREEN_SPOTS',
  recycling: 'RECYCLING_FACILITIES',
  sensor: 'IOT_SENSORS',
  flood: 'FLOOD_WARNINGS',
};

export interface UserPermissionProfile {
  user_id: string;
  email: string;
  full_name: string;
  role_id: number | null;
  role_code: string;
  role_name: string;
  permissions: string[];
}

/**
 * Lấy danh sách quyền hạn hiện tại đã lưu trữ trong localStorage
 */
export function getStoredPermissions(): string[] {
  try {
    const raw = localStorage.getItem(PERMISSION_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
    // Nếu chưa lưu riêng, kiểm tra trong eco_user_info
    const userRaw = localStorage.getItem(AUTH_STORAGE_KEYS.USER_INFO);
    if (userRaw) {
      const u = JSON.parse(userRaw);
      if (Array.isArray(u.permissions)) {
        return u.permissions;
      }
    }
  } catch {
    // Bỏ qua lỗi parse
  }
  return [];
}

/**
 * Kiểm tra xem người dùng hiện tại có quyền hạn cụ thể hay không
 * @param moduleCode Mã module (vd: GIS_MAP, AIR_QUALITY, INCIDENTS, ROLE, USER_MANAGEMENT)
 * @param action Hành động (mặc định là 'ACCESS', hoặc 'VIEW', 'CREATE', 'UPDATE', 'DELETE')
 */
export function checkUserPermission(moduleCode: string, action: string = 'ACCESS'): boolean {
  try {
    const token = localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
    const userRaw = localStorage.getItem(AUTH_STORAGE_KEYS.USER_INFO);
    
    // Nếu chưa đăng nhập: Cho phép khách vãng lai xem công cộng WebGIS và AQI
    if (!token || !userRaw) {
      if (action === 'ACCESS' || action === 'VIEW') {
        return moduleCode === 'GIS_MAP' || moduleCode === 'AIR_QUALITY' || moduleCode === 'WEATHER';
      }
      return false;
    }

    const currentUser = JSON.parse(userRaw);

    // 1. Quản trị viên tối cao (ADMIN) luôn sở hữu 100% quyền hạn
    if (currentUser.role === 'ADMIN') {
      return true;
    }

    // 2. Đối với các vai trò khác: Kiểm tra mã quyền trong danh sách permissions
    const perms = getStoredPermissions();
    const permCode = `${moduleCode}:${action}`;

    return perms.includes(permCode);
  } catch {
    return false;
  }
}

/**
 * Tải danh sách quyền thời gian thực từ Backend
 */
export async function fetchMyPermissions(): Promise<string[]> {
  try {
    const token = localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) {
      localStorage.removeItem(PERMISSION_STORAGE_KEY);
      return [];
    }

    const res = await api.get('/api/v1/rbac/my-permissions', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const perms: string[] = res.data.permissions || [];
    localStorage.setItem(PERMISSION_STORAGE_KEY, JSON.stringify(perms));
    
    // Đồng bộ lại vào eco_user_info nếu cần
    const userRaw = localStorage.getItem(AUTH_STORAGE_KEYS.USER_INFO);
    if (userRaw) {
      const u = JSON.parse(userRaw);
      u.permissions = perms;
      localStorage.setItem(AUTH_STORAGE_KEYS.USER_INFO, JSON.stringify(u));
    }

    window.dispatchEvent(new Event('permissions_change'));
    return perms;
  } catch (err) {
    console.warn('Không thể tải quyền người dùng:', err);
    return getStoredPermissions();
  }
}

/**
 * React Hook kiểm tra quyền truy cập và tự động cập nhật khi quyền thay đổi
 */
export function usePermissions() {
  const [permissions, setPermissions] = useState<string[]>(() => getStoredPermissions());
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEYS.USER_INFO);
      const token = localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
      return token && raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const refreshPermissions = useCallback(async () => {
    const updated = await fetchMyPermissions();
    setPermissions(updated);
  }, []);

  useEffect(() => {
    const handleAuthChange = () => {
      try {
        const raw = localStorage.getItem(AUTH_STORAGE_KEYS.USER_INFO);
        const token = localStorage.getItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN);
        const user = token && raw ? JSON.parse(raw) : null;
        setCurrentUser(user);
        if (user) {
          fetchMyPermissions().then(setPermissions);
        } else {
          setPermissions([]);
          localStorage.removeItem(PERMISSION_STORAGE_KEY);
        }
      } catch {
        setCurrentUser(null);
        setPermissions([]);
      }
    };

    const handlePermChange = () => {
      setPermissions(getStoredPermissions());
    };

    window.addEventListener('auth_change', handleAuthChange);
    window.addEventListener('permissions_change', handlePermChange);
    window.addEventListener('storage', handleAuthChange);

    // Tự động tải permissions lần đầu nếu đang có token
    if (currentUser) {
      fetchMyPermissions().then(setPermissions);
    }

    return () => {
      window.removeEventListener('auth_change', handleAuthChange);
      window.removeEventListener('permissions_change', handlePermChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, []);

  /**
   * Kiểm tra quyền truy cập module
   */
  const canAccess = useCallback(
    (moduleCode: string): boolean => {
      // Khách vãng lai chưa đăng nhập
      if (!currentUser) {
        return moduleCode === 'GIS_MAP' || moduleCode === 'AIR_QUALITY' || moduleCode === 'WEATHER';
      }
      // Admin luôn có quyền
      if (currentUser.role === 'ADMIN') {
        return true;
      }
      return permissions.includes(`${moduleCode}:ACCESS`);
    },
    [currentUser, permissions]
  );

  /**
   * Kiểm tra hành động cụ thể trên module
   */
  const canDo = useCallback(
    (moduleCode: string, action: string): boolean => {
      if (!currentUser) return false;
      if (currentUser.role === 'ADMIN') return true;
      return permissions.includes(`${moduleCode}:${action}`);
    },
    [currentUser, permissions]
  );

  return {
    currentUser,
    permissions,
    canAccess,
    canDo,
    refreshPermissions,
  };
}

/**
 * React Hook kiểm tra quyền hạn chi tiết của 1 Module theo chuẩn 7 cột ACL (IModulePermissionState)
 * @param moduleCode Mã module (vd: 'GIS_MAP', 'INCIDENTS', 'CAMPAIGNS')
 */
export function useModulePermissions(moduleCode: string): IModulePermissionState {
  const { currentUser, permissions } = usePermissions();

  const isGuest = !currentUser;
  const isAdmin = currentUser?.role === 'ADMIN';

  const checkAction = useCallback(
    (action: string): boolean => {
      if (isAdmin) {
        return true;
      }
      if (isGuest) {
        if (action === 'ACCESS' || action === 'VIEW') {
          return moduleCode === 'GIS_MAP' || moduleCode === 'AIR_QUALITY' || moduleCode === 'WEATHER';
        }
        return false;
      }
      return permissions.includes(`${moduleCode}:${action}`);
    },
    [isAdmin, isGuest, moduleCode, permissions]
  );

  const hasAccess = checkAction('ACCESS');
  const hasView = checkAction('VIEW');
  const canCreate = checkAction('CREATE');
  const canUpdate = checkAction('UPDATE');
  const canDelete = checkAction('DELETE');
  const canImport = checkAction('IMPORT');
  const canExport = checkAction('EXPORT');

  const isViewOnly = hasView && !canCreate && !canUpdate && !canDelete && !canImport && !canExport;

  const canDo = useCallback(
    (action: AclActionType): boolean => {
      return checkAction(action);
    },
    [checkAction]
  );

  return {
    hasAccess,
    hasView,
    canCreate,
    canUpdate,
    canDelete,
    canImport,
    canExport,
    isViewOnly,
    canDo,
  };
}
