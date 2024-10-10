import { match } from 'ts-pattern';
import { Category, ProductForm } from '../entities';
import { CategoryRepository, ProductRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  errorMessage: string | null;
  categories: Category[];
  values: ProductForm;
};

export type ProductCreateState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'submitting' }
  | { type: 'submitSuccess' }
  | { type: 'submitError' }
) &
  Context;

export type ProductCreateAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; categories: Category[] }
  | { type: 'FETCH_ERROR'; errorMessage: string }
  | { type: 'SUBMIT'; values: ProductForm }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; errorMessage: string }
  | { type: 'SUBMIT_CANCEL' };

export class ProductCreateUsecase extends Usecase<
  ProductCreateState,
  ProductCreateAction
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

  getInitialState(): ProductCreateState {
    const categories = this.categoryRepository.getCategoryList();
    const values: ProductForm = {
      categoryId: NaN,
      materials: [],
      name: '',
      price: 0,
    };
    return categories.length > 0
      ? {
          type: 'loaded',
          categories,
          errorMessage: null,
          values,
        }
      : {
          type: 'idle',
          categories,
          errorMessage: null,
          values,
        };
  }

  getNextState(
    state: ProductCreateState,
    action: ProductCreateAction
  ): ProductCreateState {
    return match([state, action])
      .returnType<ProductCreateState>()
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
        ([state, { categories }]) => ({
          ...state,
          type: 'loaded',
          categories,
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
    state: ProductCreateState,
    dispatch: (action: ProductCreateAction) => void
  ): void {
    match(state)
      .with({ type: 'idle' }, () => {
        dispatch({ type: 'FETCH' });
      })
      .with({ type: 'loading' }, () => {
        this.categoryRepository
          .fetchCategoryList()
          .then((categories) => dispatch({ type: 'FETCH_SUCCESS', categories }))
          .catch(() =>
            dispatch({
              type: 'FETCH_ERROR',
              errorMessage: 'Failed to fetch product',
            })
          );
      })
      .with({ type: 'submitting' }, ({ values }) => {
        this.productRepository
          .createProduct(values)
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
