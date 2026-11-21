import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { ModuleViewLockedView } from '../components/ModuleViewLockedView';
import { ModulePermissionGuard } from '../components/ModulePermissionGuard';
import { useModulePermissions, usePermissions } from '../services/permissionGuard';
import type { IModulePermissionState } from '../types/permissionGuard.interface';
import { AUTH_STORAGE_KEYS } from '../../auth/types/auth.types';

vi.mock('../../../api/client', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: { permissions: [] } }),
    post: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

describe('Universal RBAC Guard Framework Unit & Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // =========================================================================
  // 1. KIỂM THỬ CUSTOM HOOK: useModulePermissions()
  // =========================================================================
  describe('Hook useModulePermissions', () => {
    it('Khách vãng lai (chưa đăng nhập) được xem WebGIS công cộng ở chế độ isViewOnly', () => {
      const { result } = renderHook(() => useModulePermissions('GIS_MAP'));

      expect(result.current.hasAccess).toBe(true);
      expect(result.current.hasView).toBe(true);
      expect(result.current.canCreate).toBe(false);
      expect(result.current.canUpdate).toBe(false);
      expect(result.current.canDelete).toBe(false);
      expect(result.current.canImport).toBe(false);
      expect(result.current.canExport).toBe(false);
      expect(result.current.isViewOnly).toBe(true);
      expect(result.current.canDo('VIEW')).toBe(true);
      expect(result.current.canDo('CREATE')).toBe(false);
    });

    it('Khách vãng lai bị chặn truy cập hoàn toàn đối với các phân hệ nội bộ (vd: INCIDENTS, ROLE)', () => {
      const { result } = renderHook(() => useModulePermissions('INCIDENTS'));

      expect(result.current.hasAccess).toBe(false);
      expect(result.current.hasView).toBe(false);
      expect(result.current.canCreate).toBe(false);
      expect(result.current.isViewOnly).toBe(false);
    });

    it('Khách vãng lai bị chặn hoàn toàn đối với phân hệ phân tích khí hậu AIR_QUALITY', () => {
      const { result } = renderHook(() => useModulePermissions('AIR_QUALITY'));

      expect(result.current.hasAccess).toBe(false);
      expect(result.current.hasView).toBe(false);
      expect(result.current.canCreate).toBe(false);
      expect(result.current.isViewOnly).toBe(false);
    });

    it('Hook usePermissions: canAccess chỉ cấp GIS_MAP, chặn AIR_QUALITY khi là khách vãng lai', () => {
      const { result } = renderHook(() => usePermissions());

      expect(result.current.canAccess('GIS_MAP')).toBe(true);
      expect(result.current.canAccess('AIR_QUALITY')).toBe(false);
    });

    it('Quản trị viên ADMIN luôn sở hữu 100% 7 cột quyền trên mọi module', () => {
      localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, 'mock_admin_token');
      localStorage.setItem(
        AUTH_STORAGE_KEYS.USER_INFO,
        JSON.stringify({
          user_id: 'admin-123',
          email: 'admin@greenspot.vn',
          role: 'ADMIN',
          status: 'ACTIVE',
        })
      );

      const { result } = renderHook(() => useModulePermissions('CAMPAIGNS'));

      expect(result.current.hasAccess).toBe(true);
      expect(result.current.hasView).toBe(true);
      expect(result.current.canCreate).toBe(true);
      expect(result.current.canUpdate).toBe(true);
      expect(result.current.canDelete).toBe(true);
      expect(result.current.canImport).toBe(true);
      expect(result.current.canExport).toBe(true);
      expect(result.current.isViewOnly).toBe(false);
      expect(result.current.canDo('DELETE')).toBe(true);
    });

    it('Tài khoản chỉ có quyền ACCESS (GUARD_ACCESS_ONLY) -> hasAccess=true, hasView=false', () => {
      localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, 'mock_token');
      localStorage.setItem(
        AUTH_STORAGE_KEYS.USER_INFO,
        JSON.stringify({
          user_id: 'user-access-only',
          email: 'guard_access_only@greenspot.vn',
          role: 'GUARD_ACCESS_ONLY',
          status: 'ACTIVE',
          permissions: ['GIS_MAP:ACCESS'],
        })
      );
      localStorage.setItem('eco_user_permissions', JSON.stringify(['GIS_MAP:ACCESS']));

      const { result } = renderHook(() => useModulePermissions('GIS_MAP'));

      expect(result.current.hasAccess).toBe(true);
      expect(result.current.hasView).toBe(false);
      expect(result.current.canCreate).toBe(false);
      expect(result.current.isViewOnly).toBe(false);
    });

    it('Tài khoản Chỉ Xem (GUARD_VIEW_ONLY) -> hasAccess=true, hasView=true, isViewOnly=true, canCreate=false', () => {
      localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, 'mock_token');
      localStorage.setItem(
        AUTH_STORAGE_KEYS.USER_INFO,
        JSON.stringify({
          user_id: 'user-view-only',
          email: 'guard_view_only@greenspot.vn',
          role: 'GUARD_VIEW_ONLY',
          status: 'ACTIVE',
          permissions: ['GIS_MAP:ACCESS', 'GIS_MAP:VIEW'],
        })
      );
      localStorage.setItem('eco_user_permissions', JSON.stringify(['GIS_MAP:ACCESS', 'GIS_MAP:VIEW']));

      const { result } = renderHook(() => useModulePermissions('GIS_MAP'));

      expect(result.current.hasAccess).toBe(true);
      expect(result.current.hasView).toBe(true);
      expect(result.current.canCreate).toBe(false);
      expect(result.current.canUpdate).toBe(false);
      expect(result.current.canDelete).toBe(false);
      expect(result.current.isViewOnly).toBe(true);
    });

    it('Tài khoản Toàn Quyền (GUARD_FULL_EDITOR) -> mở đầy đủ 7 cột', () => {
      const fullPerms = [
        'GIS_MAP:ACCESS',
        'GIS_MAP:VIEW',
        'GIS_MAP:CREATE',
        'GIS_MAP:UPDATE',
        'GIS_MAP:DELETE',
        'GIS_MAP:IMPORT',
        'GIS_MAP:EXPORT',
      ];
      localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, 'mock_token');
      localStorage.setItem(
        AUTH_STORAGE_KEYS.USER_INFO,
        JSON.stringify({
          user_id: 'user-full-editor',
          email: 'guard_full_editor@greenspot.vn',
          role: 'GUARD_FULL_EDITOR',
          status: 'ACTIVE',
          permissions: fullPerms,
        })
      );
      localStorage.setItem('eco_user_permissions', JSON.stringify(fullPerms));

      const { result } = renderHook(() => useModulePermissions('GIS_MAP'));

      expect(result.current.hasAccess).toBe(true);
      expect(result.current.hasView).toBe(true);
      expect(result.current.canCreate).toBe(true);
      expect(result.current.canUpdate).toBe(true);
      expect(result.current.canDelete).toBe(true);
      expect(result.current.canImport).toBe(true);
      expect(result.current.canExport).toBe(true);
      expect(result.current.isViewOnly).toBe(false);
    });
  });

  // =========================================================================
  // 2. KIỂM THỬ COMPONENT: <ModuleViewLockedView />
  // =========================================================================
  describe('Component ModuleViewLockedView', () => {
    it('Render đầy đủ thông tin khóa xem và gọi callback khi bấm nút', () => {
      const mockHome = vi.fn();
      const mockAuth = vi.fn();

      render(
        <ModuleViewLockedView
          moduleCode="CAMPAIGNS"
          moduleName="Chiến dịch môi trường & Điểm xanh"
          onNavigateHome={mockHome}
          onNavigateToAuth={mockAuth}
        />
      );

      expect(screen.getByText('Dữ Liệu Đang Bị Khóa Xem')).toBeInTheDocument();
      expect(screen.getByText('CAMPAIGNS')).toBeInTheDocument();
      expect(screen.getByText(/Chiến dịch môi trường & Điểm xanh/i)).toBeInTheDocument();

      // Bấm nút quay lại bản đồ
      const homeBtn = screen.getByRole('button', { name: /Về bản đồ WebGIS/i });
      fireEvent.click(homeBtn);
      expect(mockHome).toHaveBeenCalledTimes(1);

      // Bấm nút đổi tài khoản
      const authBtn = screen.getByRole('button', { name: /Đăng nhập tài khoản khác/i });
      fireEvent.click(authBtn);
      expect(mockAuth).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================================
  // 3. KIỂM THỬ COMPONENT: <ModulePermissionGuard /> (3 TẦNG BẢO VỆ)
  // =========================================================================
  describe('Component ModulePermissionGuard (3 Tầng Bảo Vệ)', () => {
    it('TẦNG 1: Chặn vào màn hình khi không có ACCESS (Hiển thị 403 AccessDeniedView)', () => {
      // Mock tài khoản chỉ có quyền xem thời tiết, không có quyền INCIDENTS
      localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, 'mock_token');
      localStorage.setItem(
        AUTH_STORAGE_KEYS.USER_INFO,
        JSON.stringify({
          user_id: 'test-user',
          email: 'guard_no_access@greenspot.vn',
          role: 'GUARD_NO_ACCESS',
          permissions: ['WEATHER:ACCESS', 'WEATHER:VIEW'],
        })
      );
      localStorage.setItem('eco_user_permissions', JSON.stringify(['WEATHER:ACCESS', 'WEATHER:VIEW']));

      render(
        <ModulePermissionGuard
          moduleCode="INCIDENTS"
          moduleName="Báo cáo sự cố môi trường"
        >
          <div data-testid="protected-content">Nội dung sự cố</div>
        </ModulePermissionGuard>
      );

      // Nội dung được bảo vệ không được phép xuất hiện
      expect(screen.queryByTestId('protected-content')).toBeNull();
      // Phải hiển thị màn hình 403
      expect(screen.getByText(/Từ chối quyền truy cập \(403 Forbidden\)/i)).toBeInTheDocument();
      expect(screen.getByText(/INCIDENTS/i)).toBeInTheDocument();
    });

    it('TẦNG 2: Khóa xem khi có ACCESS nhưng thiếu VIEW (Hiển thị ModuleViewLockedView)', () => {
      localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, 'mock_token');
      localStorage.setItem(
        AUTH_STORAGE_KEYS.USER_INFO,
        JSON.stringify({
          user_id: 'test-user',
          email: 'guard_access_only@greenspot.vn',
          role: 'GUARD_ACCESS_ONLY',
          permissions: ['INCIDENTS:ACCESS'], // Chỉ có ACCESS, không có VIEW
        })
      );
      localStorage.setItem('eco_user_permissions', JSON.stringify(['INCIDENTS:ACCESS']));

      render(
        <ModulePermissionGuard
          moduleCode="INCIDENTS"
          moduleName="Báo cáo sự cố môi trường"
        >
          <div data-testid="protected-content">Nội dung sự cố</div>
        </ModulePermissionGuard>
      );

      expect(screen.queryByTestId('protected-content')).toBeNull();
      // Hiển thị giao diện khóa xem
      expect(screen.getByText('Dữ Liệu Đang Bị Khóa Xem')).toBeInTheDocument();
      expect(screen.getByText(/Chế độ khóa xem/i)).toBeInTheDocument();
    });

    it('TẦNG 2: Cho phép hiển thị fallbackLockedView tùy chọn nếu truyền vào props', () => {
      localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, 'mock_token');
      localStorage.setItem(
        AUTH_STORAGE_KEYS.USER_INFO,
        JSON.stringify({
          user_id: 'test-user',
          email: 'guard_access_only@greenspot.vn',
          role: 'GUARD_ACCESS_ONLY',
          permissions: ['INCIDENTS:ACCESS'],
        })
      );
      localStorage.setItem('eco_user_permissions', JSON.stringify(['INCIDENTS:ACCESS']));

      render(
        <ModulePermissionGuard
          moduleCode="INCIDENTS"
          moduleName="Báo cáo sự cố môi trường"
          fallbackLockedView={<div data-testid="custom-locked-view">Giao diện khóa tùy biến</div>}
        >
          <div data-testid="protected-content">Nội dung sự cố</div>
        </ModulePermissionGuard>
      );

      expect(screen.queryByTestId('protected-content')).toBeNull();
      expect(screen.getByTestId('custom-locked-view')).toBeInTheDocument();
    });

    it('TẦNG 3: Render Props hoạt động chính xác khi có cả ACCESS và VIEW', () => {
      // Cấp quyền ACCESS + VIEW + CREATE nhưng KHÔNG CÓ DELETE
      localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, 'mock_token');
      localStorage.setItem(
        AUTH_STORAGE_KEYS.USER_INFO,
        JSON.stringify({
          user_id: 'test-user',
          email: 'tester@greenspot.vn',
          role: 'TESTER',
          permissions: ['CAMPAIGNS:ACCESS', 'CAMPAIGNS:VIEW', 'CAMPAIGNS:CREATE'],
        })
      );
      localStorage.setItem(
        'eco_user_permissions',
        JSON.stringify(['CAMPAIGNS:ACCESS', 'CAMPAIGNS:VIEW', 'CAMPAIGNS:CREATE'])
      );

      render(
        <ModulePermissionGuard
          moduleCode="CAMPAIGNS"
          moduleName="Chiến dịch môi trường"
        >
          {(perms: IModulePermissionState) => (
            <div data-testid="campaigns-panel">
              {perms.canCreate && <button data-testid="btn-create">Tạo chiến dịch</button>}
              {perms.canDelete && <button data-testid="btn-delete">Xóa chiến dịch</button>}
              <span data-testid="view-only-flag">{String(perms.isViewOnly)}</span>
            </div>
          )}
        </ModulePermissionGuard>
      );

      expect(screen.getByTestId('campaigns-panel')).toBeInTheDocument();
      expect(screen.getByTestId('btn-create')).toBeInTheDocument();
      expect(screen.queryByTestId('btn-delete')).toBeNull(); // Thiếu quyền DELETE
      expect(screen.getByTestId('view-only-flag')).toHaveTextContent('false');
    });
  });
});
