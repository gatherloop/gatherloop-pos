import { match, P } from 'ts-pattern';
import { Transaction } from '../entities';
import { TransactionRepository } from '../repositories';
import { createDebounce } from '../../utils';
import { Usecase } from './IUsecase';

type Context = {
  transactions: Transaction[];
  page: number;
  query: string;
  errorMessage: string | null;
  sortBy: 'created_at';
  orderBy: 'asc' | 'desc';
  itemPerPage: number;
  totalItem: number;
  fetchDebounceDelay: number;
};

export type TransactionListState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'revalidating' }
  | { type: 'changingParams' }
) &
  Context;

export type TransactionListAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; transactions: Transaction[]; totalItem: number }
  | { type: 'FETCH_ERROR'; message: string }
  | {
      type: 'CHANGE_PARAMS';
      page?: number;
      query?: string;
      fetchDebounceDelay?: number;
    }
  | { type: 'REVALIDATE'; transactions: Transaction[]; totalItem: number }
  | {
      type: 'REVALIDATE_FINISH';
      transactions: Transaction[];
      totalItem: number;
    };

const changeParamsDebounce = createDebounce();

export class TransactionListUsecase extends Usecase<
  TransactionListState,
  TransactionListAction
> {
  repository: TransactionRepository;

  constructor(repository: TransactionRepository) {
    super();
    this.repository = repository;
  }

  getInitialState() {
    const initialParams = this.repository.getTransactionListServerParams();
    const { transactions, totalItem } =
      this.repository.getTransactionList(initialParams);

    const state: TransactionListState = {
      type: transactions.length > 0 ? 'loaded' : 'idle',
      totalItem,
      page: initialParams.page,
      query: initialParams.query,
      errorMessage: null,
      sortBy: initialParams.sortBy,
      orderBy: initialParams.orderBy,
      itemPerPage: initialParams.itemPerPage,
      fetchDebounceDelay: 0,
      transactions,
    };

    return state;
  }

  getNextState(state: TransactionListState, action: TransactionListAction) {
    return match([state, action])
      .returnType<TransactionListState>()
      .with(
        [{ type: P.union('idle', 'error') }, { type: 'FETCH' }],
        ([state]) => ({ ...state, type: 'loading' })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_SUCCESS' }],
        ([state, { transactions, totalItem }]) => ({
          ...state,
          type: 'loaded',
          transactions,
          totalItem,
        })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_ERROR' }],
        ([state, { message }]) => ({
          ...state,
          type: 'error',
          message,
        })
      )
      .with([{ type: 'loaded' }, { type: 'FETCH' }], ([state]) => ({
        ...state,
        type: 'revalidating',
      }))
      .with(
        [
          {
            type: P.union(
              'loaded',
              'changingParams',
              'loading',
              'error',
              'revalidating'
            ),
          },
          { type: P.union('CHANGE_PARAMS') },
        ],
        ([state, { type: _type, fetchDebounceDelay = 0, ...params }]) => ({
          ...state,
          ...params,
          fetchDebounceDelay,
          type: 'changingParams',
        })
      )
      .with([{ type: 'changingParams' }, { type: 'FETCH' }], ([state]) => ({
        ...state,
        type: 'loading',
      }))
      .with(
        [{ type: 'changingParams' }, { type: 'REVALIDATE' }],
        ([state, { transactions, totalItem }]) => ({
          ...state,
          transactions,
          totalItem,
          type: 'revalidating',
        })
      )
      .with(
        [{ type: 'revalidating' }, { type: 'REVALIDATE_FINISH' }],
        ([state, { type: _type, ...params }]) => ({
          ...state,
          ...params,
          type: 'loaded',
        })
      )
      .otherwise(() => state);
  }

  onStateChange(
    state: TransactionListState,
    dispatch: (action: TransactionListAction) => void
  ) {
    match(state)
      .with({ type: 'idle' }, () => dispatch({ type: 'FETCH' }))
      .with(
        { type: 'loading' },
        ({ page, itemPerPage, orderBy, query, sortBy }) => {
          this.repository
            .fetchTransactionList({ page, itemPerPage, orderBy, query, sortBy })
            .then(({ transactions, totalItem }) =>
              dispatch({ type: 'FETCH_SUCCESS', transactions, totalItem })
            )
            .catch(() =>
              dispatch({
                type: 'FETCH_ERROR',
                message: 'Failed to fetch transactions',
              })
            );
        }
      )
      .with(
        { type: 'changingParams' },
        ({ page, itemPerPage, orderBy, query, sortBy, fetchDebounceDelay }) => {
          changeParamsDebounce(() => {
            const { transactions, totalItem } =
              this.repository.getTransactionList({
                page,
                itemPerPage,
                orderBy,
                query,
                sortBy,
              });

            if (transactions.length > 0) {
              dispatch({ type: 'REVALIDATE', transactions, totalItem });
            } else {
              dispatch({ type: 'FETCH' });
            }
          }, fetchDebounceDelay);
        }
      )
      .with(
        { type: 'revalidating' },
        ({
          page,
          itemPerPage,
          orderBy,
          query,
          sortBy,
          transactions,
          totalItem,
        }) => {
          this.repository
            .fetchTransactionList({
              page,
              itemPerPage,
              orderBy,
              query,
              sortBy,
            })
            .then(({ transactions, totalItem }) =>
              dispatch({ type: 'REVALIDATE_FINISH', transactions, totalItem })
            )
            .catch(() =>
              dispatch({ type: 'REVALIDATE_FINISH', transactions, totalItem })
            );
        }
      )
      .otherwise(() => {
        // TODO: IMPLEMENT SOMETHING
      });
  }
}
