import {
  TransactionStatisticListUsecase,
  TransactionStatisticListAction,
  TransactionStatisticListState,
  TransactionStatisticListParams,
} from './transactionStatisticList';
import {
  MockTransactionRepository,
  MockTransactionStatisticListQueryRepository,
} from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('TransactionStatisticListUsecase', () => {
  describe('success flow', () => {
    it('should transition loading → loaded → loading (SET_GROUP_BY) → loaded', async () => {
      const repository = new MockTransactionRepository();
      const transactionStatisticListQueryRepository =
        new MockTransactionStatisticListQueryRepository();
      const usecase = new TransactionStatisticListUsecase(
        repository,
        transactionStatisticListQueryRepository,
        { transactionStatistics: [] }
      );

      const transactionStatisticList = new UsecaseTester<
        TransactionStatisticListUsecase,
        TransactionStatisticListState,
        TransactionStatisticListAction,
        TransactionStatisticListParams
      >(usecase);

      expect(transactionStatisticList.state).toEqual({
        type: 'loading',
        transactionStatistics: [],
        errorMessage: null,
        groupBy: 'date',
      });

      await flushPromises();
      expect(transactionStatisticList.state).toEqual({
        type: 'loaded',
        transactionStatistics: repository.statistics,
        errorMessage: null,
        groupBy: 'date',
      });

      transactionStatisticList.dispatch({
        type: 'SET_GROUP_BY',
        groupBy: 'month',
      });
      expect(transactionStatisticList.state).toEqual({
        type: 'loading',
        transactionStatistics: repository.statistics,
        errorMessage: null,
        groupBy: 'month',
      });

      await flushPromises();
      expect(transactionStatisticList.state).toEqual({
        type: 'loaded',
        transactionStatistics: repository.statistics,
        errorMessage: null,
        groupBy: 'month',
      });
    });
  });

  describe('failed flow', () => {
    it('should transition loading → error → loading → loaded', async () => {
      const repository = new MockTransactionRepository();
      repository.setShouldFail(true);
      const transactionStatisticListQueryRepository =
        new MockTransactionStatisticListQueryRepository();
      const usecase = new TransactionStatisticListUsecase(
        repository,
        transactionStatisticListQueryRepository,
        { transactionStatistics: [] }
      );

      const transactionStatisticList = new UsecaseTester<
        TransactionStatisticListUsecase,
        TransactionStatisticListState,
        TransactionStatisticListAction,
        TransactionStatisticListParams
      >(usecase);

      expect(transactionStatisticList.state).toEqual({
        type: 'loading',
        transactionStatistics: [],
        errorMessage: null,
        groupBy: 'date',
      });

      await flushPromises();
      expect(transactionStatisticList.state).toEqual({
        type: 'error',
        transactionStatistics: [],
        errorMessage: 'Failed to fetch transaction',
        groupBy: 'date',
      });

      repository.setShouldFail(false);
      transactionStatisticList.dispatch({ type: 'FETCH' });
      expect(transactionStatisticList.state).toEqual({
        type: 'loading',
        transactionStatistics: [],
        errorMessage: null,
        groupBy: 'date',
      });

      await flushPromises();
      expect(transactionStatisticList.state).toEqual({
        type: 'loaded',
        transactionStatistics: repository.statistics,
        errorMessage: null,
        groupBy: 'date',
      });
    });
  });

  it('show loaded state when initial data is given', async () => {
    const repository = new MockTransactionRepository();
    const transactionStatisticListQueryRepository =
      new MockTransactionStatisticListQueryRepository();

    const transactionStatistics = [repository.statistics[0]];

    const usecase = new TransactionStatisticListUsecase(
      repository,
      transactionStatisticListQueryRepository,
      { transactionStatistics }
    );

    const transactionStatisticList = new UsecaseTester<
      TransactionStatisticListUsecase,
      TransactionStatisticListState,
      TransactionStatisticListAction,
      TransactionStatisticListParams
    >(usecase);

    expect(transactionStatisticList.state).toEqual({
      type: 'loaded',
      transactionStatistics,
      errorMessage: null,
      groupBy: 'date',
    });
  });
});
