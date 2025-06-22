import { match } from 'ts-pattern';
import { CalculationRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  calculationId: number | null;
};

export type CalculationDeleteState = (
  | { type: 'hidden' }
  | { type: 'shown' }
  | { type: 'deleting' }
  | { type: 'deletingSuccess' }
  | { type: 'deletingError' }
) &
  Context;

export type CalculationDeleteAction =
  | { type: 'SHOW_CONFIRMATION'; calculationId: number }
  | { type: 'HIDE_CONFIRMATION' }
  | { type: 'DELETE' }
  | { type: 'DELETE_SUCCESS' }
  | { type: 'DELETE_ERROR' }
  | { type: 'DELETE_CANCEL' };

export class CalculationDeleteUsecase extends Usecase<
  CalculationDeleteState,
  CalculationDeleteAction
> {
  params: undefined;
  repository: CalculationRepository;

  constructor(repository: CalculationRepository) {
    super();
    this.repository = repository;
  }

  getInitialState(): CalculationDeleteState {
    return {
      type: 'hidden',
      calculationId: null,
    };
  }
  getNextState(
    state: CalculationDeleteState,
    action: CalculationDeleteAction
  ): CalculationDeleteState {
    return match([state, action])
      .returnType<CalculationDeleteState>()
      .with(
        [{ type: 'hidden' }, { type: 'SHOW_CONFIRMATION' }],
        ([_state, { calculationId }]) => ({ type: 'shown', calculationId })
      )
      .with([{ type: 'shown' }, { type: 'HIDE_CONFIRMATION' }], ([state]) => ({
        ...state,
        type: 'hidden',
        calculationId: null,
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
          CalculationId: null,
        })
      )
      .otherwise(() => state);
  }
  onStateChange(
    state: CalculationDeleteState,
    dispatch: (action: CalculationDeleteAction) => void
  ): void {
    match(state)
      .with({ type: 'deleting' }, ({ calculationId }) => {
        this.repository
          .deleteCalculationById(calculationId ?? NaN)
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
