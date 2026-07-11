import { match } from 'ts-pattern';
import { BudgetForm } from '../entities';
import { BudgetRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  errorMessage: string | null;
  values: BudgetForm;
};

export type BudgetCreateState = (
  | { type: 'loaded' }
  | { type: 'submitting' }
  | { type: 'submitSuccess' }
  | { type: 'submitError' }
) &
  Context;

export type BudgetCreateAction =
  | { type: 'SUBMIT'; values: BudgetForm }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; errorMessage: string }
  | { type: 'SUBMIT_CANCEL' };

export class BudgetCreateUsecase extends Usecase<
  BudgetCreateState,
  BudgetCreateAction
> {
  params: undefined;
  repository: BudgetRepository;

  constructor(repository: BudgetRepository) {
    super();
    this.repository = repository;
  }

  getInitialState(): BudgetCreateState {
    return {
      type: 'loaded',
      errorMessage: null,
      values: {
        name: '',
        percentage: 0,
      },
    };
  }

  getNextState(
    state: BudgetCreateState,
    action: BudgetCreateAction
  ): BudgetCreateState {
    return match([state, action])
      .returnType<BudgetCreateState>()
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
    state: BudgetCreateState,
    dispatch: (action: BudgetCreateAction) => void
  ): void {
    match(state)
      .with({ type: 'submitting' }, ({ values }) => {
        this.repository
          .createBudget(values)
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
