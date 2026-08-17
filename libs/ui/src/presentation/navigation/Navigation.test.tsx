import React from 'react';
import { renderHook } from '@testing-library/react';
import { NavigationProvider, useNavigation } from './Navigation';

describe('useNavigation', () => {
  it('returns no-op functions when rendered outside a provider', () => {
    const { result } = renderHook(() => useNavigation());

    expect(() => result.current.push('/order/t/ABC')).not.toThrow();
    expect(() => result.current.replace('/order/t/ABC')).not.toThrow();
    expect(() => result.current.back()).not.toThrow();
  });

  it('returns the value supplied by NavigationProvider', () => {
    const push = jest.fn();
    const replace = jest.fn();
    const back = jest.fn();

    const { result } = renderHook(() => useNavigation(), {
      wrapper: ({ children }) => (
        <NavigationProvider value={{ push, replace, back }}>
          {children}
        </NavigationProvider>
      ),
    });

    result.current.push('/order/t/ABC');
    result.current.replace('/order/t/ABC/cart');
    result.current.back();

    expect(push).toHaveBeenCalledWith('/order/t/ABC');
    expect(replace).toHaveBeenCalledWith('/order/t/ABC/cart');
    expect(back).toHaveBeenCalledTimes(1);
  });
});
