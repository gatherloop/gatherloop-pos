import { match, P } from 'ts-pattern';
import { Budget } from '../entities';
import { BudgetRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  budgets: Budget[];
  errorMessage: string | null;
};

export type BudgetListState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'revalidating' }
) &
  Context;

export type BudgetListAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; budgets: Budget[] }
  | { type: 'FETCH_ERROR'; message: string }
  | { type: 'REVALIDATE_FINISH'; budgets: Budget[] };

export type BudgetListParams = {
  budgets: Budget[];
};

export class BudgetListUsecase extends Usecase<
  BudgetListState,
  BudgetListAction,
  BudgetListParams
> {
  params: BudgetListParams;
  repository: BudgetRepository;

  constructor(repository: BudgetRepository, params: BudgetListParams) {
    super();
    this.repository = repository;
    this.params = params;
  }

  getInitialState() {
    const state: BudgetListState = {
      type: this.params.budgets.length >= 1 ? 'loaded' : 'idle',
      errorMessage: null,
      budgets: this.params.budgets,
    };

    return state;
  }

  getNextState(state: BudgetListState, action: BudgetListAction) {
    return match([state, action])
      .returnType<BudgetListState>()
      .with(
        [{ type: P.union('idle', 'error') }, { type: 'FETCH' }],
        ([state]) => ({ ...state, type: 'loading' })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_SUCCESS' }],
        ([state, { budgets }]) => ({
          ...state,
          type: 'loaded',
          budgets,
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
    state: BudgetListState,
    dispatch: (action: BudgetListAction) => void
  ) {
    match(state)
      .with({ type: 'idle' }, () => dispatch({ type: 'FETCH' }))
      .with({ type: 'loading' }, () =>
        this.repository
          .fetchBudgetList()
          .then((budgets) => dispatch({ type: 'FETCH_SUCCESS', budgets }))
          .catch(() =>
            dispatch({
              type: 'FETCH_ERROR',
              message: 'Failed to fetch budgets',
            })
          )
      )
      .with({ type: 'revalidating' }, ({ budgets }) => {
        this.repository
          .fetchBudgetList()
          .then((budgets) => dispatch({ type: 'REVALIDATE_FINISH', budgets }))
          .catch(() => dispatch({ type: 'REVALIDATE_FINISH', budgets }));
      })
      .otherwise(() => {
        // TODO: IMPLEMENT SOMETHING
      });
  }
}
