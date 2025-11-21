import { match } from 'ts-pattern';
import { RentalCheckoutForm } from '../entities';
import { RentalRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  errorMessage: string | null;
  values: RentalCheckoutForm;
  transactionId: number | null;
};

export type RentalCheckoutState = (
  | { type: 'loaded' }
  | { type: 'submitting' }
  | { type: 'submitSuccess' }
  | { type: 'submitError' }
) &
  Context;

export type RentalCheckoutAction =
  | { type: 'SUBMIT'; values: RentalCheckoutForm }
  | { type: 'SUBMIT_SUCCESS'; transactionId: number }
  | { type: 'SUBMIT_ERROR'; errorMessage: string }
  | { type: 'SUBMIT_CANCEL' };

export class RentalCheckoutUsecase extends Usecase<
  RentalCheckoutState,
  RentalCheckoutAction
> {
  params: undefined;
  repository: RentalRepository;

  constructor(repository: RentalRepository) {
    super();
    this.repository = repository;
  }

  getInitialState(): RentalCheckoutState {
    return {
      type: 'loaded',
      errorMessage: null,
      transactionId: null,
      values: { rentals: [] },
    };
  }

  getNextState(
    state: RentalCheckoutState,
    action: RentalCheckoutAction
  ): RentalCheckoutState {
    return match([state, action])
      .returnType<RentalCheckoutState>()
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
    state: RentalCheckoutState,
    dispatch: (action: RentalCheckoutAction) => void
  ): void {
    match(state)
      .with({ type: 'submitting' }, ({ values }) => {
        this.repository
          .checkoutRentals(values)
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
