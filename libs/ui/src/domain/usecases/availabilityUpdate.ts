import { match } from 'ts-pattern';
import { AvailabilityForm, AvailabilityProduct } from '../entities';
import { AvailabilityRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  errorMessage: string | null;
  values: AvailabilityForm;
  products: AvailabilityProduct[];
};

export type AvailabilityUpdateState = (
  | { type: 'loaded' }
  | { type: 'submitting' }
  | { type: 'submitSuccess' }
  | { type: 'submitError' }
) &
  Context;

export type AvailabilityUpdateAction =
  | { type: 'SUBMIT'; values: AvailabilityForm }
  | { type: 'SUBMIT_SUCCESS'; products: AvailabilityProduct[] }
  | { type: 'SUBMIT_ERROR'; errorMessage: string }
  | { type: 'SUBMIT_CANCEL' };

export class AvailabilityUpdateUsecase extends Usecase<
  AvailabilityUpdateState,
  AvailabilityUpdateAction
> {
  params: undefined;
  repository: AvailabilityRepository;

  constructor(repository: AvailabilityRepository) {
    super();
    this.repository = repository;
  }

  getInitialState(): AvailabilityUpdateState {
    return {
      type: 'loaded',
      errorMessage: null,
      values: { products: [], variants: [] },
      products: [],
    };
  }

  getNextState(
    state: AvailabilityUpdateState,
    action: AvailabilityUpdateAction
  ): AvailabilityUpdateState {
    return match([state, action])
      .returnType<AvailabilityUpdateState>()
      .with(
        [{ type: 'loaded' }, { type: 'SUBMIT' }],
        ([state, { values }]) => ({ ...state, values, type: 'submitting' })
      )
      .with(
        [{ type: 'submitError' }, { type: 'SUBMIT' }],
        ([state, { values }]) => ({ ...state, values, type: 'submitting' })
      )
      .with(
        [{ type: 'submitting' }, { type: 'SUBMIT_SUCCESS' }],
        ([state, { products }]) => ({
          ...state,
          type: 'submitSuccess',
          products,
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
        ([state]) => ({ ...state, type: 'loaded' })
      )
      .otherwise(() => state);
  }

  onStateChange(
    state: AvailabilityUpdateState,
    dispatch: (action: AvailabilityUpdateAction) => void
  ): void {
    match(state)
      .with({ type: 'submitting' }, ({ values }) => {
        this.repository
          .updateAvailability(values)
          .then((products) => dispatch({ type: 'SUBMIT_SUCCESS', products }))
          .catch(() =>
            dispatch({ type: 'SUBMIT_ERROR', errorMessage: 'Submit failed' })
          );
      })
      .otherwise(() => {
        // noop
      });
  }
}
