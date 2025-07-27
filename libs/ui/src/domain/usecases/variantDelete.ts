import { match } from 'ts-pattern';
import { VariantRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  variantId: number | null;
};

export type VariantDeleteState = (
  | { type: 'hidden' }
  | { type: 'shown' }
  | { type: 'deleting' }
  | { type: 'deletingSuccess' }
  | { type: 'deletingError' }
) &
  Context;

export type VariantDeleteAction =
  | { type: 'SHOW_CONFIRMATION'; variantId: number }
  | { type: 'HIDE_CONFIRMATION' }
  | { type: 'DELETE' }
  | { type: 'DELETE_SUCCESS' }
  | { type: 'DELETE_ERROR' }
  | { type: 'DELETE_CANCEL' };

export class VariantDeleteUsecase extends Usecase<
  VariantDeleteState,
  VariantDeleteAction
> {
  params: undefined;
  repository: VariantRepository;

  constructor(repository: VariantRepository) {
    super();
    this.repository = repository;
  }

  getInitialState(): VariantDeleteState {
    return {
      type: 'hidden',
      variantId: null,
    };
  }
  getNextState(
    state: VariantDeleteState,
    action: VariantDeleteAction
  ): VariantDeleteState {
    return match([state, action])
      .returnType<VariantDeleteState>()
      .with(
        [{ type: 'hidden' }, { type: 'SHOW_CONFIRMATION' }],
        ([_state, { variantId }]) => ({ type: 'shown', variantId })
      )
      .with([{ type: 'shown' }, { type: 'HIDE_CONFIRMATION' }], ([state]) => ({
        type: 'hidden',
        variantId: null,
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
          variantId: null,
        })
      )
      .otherwise(() => state);
  }
  onStateChange(
    state: VariantDeleteState,
    dispatch: (action: VariantDeleteAction) => void
  ): void {
    match(state)
      .with({ type: 'deleting' }, ({ variantId }) => {
        this.repository
          .deleteVariantById(variantId ?? NaN)
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
