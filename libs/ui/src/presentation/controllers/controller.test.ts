import { renderHook, act } from '@testing-library/react';
import { useController } from './controller';
import {
  MockProductRepository,
  MockProductListQueryRepository,
} from '../../data/mock';
import { ProductListUsecase } from '../../domain';

const createUsecase = () => {
  const productRepo = new MockProductRepository();
  const queryRepo = new MockProductListQueryRepository();
  return new ProductListUsecase(productRepo, queryRepo, {
    products: [],
    totalItem: 0,
  });
};

describe('useController', () => {
  it('should return initial state from usecase', () => {
    const usecase = createUsecase();
    const { result } = renderHook(() => useController(usecase));

    expect(result.current.state).toBeDefined();
    expect(result.current.state.type).toBe('loading');
  });

  it('should return a dispatch function', () => {
    const usecase = createUsecase();
    const { result } = renderHook(() => useController(usecase));

    expect(typeof result.current.dispatch).toBe('function');
  });

  it('should update state when dispatch is called', async () => {
    const productRepo = new MockProductRepository();
    const queryRepo = new MockProductListQueryRepository();
    const usecase = new ProductListUsecase(productRepo, queryRepo, {
      products: productRepo.products,
      totalItem: productRepo.products.length,
    });

    const { result } = renderHook(() => useController(usecase));

    expect(result.current.state.type).toBe('loaded');

    // Use synchronous act to capture intermediate state before async resolves
    act(() => {
      result.current.dispatch({ type: 'FETCH' });
    });

    expect(result.current.state.type).toBe('revalidating');
  });

  it('should reflect async state changes after promises resolve', async () => {
    const usecase = createUsecase();
    const { result } = renderHook(() => useController(usecase));

    expect(result.current.state.type).toBe('loading');

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.state.type).toBe('loaded');
  });
});
