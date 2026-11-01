import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import api from '../client';
import { AUTH_STORAGE_KEYS } from '../../features/auth/types/auth.types';
import {
  triggerSessionExpired,
  resetSessionExpired,
  isSessionExpiredActive,
  subscribeSessionExpired,
} from '../../features/auth/services/sessionManager';

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  return {
    ...actual,
    default: {
      ...actual.default,
      post: vi.fn(),
      create: actual.default.create,
    },
  };
});

describe('Axios Client & Interceptor (Giai đoạn 5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    resetSessionExpired();
  });

  it('tự động đính kèm Authorization header nếu có access token trong localStorage', async () => {
    localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, 'my_access_token');
    
    // Test through interceptor handler directly
    const reqInterceptor = (api.interceptors.request as any).handlers[0];
    const config = await reqInterceptor.fulfilled({ headers: {} });

    expect(config.headers.Authorization).toBe('Bearer my_access_token');
  });

  it('dừng gửi các yêu cầu tiếp theo khi sessionExpiredActive là true', async () => {
    localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, 'my_token');
    triggerSessionExpired();

    const reqInterceptor = (api.interceptors.request as any).handlers[0];
    await expect(reqInterceptor.fulfilled({ headers: {} })).rejects.toThrow(
      'SESSION_EXPIRED_ACTIVE'
    );
  });

  it('kích hoạt SessionExpiredModal khi nhận lỗi SESSION_INVALID từ máy chủ', async () => {
    localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, 'token_xyz');
    localStorage.setItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN, 'refresh_xyz');

    const listener = vi.fn();
    const unsub = subscribeSessionExpired(listener);

    const resInterceptor = (api.interceptors.response as any).handlers[0];
    const mockError = {
      config: { url: '/api/v1/auth/sessions' },
      response: {
        status: 401,
        data: { error_code: 'SESSION_INVALID', message: 'Vui lòng đăng nhập lại' },
      },
    };

    await expect(resInterceptor.rejected(mockError)).rejects.toBeDefined();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(isSessionExpiredActive()).toBe(true);
    unsub();
  });

  it('không kích hoạt Popup nếu không có token trong localStorage từ đầu', async () => {
    const listener = vi.fn();
    const unsub = subscribeSessionExpired(listener);

    const resInterceptor = (api.interceptors.response as any).handlers[0];
    const mockError = {
      config: { url: '/api/v1/auth/sessions' },
      response: {
        status: 401,
        data: { error_code: 'SESSION_INVALID' },
      },
    };

    await expect(resInterceptor.rejected(mockError)).rejects.toBeDefined();

    expect(listener).not.toHaveBeenCalled();
    expect(isSessionExpiredActive()).toBe(false);
    unsub();
  });

  it('cho phép gửi các endpoint xác thực công khai ngay cả khi sessionExpiredActive là true', async () => {
    localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, 'old_expired_token');
    triggerSessionExpired();

    const reqInterceptor = (api.interceptors.request as any).handlers[0];
    const loginConfig = await reqInterceptor.fulfilled({
      headers: {},
      url: '/api/v1/auth/login',
    });

    expect(loginConfig).toBeDefined();
    // Không đính kèm Bearer token cũ vào endpoint đăng nhập
    expect(loginConfig.headers.Authorization).toBeUndefined();
  });

  it('không can thiệp vào lỗi 401 của endpoint đăng nhập công khai để UI tự hiển thị thông báo', async () => {
    localStorage.setItem(AUTH_STORAGE_KEYS.ACCESS_TOKEN, 'token_xyz');
    localStorage.setItem(AUTH_STORAGE_KEYS.REFRESH_TOKEN, 'refresh_xyz');

    const listener = vi.fn();
    const unsub = subscribeSessionExpired(listener);

    const resInterceptor = (api.interceptors.response as any).handlers[0];
    const mockLoginError = {
      config: { url: '/api/v1/auth/login' },
      response: {
        status: 401,
        data: { error_code: 'INVALID_CREDENTIALS', message: 'Email hoặc mật khẩu không đúng' },
      },
    };

    await expect(resInterceptor.rejected(mockLoginError)).rejects.toEqual(mockLoginError);

    // Không được kích hoạt popup hết hạn khi chỉ là đăng nhập sai mật khẩu
    expect(listener).not.toHaveBeenCalled();
    expect(isSessionExpiredActive()).toBe(false);
    unsub();
  });
});
