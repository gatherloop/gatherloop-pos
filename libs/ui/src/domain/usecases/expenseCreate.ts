import { match, P } from 'ts-pattern';
import { Budget, ExpenseForm, Wallet } from '../entities';
import {
  BudgetRepository,
  ExpenseRepository,
  WalletRepository,
} from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  errorMessage: string | null;
  values: ExpenseForm;
  wallets: Wallet[];
  budgets: Budget[];
};

export type ExpenseCreateState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'error' }
  | { type: 'loaded' }
  | { type: 'submitting' }
  | { type: 'submitSuccess' }
  | { type: 'submitError' }
) &
  Context;

export type ExpenseCreateAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_ERROR'; errorMessage: string }
  | { type: 'FETCH_SUCCESS'; wallets: Wallet[]; budgets: Budget[] }
  | { type: 'SUBMIT'; values: ExpenseForm }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; errorMessage: string }
  | { type: 'SUBMIT_CANCEL' };

export type ExpenseCreateParams = {
  budgets: Budget[];
  wallets: Wallet[];
};

export class ExpenseCreateUsecase extends Usecase<
  ExpenseCreateState,
  ExpenseCreateAction,
  ExpenseCreateParams
> {
  params: ExpenseCreateParams;
  expenseRepository: ExpenseRepository;
  budgetRepository: BudgetRepository;
  walletRepository: WalletRepository;

  constructor(
    expenseRepository: ExpenseRepository,
    budgetRepository: BudgetRepository,
    walletRepository: WalletRepository,
    params: ExpenseCreateParams
  ) {
    super();
    this.expenseRepository = expenseRepository;
    this.budgetRepository = budgetRepository;
    this.walletRepository = walletRepository;
    this.params = params;
  }

  getInitialState(): ExpenseCreateState {
    const isLoaded =
      this.params.budgets.length > 0 && this.params.wallets.length > 0;
    return {
      type: isLoaded ? 'loaded' : 'idle',
      errorMessage: null,
      budgets: this.params.budgets,
      wallets: this.params.wallets,
      values: {
        budgetId: NaN,
        walletId: NaN,
        expenseItems: [],
      },
    };
  }

  getNextState(
    state: ExpenseCreateState,
    action: ExpenseCreateAction
  ): ExpenseCreateState {
    return match([state, action])
      .returnType<ExpenseCreateState>()
      .with(
        [{ type: P.union('idle', 'error') }, { type: 'FETCH' }],
        ([state]) => ({
          ...state,
          type: 'loading',
        })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_ERROR' }],
        ([state, { errorMessage }]) => ({
          ...state,
          type: 'error',
          errorMessage,
        })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_SUCCESS' }],
        ([state, { budgets, wallets }]) => ({
          ...state,
          type: 'loaded',
          budgets,
          wallets,
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
    state: ExpenseCreateState,
    dispatch: (action: ExpenseCreateAction) => void
  ): void {
    match(state)
      .with({ type: 'loading' }, () => {
        Promise.all([
          this.budgetRepository.fetchBudgetList(),
          this.walletRepository.fetchWalletList(),
        ])
          .then(([budgets, wallets]) => {
            dispatch({ type: 'FETCH_SUCCESS', budgets, wallets });
          })
          .catch(() =>
            dispatch({ type: 'FETCH_ERROR', errorMessage: 'Fetch failed' })
          );
      })
      .with({ type: 'submitting' }, ({ values }) => {
        this.expenseRepository
          .createExpense(values)
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
