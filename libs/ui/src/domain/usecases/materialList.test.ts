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

  it('should follow the success flow', async () => {
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

    await Promise.resolve();

    expect(materialList.state.type).toBe('loaded');
    expect(materialList.state.materials).toEqual(materialRepository.materials);
    expect(materialList.state.totalItem).toBe(
      materialRepository.materials.length
    );

    materialList.dispatch({ type: 'FETCH' });
    expect(materialList.state.type).toBe('revalidating');
    await Promise.resolve();
    expect(materialList.state.type).toBe('loaded');
    expect(materialList.state.materials).toEqual(materialRepository.materials);
    expect(materialList.state.totalItem).toBe(
      materialRepository.materials.length
    );
  });

  it('should follow the failed flow', async () => {
    const usecase = new MaterialListUsecase(
      materialRepository,
      materialListQueryRepository,
      { materials: [], totalItem: 0 }
    );
    materialRepository.shouldFail = true;
    const materialList = new UsecaseTester<
      MaterialListUsecase,
      MaterialListState,
      MaterialListAction,
      MaterialListParams
    >(usecase);

    expect(materialList.state.type).toBe('loading');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(materialList.state.type).toBe('error');

    materialRepository.shouldFail = false;
    materialList.dispatch({ type: 'FETCH' });
    expect(materialList.state.type).toBe('loading');
    await Promise.resolve();
    expect(materialList.state.type).toBe('loaded');
    expect(materialList.state.materials).toEqual(materialRepository.materials);
    expect(materialList.state.totalItem).toBe(
      materialRepository.materials.length
    );

    materialRepository.shouldFail = true;
    materialList.dispatch({ type: 'FETCH' });
    expect(materialList.state.type).toBe('revalidating');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(materialList.state.type).toBe('loaded');
    expect(materialList.state.materials).toEqual(materialRepository.materials);
    expect(materialList.state.totalItem).toBe(
      materialRepository.materials.length
    );
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
