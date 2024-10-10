import { match } from 'ts-pattern';
import { CategoryRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  categoryId: number | null;
};

export type CategoryDeleteState = (
  | { type: 'hidden' }
  | { type: 'shown' }
  | { type: 'deleting' }
  | { type: 'deletingSuccess' }
  | { type: 'deletingError' }
) &
  Context;

export type CategoryDeleteAction =
  | { type: 'SHOW_CONFIRMATION'; categoryId: number }
  | { type: 'HIDE_CONFIRMATION' }
  | { type: 'DELETE' }
  | { type: 'DELETE_SUCCESS' }
  | { type: 'DELETE_ERROR' }
  | { type: 'DELETE_CANCEL' };

export class CategoryDeleteUsecase extends Usecase<
  CategoryDeleteState,
  CategoryDeleteAction
> {
  repository: CategoryRepository;

  constructor(repository: CategoryRepository) {
    super();
    this.repository = repository;
  }

  getInitialState(): CategoryDeleteState {
    return {
      type: 'hidden',
      categoryId: null,
    };
  }
  getNextState(
    state: CategoryDeleteState,
    action: CategoryDeleteAction
  ): CategoryDeleteState {
    return match([state, action])
      .returnType<CategoryDeleteState>()
      .with(
        [{ type: 'hidden' }, { type: 'SHOW_CONFIRMATION' }],
        ([_state, { categoryId }]) => ({ type: 'shown', categoryId })
      )
      .with([{ type: 'shown' }, { type: 'HIDE_CONFIRMATION' }], ([state]) => ({
        ...state,
        type: 'hidden',
        categoryId: null,
      }))
      .with([{ type: 'shown' }, { type: 'DELETE' }], ([state]) => ({
        ...state,
        type: 'deleting',
      }))
      .with([{ type: 'deleting' }, { type: 'DELETE_ERROR' }], ([state]) => ({
        ...state,
        type: 'deletingError',
      }))
      .with(
        [{ type: 'deletingError' }, { type: 'DELETE_CANCEL' }],
        ([state]) => ({
          ...state,
          type: 'shown',
        })
      )
      .with([{ type: 'deleting' }, { type: 'DELETE_SUCCESS' }], ([state]) => ({
        ...state,
        type: 'deletingSuccess',
      }))
      .with(
        [{ type: 'deletingSuccess' }, { type: 'HIDE_CONFIRMATION' }],
        ([state]) => ({
          ...state,
          type: 'hidden',
          CategoryId: null,
        })
      )
      .otherwise(() => state);
  }
  onStateChange(
    state: CategoryDeleteState,
    dispatch: (action: CategoryDeleteAction) => void
  ): void {
    match(state)
      .with({ type: 'deleting' }, ({ categoryId }) => {
        this.repository
          .deleteCategoryById(categoryId ?? NaN)
          .then(() => dispatch({ type: 'DELETE_SUCCESS' }))
          .catch(() => dispatch({ type: 'DELETE_ERROR' }));
      })
      .with({ type: 'deletingSuccess' }, () => {
        dispatch({ type: 'HIDE_CONFIRMATION' });
      })
      .with({ type: 'deletingError' }, () => {
        dispatch({ type: 'DELETE_CANCEL' });
      })
      .otherwise(() => {
        // TODO: IMPLEMENT SOMETHING
      });
  }
}
