import { match } from 'ts-pattern';
import { MaterialRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  materialId: number | null;
};

export type MaterialDeleteState = (
  | { type: 'hidden' }
  | { type: 'shown' }
  | { type: 'deleting' }
  | { type: 'deletingSuccess' }
  | { type: 'deletingError' }
) &
  Context;

export type MaterialDeleteAction =
  | { type: 'SHOW_CONFIRMATION'; materialId: number }
  | { type: 'HIDE_CONFIRMATION' }
  | { type: 'DELETE' }
  | { type: 'DELETE_SUCCESS' }
  | { type: 'DELETE_ERROR' }
  | { type: 'DELETE_CANCEL' };

export class MaterialDeleteUsecase extends Usecase<
  MaterialDeleteState,
  MaterialDeleteAction
> {
  repository: MaterialRepository;

  constructor(repository: MaterialRepository) {
    super();
    this.repository = repository;
  }

  getInitialState(): MaterialDeleteState {
    return {
      type: 'hidden',
      materialId: null,
    };
  }
  getNextState(
    state: MaterialDeleteState,
    action: MaterialDeleteAction
  ): MaterialDeleteState {
    return match([state, action])
      .returnType<MaterialDeleteState>()
      .with(
        [{ type: 'hidden' }, { type: 'SHOW_CONFIRMATION' }],
        ([_state, { materialId }]) => ({ type: 'shown', materialId })
      )
      .with([{ type: 'shown' }, { type: 'HIDE_CONFIRMATION' }], ([state]) => ({
        type: 'hidden',
        materialId: null,
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
          MaterialId: null,
        })
      )
      .otherwise(() => state);
  }
  onStateChange(
    state: MaterialDeleteState,
    dispatch: (action: MaterialDeleteAction) => void
  ): void {
    match(state)
      .with({ type: 'deleting' }, ({ materialId }) => {
        this.repository
          .deleteMaterialById(materialId ?? NaN)
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
