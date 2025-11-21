import { match } from 'ts-pattern';
import { RentalRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  rentalId: number | null;
};

export type RentalDeleteState = (
  | { type: 'hidden' }
  | { type: 'shown' }
  | { type: 'deleting' }
  | { type: 'deletingSuccess' }
  | { type: 'deletingError' }
) &
  Context;

export type RentalDeleteAction =
  | { type: 'SHOW_CONFIRMATION'; rentalId: number }
  | { type: 'HIDE_CONFIRMATION' }
  | { type: 'DELETE' }
  | { type: 'DELETE_SUCCESS' }
  | { type: 'DELETE_ERROR' }
  | { type: 'DELETE_CANCEL' };

export class RentalDeleteUsecase extends Usecase<
  RentalDeleteState,
  RentalDeleteAction
> {
  params: undefined;
  repository: RentalRepository;

  constructor(repository: RentalRepository) {
    super();
    this.repository = repository;
  }

  getInitialState(): RentalDeleteState {
    return {
      type: 'hidden',
      rentalId: null,
    };
  }
  getNextState(
    state: RentalDeleteState,
    action: RentalDeleteAction
  ): RentalDeleteState {
    return match([state, action])
      .returnType<RentalDeleteState>()
      .with(
        [{ type: 'hidden' }, { type: 'SHOW_CONFIRMATION' }],
        ([_state, { rentalId }]) => ({ type: 'shown', rentalId })
      )
      .with([{ type: 'shown' }, { type: 'HIDE_CONFIRMATION' }], ([state]) => ({
        ...state,
        type: 'hidden',
        rentalId: null,
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
          RentalId: null,
        })
      )
      .otherwise(() => state);
  }
  onStateChange(
    state: RentalDeleteState,
    dispatch: (action: RentalDeleteAction) => void
  ): void {
    match(state)
      .with({ type: 'deleting' }, ({ rentalId }) => {
        this.repository
          .deleteRentalById(rentalId ?? NaN)
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
