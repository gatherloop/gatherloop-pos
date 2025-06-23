import { CategoryListUsecase, CategoryListAction } from './categoryList';
import { Category } from '../entities';
import { MockCategoryRepository } from '../../data/mock/category';

describe('CategoryListUsecase', () => {
  let mockRepository: MockCategoryRepository;
  let mockDispatch: jest.Mock<void, [CategoryListAction]>;
  
  beforeEach(() => {
    mockRepository = new MockCategoryRepository();
    mockDispatch = jest.fn();
  });

  describe('getInitialState', () => {
    it('should return loaded state when categories exist', () => {
      const categories: Category[] = [
        { id: 1, name: 'Test Category', createdAt: '2024-03-20T00:00:00.000Z' },
      ];
      
      const usecase = new CategoryListUsecase(mockRepository, { categories });
      const state = usecase.getInitialState();
      
      expect(state).toEqual({
        type: 'loaded',
        categories,
        errorMessage: null,
      });
    });

    it('should return idle state when no categories exist', () => {
      const usecase = new CategoryListUsecase(mockRepository, { categories: [] });
      const state = usecase.getInitialState();
      
      expect(state).toEqual({
        type: 'idle',
        categories: [],
        errorMessage: null,
      });
    });
  });

  describe('getNextState', () => {
    let usecase: CategoryListUsecase;

    beforeEach(() => {
      usecase = new CategoryListUsecase(mockRepository, { categories: [] });
    });

    it('should transition from idle to loading on FETCH', () => {
      const state = usecase.getNextState(
        { type: 'idle', categories: [], errorMessage: null },
        { type: 'FETCH' }
      );

      expect(state).toEqual({
        type: 'loading',
        categories: [],
        errorMessage: null,
      });
    });

    it('should transition from loading to loaded on FETCH_SUCCESS', () => {
      const categories = [{ id: 1, name: 'Test Category', createdAt: '2024-03-20T00:00:00.000Z' }];
      const state = usecase.getNextState(
        { type: 'loading', categories: [], errorMessage: null },
        { type: 'FETCH_SUCCESS', categories }
      );

      expect(state).toEqual({
        type: 'loaded',
        categories,
        errorMessage: null,
      });
    });

    it('should transition from loading to error on FETCH_ERROR', () => {
      const state = usecase.getNextState(
        { type: 'loading', categories: [], errorMessage: null },
        { type: 'FETCH_ERROR', message: 'Test error' }
      );

      expect(state).toEqual({
        type: 'error',
        categories: [],
        errorMessage: 'Test error',
      });
    });

    it('should transition from loaded to revalidating on FETCH', () => {
      const categories = [{ id: 1, name: 'Test Category', createdAt: '2024-03-20T00:00:00.000Z' }];
      const state = usecase.getNextState(
        { type: 'loaded', categories, errorMessage: null },
        { type: 'FETCH' }
      );

      expect(state).toEqual({
        type: 'revalidating',
        categories,
        errorMessage: null,
      });
    });

    it('should transition from revalidating to loaded on REVALIDATE_FINISH', () => {
      const categories = [{ id: 1, name: 'Test Category', createdAt: '2024-03-20T00:00:00.000Z' }];
      const state = usecase.getNextState(
        { type: 'revalidating', categories: [], errorMessage: null },
        { type: 'REVALIDATE_FINISH', categories }
      );

      expect(state).toEqual({
        type: 'loaded',
        categories,
        errorMessage: null,
      });
    });
  });

  describe('onStateChange', () => {
    let usecase: CategoryListUsecase;

    beforeEach(() => {
      usecase = new CategoryListUsecase(mockRepository, { categories: [] });
    });

    it('should dispatch FETCH when in idle state', () => {
      usecase.onStateChange(
        { type: 'idle', categories: [], errorMessage: null },
        mockDispatch
      );

      expect(mockDispatch).toHaveBeenCalledWith({ type: 'FETCH' });
    });

    it('should fetch categories and dispatch success when in loading state', async () => {
      usecase.onStateChange(
        { type: 'loading', categories: [], errorMessage: null },
        mockDispatch
      );
      await Promise.resolve(); // Wait for async operation
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'FETCH_SUCCESS',
        categories: [
          { id: 1, name: 'Mock Category 1', createdAt: '2024-03-20T00:00:00.000Z' },
          { id: 2, name: 'Mock Category 2', createdAt: '2024-03-21T00:00:00.000Z' },
        ],
      });
    });

    it('should dispatch error when fetch fails in loading state', async () => {
      // Set up the mock to fail
      mockRepository.setShouldFail(true);

      usecase.onStateChange(
        { type: 'loading', categories: [], errorMessage: null },
        mockDispatch
      );

      // Wait for all promises to resolve
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'FETCH_ERROR',
        message: 'Failed to fetch categories',
      });

      // Reset the mock for other tests
      mockRepository.setShouldFail(false);
    });

    it('should fetch and dispatch REVALIDATE_FINISH when in revalidating state', async () => {
      usecase.onStateChange(
        { type: 'revalidating', categories: [], errorMessage: null },
        mockDispatch
      );
      
      await Promise.resolve(); // Wait for async operation

      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'REVALIDATE_FINISH',
        categories: [
          { id: 1, name: 'Mock Category 1', createdAt: '2024-03-20T00:00:00.000Z' },
          { id: 2, name: 'Mock Category 2', createdAt: '2024-03-21T00:00:00.000Z' },
        ],
      });
    });

    it('should keep existing categories when revalidation fails', async () => {
      const existingCategories = [{ id: 1, name: 'Existing Category', createdAt: '2024-03-20T00:00:00.000Z' }];
      mockRepository.fetchCategoryList = async () => { throw new Error('Failed to fetch categories'); };
      usecase.onStateChange(
        { type: 'revalidating', categories: existingCategories, errorMessage: null },
        mockDispatch
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'REVALIDATE_FINISH',
        categories: existingCategories,
      });
    });
  });

  describe('State Flow', () => {
    let mockRepository: MockCategoryRepository;
    let usecase: CategoryListUsecase;
    let currentState: ReturnType<typeof usecase.getInitialState>;

    beforeEach(() => {
      mockRepository = new MockCategoryRepository();
      usecase = new CategoryListUsecase(mockRepository, { categories: [] });
      currentState = usecase.getInitialState();
    });

    it('should follow the complete flow: idle -> loading -> loaded -> revalidating -> loaded', async () => {
      mockRepository.setShouldFail(false);
      let dispatched: CategoryListAction | null = null;

      // idle -> loading
      usecase.onStateChange(currentState, (action) => { dispatched = action; });
      currentState = usecase.getNextState(currentState, dispatched!);
      expect(currentState.type).toBe('loading');

      // loading -> loaded
      dispatched = null;
      usecase.onStateChange(currentState, (action) => { dispatched = action; });
      await new Promise((resolve) => setTimeout(resolve, 0));
      currentState = usecase.getNextState(currentState, dispatched!);
      expect(currentState.type).toBe('loaded');
      expect(currentState.categories).toEqual([
        { id: 1, name: 'Mock Category 1', createdAt: '2024-03-20T00:00:00.000Z' },
        { id: 2, name: 'Mock Category 2', createdAt: '2024-03-21T00:00:00.000Z' },
      ]);

      // loaded -> revalidating
      dispatched = { type: 'FETCH' };
      currentState = usecase.getNextState(currentState, dispatched);
      expect(currentState.type).toBe('revalidating');

      // revalidating -> loaded
      dispatched = null;
      usecase.onStateChange(currentState, (action) => { dispatched = action; });
      await new Promise((resolve) => setTimeout(resolve, 0));
      currentState = usecase.getNextState(currentState, dispatched!);
      expect(currentState.type).toBe('loaded');
      expect(currentState.categories).toEqual([
        { id: 1, name: 'Mock Category 1', createdAt: '2024-03-20T00:00:00.000Z' },
        { id: 2, name: 'Mock Category 2', createdAt: '2024-03-21T00:00:00.000Z' },
      ]);
    });

    it('should handle error flow: idle -> loading -> error -> loading -> loaded', async () => {
      expect(currentState.type).toBe('idle');
      expect(currentState.categories).toEqual([]);

      // idle -> loading
      let dispatched: CategoryListAction | null = null;
      usecase.onStateChange(currentState, (action) => { dispatched = action; });
      currentState = usecase.getNextState(currentState, dispatched!);
      expect(currentState.type).toBe('loading');

      // loading -> error
      mockRepository.setShouldFail(true);
      dispatched = null;
      usecase.onStateChange(currentState, (action) => { dispatched = action; });
      await new Promise((resolve) => setTimeout(resolve, 0));
      currentState = usecase.getNextState(currentState, dispatched!);
      expect(currentState.type).toBe('error');
      expect(currentState.categories).toEqual([]);

      // error -> loading (retry)
      mockRepository.setShouldFail(false);
      dispatched = { type: 'FETCH' };
      currentState = usecase.getNextState(currentState, dispatched);
      expect(currentState.type).toBe('loading');

      // loading -> loaded
      dispatched = null;
      usecase.onStateChange(currentState, (action) => { dispatched = action; });
      await new Promise((resolve) => setTimeout(resolve, 0));
      currentState = usecase.getNextState(currentState, dispatched!);
      expect(currentState.type).toBe('loaded');
      expect(currentState.categories).toEqual([
        { id: 1, name: 'Mock Category 1', createdAt: '2024-03-20T00:00:00.000Z' },
        { id: 2, name: 'Mock Category 2', createdAt: '2024-03-21T00:00:00.000Z' },
      ]);
    });

    it('should handle revalidation error gracefully: loaded -> revalidating -> loaded (with old data)', async () => {
      const initialCategories = [
        { id: 1, name: 'Initial Category', createdAt: '2024-03-20T00:00:00.000Z' },
      ];
      currentState = usecase.getNextState(
        { type: 'loading', categories: [], errorMessage: null },
        { type: 'FETCH_SUCCESS', categories: initialCategories }
      );
      expect(currentState.type).toBe('loaded');
      expect(currentState.categories).toEqual(initialCategories);

      // loaded -> revalidating
      let dispatched: CategoryListAction | null = { type: 'FETCH' };
      currentState = usecase.getNextState(currentState, dispatched);
      expect(currentState.type).toBe('revalidating');

      // revalidating -> loaded (with error, so categories stay the same)
      mockRepository.setShouldFail(true);
      dispatched = null;
      usecase.onStateChange(currentState, (action) => { dispatched = action; });
      await new Promise((resolve) => setTimeout(resolve, 0));
      currentState = usecase.getNextState(currentState, dispatched!);
      expect(currentState.type).toBe('loaded');
      expect(currentState.categories).toEqual(initialCategories);
      mockRepository.setShouldFail(false);
    });
  });
}); 