import { match, P } from 'ts-pattern';
import { TransactionCategory } from '../entities';
import { TransactionCategoryRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  transactionCategories: TransactionCategory[];
  errorMessage: string | null;
};

export type TransactionCategoryListState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'revalidating' }
) &
  Context;

export type TransactionCategoryListAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; transactionCategories: TransactionCategory[] }
  | { type: 'FETCH_ERROR'; message: string }
  | { type: 'REVALIDATE'; transactionCategories: TransactionCategory[] }
  | { type: 'REVALIDATE_FINISH'; transactionCategories: TransactionCategory[] };

export type TransactionCategoryListParams = {
  transactionCategories: TransactionCategory[];
};

export class TransactionCategoryListUsecase extends Usecase<
  TransactionCategoryListState,
  TransactionCategoryListAction,
  TransactionCategoryListParams
> {
  params: TransactionCategoryListParams;
  repository: TransactionCategoryRepository;

  constructor(
    repository: TransactionCategoryRepository,
    params: TransactionCategoryListParams
  ) {
    super();
    this.repository = repository;
    this.params = params;
  }

  getInitialState() {
    const state: TransactionCategoryListState = {
      type: this.params.transactionCategories.length >= 1 ? 'loaded' : 'idle',
      errorMessage: null,
      transactionCategories: this.params.transactionCategories,
    };
    return state;
  }

  getNextState(
    state: TransactionCategoryListState,
    action: TransactionCategoryListAction
  ) {
    return match([state, action])
      .returnType<TransactionCategoryListState>()
      .with(
        [{ type: P.union('idle', 'error') }, { type: 'FETCH' }],
        ([state]) => ({ ...state, type: 'loading', errorMessage: null })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_SUCCESS' }],
        ([state, { transactionCategories }]) => ({
          ...state,
          type: 'loaded',
          transactionCategories,
          errorMessage: null,
        })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_ERROR' }],
        ([state, { message }]) => ({
          ...state,
          type: 'error',
          errorMessage: message,
        })
      )
      .with([{ type: 'loaded' }, { type: 'FETCH' }], ([state]) => ({
        ...state,
        type: 'revalidating',
        errorMessage: null,
      }))
      .with(
        [{ type: 'revalidating' }, { type: 'REVALIDATE_FINISH' }],
        ([state, { transactionCategories }]) => ({
          ...state,
          type: 'loaded',
          transactionCategories,
          errorMessage: null,
        })
      )
      .otherwise(() => state);
  }

  onStateChange(
    state: TransactionCategoryListState,
    dispatch: (action: TransactionCategoryListAction) => void
  ) {
    match(state)
      .with({ type: 'idle' }, () => dispatch({ type: 'FETCH' }))
      .with({ type: 'loading' }, () =>
        this.repository
          .fetchTransactionCategoryList()
          .then((transactionCategories) =>
            dispatch({ type: 'FETCH_SUCCESS', transactionCategories })
          )
          .catch(() =>
            dispatch({
              type: 'FETCH_ERROR',
              message: 'Failed to fetch transactionCategories',
            })
          )
      )
      .with({ type: 'revalidating' }, ({ transactionCategories }) => {
        this.repository
          .fetchTransactionCategoryList()
          .then((transactionCategories) =>
            dispatch({ type: 'REVALIDATE_FINISH', transactionCategories })
          )
          .catch(() =>
            dispatch({ type: 'REVALIDATE_FINISH', transactionCategories })
          );
      })
      .otherwise(() => {
        // No action needed for other states
      });
  }
}
