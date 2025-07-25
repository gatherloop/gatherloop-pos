import { match } from 'ts-pattern';
import { TransactionStatistic } from '../entities';
import {
  TransactionRepository,
  TransactionStatisticListQueryRepository,
} from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  errorMessage: string | null;
  transactionStatistics: TransactionStatistic[];
  groupBy: 'date' | 'month';
};

export type TransactionStatisticListState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
) &
  Context;

export type TransactionStatisticListAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; transactionStatistics: TransactionStatistic[] }
  | { type: 'FETCH_ERROR'; errorMessage: string }
  | { type: 'SET_GROUP_BY'; groupBy: 'date' | 'month' };

export type TransactionStatisticListParams = {
  transactionStatistics: TransactionStatistic[];
  groupBy?: 'date' | 'month';
};

export class TransactionStatisticListUsecase extends Usecase<
  TransactionStatisticListState,
  TransactionStatisticListAction,
  TransactionStatisticListParams
> {
  params: TransactionStatisticListParams;
  transactionRepository: TransactionRepository;
  transactionStatisticListQueryRepository: TransactionStatisticListQueryRepository;

  constructor(
    transactionRepository: TransactionRepository,
    transactionStatisticListQueryRepository: TransactionStatisticListQueryRepository,
    params: TransactionStatisticListParams
  ) {
    super();
    this.transactionRepository = transactionRepository;
    this.transactionStatisticListQueryRepository =
      transactionStatisticListQueryRepository;
    this.params = params;
  }

  getInitialState(): TransactionStatisticListState {
    return {
      type: this.params.transactionStatistics.length > 0 ? 'loaded' : 'idle',
      errorMessage: null,
      transactionStatistics: this.params.transactionStatistics,
      groupBy: this.params.groupBy ?? 'date',
    };
  }

  getNextState(
    state: TransactionStatisticListState,
    action: TransactionStatisticListAction
  ): TransactionStatisticListState {
    return match([state, action])
      .returnType<TransactionStatisticListState>()
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
      }))
      .with(
        [{ type: 'loading' }, { type: 'FETCH_SUCCESS' }],
        ([state, { transactionStatistics }]) => ({
          ...state,
          type: 'loaded',
          transactionStatistics,
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
      .otherwise(() => state);
  }

  onStateChange(
    state: TransactionStatisticListState,
    dispatch: (action: TransactionStatisticListAction) => void
  ): void {
    match(state)
      .with({ type: 'idle' }, () => {
        dispatch({ type: 'FETCH' });
      })
      .with({ type: 'loading' }, ({ groupBy }) => {
        this.transactionStatisticListQueryRepository.setGroupBy(groupBy);
        this.transactionRepository
          .fetchTransactionStatisticList(groupBy)
          .then((transactionStatistics) =>
            dispatch({
              type: 'FETCH_SUCCESS',
              transactionStatistics,
            })
          )
          .catch(() =>
            dispatch({
              type: 'FETCH_ERROR',
              errorMessage: 'Failed to fetch transaction',
            })
          );
      })
      .otherwise(() => {
        // TODO: IMPLEMENT SOMETHING
      });
  }
}
