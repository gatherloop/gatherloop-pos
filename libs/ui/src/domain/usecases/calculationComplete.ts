import { match } from 'ts-pattern';
import { CalculationRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  calculationId: number | null;
};

export type CalculationCompleteState = (
  | { type: 'hidden' }
  | { type: 'shown' }
  | { type: 'completing' }
  | { type: 'completingSuccess' }
  | { type: 'completingError' }
) &
  Context;

export type CalculationCompleteAction =
  | { type: 'SHOW_CONFIRMATION'; calculationId: number }
  | { type: 'HIDE_CONFIRMATION' }
  | { type: 'COMPLETE' }
  | { type: 'COMPLETE_SUCCESS' }
  | { type: 'COMPLETE_ERROR' }
  | { type: 'COMPLETE_CANCEL' };

export class CalculationCompleteUsecase extends Usecase<
  CalculationCompleteState,
  CalculationCompleteAction
> {
  params: undefined;
  repository: CalculationRepository;

  constructor(repository: CalculationRepository) {
    super();
    this.repository = repository;
  }

  getInitialState(): CalculationCompleteState {
    return {
      type: 'hidden',
      calculationId: null,
    };
  }
  getNextState(
    state: CalculationCompleteState,
    action: CalculationCompleteAction
  ): CalculationCompleteState {
    return match([state, action])
      .returnType<CalculationCompleteState>()
      .with(
        [{ type: 'hidden' }, { type: 'SHOW_CONFIRMATION' }],
        ([_state, { calculationId }]) => ({ type: 'shown', calculationId })
      )
      .with([{ type: 'shown' }, { type: 'HIDE_CONFIRMATION' }], ([state]) => ({
        ...state,
        type: 'hidden',
        calculationId: null,
      }))
      .with([{ type: 'shown' }, { type: 'COMPLETE' }], ([state]) => ({
        ...state,
        type: 'completing',
      }))
      .with(
        [{ type: 'completing' }, { type: 'COMPLETE_ERROR' }],
        ([state]) => ({
          ...state,
          type: 'completingError',
        })
      )
      .with(
        [{ type: 'completingError' }, { type: 'COMPLETE_CANCEL' }],
        ([state]) => ({
          ...state,
          type: 'shown',
        })
      )
      .with(
        [{ type: 'completing' }, { type: 'COMPLETE_SUCCESS' }],
        ([state]) => ({
          ...state,
          type: 'completingSuccess',
        })
      )
      .with(
        [{ type: 'completingSuccess' }, { type: 'HIDE_CONFIRMATION' }],
        ([state]) => ({
          ...state,
          type: 'hidden',
          CalculationId: null,
        })
      )
      .otherwise(() => state);
  }
  onStateChange(
    state: CalculationCompleteState,
    dispatch: (action: CalculationCompleteAction) => void
  ): void {
    match(state)
      .with({ type: 'completing' }, ({ calculationId }) => {
        this.repository
          .completeCalculationById(calculationId ?? NaN)
          .then(() => dispatch({ type: 'COMPLETE_SUCCESS' }))
          .catch(() => dispatch({ type: 'COMPLETE_ERROR' }));
      })
      .with({ type: 'completingSuccess' }, () => {
        dispatch({ type: 'HIDE_CONFIRMATION' });
      })
      .with({ type: 'completingError' }, () => {
        dispatch({ type: 'COMPLETE_CANCEL' });
      })
      .otherwise(() => {
        // TODO: IMPLEMENT SOMETHING
      });
  }
}
