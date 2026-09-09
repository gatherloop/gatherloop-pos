import { act, renderHook } from '@testing-library/react';
import { useWebVisualViewportHeight } from './useWebVisualViewportHeight';

describe('useWebVisualViewportHeight', () => {
  const originalVisualViewport = window.visualViewport;

  afterEach(() => {
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: originalVisualViewport,
    });
  });

  it('returns undefined when the environment has no visualViewport API', () => {
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: undefined,
    });

    const { result } = renderHook(() => useWebVisualViewportHeight());

    expect(result.current).toBeUndefined();
  });

  it('reports the visual viewport height and updates when it resizes', () => {
    const listeners: Record<string, (() => void)[]> = {};
    const mockViewport = {
      height: 640,
      addEventListener: (event: string, callback: () => void) => {
        listeners[event] = [...(listeners[event] ?? []), callback];
      },
      removeEventListener: jest.fn(),
    };
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: mockViewport,
    });

    const { result } = renderHook(() => useWebVisualViewportHeight());

    expect(result.current).toBe(640);

    mockViewport.height = 380;
    act(() => {
      listeners['resize'].forEach((callback) => callback());
    });

    expect(result.current).toBe(380);
  });

  it('removes the resize listener on unmount', () => {
    const mockViewport = {
      height: 640,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: mockViewport,
    });

    const { unmount } = renderHook(() => useWebVisualViewportHeight());
    unmount();

    expect(mockViewport.removeEventListener).toHaveBeenCalledWith(
      'resize',
      expect.any(Function)
    );
  });
});
