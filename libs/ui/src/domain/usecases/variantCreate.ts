import { match } from 'ts-pattern';
import { Product, VariantForm } from '../entities';
import { VariantRepository, ProductRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  errorMessage: string | null;
  products: Product[];
  values: VariantForm;
};

export type VariantCreateState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'submitting' }
  | { type: 'submitSuccess' }
  | { type: 'submitError' }
) &
  Context;

export type VariantCreateAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; products: Product[] }
  | { type: 'FETCH_ERROR'; errorMessage: string }
  | { type: 'SUBMIT'; values: VariantForm }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; errorMessage: string }
  | { type: 'SUBMIT_CANCEL' };

export type VariantCreateParams = {
  products: Product[];
};

export class VariantCreateUsecase extends Usecase<
  VariantCreateState,
  VariantCreateAction,
  VariantCreateParams
> {
  params: VariantCreateParams;
  variantRepository: VariantRepository;
  productRepository: ProductRepository;

  constructor(
    variantRepository: VariantRepository,
    productRepository: ProductRepository,
    params: VariantCreateParams
  ) {
    super();
    this.variantRepository = variantRepository;
    this.productRepository = productRepository;
    this.params = params;
  }

  getInitialState(): VariantCreateState {
    const values: VariantForm = {
      productId: NaN,
      materials: [],
      name: '',
      price: 0,
      description: '',
      values: [],
    };
    return this.params.products.length > 0
      ? {
          type: 'loaded',
          products: this.params.products,
          errorMessage: null,
          values,
        }
      : {
          type: 'idle',
          products: [],
          errorMessage: null,
          values,
        };
  }

  getNextState(
    state: VariantCreateState,
    action: VariantCreateAction
  ): VariantCreateState {
    return match([state, action])
      .returnType<VariantCreateState>()
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
    state: VariantCreateState,
    dispatch: (action: VariantCreateAction) => void
  ): void {
    match(state)
      .with({ type: 'idle' }, () => {
        dispatch({ type: 'FETCH' });
      })
      .with({ type: 'loading' }, () => {
        this.productRepository
          .fetchProductList({
            itemPerPage: 1000,
            orderBy: 'desc',
            page: 1,
            query: '',
            sortBy: 'created_at',
            saleType: 'all',
          })
          .then(({ products }) => dispatch({ type: 'FETCH_SUCCESS', products }))
          .catch(() =>
            dispatch({
              type: 'FETCH_ERROR',
              errorMessage: 'Failed to fetch variant',
            })
          );
      })
      .with({ type: 'submitting' }, ({ values }) => {
        this.variantRepository
          .createVariant(values)
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
