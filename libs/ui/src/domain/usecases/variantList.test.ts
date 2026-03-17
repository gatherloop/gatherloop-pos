import {
  VariantListUsecase,
  VariantListAction,
  VariantListState,
  VariantListParams,
} from './variantList';
import {
  MockVariantRepository,
  MockVariantListQueryRepository,
} from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('VariantListUsecase', () => {
  describe('success flow', () => {
    it('should transition loading → loaded → revalidating → loaded → changingParams', async () => {
      const repository = new MockVariantRepository();
      const variantListQueryRepository = new MockVariantListQueryRepository();
      const usecase = new VariantListUsecase(
        repository,
        variantListQueryRepository,
        { variants: [], totalItem: 0 }
      );

      const variantList = new UsecaseTester<
        VariantListUsecase,
        VariantListState,
        VariantListAction,
        VariantListParams
      >(usecase);

      expect(variantList.state).toEqual({
        type: 'loading',
        variants: [],
        totalItem: 0,
        page: variantListQueryRepository.getPage(),
        query: variantListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: variantListQueryRepository.getSortBy(),
        orderBy: variantListQueryRepository.getOrderBy(),
        itemPerPage: variantListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });

      await flushPromises();
      expect(variantList.state).toEqual({
        type: 'loaded',
        variants: repository.variants,
        totalItem: repository.variants.length,
        page: variantListQueryRepository.getPage(),
        query: variantListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: variantListQueryRepository.getSortBy(),
        orderBy: variantListQueryRepository.getOrderBy(),
        itemPerPage: variantListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });

      variantList.dispatch({ type: 'FETCH' });
      expect(variantList.state).toEqual({
        type: 'revalidating',
        variants: repository.variants,
        totalItem: repository.variants.length,
        page: variantListQueryRepository.getPage(),
        query: variantListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: variantListQueryRepository.getSortBy(),
        orderBy: variantListQueryRepository.getOrderBy(),
        itemPerPage: variantListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });

      await flushPromises();
      expect(variantList.state).toEqual({
        type: 'loaded',
        variants: repository.variants,
        totalItem: repository.variants.length,
        page: variantListQueryRepository.getPage(),
        query: variantListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: variantListQueryRepository.getSortBy(),
        orderBy: variantListQueryRepository.getOrderBy(),
        itemPerPage: variantListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });

      variantList.dispatch({ type: 'CHANGE_PARAMS', page: 2 });
      expect(variantList.state).toEqual({
        type: 'changingParams',
        variants: repository.variants,
        totalItem: repository.variants.length,
        page: 2,
        query: variantListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: variantListQueryRepository.getSortBy(),
        orderBy: variantListQueryRepository.getOrderBy(),
        itemPerPage: variantListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });
    });
  });

  describe('error flow', () => {
    it('should transition loading → error → loading → loaded', async () => {
      const variantRepository = new MockVariantRepository();
      variantRepository.setShouldFail(true);
      const variantListQueryRepository = new MockVariantListQueryRepository();
      const usecase = new VariantListUsecase(
        variantRepository,
        variantListQueryRepository,
        { variants: [], totalItem: 0 }
      );

      const variantList = new UsecaseTester<
        VariantListUsecase,
        VariantListState,
        VariantListAction,
        VariantListParams
      >(usecase);

      expect(variantList.state).toEqual({
        type: 'loading',
        variants: [],
        totalItem: 0,
        page: variantListQueryRepository.getPage(),
        query: variantListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: variantListQueryRepository.getSortBy(),
        orderBy: variantListQueryRepository.getOrderBy(),
        itemPerPage: variantListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });

      await flushPromises();
      expect(variantList.state).toEqual({
        type: 'error',
        variants: [],
        totalItem: 0,
        page: variantListQueryRepository.getPage(),
        query: variantListQueryRepository.getSearchQuery(),
        errorMessage: 'Failed to fetch variants',
        sortBy: variantListQueryRepository.getSortBy(),
        orderBy: variantListQueryRepository.getOrderBy(),
        itemPerPage: variantListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });

      variantRepository.setShouldFail(false);
      variantList.dispatch({ type: 'FETCH' });
      expect(variantList.state).toEqual({
        type: 'loading',
        variants: [],
        totalItem: 0,
        page: variantListQueryRepository.getPage(),
        query: variantListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: variantListQueryRepository.getSortBy(),
        orderBy: variantListQueryRepository.getOrderBy(),
        itemPerPage: variantListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });

      await flushPromises();
      expect(variantList.state).toEqual({
        type: 'loaded',
        variants: variantRepository.variants,
        totalItem: variantRepository.variants.length,
        page: variantListQueryRepository.getPage(),
        query: variantListQueryRepository.getSearchQuery(),
        errorMessage: null,
        sortBy: variantListQueryRepository.getSortBy(),
        orderBy: variantListQueryRepository.getOrderBy(),
        itemPerPage: variantListQueryRepository.getItemPerPage(),
        fetchDebounceDelay: 0,
      });
    });
  });

  it('should show loaded state when initial data is given', async () => {
    const variantRepository = new MockVariantRepository();
    const variantListQueryRepository = new MockVariantListQueryRepository();
    const variants = [variantRepository.variants[0]];
    const usecase = new VariantListUsecase(
      variantRepository,
      variantListQueryRepository,
      { variants, totalItem: 1 }
    );
    const variantList = new UsecaseTester<
      VariantListUsecase,
      VariantListState,
      VariantListAction,
      VariantListParams
    >(usecase);

    expect(variantList.state.type).toBe('loaded');
    expect(variantList.state.variants).toEqual(variants);
    expect(variantList.state.totalItem).toBe(variants.length);
  });
});
