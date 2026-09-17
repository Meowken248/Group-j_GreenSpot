import { renderHook, act } from '@testing-library/react';
import { useFastGeolocation, DEFAULT_FALLBACK_LOCATION } from '../useFastGeolocation';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('useFastGeolocation', () => {
  let mockGeolocation: any;

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();

    mockGeolocation = {
      getCurrentPosition: vi.fn(),
      watchPosition: vi.fn(),
      clearWatch: vi.fn(),
    };
    (global as any).navigator.geolocation = mockGeolocation;
    
    // Mock fetch for IP Fallback
    (global as any).fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ latitude: 10.123, longitude: 106.123 }),
    });
  });

  it('should initialize with locating state', () => {
    const { result } = renderHook(() => useFastGeolocation());
    expect(result.current.isLocating).toBe(true);
    expect(result.current.coords).toBeNull();
  });

  it('should update location on successful getCurrentPosition', () => {
    const { result } = renderHook(() => useFastGeolocation());
    
    act(() => {
      const successCb = mockGeolocation.getCurrentPosition.mock.calls[0][0];
      successCb({
        coords: {
          latitude: 10.762622,
          longitude: 106.660172,
          accuracy: 10,
        },
      });
    });

    expect(result.current.coords).toEqual({ lat: 10.762622, lng: 106.660172 });
    expect(result.current.accuracy).toBe(10);
    expect(result.current.isLocked).toBe(true);
  });

  it('should fall back to IP location on permission denied', async () => {
    const { result } = renderHook(() => useFastGeolocation());
    
    await act(async () => {
      const errorCb = mockGeolocation.getCurrentPosition.mock.calls[0][1];
      errorCb({ code: 1, PERMISSION_DENIED: 1 }); // 1 = PERMISSION_DENIED
      
      // Advance timers if necessary or wait for fetch
      await vi.runAllTimersAsync();
    });

    expect(result.current.coords).toEqual({ lat: 10.123, lng: 106.123 });
    expect(result.current.source).toBe('network');
  });
  
  it('should filter out micro-movements under 5m', () => {
    const { result } = renderHook(() => useFastGeolocation());
    
    act(() => {
      const watchCb = mockGeolocation.watchPosition.mock.calls[0][0];
      watchCb({
        coords: {
          latitude: 10.762622,
          longitude: 106.660172,
          accuracy: 15,
        },
      });
    });

    expect(result.current.coords?.lat).toBe(10.762622);

    act(() => {
      const watchCb = mockGeolocation.watchPosition.mock.calls[0][0];
      watchCb({
        coords: {
          // Moved roughly 1 meter
          latitude: 10.76263,
          longitude: 106.660172,
          accuracy: 15,
        },
      });
    });

    // Should NOT have updated coords because movement < 5m
    expect(result.current.coords?.lat).toBe(10.762622);
  });
});
