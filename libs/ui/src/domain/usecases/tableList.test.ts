import {
  TableListUsecase,
  TableListAction,
  TableListState,
  TableListParams,
} from './tableList';
import { MockTableRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('TableListUsecase', () => {
  describe('success flow', () => {
    it('should transition loading → loaded → revalidating → loaded', async () => {
      const repository = new MockTableRepository();
      const usecase = new TableListUsecase(repository, { tables: [] });
      const tableList = new UsecaseTester<
        TableListUsecase,
        TableListState,
        TableListAction,
        TableListParams
      >(usecase);

      expect(tableList.state).toEqual({
        type: 'loading',
        tables: [],
        errorMessage: null,
      });

      await flushPromises();
      expect(tableList.state).toEqual({
        type: 'loaded',
        tables: repository.tables,
        errorMessage: null,
      });

      tableList.dispatch({ type: 'FETCH' });
      expect(tableList.state).toEqual({
        type: 'revalidating',
        tables: repository.tables,
        errorMessage: null,
      });

      await flushPromises();
      expect(tableList.state).toEqual({
        type: 'loaded',
        tables: repository.tables,
        errorMessage: null,
      });
    });
  });

  describe('failed flow', () => {
    it('should transition loading → error → loading → loaded', async () => {
      const repository = new MockTableRepository();
      repository.setShouldFail(true);
      const usecase = new TableListUsecase(repository, { tables: [] });
      const tableList = new UsecaseTester<
        TableListUsecase,
        TableListState,
        TableListAction,
        TableListParams
      >(usecase);

      expect(tableList.state).toEqual({
        type: 'loading',
        tables: [],
        errorMessage: null,
      });

      await flushPromises();
      expect(tableList.state).toEqual({
        type: 'error',
        tables: [],
        errorMessage: 'Failed to fetch tables',
      });

      repository.setShouldFail(false);
      tableList.dispatch({ type: 'FETCH' });
      expect(tableList.state).toEqual({
        type: 'loading',
        tables: [],
        errorMessage: null,
      });

      await flushPromises();
      expect(tableList.state).toEqual({
        type: 'loaded',
        tables: repository.tables,
        errorMessage: null,
      });
    });
  });

  it('show loaded state when initial data is given', async () => {
    const repository = new MockTableRepository();

    const tables = [repository.tables[0]];

    const usecase = new TableListUsecase(repository, { tables });

    const tableList = new UsecaseTester<
      TableListUsecase,
      TableListState,
      TableListAction,
      TableListParams
    >(usecase);

    expect(tableList.state).toEqual({
      type: 'loaded',
      tables,
      errorMessage: null,
    });
  });
});
