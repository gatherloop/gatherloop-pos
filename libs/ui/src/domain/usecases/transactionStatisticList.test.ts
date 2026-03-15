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
import { UsecaseTester } from '../../utils/usecase';

describe('TransactionStatisticListUsecase', () => {
  describe('success flow', () => {
    const repository = new MockTransactionRepository();
    const transactionStatisticListQueryRepository =
      new MockTransactionStatisticListQueryRepository();
    const usecase = new TransactionStatisticListUsecase(
      repository,
      transactionStatisticListQueryRepository,
      { transactionStatistics: [] }
    );

    let transactionStatisticList: UsecaseTester<
      TransactionStatisticListUsecase,
      TransactionStatisticListState,
      TransactionStatisticListAction,
      TransactionStatisticListParams
    >;

    it('initialize with loading state', () => {
      transactionStatisticList = new UsecaseTester<
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
    });

    it('transition to loaded state after success fetch', async () => {
      await Promise.resolve();
      expect(transactionStatisticList.state).toEqual({
        type: 'loaded',
        transactionStatistics: repository.statistics,
        errorMessage: null,
        groupBy: 'date',
      });
    });

    it('transition to loading state when SET_GROUP_BY action is dispatched', () => {
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
    });

    it('transition to loaded state after success fetch with new groupBy', async () => {
      await Promise.resolve();
      expect(transactionStatisticList.state).toEqual({
        type: 'loaded',
        transactionStatistics: repository.statistics,
        errorMessage: null,
        groupBy: 'month',
      });
    });
  });

  describe('failed flow', () => {
    const repository = new MockTransactionRepository();
    repository.setShouldFail(true);
    const transactionStatisticListQueryRepository =
      new MockTransactionStatisticListQueryRepository();
    const usecase = new TransactionStatisticListUsecase(
      repository,
      transactionStatisticListQueryRepository,
      { transactionStatistics: [] }
    );

    let transactionStatisticList: UsecaseTester<
      TransactionStatisticListUsecase,
      TransactionStatisticListState,
      TransactionStatisticListAction,
      TransactionStatisticListParams
    >;

    it('initialize with loading state', () => {
      transactionStatisticList = new UsecaseTester<
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
    });

    it('transition to error state after failed fetch', async () => {
      await Promise.resolve();
      expect(transactionStatisticList.state).toEqual({
        type: 'error',
        transactionStatistics: [],
        errorMessage: 'Failed to fetch transaction',
        groupBy: 'date',
      });
    });

    it('transition to loading state when FETCH action is dispatched', () => {
      repository.setShouldFail(false);
      transactionStatisticList.dispatch({ type: 'FETCH' });
      expect(transactionStatisticList.state).toEqual({
        type: 'loading',
        transactionStatistics: [],
        errorMessage: null,
        groupBy: 'date',
      });
    });

    it('transition to loaded state after success fetch', async () => {
      await Promise.resolve();
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
