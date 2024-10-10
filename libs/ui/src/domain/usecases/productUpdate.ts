import { match } from 'ts-pattern';
import { Category, ProductForm } from '../entities';
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

export class ProductUpdateUsecase extends Usecase<
  ProductUpdateState,
  ProductUpdateAction
> {
  productRepository: ProductRepository;
  categoryRepository: CategoryRepository;

  constructor(
    productRepository: ProductRepository,
    categoryRepository: CategoryRepository
  ) {
    super();
    this.productRepository = productRepository;
    this.categoryRepository = categoryRepository;
  }

  getInitialState(): ProductUpdateState {
    const productId = this.productRepository.getProductByIdServerParams();
    const product = productId
      ? this.productRepository.getProductById(productId)
      : null;
    const categories = this.categoryRepository.getCategoryList();
    const values: ProductForm = {
      categoryId: product?.category.id ?? NaN,
      materials: product?.materials ?? [],
      name: product?.name ?? '',
      price: product?.price ?? 0,
    };

    return {
      type: product !== null && categories.length > 0 ? 'loaded' : 'idle',
      categories,
      errorMessage: null,
      values,
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
        const productId =
          this.productRepository.getProductByIdServerParams() ?? NaN;
        Promise.all([
          this.categoryRepository.fetchCategoryList(),
          this.productRepository.fetchProductById(productId),
        ])
          .then(([categories, product]) =>
            dispatch({
              type: 'FETCH_SUCCESS',
              categories,
              values: {
                name: product.name,
                price: product.price,
                materials: product.materials,
                categoryId: product.category.id,
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
        const productId =
          this.productRepository.getProductByIdServerParams() ?? NaN;
        this.productRepository
          .updateProduct(values, productId)
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
