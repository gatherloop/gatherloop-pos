import { match, P } from 'ts-pattern';
import { Expense } from '../entities';
import { ExpenseRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  expenses: Expense[];
  errorMessage: string | null;
};

export type ExpenseListState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'revalidating' }
) &
  Context;

export type ExpenseListAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; expenses: Expense[] }
  | { type: 'FETCH_ERROR'; message: string }
  | { type: 'REVALIDATE'; expenses: Expense[] }
  | { type: 'REVALIDATE_FINISH'; expenses: Expense[] };

export class ExpenseListUsecase extends Usecase<
  ExpenseListState,
  ExpenseListAction
> {
  repository: ExpenseRepository;

  constructor(repository: ExpenseRepository) {
    super();
    this.repository = repository;
  }

  getInitialState() {
    const expenses = this.repository.getExpenseList();

    const state: ExpenseListState = {
      type: expenses.length >= 1 ? 'loaded' : 'idle',
      errorMessage: null,
      expenses,
    };

    return state;
  }

  getNextState(state: ExpenseListState, action: ExpenseListAction) {
    return match([state, action])
      .returnType<ExpenseListState>()
      .with(
        [{ type: P.union('idle', 'error') }, { type: 'FETCH' }],
        ([state]) => ({ ...state, type: 'loading' })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_SUCCESS' }],
        ([state, { expenses }]) => ({
          ...state,
          type: 'loaded',
          expenses,
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
    state: ExpenseListState,
    dispatch: (action: ExpenseListAction) => void
  ) {
    match(state)
      .with({ type: 'idle' }, () => dispatch({ type: 'FETCH' }))
      .with({ type: 'loading' }, () =>
        this.repository
          .fetchExpenseList()
          .then((expenses) => dispatch({ type: 'FETCH_SUCCESS', expenses }))
          .catch(() =>
            dispatch({
              type: 'FETCH_ERROR',
              message: 'Failed to fetch expenses',
            })
          )
      )
      .with({ type: 'revalidating' }, ({ expenses }) => {
        this.repository
          .fetchExpenseList()
          .then((expenses) => dispatch({ type: 'REVALIDATE_FINISH', expenses }))
          .catch(() => dispatch({ type: 'REVALIDATE_FINISH', expenses }));
      })
      .otherwise(() => {
        // TODO: IMPLEMENT SOMETHING
      });
  }
}
