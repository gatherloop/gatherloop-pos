import { match } from 'ts-pattern';
import { Category, Product, ProductForm } from '../entities';
import { CategoryRepository, ProductRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  errorMessage: string | null;
  categories: Category[];
  values: ProductForm;
};

export type ProductUpdateState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'submitting' }
  | { type: 'submitSuccess' }
  | { type: 'submitError' }
) &
  Context;

export type ProductUpdateAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; categories: Category[]; values: ProductForm }
  | { type: 'FETCH_ERROR'; errorMessage: string }
  | { type: 'SUBMIT'; values: ProductForm }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; errorMessage: string }
  | { type: 'SUBMIT_CANCEL' };

export type ProductUpdateParams = {
  productId: number;
  product: Product | null;
  categories: Category[];
};

export class ProductUpdateUsecase extends Usecase<
  ProductUpdateState,
  ProductUpdateAction,
  ProductUpdateParams
> {
  productRepository: ProductRepository;
  categoryRepository: CategoryRepository;
  params: ProductUpdateParams;

  constructor(
    productRepository: ProductRepository,
    categoryRepository: CategoryRepository,
    params: ProductUpdateParams
  ) {
    super();
    this.productRepository = productRepository;
    this.categoryRepository = categoryRepository;
    this.params = params;
  }

  getInitialState(): ProductUpdateState {
    return {
      categories: this.params.categories,
      errorMessage: null,
      type:
        this.params.product !== null && this.params.categories.length > 0
          ? 'loaded'
          : 'idle',
      values: {
        categoryId: this.params.product?.category.id ?? NaN,
        name: this.params.product?.name ?? '',
        imageUrl: this.params.product?.imageUrl ?? '',
        description: this.params.product?.description ?? '',
        options: this.params.product?.options ?? [],
      },
    };
  }

  getNextState(
    state: ProductUpdateState,
    action: ProductUpdateAction
  ): ProductUpdateState {
    return match([state, action])
      .returnType<ProductUpdateState>()
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
        ([state, { categories, values }]) => ({
          ...state,
          type: 'loaded',
          categories,
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
    state: ProductUpdateState,
    dispatch: (action: ProductUpdateAction) => void
  ): void {
    match(state)
      .with({ type: 'idle' }, () => {
        dispatch({ type: 'FETCH' });
      })
      .with({ type: 'loading' }, () => {
        Promise.all([
          this.categoryRepository.fetchCategoryList(),
          this.productRepository.fetchProductById(this.params.productId),
        ])
          .then(([categories, product]) =>
            dispatch({
              type: 'FETCH_SUCCESS',
              categories,
              values: {
                name: product.name,
                categoryId: product.category.id,
                imageUrl: product.imageUrl,
                description: product.description,
                options: product.options,
              },
            })
          )
          .catch(() =>
            dispatch({
              type: 'FETCH_ERROR',
              errorMessage: 'Failed to fetch product',
            })
          );
      })
      .with({ type: 'submitting' }, ({ values }) => {
        this.productRepository
          .updateProduct(values, this.params.productId)
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
