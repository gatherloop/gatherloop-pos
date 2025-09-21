import { match } from 'ts-pattern';
import { ReservationCheckoutForm } from '../entities';
import { ReservationRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  errorMessage: string | null;
  values: ReservationCheckoutForm;
  transactionId: number | null;
};

export type ReservationCheckoutState = (
  | { type: 'loaded' }
  | { type: 'submitting' }
  | { type: 'submitSuccess' }
  | { type: 'submitError' }
) &
  Context;

export type ReservationCheckoutAction =
  | { type: 'SUBMIT'; values: ReservationCheckoutForm }
  | { type: 'SUBMIT_SUCCESS'; transactionId: number }
  | { type: 'SUBMIT_ERROR'; errorMessage: string }
  | { type: 'SUBMIT_CANCEL' };

export class ReservationCheckoutUsecase extends Usecase<
  ReservationCheckoutState,
  ReservationCheckoutAction
> {
  params: undefined;
  repository: ReservationRepository;

  constructor(repository: ReservationRepository) {
    super();
    this.repository = repository;
  }

  getInitialState(): ReservationCheckoutState {
    return {
      type: 'loaded',
      errorMessage: null,
      transactionId: null,
      values: { reservations: [] },
    };
  }

  getNextState(
    state: ReservationCheckoutState,
    action: ReservationCheckoutAction
  ): ReservationCheckoutState {
    return match([state, action])
      .returnType<ReservationCheckoutState>()
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
        ([state, action]) => ({
          ...state,
          type: 'submitSuccess',
          transactionId: action.transactionId,
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
    state: ReservationCheckoutState,
    dispatch: (action: ReservationCheckoutAction) => void
  ): void {
    match(state)
      .with({ type: 'submitting' }, ({ values }) => {
        this.repository
          .checkoutReservations(values)
          .then(({ transactionId }) =>
            dispatch({ type: 'SUBMIT_SUCCESS', transactionId })
          )
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
