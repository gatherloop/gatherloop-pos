import { match } from 'ts-pattern';
import { Budget, BudgetForm } from '../entities';
import { BudgetRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  errorMessage: string | null;
  values: BudgetForm;
};

export type BudgetUpdateState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'submitting' }
  | { type: 'submitSuccess' }
  | { type: 'submitError' }
) &
  Context;

export type BudgetUpdateAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; values: BudgetForm }
  | { type: 'FETCH_ERROR'; errorMessage: string }
  | { type: 'SUBMIT'; values: BudgetForm }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; errorMessage: string }
  | { type: 'SUBMIT_CANCEL' };

export type BudgetUpdateParams = {
  budgetId: number;
  budget: Budget | null;
};

export class BudgetUpdateUsecase extends Usecase<
  BudgetUpdateState,
  BudgetUpdateAction,
  BudgetUpdateParams
> {
  params: BudgetUpdateParams;
  repository: BudgetRepository;

  constructor(repository: BudgetRepository, params: BudgetUpdateParams) {
    super();
    this.repository = repository;
    this.params = params;
  }

  getInitialState(): BudgetUpdateState {
    return {
      type: this.params.budget !== null ? 'loaded' : 'idle',
      errorMessage: null,
      values: {
        name: this.params.budget?.name ?? '',
        percentage: this.params.budget?.percentage ?? 0,
      },
    };
  }

  getNextState(
    state: BudgetUpdateState,
    action: BudgetUpdateAction
  ): BudgetUpdateState {
    return match([state, action])
      .returnType<BudgetUpdateState>()
      .with([{ type: 'idle' }, { type: 'FETCH' }], ([state]) => ({
        ...state,
        type: 'loading',
      }))
      .with(
        [{ type: 'loading' }, { type: 'FETCH_ERROR' }],
        ([state, { errorMessage }]) => ({
          ...state,
          type: 'error',
          errorMessage,
        })
      )
      .with([{ type: 'error' }, { type: 'FETCH' }], ([state]) => ({
        ...state,
        type: 'loading',
      }))
      .with(
        [{ type: 'loading' }, { type: 'FETCH_SUCCESS' }],
        ([state, { values }]) => ({
          ...state,
          type: 'loaded',
          values,
        })
      )
      .with(
        [{ type: 'loaded' }, { type: 'SUBMIT' }],
        ([state, { values }]) => ({
          ...state,
          values,
          type: 'submitting',
        })
      )
      .with(
        [{ type: 'submitError' }, { type: 'SUBMIT' }],
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
    state: BudgetUpdateState,
    dispatch: (action: BudgetUpdateAction) => void
  ): void {
    match(state)
      .with({ type: 'idle' }, () => {
        dispatch({ type: 'FETCH' });
      })
      .with({ type: 'loading' }, () => {
        this.repository
          .fetchBudgetById(this.params.budgetId)
          .then((budget) =>
            dispatch({
              type: 'FETCH_SUCCESS',
              values: {
                name: budget.name,
                percentage: budget.percentage,
              },
            })
          )
          .catch(() =>
            dispatch({
              type: 'FETCH_ERROR',
              errorMessage: 'Failed to fetch budget',
            })
          );
      })
      .with({ type: 'submitting' }, ({ values }) => {
        this.repository
          .updateBudget(values, this.params.budgetId)
          .then(() => dispatch({ type: 'SUBMIT_SUCCESS' }))
          .catch(() =>
            dispatch({ type: 'SUBMIT_ERROR', errorMessage: 'Submit failed' })
          );
      })
      .otherwise(() => {
        // TODO: IMPLEMENT SOMETHING
      });
  }
}
