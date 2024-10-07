import { match } from 'ts-pattern';
import { CategoryForm } from '../entities';
import { CategoryRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  errorMessage: string | null;
  values: CategoryForm;
};

export type CategoryUpdateState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'submitting' }
  | { type: 'submitSuccess' }
) &
  Context;

export type CategoryUpdateAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; values: CategoryForm }
  | { type: 'FETCH_ERROR'; errorMessage: string }
  | { type: 'SUBMIT'; values: CategoryForm }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; errorMessage: string };

export class CategoryUpdateUsecase extends Usecase<
  CategoryUpdateState,
  CategoryUpdateAction
> {
  repository: CategoryRepository;

  constructor(repository: CategoryRepository) {
    super();
    this.repository = repository;
  }

  getInitialState(): CategoryUpdateState {
    const categoryId = this.repository.getCategoryByIdServerParams();
    const category = categoryId
      ? this.repository.getCategoryById(categoryId)
      : null;
    return {
      type: category !== null ? 'loaded' : 'idle',
      errorMessage: null,
      values: {
        name: category?.name ?? '',
      },
    };
  }

  getNextState(
    state: CategoryUpdateState,
    action: CategoryUpdateAction
  ): CategoryUpdateState {
    return match([state, action])
      .returnType<CategoryUpdateState>()
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
        ([state, { values }]) => ({
          ...state,
          type: 'loaded',
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
          type: 'loaded',
          errorMessage,
        })
      )
      .otherwise(() => state);
  }

  onStateChange(
    state: CategoryUpdateState,
    dispatch: (action: CategoryUpdateAction) => void
  ): void {
    match(state)
      .with({ type: 'idle' }, () => {
        dispatch({ type: 'FETCH' });
      })
      .with({ type: 'loading' }, () => {
        const categoryId = this.repository.getCategoryByIdServerParams() ?? NaN;
        this.repository
          .fetchCategoryById(categoryId)
          .then((category) =>
            dispatch({
              type: 'FETCH_SUCCESS',
              values: {
                name: category.name,
              },
            })
          )
          .catch(() =>
            dispatch({
              type: 'FETCH_ERROR',
              errorMessage: 'Failed to fetch category',
            })
          );
      })
      .with({ type: 'submitting' }, ({ values }) => {
        const categoryId = this.repository.getCategoryByIdServerParams() ?? NaN;
        this.repository
          .updateCategory(values, categoryId)
          .then(() => dispatch({ type: 'SUBMIT_SUCCESS' }))
          .catch(() =>
            dispatch({ type: 'SUBMIT_ERROR', errorMessage: 'Submit failed' })
          );
      })
      .otherwise(() => {
        // TODO: IMPLEMENT SOMETHING
      });
  }
}
