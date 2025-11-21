import { match } from 'ts-pattern';
import { RentalCheckinForm } from '../entities';
import { RentalRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  errorMessage: string | null;
  values: RentalCheckinForm;
};

export type RentalCheckinState = (
  | { type: 'loaded' }
  | { type: 'submitting' }
  | { type: 'submitSuccess' }
  | { type: 'submitError' }
) &
  Context;

export type RentalCheckinAction =
  | { type: 'SUBMIT'; values: RentalCheckinForm }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; errorMessage: string }
  | { type: 'SUBMIT_CANCEL' };

export class RentalCheckinUsecase extends Usecase<
  RentalCheckinState,
  RentalCheckinAction
> {
  params: undefined;
  repository: RentalRepository;

  constructor(repository: RentalRepository) {
    super();
    this.repository = repository;
  }

  getInitialState(): RentalCheckinState {
    return {
      type: 'loaded',
      errorMessage: null,
      values: { name: '', rentals: [] },
    };
  }

  getNextState(
    state: RentalCheckinState,
    action: RentalCheckinAction
  ): RentalCheckinState {
    return match([state, action])
      .returnType<RentalCheckinState>()
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
    state: RentalCheckinState,
    dispatch: (action: RentalCheckinAction) => void
  ): void {
    match(state)
      .with({ type: 'submitting' }, ({ values }) => {
        this.repository
          .checkinRentals(values)
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
