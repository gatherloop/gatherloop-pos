import { match, P } from 'ts-pattern';
import { AvailabilityLevel, AvailabilityMovement } from '../entities';
import { AvailabilityRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  level: AvailabilityLevel | null;
  id: number | null;
  movements: AvailabilityMovement[];
  errorMessage: string | null;
};

export type AvailabilityMovementListState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
) &
  Context;

export type AvailabilityMovementListAction =
  | { type: 'FETCH'; level: AvailabilityLevel; id: number }
  | { type: 'FETCH_SUCCESS'; movements: AvailabilityMovement[] }
  | { type: 'FETCH_ERROR'; message: string }
  | { type: 'RESET' };

export class AvailabilityMovementListUsecase extends Usecase<
  AvailabilityMovementListState,
  AvailabilityMovementListAction
> {
  params: undefined;
  repository: AvailabilityRepository;

  constructor(repository: AvailabilityRepository) {
    super();
    this.repository = repository;
  }

  getInitialState(): AvailabilityMovementListState {
    return {
      type: 'idle',
      level: null,
      id: null,
      movements: [],
      errorMessage: null,
    };
  }

  getNextState(
    state: AvailabilityMovementListState,
    action: AvailabilityMovementListAction
  ): AvailabilityMovementListState {
    return match([state, action])
      .returnType<AvailabilityMovementListState>()
      .with(
        [{ type: P.union('idle', 'loaded', 'error') }, { type: 'FETCH' }],
        ([state, { level, id }]) => ({
          ...state,
          type: 'loading',
          level,
          id,
          errorMessage: null,
        })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_SUCCESS' }],
        ([state, { movements }]) => ({ ...state, type: 'loaded', movements })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_ERROR' }],
        ([state, { message }]) => ({
          ...state,
          type: 'error',
          errorMessage: message,
        })
      )
      .with([{ type: P.union('loaded', 'error') }, { type: 'RESET' }], () =>
        this.getInitialState()
      )
      .otherwise(() => state);
  }

  onStateChange(
    state: AvailabilityMovementListState,
    dispatch: (action: AvailabilityMovementListAction) => void
  ): void {
    match(state)
      .with({ type: 'loading' }, ({ level, id }) => {
        if (level === null || id === null) return;
        this.repository
          .fetchAvailabilityMovements(level, id)
          .then((movements) => dispatch({ type: 'FETCH_SUCCESS', movements }))
          .catch(() =>
            dispatch({
              type: 'FETCH_ERROR',
              message: 'Failed to fetch availability history',
            })
          );
      })
      .otherwise(() => {
        // noop
      });
  }
}
