import { renderHook, act } from '@testing-library/react';
import { useProductListController } from './ProductListController';
import {
  MockProductRepository,
  MockProductListQueryRepository,
} from '../../data/mock';
import { ProductListUsecase } from '../../domain';

const createUsecase = (preloadedProducts = false) => {
  const productRepo = new MockProductRepository();
  const queryRepo = new MockProductListQueryRepository();
  return {
    usecase: new ProductListUsecase(productRepo, queryRepo, {
      products: preloadedProducts ? productRepo.products : [],
      totalItem: preloadedProducts ? productRepo.products.length : 0,
    }),
    productRepo,
    queryRepo,
  };
};

describe('useProductListController', () => {
  it('should return state and dispatch', () => {
    const { usecase } = createUsecase();
    const { result } = renderHook(() => useProductListController(usecase));

    expect(result.current.state).toBeDefined();
    expect(typeof result.current.dispatch).toBe('function');
  });

  it('should start in loading state when no products preloaded', () => {
    const { usecase } = createUsecase();
    const { result } = renderHook(() => useProductListController(usecase));

    expect(result.current.state.type).toBe('loading');
  });

  it('should trigger revalidation on mount when products are preloaded', async () => {
    const { usecase } = createUsecase(true);
    const { result } = renderHook(() => useProductListController(usecase));

    // useFocusEffect dispatches FETCH on mount → loaded → revalidating
    expect(result.current.state.type).toBe('revalidating');

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.state.type).toBe('loaded');
  });

  it('should transition to loaded state after fetching', async () => {
    const { usecase } = createUsecase();
    const { result } = renderHook(() => useProductListController(usecase));

    expect(result.current.state.type).toBe('loading');

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.state.type).toBe('loaded');
  });

  it('should transition to error state when fetch fails', async () => {
    const { usecase, productRepo } = createUsecase();
    productRepo.setShouldFail(true);

    const { result } = renderHook(() => useProductListController(usecase));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.state.type).toBe('error');
  });

  it('should contain products in state after successful fetch', async () => {
    const { usecase, productRepo } = createUsecase();
    const { result } = renderHook(() => useProductListController(usecase));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.state.type).toBe('loaded');
    if (result.current.state.type === 'loaded') {
      expect(result.current.state.products).toHaveLength(
        productRepo.products.length
      );
    }
  });

  it('should transition to revalidating state when FETCH dispatched from loaded', async () => {
    const { usecase } = createUsecase(true);
    const { result } = renderHook(() => useProductListController(usecase));

    // Wait for initial mount revalidation to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.state.type).toBe('loaded');

    // Dispatch synchronously to capture intermediate revalidating state
    act(() => {
      result.current.dispatch({ type: 'FETCH' });
    });

    expect(result.current.state.type).toBe('revalidating');
  });

  it('should support CHANGE_PARAMS action', async () => {
    const { usecase } = createUsecase(true);
    const { result } = renderHook(() => useProductListController(usecase));

    // Wait for initial mount revalidation to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    // Dispatch synchronously to capture intermediate changingParams state
    act(() => {
      result.current.dispatch({
        type: 'CHANGE_PARAMS',
        page: 2,
        fetchDebounceDelay: 0,
      });
    });

    expect(result.current.state.type).toBe('changingParams');
    if (result.current.state.type === 'changingParams') {
      expect(result.current.state.page).toBe(2);
    }
  });
});
