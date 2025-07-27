import { match } from 'ts-pattern';
import { Product, Variant, VariantForm } from '../entities';
import { ProductRepository, VariantRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  errorMessage: string | null;
  products: Product[];
  values: VariantForm;
};

export type VariantUpdateState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'submitting' }
  | { type: 'submitSuccess' }
  | { type: 'submitError' }
) &
  Context;

export type VariantUpdateAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; products: Product[]; values: VariantForm }
  | { type: 'FETCH_ERROR'; errorMessage: string }
  | { type: 'SUBMIT'; values: VariantForm }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; errorMessage: string }
  | { type: 'SUBMIT_CANCEL' };

export type VariantUpdateParams = {
  variantId: number;
  variant: Variant | null;
  products: Product[];
};

export class VariantUpdateUsecase extends Usecase<
  VariantUpdateState,
  VariantUpdateAction,
  VariantUpdateParams
> {
  variantRepository: VariantRepository;
  productRepository: ProductRepository;
  params: VariantUpdateParams;

  constructor(
    variantRepository: VariantRepository,
    productRepository: ProductRepository,
    params: VariantUpdateParams
  ) {
    super();
    this.variantRepository = variantRepository;
    this.productRepository = productRepository;
    this.params = params;
  }

  getInitialState(): VariantUpdateState {
    return {
      products: this.params.products,
      errorMessage: null,
      type:
        this.params.variant !== null && this.params.products.length > 0
          ? 'loaded'
          : 'idle',
      values: {
        productId: this.params.variant?.product.id ?? NaN,
        materials: this.params.variant?.materials ?? [],
        name: this.params.variant?.name ?? '',
        price: this.params.variant?.price ?? 0,
        description: this.params.variant?.description ?? '',
      },
    };
  }

  getNextState(
    state: VariantUpdateState,
    action: VariantUpdateAction
  ): VariantUpdateState {
    return match([state, action])
      .returnType<VariantUpdateState>()
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
        ([state, { products, values }]) => ({
          ...state,
          type: 'loaded',
          products,
          values,
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
    state: VariantUpdateState,
    dispatch: (action: VariantUpdateAction) => void
  ): void {
    match(state)
      .with({ type: 'idle' }, () => {
        dispatch({ type: 'FETCH' });
      })
      .with({ type: 'loading' }, () => {
        Promise.all([
          this.productRepository.fetchProductList({
            itemPerPage: 1000,
            orderBy: 'asc',
            page: 1,
            query: '',
            sortBy: 'created_at',
          }),
          this.variantRepository.fetchVariantById(this.params.variantId),
        ])
          .then(([{ products }, variant]) =>
            dispatch({
              type: 'FETCH_SUCCESS',
              products,
              values: {
                name: variant.name,
                price: variant.price,
                materials: variant.materials,
                productId: variant.product.id,
              },
            })
          )
          .catch(() =>
            dispatch({
              type: 'FETCH_ERROR',
              errorMessage: 'Failed to fetch variant',
            })
          );
      })
      .with({ type: 'submitting' }, ({ values }) => {
        this.variantRepository
          .updateVariant(values, this.params.variantId)
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
