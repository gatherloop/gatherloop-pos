import { match, P } from 'ts-pattern';
import { PaymentStatus, Transaction } from '../entities';
import {
  TransactionRepository,
  TransactionListQueryRepository,
} from '../repositories';
import { createDebounce } from '../../utils';
import { Usecase } from './IUsecase';

type Context = {
  transactions: Transaction[];
  page: number;
  query: string;
  errorMessage: string | null;
  sortBy: 'created_at';
  orderBy: 'asc' | 'desc';
  paymentStatus: PaymentStatus;
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
      paymentStatus?: PaymentStatus;
    }
  | { type: 'REVALIDATE'; transactions: Transaction[]; totalItem: number }
  | {
      type: 'REVALIDATE_FINISH';
      transactions: Transaction[];
      totalItem: number;
    };

export type TransactionListParams = {
  page?: number;
  query?: string;
  paymentStatus?: PaymentStatus;
  sortBy?: 'created_at';
  orderBy?: 'asc' | 'desc';
  itemPerPage?: number;
  transactions: Transaction[];
  totalItem: number;
};

const changeParamsDebounce = createDebounce();

export class TransactionListUsecase extends Usecase<
  TransactionListState,
  TransactionListAction,
  TransactionListParams
> {
  params: TransactionListParams;
  transactionRepository: TransactionRepository;
  transactionListQueryRepository: TransactionListQueryRepository;

  constructor(
    transactionRepository: TransactionRepository,
    transactionListQueryRepository: TransactionListQueryRepository,
    params: TransactionListParams
  ) {
    super();
    this.transactionRepository = transactionRepository;
    this.transactionListQueryRepository = transactionListQueryRepository;
    this.params = params;
  }

  getInitialState() {
    const state: TransactionListState = {
      type: this.params.transactions.length > 0 ? 'loaded' : 'idle',
      totalItem: this.params.totalItem,
      page: this.params.page ?? this.transactionListQueryRepository.getPage(),
      query:
        this.params.query ??
        this.transactionListQueryRepository.getSearchQuery(),
      paymentStatus:
        this.params.paymentStatus ??
        this.transactionListQueryRepository.getPaymentStatus(),
      errorMessage: null,
      sortBy:
        this.params.sortBy ?? this.transactionListQueryRepository.getSortBy(),
      orderBy:
        this.params.orderBy ?? this.transactionListQueryRepository.getOrderBy(),
      itemPerPage:
        this.params.itemPerPage ??
        this.transactionListQueryRepository.getItemPerPage(),
      fetchDebounceDelay: 0,
      transactions: this.params.transactions,
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
        ({ page, itemPerPage, orderBy, query, sortBy, paymentStatus }) => {
          this.transactionRepository
            .fetchTransactionList({
              page,
              itemPerPage,
              orderBy,
              query,
              sortBy,
              paymentStatus,
            })
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
        ({
          page,
          itemPerPage,
          orderBy,
          query,
          sortBy,
          fetchDebounceDelay,
          paymentStatus,
        }) => {
          this.transactionListQueryRepository.setPage(page);
          this.transactionListQueryRepository.setSearchQuery(query);
          this.transactionListQueryRepository.setOrderBy(orderBy);
          this.transactionListQueryRepository.setSortBy(sortBy);
          this.transactionListQueryRepository.setItemPerPage(itemPerPage);
          this.transactionListQueryRepository.setPaymentStatus(paymentStatus);

          changeParamsDebounce(() => {
            const { transactions, totalItem } =
              this.transactionRepository.getTransactionList({
                page,
                itemPerPage,
                orderBy,
                query,
                sortBy,
                paymentStatus,
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
          paymentStatus,
          transactions,
          totalItem,
        }) => {
          this.transactionRepository
            .fetchTransactionList({
              page,
              itemPerPage,
              orderBy,
              query,
              sortBy,
              paymentStatus,
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
