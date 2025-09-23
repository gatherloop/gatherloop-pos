import { match } from 'ts-pattern';
import { ReservationCheckinForm } from '../entities';
import { ReservationRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  errorMessage: string | null;
  values: ReservationCheckinForm;
};

export type ReservationCheckinState = (
  | { type: 'loaded' }
  | { type: 'submitting' }
  | { type: 'submitSuccess' }
  | { type: 'submitError' }
) &
  Context;

export type ReservationCheckinAction =
  | { type: 'SUBMIT'; values: ReservationCheckinForm }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; errorMessage: string }
  | { type: 'SUBMIT_CANCEL' };

export class ReservationCheckinUsecase extends Usecase<
  ReservationCheckinState,
  ReservationCheckinAction
> {
  params: undefined;
  repository: ReservationRepository;

  constructor(repository: ReservationRepository) {
    super();
    this.repository = repository;
  }

  getInitialState(): ReservationCheckinState {
    return {
      type: 'loaded',
      errorMessage: null,
      values: { name: '', reservations: [] },
    };
  }

  getNextState(
    state: ReservationCheckinState,
    action: ReservationCheckinAction
  ): ReservationCheckinState {
    return match([state, action])
      .returnType<ReservationCheckinState>()
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
    state: ReservationCheckinState,
    dispatch: (action: ReservationCheckinAction) => void
  ): void {
    match(state)
      .with({ type: 'submitting' }, ({ values }) => {
        this.repository
          .checkinReservations(values)
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
