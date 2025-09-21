import { match } from 'ts-pattern';
import { ReservationRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  reservationId: number | null;
};

export type ReservationDeleteState = (
  | { type: 'hidden' }
  | { type: 'shown' }
  | { type: 'deleting' }
  | { type: 'deletingSuccess' }
  | { type: 'deletingError' }
) &
  Context;

export type ReservationDeleteAction =
  | { type: 'SHOW_CONFIRMATION'; reservationId: number }
  | { type: 'HIDE_CONFIRMATION' }
  | { type: 'DELETE' }
  | { type: 'DELETE_SUCCESS' }
  | { type: 'DELETE_ERROR' }
  | { type: 'DELETE_CANCEL' };

export class ReservationDeleteUsecase extends Usecase<
  ReservationDeleteState,
  ReservationDeleteAction
> {
  params: undefined;
  repository: ReservationRepository;

  constructor(repository: ReservationRepository) {
    super();
    this.repository = repository;
  }

  getInitialState(): ReservationDeleteState {
    return {
      type: 'hidden',
      reservationId: null,
    };
  }
  getNextState(
    state: ReservationDeleteState,
    action: ReservationDeleteAction
  ): ReservationDeleteState {
    return match([state, action])
      .returnType<ReservationDeleteState>()
      .with(
        [{ type: 'hidden' }, { type: 'SHOW_CONFIRMATION' }],
        ([_state, { reservationId }]) => ({ type: 'shown', reservationId })
      )
      .with([{ type: 'shown' }, { type: 'HIDE_CONFIRMATION' }], ([state]) => ({
        ...state,
        type: 'hidden',
        reservationId: null,
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
          ReservationId: null,
        })
      )
      .otherwise(() => state);
  }
  onStateChange(
    state: ReservationDeleteState,
    dispatch: (action: ReservationDeleteAction) => void
  ): void {
    match(state)
      .with({ type: 'deleting' }, ({ reservationId }) => {
        this.repository
          .deleteReservationById(reservationId ?? NaN)
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
