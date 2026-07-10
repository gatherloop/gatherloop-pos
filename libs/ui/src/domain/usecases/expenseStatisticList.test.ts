import {
  ExpenseStatisticListUsecase,
  ExpenseStatisticListAction,
  ExpenseStatisticListState,
  ExpenseStatisticListParams,
} from './expenseStatisticList';
import {
  MockExpenseRepository,
  MockExpenseStatisticListQueryRepository,
} from '../../data/mock';
import { getDateRangeForPreset } from '../entities';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('ExpenseStatisticListUsecase', () => {
  describe('success flow', () => {
    it('should transition loading → loaded → loading (SET_GROUP_BY) → loaded', async () => {
      const repository = new MockExpenseRepository();
      const expenseStatisticListQueryRepository =
        new MockExpenseStatisticListQueryRepository();
      const usecase = new ExpenseStatisticListUsecase(
        repository,
        expenseStatisticListQueryRepository,
        { expenseStatistics: [] }
      );

      const expenseStatisticList = new UsecaseTester<
        ExpenseStatisticListUsecase,
        ExpenseStatisticListState,
        ExpenseStatisticListAction,
        ExpenseStatisticListParams
      >(usecase);

      const { startDate, endDate } = getDateRangeForPreset('last12Months');

      expect(expenseStatisticList.state).toEqual({
        type: 'loading',
        expenseStatistics: [],
        errorMessage: null,
        view: 'budget',
        groupBy: 'month',
        preset: 'last12Months',
        startDate: null,
        endDate: null,
      });

      await flushPromises();
      expect(expenseStatisticList.state).toEqual({
        type: 'loaded',
        expenseStatistics: repository.statistics,
        errorMessage: null,
        view: 'budget',
        groupBy: 'month',
        preset: 'last12Months',
        startDate: null,
        endDate: null,
      });

      expenseStatisticList.dispatch({
        type: 'SET_GROUP_BY',
        groupBy: 'date',
      });
      expect(expenseStatisticList.state).toEqual({
        type: 'loading',
        expenseStatistics: repository.statistics,
        errorMessage: null,
        view: 'budget',
        groupBy: 'date',
        preset: 'last12Months',
        startDate: null,
        endDate: null,
      });

      await flushPromises();
      expect(expenseStatisticList.state).toEqual({
        type: 'loaded',
        expenseStatistics: repository.statistics,
        errorMessage: null,
        view: 'budget',
        groupBy: 'date',
        preset: 'last12Months',
        startDate: null,
        endDate: null,
      });

      expenseStatisticList.dispatch({
        type: 'SET_DATE_RANGE',
        preset: 'last7Days',
        startDate,
        endDate,
        groupBy: 'date',
      });
      expect(expenseStatisticList.state).toEqual({
        type: 'loading',
        expenseStatistics: repository.statistics,
        errorMessage: null,
        view: 'budget',
        groupBy: 'date',
        preset: 'last7Days',
        startDate,
        endDate,
      });

      await flushPromises();
      expect(expenseStatisticList.state).toEqual({
        type: 'loaded',
        expenseStatistics: repository.statistics,
        errorMessage: null,
        view: 'budget',
        groupBy: 'date',
        preset: 'last7Days',
        startDate,
        endDate,
      });
    });

    it('should switch view without refetching (no loading transition)', async () => {
      const repository = new MockExpenseRepository();
      const expenseStatisticListQueryRepository =
        new MockExpenseStatisticListQueryRepository();
      const usecase = new ExpenseStatisticListUsecase(
        repository,
        expenseStatisticListQueryRepository,
        { expenseStatistics: [] }
      );

      const expenseStatisticList = new UsecaseTester<
        ExpenseStatisticListUsecase,
        ExpenseStatisticListState,
        ExpenseStatisticListAction,
        ExpenseStatisticListParams
      >(usecase);

      await flushPromises();
      expect(expenseStatisticList.state.type).toEqual('loaded');
      expect(expenseStatisticList.state.expenseStatistics).toEqual(
        repository.statistics
      );

      const fetchSpy = jest.spyOn(repository, 'fetchExpenseStatisticList');

      expenseStatisticList.dispatch({ type: 'SET_VIEW', view: 'combined' });

      expect(expenseStatisticList.state).toEqual({
        type: 'loaded',
        expenseStatistics: repository.statistics,
        errorMessage: null,
        view: 'combined',
        groupBy: 'month',
        preset: 'last12Months',
        startDate: null,
        endDate: null,
      });
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('failed flow', () => {
    it('should transition loading → error → loading → loaded', async () => {
      const repository = new MockExpenseRepository();
      repository.setShouldFail(true);
      const expenseStatisticListQueryRepository =
        new MockExpenseStatisticListQueryRepository();
      const usecase = new ExpenseStatisticListUsecase(
        repository,
        expenseStatisticListQueryRepository,
        { expenseStatistics: [] }
      );

      const expenseStatisticList = new UsecaseTester<
        ExpenseStatisticListUsecase,
        ExpenseStatisticListState,
        ExpenseStatisticListAction,
        ExpenseStatisticListParams
      >(usecase);

      expect(expenseStatisticList.state).toEqual({
        type: 'loading',
        expenseStatistics: [],
        errorMessage: null,
        view: 'budget',
        groupBy: 'month',
        preset: 'last12Months',
        startDate: null,
        endDate: null,
      });

      await flushPromises();
      expect(expenseStatisticList.state).toEqual({
        type: 'error',
        expenseStatistics: [],
        errorMessage: 'Failed to fetch expense statistics',
        view: 'budget',
        groupBy: 'month',
        preset: 'last12Months',
        startDate: null,
        endDate: null,
      });

      repository.setShouldFail(false);
      expenseStatisticList.dispatch({ type: 'FETCH' });
      expect(expenseStatisticList.state).toEqual({
        type: 'loading',
        expenseStatistics: [],
        errorMessage: null,
        view: 'budget',
        groupBy: 'month',
        preset: 'last12Months',
        startDate: null,
        endDate: null,
      });

      await flushPromises();
      expect(expenseStatisticList.state).toEqual({
        type: 'loaded',
        expenseStatistics: repository.statistics,
        errorMessage: null,
        view: 'budget',
        groupBy: 'month',
        preset: 'last12Months',
        startDate: null,
        endDate: null,
      });
    });
  });

  it('show loaded state when initial data is given', async () => {
    const repository = new MockExpenseRepository();
    const expenseStatisticListQueryRepository =
      new MockExpenseStatisticListQueryRepository();

    const expenseStatistics = [repository.statistics[0]];

    const usecase = new ExpenseStatisticListUsecase(
      repository,
      expenseStatisticListQueryRepository,
      { expenseStatistics }
    );

    const expenseStatisticList = new UsecaseTester<
      ExpenseStatisticListUsecase,
      ExpenseStatisticListState,
      ExpenseStatisticListAction,
      ExpenseStatisticListParams
    >(usecase);

    expect(expenseStatisticList.state).toEqual({
      type: 'loaded',
      expenseStatistics,
      errorMessage: null,
      view: 'budget',
      groupBy: 'month',
      preset: 'last12Months',
      startDate: null,
      endDate: null,
    });
  });
});
