import { match } from 'ts-pattern';
import {
  DEFAULT_EXPENSE_STATISTIC_GROUP_BY,
  DEFAULT_EXPENSE_STATISTIC_PRESET,
  DEFAULT_EXPENSE_STATISTIC_VIEW,
  ExpenseStatistic,
  ExpenseStatisticView,
  TransactionStatisticPreset,
} from '../entities';
import {
  ExpenseRepository,
  ExpenseStatisticListQueryRepository,
} from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  errorMessage: string | null;
  expenseStatistics: ExpenseStatistic[];
  view: ExpenseStatisticView;
  groupBy: 'date' | 'month';
  preset: TransactionStatisticPreset;
  startDate: string | null;
  endDate: string | null;
};

export type ExpenseStatisticListState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
) &
  Context;

export type ExpenseStatisticListAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; expenseStatistics: ExpenseStatistic[] }
  | { type: 'FETCH_ERROR'; errorMessage: string }
  | { type: 'SET_VIEW'; view: ExpenseStatisticView }
  | { type: 'SET_GROUP_BY'; groupBy: 'date' | 'month' }
  | {
      type: 'SET_DATE_RANGE';
      preset: TransactionStatisticPreset;
      startDate: string | null;
      endDate: string | null;
      groupBy: 'date' | 'month';
    };

export type ExpenseStatisticListParams = {
  expenseStatistics: ExpenseStatistic[];
  view?: ExpenseStatisticView;
  groupBy?: 'date' | 'month';
  preset?: TransactionStatisticPreset;
  startDate?: string | null;
  endDate?: string | null;
};

export class ExpenseStatisticListUsecase extends Usecase<
  ExpenseStatisticListState,
  ExpenseStatisticListAction,
  ExpenseStatisticListParams
> {
  params: ExpenseStatisticListParams;
  expenseRepository: ExpenseRepository;
  expenseStatisticListQueryRepository: ExpenseStatisticListQueryRepository;

  constructor(
    expenseRepository: ExpenseRepository,
    expenseStatisticListQueryRepository: ExpenseStatisticListQueryRepository,
    params: ExpenseStatisticListParams
  ) {
    super();
    this.expenseRepository = expenseRepository;
    this.expenseStatisticListQueryRepository =
      expenseStatisticListQueryRepository;
    this.params = params;
  }

  getInitialState(): ExpenseStatisticListState {
    return {
      type: this.params.expenseStatistics.length > 0 ? 'loaded' : 'idle',
      errorMessage: null,
      expenseStatistics: this.params.expenseStatistics,
      view: this.params.view ?? DEFAULT_EXPENSE_STATISTIC_VIEW,
      groupBy: this.params.groupBy ?? DEFAULT_EXPENSE_STATISTIC_GROUP_BY,
      preset: this.params.preset ?? DEFAULT_EXPENSE_STATISTIC_PRESET,
      startDate: this.params.startDate ?? null,
      endDate: this.params.endDate ?? null,
    };
  }

  getNextState(
    state: ExpenseStatisticListState,
    action: ExpenseStatisticListAction
  ): ExpenseStatisticListState {
    return match([state, action])
      .returnType<ExpenseStatisticListState>()
      .with([{ type: 'idle' }, { type: 'FETCH' }], ([state]) => ({
        ...state,
        type: 'loading',
      }))
      .with(
        [{ type: 'loading' }, { type: 'FETCH_ERROR' }],
        ([state, { errorMessage }]) => ({
          ...state,
          type: 'error',
          errorMessage,
        })
      )
      .with([{ type: 'error' }, { type: 'FETCH' }], ([state]) => ({
        ...state,
        type: 'loading',
        errorMessage: null,
      }))
      .with(
        [{ type: 'loading' }, { type: 'FETCH_SUCCESS' }],
        ([state, { expenseStatistics }]) => ({
          ...state,
          type: 'loaded',
          expenseStatistics,
        })
      )
      .with(
        [{ type: 'loaded' }, { type: 'SET_VIEW' }],
        ([state, { view }]) => ({
          ...state,
          type: 'loaded',
          view,
        })
      )
      .with(
        [{ type: 'loaded' }, { type: 'SET_GROUP_BY' }],
        ([state, { groupBy }]) => ({
          ...state,
          type: 'loading',
          groupBy,
        })
      )
      .with(
        [{ type: 'loaded' }, { type: 'SET_DATE_RANGE' }],
        ([state, { preset, startDate, endDate, groupBy }]) => ({
          ...state,
          type: 'loading',
          preset,
          startDate,
          endDate,
          groupBy,
        })
      )
      .otherwise(() => state);
  }

  onStateChange(
    state: ExpenseStatisticListState,
    dispatch: (action: ExpenseStatisticListAction) => void
  ): void {
    match(state)
      .with({ type: 'idle' }, () => {
        dispatch({ type: 'FETCH' });
      })
      .with({ type: 'loading' }, ({ groupBy, preset, startDate, endDate }) => {
        this.expenseStatisticListQueryRepository.setGroupBy(groupBy);
        this.expenseStatisticListQueryRepository.setDateRange({
          preset,
          startDate,
          endDate,
        });
        this.expenseRepository
          .fetchExpenseStatisticList({ groupBy, startDate, endDate })
          .then((expenseStatistics) =>
            dispatch({
              type: 'FETCH_SUCCESS',
              expenseStatistics,
            })
          )
          .catch(() =>
            dispatch({
              type: 'FETCH_ERROR',
              errorMessage: 'Failed to fetch expense statistics',
            })
          );
      })
      .with({ type: 'loaded' }, ({ view }) => {
        this.expenseStatisticListQueryRepository.setView(view);
      })
      .otherwise(() => {
        // TODO: IMPLEMENT SOMETHING
      });
  }
}
