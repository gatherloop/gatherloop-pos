import { renderHook } from '@testing-library/react';
import { useMedia } from 'tamagui';
import { useIsCompactLayout } from './useIsCompactLayout';

describe('useIsCompactLayout', () => {
  afterEach(() => {
    (useMedia as jest.Mock).mockReturnValue({});
  });

  it('returns false when media.sm is undefined', () => {
    (useMedia as jest.Mock).mockReturnValue({});

    const { result } = renderHook(() => useIsCompactLayout());

    expect(result.current).toBe(false);
  });

  it('returns false when media.sm is false', () => {
    (useMedia as jest.Mock).mockReturnValue({ sm: false });

    const { result } = renderHook(() => useIsCompactLayout());

    expect(result.current).toBe(false);
  });

  it('returns true when media.sm is true', () => {
    (useMedia as jest.Mock).mockReturnValue({ sm: true });

    const { result } = renderHook(() => useIsCompactLayout());

    expect(result.current).toBe(true);
  });
});
