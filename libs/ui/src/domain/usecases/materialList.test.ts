import { MaterialListUsecase, MaterialListAction } from './materialList';
import { Material } from '../entities';
import { MockMaterialRepository, MockMaterialListQueryRepository } from "../../data/mock"





// --- Tests ---
describe('MaterialListUsecase State Flow', () => {
  let materialRepository: MockMaterialRepository;
  let materialListQueryRepository: any;
  let usecase: MaterialListUsecase;
  let currentState: ReturnType<typeof usecase.getInitialState>;

  beforeEach(() => {
    materialRepository = new MockMaterialRepository();
    materialListQueryRepository = new MockMaterialListQueryRepository();
  });

  it('should follow the complete flow: idle -> loading -> loaded -> revalidating -> loaded', async () => {
    usecase = new MaterialListUsecase(materialRepository, materialListQueryRepository, { materials: [], totalItem: 0 });
    currentState = usecase.getInitialState();
    let dispatched: MaterialListAction | null = null;

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
    expect(currentState.materials).toEqual([
      { id: 1, name: 'Material 1', price: 100, unit: 'kg', createdAt: '2024-03-20T00:00:00.000Z' },
      { id: 2, name: 'Material 2', price: 200, unit: 'kg', createdAt: '2024-03-21T00:00:00.000Z' },
    ]);
    expect(currentState.totalItem).toBe(2);

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
    expect(currentState.materials).toEqual([
      { id: 1, name: 'Material 1', price: 100, unit: 'kg', createdAt: '2024-03-20T00:00:00.000Z' },
      { id: 2, name: 'Material 2', price: 200, unit: 'kg', createdAt: '2024-03-21T00:00:00.000Z' },
    ]);
    expect(currentState.totalItem).toBe(2);
  });

  it('should handle error flow: idle -> loading -> error -> loading -> loaded', async () => {
    usecase = new MaterialListUsecase(materialRepository, materialListQueryRepository, { materials: [], totalItem: 0 });
    currentState = usecase.getInitialState();
    let dispatched: MaterialListAction | null = null;

    // idle -> loading
    usecase.onStateChange(currentState, (action) => { dispatched = action; });
    currentState = usecase.getNextState(currentState, dispatched!);
    expect(currentState.type).toBe('loading');

    // loading -> error
    materialRepository.shouldFail = true;
    dispatched = null;
    usecase.onStateChange(currentState, (action) => { dispatched = action; });
    await new Promise((resolve) => setTimeout(resolve, 0));
    currentState = usecase.getNextState(currentState, dispatched!);
    expect(currentState.type).toBe('error');

    // error -> loading (retry)
    materialRepository.shouldFail = false;
    dispatched = { type: 'FETCH' };
    currentState = usecase.getNextState(currentState, dispatched);
    expect(currentState.type).toBe('loading');

    // loading -> loaded
    dispatched = null;
    usecase.onStateChange(currentState, (action) => { dispatched = action; });
    await new Promise((resolve) => setTimeout(resolve, 0));
    currentState = usecase.getNextState(currentState, dispatched!);
    expect(currentState.type).toBe('loaded');
    expect(currentState.materials).toEqual([
      { id: 1, name: 'Material 1', price: 100, unit: 'kg', createdAt: '2024-03-20T00:00:00.000Z' },
      { id: 2, name: 'Material 2', price: 200, unit: 'kg', createdAt: '2024-03-21T00:00:00.000Z' },
    ]);
    expect(currentState.totalItem).toBe(2);
  });

  it('should handle revalidation error gracefully: loaded -> revalidating -> loaded (with old data)', async () => {
    const initialMaterials = [
      { id: 1, name: 'Initial Material', price: 50, unit: 'g', createdAt: '2024-03-20T00:00:00.000Z' },
    ];
    usecase = new MaterialListUsecase(materialRepository, materialListQueryRepository, { materials: initialMaterials, totalItem: 1 });
    currentState = usecase.getInitialState();
    expect(currentState.type).toBe('loaded');
    expect(currentState.materials).toEqual(initialMaterials);

    // loaded -> revalidating
    let dispatched: MaterialListAction | null = { type: 'FETCH' };
    currentState = usecase.getNextState(currentState, dispatched);
    expect(currentState.type).toBe('revalidating');

    // revalidating -> loaded (with error, so materials stay the same)
    materialRepository.shouldFail = true;
    dispatched = null;
    usecase.onStateChange(currentState, (action) => { dispatched = action; });
    await new Promise((resolve) => setTimeout(resolve, 0));
    currentState = usecase.getNextState(currentState, dispatched!);
    expect(currentState.type).toBe('loaded');
    expect(currentState.materials).toEqual(initialMaterials);
    expect(currentState.totalItem).toBe(1);
  });
});

