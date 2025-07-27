import { match } from 'ts-pattern';
import { Category, VariantForm } from '../entities';
import { CategoryRepository, VariantRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  errorMessage: string | null;
  categories: Category[];
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
  | { type: 'FETCH_SUCCESS'; categories: Category[] }
  | { type: 'FETCH_ERROR'; errorMessage: string }
  | { type: 'SUBMIT'; values: VariantForm }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; errorMessage: string }
  | { type: 'SUBMIT_CANCEL' };

export type VariantCreateParams = {
  categories: Category[];
};

export class VariantCreateUsecase extends Usecase<
  VariantCreateState,
  VariantCreateAction,
  VariantCreateParams
> {
  params: VariantCreateParams;
  variantRepository: VariantRepository;
  categoryRepository: CategoryRepository;

  constructor(
    variantRepository: VariantRepository,
    categoryRepository: CategoryRepository,
    params: VariantCreateParams
  ) {
    super();
    this.variantRepository = variantRepository;
    this.categoryRepository = categoryRepository;
    this.params = params;
  }

  getInitialState(): VariantCreateState {
    const values: VariantForm = {
      categoryId: NaN,
      materials: [],
      name: '',
      price: 0,
      description: '',
    };
    return this.params.categories.length > 0
      ? {
          type: 'loaded',
          categories: this.params.categories,
          errorMessage: null,
          values,
        }
      : {
          type: 'idle',
          categories: [],
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
    state: VariantCreateState,
    dispatch: (action: VariantCreateAction) => void
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
