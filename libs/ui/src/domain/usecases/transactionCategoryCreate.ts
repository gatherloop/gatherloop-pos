import { match } from 'ts-pattern';
import { Product, TransactionCategoryForm } from '../entities';
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

export type TransactionCategoryCreateState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'submitting' }
  | { type: 'submitSuccess' }
  | { type: 'submitError' }
) &
  Context;

export type TransactionCategoryCreateAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; products: Product[] }
  | { type: 'FETCH_ERROR'; errorMessage: string }
  | { type: 'SUBMIT'; values: TransactionCategoryForm }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; errorMessage: string }
  | { type: 'SUBMIT_CANCEL' };

export type TransactionCategoryCreateParams = {
  products: Product[];
};

export class TransactionCategoryCreateUsecase extends Usecase<
  TransactionCategoryCreateState,
  TransactionCategoryCreateAction,
  TransactionCategoryCreateParams
> {
  params: TransactionCategoryCreateParams;
  transactionCategoryRepository: TransactionCategoryRepository;
  productRepository: ProductRepository;

  constructor(
    transactionCategoryRepository: TransactionCategoryRepository,
    productRepository: ProductRepository,
    params: TransactionCategoryCreateParams
  ) {
    super();
    this.transactionCategoryRepository = transactionCategoryRepository;
    this.productRepository = productRepository;
    this.params = params;
  }

  getInitialState(): TransactionCategoryCreateState {
    return {
      type: this.params.products.length > 1 ? 'loaded' : 'idle',
      errorMessage: null,
      products: this.params.products,
      values: {
        name: '',
        checkoutProductId: null,
      },
    };
  }

  getNextState(
    state: TransactionCategoryCreateState,
    action: TransactionCategoryCreateAction
  ): TransactionCategoryCreateState {
    return match([state, action])
      .returnType<TransactionCategoryCreateState>()
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
        ([state, { products }]) => ({
          ...state,
          type: 'loaded',
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
    state: TransactionCategoryCreateState,
    dispatch: (action: TransactionCategoryCreateAction) => void
  ): void {
    match(state)
      .with({ type: 'idle' }, () => {
        dispatch({ type: 'FETCH' });
      })
      .with({ type: 'loading' }, () => {
        this.productRepository
          .fetchProductList({
            page: 1,
            itemPerPage: 999999,
            orderBy: 'desc',
            query: '',
            sortBy: 'created_at',
          })
          .then(({ products }) => dispatch({ type: 'FETCH_SUCCESS', products }))
          .catch(() =>
            dispatch({
              type: 'FETCH_ERROR',
              errorMessage: 'Failed to fetch product',
            })
          );
      })
      .with({ type: 'submitting' }, ({ values }) => {
        this.transactionCategoryRepository
          .createTransactionCategory(values)
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