describe('MaterialListUsecase', () => {
  let materialRepository: MockMaterialRepository;
  let materialListQueryRepository: any;
  let usecase: MaterialListUsecase;

  beforeEach(() => {
    materialRepository = new MockMaterialRepository();
    materialListQueryRepository = new MockMaterialListQueryRepository();
  });

  describe('getInitialState', () => {
    it('should return loaded state when materials exist', () => {
      const materials: Material[] = [
        { id: 1, name: 'Material 1', price: 100, unit: 'kg', createdAt: '2024-03-20T00:00:00.000Z' },
      ];
      usecase = new MaterialListUsecase(materialRepository, materialListQueryRepository, { materials, totalItem: 1 });
      const state = usecase.getInitialState();
      expect(state.type).toBe('loaded');
      expect(state.materials).toEqual(materials);
      expect(state.totalItem).toBe(1);
    });

    it('should return idle state when no materials exist', () => {
      usecase = new MaterialListUsecase(materialRepository, materialListQueryRepository, { materials: [], totalItem: 0 });
      const state = usecase.getInitialState();
      expect(state.type).toBe('idle');
      expect(state.materials).toEqual([]);
      expect(state.totalItem).toBe(0);
    });
  });

  describe('getNextState', () => {
    beforeEach(() => {
      usecase = new MaterialListUsecase(materialRepository, materialListQueryRepository, { materials: [], totalItem: 0 });
    });

    it('should transition from idle to loading on FETCH', () => {
      const state = usecase.getNextState(
        { type: 'idle', materials: [], totalItem: 0, page: 1, query: '', errorMessage: null, sortBy: 'created_at', orderBy: 'asc', itemPerPage: 10, fetchDebounceDelay: 0 },
        { type: 'FETCH' }
      );
      expect(state.type).toBe('loading');
    });

    it('should transition from loading to loaded on FETCH_SUCCESS', () => {
      const materials = [
        { id: 1, name: 'Material 1', price: 100, unit: 'kg', createdAt: '2024-03-20T00:00:00.000Z' },
      ];
      const state = usecase.getNextState(
        { type: 'loading', materials: [], totalItem: 0, page: 1, query: '', errorMessage: null, sortBy: 'created_at', orderBy: 'asc', itemPerPage: 10, fetchDebounceDelay: 0 },
        { type: 'FETCH_SUCCESS', materials, totalItem: 1 }
      );
      expect(state.type).toBe('loaded');
      expect(state.materials).toEqual(materials);
      expect(state.totalItem).toBe(1);
    });

    it('should transition from loading to error on FETCH_ERROR', () => {
      const state = usecase.getNextState(
        { type: 'loading', materials: [], totalItem: 0, page: 1, query: '', errorMessage: null, sortBy: 'created_at', orderBy: 'asc', itemPerPage: 10, fetchDebounceDelay: 0 },
        { type: 'FETCH_ERROR', message: 'Test error' }
      );
      expect(state.type).toBe('error');
      expect(state.errorMessage).toBe('Test error');
    });

    it('should transition from loaded to revalidating on FETCH', () => {
      const materials = [
        { id: 1, name: 'Material 1', price: 100, unit: 'kg', createdAt: '2024-03-20T00:00:00.000Z' },
      ];
      const state = usecase.getNextState(
        { type: 'loaded', materials, totalItem: 1, page: 1, query: '', errorMessage: null, sortBy: 'created_at', orderBy: 'asc', itemPerPage: 10, fetchDebounceDelay: 0 },
        { type: 'FETCH' }
      );
      expect(state.type).toBe('revalidating');
    });

    it('should transition from revalidating to loaded on REVALIDATE_FINISH', () => {
      const materials = [
        { id: 1, name: 'Material 1', price: 100, unit: 'kg', createdAt: '2024-03-20T00:00:00.000Z' },
      ];
      const state = usecase.getNextState(
        { type: 'revalidating', materials: [], totalItem: 0, page: 1, query: '', errorMessage: null, sortBy: 'created_at', orderBy: 'asc', itemPerPage: 10, fetchDebounceDelay: 0 },
        { type: 'REVALIDATE_FINISH', materials, totalItem: 1 }
      );
      expect(state.type).toBe('loaded');
      expect(state.materials).toEqual(materials);
      expect(state.totalItem).toBe(1);
    });
  });

  describe('onStateChange', () => {
    beforeEach(() => {
      usecase = new MaterialListUsecase(materialRepository, materialListQueryRepository, { materials: [], totalItem: 0 });
    });

    it('should dispatch FETCH when in idle state', () => {
      const mockDispatch = jest.fn();
      usecase.onStateChange(
        { type: 'idle', materials: [], totalItem: 0, page: 1, query: '', errorMessage: null, sortBy: 'created_at', orderBy: 'asc', itemPerPage: 10, fetchDebounceDelay: 0 },
        mockDispatch
      );
      expect(mockDispatch).toHaveBeenCalledWith({ type: 'FETCH' });
    });

    it('should fetch materials and dispatch success when in loading state', async () => {
      const mockDispatch = jest.fn();
      usecase.onStateChange(
        { type: 'loading', materials: [], totalItem: 0, page: 1, query: '', errorMessage: null, sortBy: 'created_at', orderBy: 'asc', itemPerPage: 10, fetchDebounceDelay: 0 },
        mockDispatch
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'FETCH_SUCCESS',
        materials: [
          { id: 1, name: 'Material 1', price: 100, unit: 'kg', createdAt: '2024-03-20T00:00:00.000Z' },
          { id: 2, name: 'Material 2', price: 200, unit: 'kg', createdAt: '2024-03-21T00:00:00.000Z' },
        ],
        totalItem: 2,
      });
    });

    it('should dispatch error when fetch fails in loading state', async () => {
      const mockDispatch = jest.fn();
      materialRepository.shouldFail = true;
      usecase.onStateChange(
        { type: 'loading', materials: [], totalItem: 0, page: 1, query: '', errorMessage: null, sortBy: 'created_at', orderBy: 'asc', itemPerPage: 10, fetchDebounceDelay: 0 },
        mockDispatch
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'FETCH_ERROR',
        message: 'Failed to fetch materials',
      });
      materialRepository.shouldFail = false;
    });

    it('should fetch and dispatch REVALIDATE_FINISH when in revalidating state', async () => {
      const mockDispatch = jest.fn();
      usecase.onStateChange(
        { type: 'revalidating', materials: [], totalItem: 0, page: 1, query: '', errorMessage: null, sortBy: 'created_at', orderBy: 'asc', itemPerPage: 10, fetchDebounceDelay: 0 },
        mockDispatch
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'REVALIDATE_FINISH',
        materials: [
          { id: 1, name: 'Material 1', price: 100, unit: 'kg', createdAt: '2024-03-20T00:00:00.000Z' },
          { id: 2, name: 'Material 2', price: 200, unit: 'kg', createdAt: '2024-03-21T00:00:00.000Z' },
        ],
        totalItem: 2,
      });
    });

    it('should keep existing materials when revalidation fails', async () => {
      const mockDispatch = jest.fn();
      const existingMaterials = [
        { id: 1, name: 'Existing Material', price: 50, unit: 'g', createdAt: '2024-03-20T00:00:00.000Z' },
      ];
      materialRepository.shouldFail = true;
      usecase.onStateChange(
        { type: 'revalidating', materials: existingMaterials, totalItem: 1, page: 1, query: '', errorMessage: null, sortBy: 'created_at', orderBy: 'asc', itemPerPage: 10, fetchDebounceDelay: 0 },
        mockDispatch
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(mockDispatch).toHaveBeenCalledWith({
        type: 'REVALIDATE_FINISH',
        materials: existingMaterials,
        totalItem: 1,
      });
      materialRepository.shouldFail = false;
    });
  });
}); 