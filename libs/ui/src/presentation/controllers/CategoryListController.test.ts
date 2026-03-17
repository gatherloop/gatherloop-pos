import { renderHook, act } from '@testing-library/react';
import { useCategoryListController } from './CategoryListController';
import { MockCategoryRepository } from '../../data/mock';
import { CategoryListUsecase } from '../../domain';

const createUsecase = (preloadedCategories = false) => {
  const categoryRepo = new MockCategoryRepository();
  return {
    usecase: new CategoryListUsecase(categoryRepo, {
      categories: preloadedCategories ? categoryRepo.categories : [],
    }),
    categoryRepo,
  };
};

describe('useCategoryListController', () => {
  it('should return state and dispatch', () => {
    const { usecase } = createUsecase();
    const { result } = renderHook(() => useCategoryListController(usecase));

    expect(result.current.state).toBeDefined();
    expect(typeof result.current.dispatch).toBe('function');
  });

  it('should start in loading state when no categories preloaded', () => {
    const { usecase } = createUsecase();
    const { result } = renderHook(() => useCategoryListController(usecase));

    expect(result.current.state.type).toBe('loading');
  });

  it('should trigger revalidation on mount when categories are preloaded', async () => {
    const { usecase } = createUsecase(true);
    const { result } = renderHook(() => useCategoryListController(usecase));

    // useFocusEffect dispatches FETCH on mount → loaded → revalidating
    expect(result.current.state.type).toBe('revalidating');

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.state.type).toBe('loaded');
  });

  it('should transition to loaded state after successful fetch', async () => {
    const { usecase, categoryRepo } = createUsecase();
    const { result } = renderHook(() => useCategoryListController(usecase));

    expect(result.current.state.type).toBe('loading');

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.state.type).toBe('loaded');
    if (result.current.state.type === 'loaded') {
      expect(result.current.state.categories).toHaveLength(
        categoryRepo.categories.length
      );
    }
  });

  it('should transition to error state when fetch fails', async () => {
    const { usecase, categoryRepo } = createUsecase();
    categoryRepo.setShouldFail(true);

    const { result } = renderHook(() => useCategoryListController(usecase));

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.state.type).toBe('error');
  });

  it('should transition to revalidating when FETCH dispatched from loaded', async () => {
    const { usecase } = createUsecase(true);
    const { result } = renderHook(() => useCategoryListController(usecase));

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

  it('should return updated categories after revalidation', async () => {
    const { usecase, categoryRepo } = createUsecase(true);
    const initialCount = categoryRepo.categories.length;
    const { result } = renderHook(() => useCategoryListController(usecase));

    // Wait for initial revalidation, then dispatch another FETCH
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await act(async () => {
      result.current.dispatch({ type: 'FETCH' });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.state.type).toBe('loaded');
    if (result.current.state.type === 'loaded') {
      expect(result.current.state.categories).toHaveLength(initialCount);
    }
  });
});
