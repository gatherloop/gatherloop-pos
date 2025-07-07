import {
  MaterialListUsecase,
  MaterialListState,
  MaterialListAction,
  MaterialListParams,
} from './materialList';
import {
  MockMaterialRepository,
  MockMaterialListQueryRepository,
} from '../../data/mock';
import { UsecaseTester } from '../../utils/usecase';

describe('MaterialListUsecase', () => {
  let materialRepository: MockMaterialRepository;
  let materialListQueryRepository: MockMaterialListQueryRepository;

  beforeEach(() => {
    materialRepository = new MockMaterialRepository();
    materialListQueryRepository = new MockMaterialListQueryRepository();
  });

  describe('success flow', () => {
    const repository = new MockMaterialRepository();
    const materialListQueryRepository = new MockMaterialListQueryRepository();
    const usecase = new MaterialListUsecase(
      repository,
      materialListQueryRepository,
      { materials: [], totalItem: 0 }
    );

    let materialList: UsecaseTester<
      MaterialListUsecase,
      MaterialListState,
      MaterialListAction,
      MaterialListParams
    >;

    it('initialize with loading state', () => {
      materialList = new UsecaseTester<
        MaterialListUsecase,
        MaterialListState,
        MaterialListAction,
        MaterialListParams
      >(usecase);

      expect(materialList.state).toEqual({
        type: 'loading',
        materials: [],
        totalItem: 0,
        page: materialListQueryRepository.getPage(),
        query: materialListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: materialListQueryRepository.getSortBy(),
        orderBy: materialListQueryRepository.getOrderBy(),
        itemPerPage: materialListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });
    });

    it('transition to loaded state after success fetch', async () => {
      await Promise.resolve();
      expect(materialList.state).toEqual({
        type: 'loaded',
        materials: repository.materials,
        totalItem: repository.materials.length,
        page: materialListQueryRepository.getPage(),
        query: materialListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: materialListQueryRepository.getSortBy(),
        orderBy: materialListQueryRepository.getOrderBy(),
        itemPerPage: materialListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });
    });

    it('transition to revalidating state when FETCH action is dispatched', () => {
      materialList.dispatch({ type: 'FETCH' });
      expect(materialList.state).toEqual({
        type: 'revalidating',
        materials: repository.materials,
        totalItem: repository.materials.length,
        page: materialListQueryRepository.getPage(),
        query: materialListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: materialListQueryRepository.getSortBy(),
        orderBy: materialListQueryRepository.getOrderBy(),
        itemPerPage: materialListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });
    });

    it('transition to loaded state after success fetch', async () => {
      await Promise.resolve();
      expect(materialList.state).toEqual({
        type: 'loaded',
        materials: repository.materials,
        totalItem: repository.materials.length,
        page: materialListQueryRepository.getPage(),
        query: materialListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: materialListQueryRepository.getSortBy(),
        orderBy: materialListQueryRepository.getOrderBy(),
        itemPerPage: materialListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });
    });

    it('transition to changingParams state after CHANGE_PARAMS action is dispatched', () => {
      materialList.dispatch({ type: 'CHANGE_PARAMS', page: 2 });
      expect(materialList.state).toEqual({
        type: 'changingParams',
        materials: repository.materials,
        totalItem: repository.materials.length,
        page: 2,
        query: materialListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: materialListQueryRepository.getSortBy(),
        orderBy: materialListQueryRepository.getOrderBy(),
        itemPerPage: materialListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });
    });
  });

  describe('error flow', () => {
    const materialRepository = new MockMaterialRepository();
    materialRepository.shouldFail = true;
    const materialListQueryRepository = new MockMaterialListQueryRepository();
    const usecase = new MaterialListUsecase(
      materialRepository,
      materialListQueryRepository,
      { materials: [], totalItem: 0 }
    );
    let materialList: UsecaseTester<
      MaterialListUsecase,
      MaterialListState,
      MaterialListAction,
      MaterialListParams
    >;

    it('initialize with loading state', () => {
      materialList = new UsecaseTester<
        MaterialListUsecase,
        MaterialListState,
        MaterialListAction,
        MaterialListParams
      >(usecase);

      expect(materialList.state).toEqual({
        type: 'loading',
        materials: [],
        totalItem: 0,
        page: materialListQueryRepository.getPage(),
        query: materialListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: materialListQueryRepository.getSortBy(),
        orderBy: materialListQueryRepository.getOrderBy(),
        itemPerPage: materialListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });
    });

    it('transition to error state after failed fetch', async () => {
      await Promise.resolve();
      expect(materialList.state).toEqual({
        type: 'error',
        materials: [],
        totalItem: 0,
        page: materialListQueryRepository.getPage(),
        query: materialListQueryRepository.getSearchQuery(),
        errorMessage: 'Failed to fetch materials',
        sortBy: materialListQueryRepository.getSortBy(),
        orderBy: materialListQueryRepository.getOrderBy(),
        itemPerPage: materialListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });
    });

    it('transition to loading state when FETCH action is dispatched', () => {
      materialRepository.shouldFail = false;
      materialList.dispatch({ type: 'FETCH' });
      expect(materialList.state).toEqual({
        type: 'loading',
        materials: [],
        totalItem: 0,
        page: materialListQueryRepository.getPage(),
        query: materialListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: materialListQueryRepository.getSortBy(),
        orderBy: materialListQueryRepository.getOrderBy(),
        itemPerPage: materialListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });
    });

    it('transition to loaded state after successful fetch', async () => {
      await Promise.resolve();
      expect(materialList.state).toEqual({
        type: 'loaded',
        materials: materialRepository.materials,
        totalItem: materialRepository.materials.length,
        page: materialListQueryRepository.getPage(),
        query: materialListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: materialListQueryRepository.getSortBy(),
        orderBy: materialListQueryRepository.getOrderBy(),
        itemPerPage: materialListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });
    });
  });

  it('should show loaded state when initial data is given', async () => {
    const materials = [
      {
        id: 1,
        name: 'Material Test 1',
        price: 100,
        unit: 'kg',
        createdAt: new Date().toISOString(),
      },
    ];
    const usecase = new MaterialListUsecase(
      materialRepository,
      materialListQueryRepository,
      { materials, totalItem: 1 }
    );
    const materialList = new UsecaseTester<
      MaterialListUsecase,
      MaterialListState,
      MaterialListAction,
      MaterialListParams
    >(usecase);

    expect(materialList.state.type).toBe('loaded');
    expect(materialList.state.materials).toEqual(materials);
    expect(materialList.state.totalItem).toBe(materials.length);
  });
});
