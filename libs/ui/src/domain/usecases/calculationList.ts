import { match, P } from 'ts-pattern';
import { Calculation } from '../entities';
import { CalculationRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  calculations: Calculation[];
  errorMessage: string | null;
};

export type CalculationListState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'revalidating' }
) &
  Context;

export type CalculationListAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; calculations: Calculation[] }
  | { type: 'FETCH_ERROR'; message: string }
  | { type: 'REVALIDATE'; calculations: Calculation[] }
  | { type: 'REVALIDATE_FINISH'; calculations: Calculation[] };

export class CalculationListUsecase extends Usecase<
  CalculationListState,
  CalculationListAction
> {
  repository: CalculationRepository;

  constructor(repository: CalculationRepository) {
    super();
    this.repository = repository;
  }

  getInitialState() {
    const calculations = this.repository.getCalculationList();

    const state: CalculationListState = {
      type: calculations.length >= 1 ? 'loaded' : 'idle',
      errorMessage: null,
      calculations,
    };

    return state;
  }

  getNextState(state: CalculationListState, action: CalculationListAction) {
    return match([state, action])
      .returnType<CalculationListState>()
      .with(
        [{ type: P.union('idle', 'error') }, { type: 'FETCH' }],
        ([state]) => ({ ...state, type: 'loading' })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_SUCCESS' }],
        ([state, { calculations }]) => ({
          ...state,
          type: 'loaded',
          calculations,
        })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_ERROR' }],
        ([state, { message }]) => ({
          ...state,
          type: 'error',
          message,
        })
      )
      .with([{ type: 'loaded' }, { type: 'FETCH' }], ([state]) => ({
        ...state,
        type: 'revalidating',
      }))
      .with(
        [{ type: 'revalidating' }, { type: 'REVALIDATE_FINISH' }],
        ([state, { type: _type, ...params }]) => ({
          ...state,
          ...params,
          type: 'loaded',
        })
      )
      .otherwise(() => state);
  }

  onStateChange(
    state: CalculationListState,
    dispatch: (action: CalculationListAction) => void
  ) {
    match(state)
      .with({ type: 'idle' }, () => dispatch({ type: 'FETCH' }))
      .with({ type: 'loading' }, () =>
        this.repository
          .fetchCalculationList()
          .then((calculations) =>
            dispatch({ type: 'FETCH_SUCCESS', calculations })
          )
          .catch(() =>
            dispatch({
              type: 'FETCH_ERROR',
              message: 'Failed to fetch calculations',
            })
          )
      )
      .with({ type: 'revalidating' }, ({ calculations }) => {
        this.repository
          .fetchCalculationList()
          .then((calculations) =>
            dispatch({ type: 'REVALIDATE_FINISH', calculations })
          )
          .catch(() => dispatch({ type: 'REVALIDATE_FINISH', calculations }));
      })
      .otherwise(() => {
        // TODO: IMPLEMENT SOMETHING
      });
  }
}
