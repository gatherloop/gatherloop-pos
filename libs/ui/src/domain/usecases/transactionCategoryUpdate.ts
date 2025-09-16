import { match } from 'ts-pattern';
import {
  Product,
  TransactionCategory,
  TransactionCategoryForm,
} from '../entities';
import {
  ProductRepository,
  TransactionCategoryRepository,
} from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  errorMessage: string | null;
  values: TransactionCategoryForm;
  products: Product[];
};

export type TransactionCategoryUpdateState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'submitting' }
  | { type: 'submitSuccess' }
  | { type: 'submitError' }
) &
  Context;

export type TransactionCategoryUpdateAction =
  | { type: 'FETCH' }
  | {
      type: 'FETCH_SUCCESS';
      values: TransactionCategoryForm;
      products: Product[];
    }
  | { type: 'FETCH_ERROR'; errorMessage: string }
  | { type: 'SUBMIT'; values: TransactionCategoryForm }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; errorMessage: string }
  | { type: 'SUBMIT_CANCEL' };

export type TransactionCategoryUpdateParams = {
  transactionCategoryId: number;
  transactionCategory: TransactionCategory | null;
  products: Product[];
};

export class TransactionCategoryUpdateUsecase extends Usecase<
  TransactionCategoryUpdateState,
  TransactionCategoryUpdateAction,
  TransactionCategoryUpdateParams
> {
  params: TransactionCategoryUpdateParams;
  transactionCategoryRepository: TransactionCategoryRepository;
  productRepository: ProductRepository;

  constructor(
    transactionCategoryRepository: TransactionCategoryRepository,
    productRepository: ProductRepository,
    params: TransactionCategoryUpdateParams
  ) {
    super();
    this.transactionCategoryRepository = transactionCategoryRepository;
    this.productRepository = productRepository;
    this.params = params;
  }

  getInitialState(): TransactionCategoryUpdateState {
    return {
      type:
        this.params.transactionCategory !== null &&
        this.params.products.length > 1
          ? 'loaded'
          : 'idle',
      errorMessage: null,
      products: this.params.products,
      values: {
        name: this.params.transactionCategory?.name ?? '',
        checkoutProductId:
          this.params.transactionCategory?.checkoutProductId || null,
      },
    };
  }

  getNextState(
    state: TransactionCategoryUpdateState,
    action: TransactionCategoryUpdateAction
  ): TransactionCategoryUpdateState {
    return match([state, action])
      .returnType<TransactionCategoryUpdateState>()
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
        ([state, { values, products }]) => ({
          ...state,
          type: 'loaded',
          values,
          products,
        })
      )
      .with(
        [{ type: 'loaded' }, { type: 'SUBMIT' }],
        ([state, { values }]) => ({
          ...state,
          values,
          type: 'submitting',
        })
      )
      .with(
        [{ type: 'submitting' }, { type: 'SUBMIT_SUCCESS' }],
        ([state]) => ({
          ...state,
          type: 'submitSuccess',
        })
      )
      .with(
        [{ type: 'submitting' }, { type: 'SUBMIT_ERROR' }],
        ([state, { errorMessage }]) => ({
          ...state,
          type: 'submitError',
          errorMessage,
        })
      )
      .with(
        [{ type: 'submitError' }, { type: 'SUBMIT_CANCEL' }],
        ([state]) => ({
          ...state,
          type: 'loaded',
        })
      )
      .otherwise(() => state);
  }

  onStateChange(
    state: TransactionCategoryUpdateState,
    dispatch: (action: TransactionCategoryUpdateAction) => void
  ): void {
    match(state)
      .with({ type: 'idle' }, () => {
        dispatch({ type: 'FETCH' });
      })
      .with({ type: 'loading' }, () => {
        Promise.all([
          this.transactionCategoryRepository.fetchTransactionCategoryById(
            this.params.transactionCategoryId
          ),
          this.productRepository.fetchProductList({
            page: 1,
            itemPerPage: 999999,
            orderBy: 'desc',
            query: '',
            sortBy: 'created_at',
          }),
        ])
          .then(([transactionCategory, { products }]) =>
            dispatch({
              type: 'FETCH_SUCCESS',
              products,
              values: {
                name: transactionCategory.name,
                checkoutProductId: transactionCategory.checkoutProductId,
              },
            })
          )
          .catch(() =>
            dispatch({
              type: 'FETCH_ERROR',
              errorMessage: 'Failed to fetch transactionCategory',
            })
          );
      })
      .with({ type: 'submitting' }, ({ values }) => {
        this.transactionCategoryRepository
          .updateTransactionCategory(values, this.params.transactionCategoryId)
          .then(() => dispatch({ type: 'SUBMIT_SUCCESS' }))
          .catch(() =>
            dispatch({ type: 'SUBMIT_ERROR', errorMessage: 'Submit failed' })
          );
      })
      .with({ type: 'submitError' }, () => {
        dispatch({ type: 'SUBMIT_CANCEL' });
      })
      .otherwise(() => {
        // TODO: IMPLEMENT SOMETHING
      });
  }
}
