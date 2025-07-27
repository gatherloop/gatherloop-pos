import { match } from 'ts-pattern';
import { Category, Variant, VariantForm } from '../entities';
import { CategoryRepository, VariantRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  errorMessage: string | null;
  categories: Category[];
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
  | { type: 'FETCH_SUCCESS'; categories: Category[]; values: VariantForm }
  | { type: 'FETCH_ERROR'; errorMessage: string }
  | { type: 'SUBMIT'; values: VariantForm }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; errorMessage: string }
  | { type: 'SUBMIT_CANCEL' };

export type VariantUpdateParams = {
  variantId: number;
  variant: Variant | null;
  categories: Category[];
};

export class VariantUpdateUsecase extends Usecase<
  VariantUpdateState,
  VariantUpdateAction,
  VariantUpdateParams
> {
  variantRepository: VariantRepository;
  categoryRepository: CategoryRepository;
  params: VariantUpdateParams;

  constructor(
    variantRepository: VariantRepository,
    categoryRepository: CategoryRepository,
    params: VariantUpdateParams
  ) {
    super();
    this.variantRepository = variantRepository;
    this.categoryRepository = categoryRepository;
    this.params = params;
  }

  getInitialState(): VariantUpdateState {
    return {
      categories: this.params.categories,
      errorMessage: null,
      type:
        this.params.variant !== null && this.params.categories.length > 0
          ? 'loaded'
          : 'idle',
      values: {
        categoryId: this.params.variant?.category.id ?? NaN,
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
    state: VariantUpdateState,
    dispatch: (action: VariantUpdateAction) => void
  ): void {
    match(state)
      .with({ type: 'idle' }, () => {
        dispatch({ type: 'FETCH' });
      })
      .with({ type: 'loading' }, () => {
        Promise.all([
          this.categoryRepository.fetchCategoryList(),
          this.variantRepository.fetchVariantById(this.params.variantId),
        ])
          .then(([categories, variant]) =>
            dispatch({
              type: 'FETCH_SUCCESS',
              categories,
              values: {
                name: variant.name,
                price: variant.price,
                materials: variant.materials,
                categoryId: variant.category.id,
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
