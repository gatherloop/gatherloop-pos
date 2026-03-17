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
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('MaterialListUsecase', () => {
  describe('success flow', () => {
    it('should transition loading → loaded → revalidating → loaded → changingParams', async () => {
      const repository = new MockMaterialRepository();
      const materialListQueryRepository = new MockMaterialListQueryRepository();
      const usecase = new MaterialListUsecase(
        repository,
        materialListQueryRepository,
        { materials: [], totalItem: 0 }
      );

      const materialList = new UsecaseTester<
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

      await flushPromises();
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

      await flushPromises();
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
    it('should transition loading → error → loading → loaded', async () => {
      const materialRepository = new MockMaterialRepository();
      materialRepository.shouldFail = true;
      const materialListQueryRepository = new MockMaterialListQueryRepository();
      const usecase = new MaterialListUsecase(
        materialRepository,
        materialListQueryRepository,
        { materials: [], totalItem: 0 }
      );

      const materialList = new UsecaseTester<
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

      await flushPromises();
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

      await flushPromises();
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
    const materialRepository = new MockMaterialRepository();
    const materialListQueryRepository = new MockMaterialListQueryRepository();
    const materials = [
      {
        id: 1,
        name: 'Material Test 1',
        price: 100,
        unit: 'kg',
        createdAt: new Date().toISOString(),
        weeklyUsage: 0,
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
