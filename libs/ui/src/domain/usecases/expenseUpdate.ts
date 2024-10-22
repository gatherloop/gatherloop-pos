import { match } from 'ts-pattern';
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

export type ExpenseUpdateState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'submitting' }
  | { type: 'submitSuccess' }
  | { type: 'submitError' }
) &
  Context;

export type ExpenseUpdateAction =
  | { type: 'FETCH' }
  | {
      type: 'FETCH_SUCCESS';
      values: ExpenseForm;
      wallets: Wallet[];
      budgets: Budget[];
    }
  | { type: 'FETCH_ERROR'; errorMessage: string }
  | { type: 'SUBMIT'; values: ExpenseForm }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; errorMessage: string }
  | { type: 'SUBMIT_CANCEL' };

export class ExpenseUpdateUsecase extends Usecase<
  ExpenseUpdateState,
  ExpenseUpdateAction
> {
  budgetRepository: BudgetRepository;
  walletRepository: WalletRepository;
  expenseRepository: ExpenseRepository;

  constructor(
    expenseRepository: ExpenseRepository,
    budgetRepository: BudgetRepository,
    walletRepository: WalletRepository
  ) {
    super();
    this.expenseRepository = expenseRepository;
    this.budgetRepository = budgetRepository;
    this.walletRepository = walletRepository;
  }

  getInitialState(): ExpenseUpdateState {
    const expenseId = this.expenseRepository.getExpenseByIdServerParams();
    const expense = expenseId
      ? this.expenseRepository.getExpenseById(expenseId)
      : null;

    const budgets = this.budgetRepository.getBudgetList();
    const wallets = this.walletRepository.getWalletList();
    const isLoaded =
      expense !== null && budgets.length > 0 && wallets.length > 0;
    return {
      type: isLoaded ? 'loaded' : 'idle',
      errorMessage: null,
      budgets,
      wallets,
      values: {
        budgetId: expense?.budget.id ?? NaN,
        walletId: expense?.wallet.id ?? NaN,
        expenseItems: expense?.expenseItems ?? [],
      },
    };
  }

  getNextState(
    state: ExpenseUpdateState,
    action: ExpenseUpdateAction
  ): ExpenseUpdateState {
    return match([state, action])
      .returnType<ExpenseUpdateState>()
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
        ([state, { values, budgets, wallets }]) => ({
          ...state,
          type: 'loaded',
          values,
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
    state: ExpenseUpdateState,
    dispatch: (action: ExpenseUpdateAction) => void
  ): void {
    match(state)
      .with({ type: 'idle' }, () => {
        dispatch({ type: 'FETCH' });
      })
      .with({ type: 'loading' }, () => {
        const expenseId =
          this.expenseRepository.getExpenseByIdServerParams() ?? NaN;

        Promise.all([
          this.expenseRepository.fetchExpenseById(expenseId),
          this.budgetRepository.fetchBudgetList(),
          this.walletRepository.fetchWalletList(),
        ])
          .then(([expense, budgets, wallets]) =>
            dispatch({
              type: 'FETCH_SUCCESS',
              values: {
                budgetId: expense?.budget.id ?? NaN,
                walletId: expense?.wallet.id ?? NaN,
                expenseItems: expense?.expenseItems ?? [],
              },
              budgets,
              wallets,
            })
          )
          .catch(() =>
            dispatch({
              type: 'FETCH_ERROR',
              errorMessage: 'Failed to fetch expense',
            })
          );
      })
      .with({ type: 'submitting' }, ({ values }) => {
        const expenseId =
          this.expenseRepository.getExpenseByIdServerParams() ?? NaN;
        this.expenseRepository
          .updateExpense(values, expenseId)
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