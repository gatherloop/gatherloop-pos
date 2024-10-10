import { match } from 'ts-pattern';
import { ExpenseRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  expenseId: number | null;
};

export type ExpenseDeleteState = (
  | { type: 'hidden' }
  | { type: 'shown' }
  | { type: 'deleting' }
  | { type: 'deletingSuccess' }
  | { type: 'deletingError' }
) &
  Context;

export type ExpenseDeleteAction =
  | { type: 'SHOW_CONFIRMATION'; expenseId: number }
  | { type: 'HIDE_CONFIRMATION' }
  | { type: 'DELETE' }
  | { type: 'DELETE_SUCCESS' }
  | { type: 'DELETE_ERROR' }
  | { type: 'DELETE_CANCEL' };

export class ExpenseDeleteUsecase extends Usecase<
  ExpenseDeleteState,
  ExpenseDeleteAction
> {
  repository: ExpenseRepository;

  constructor(repository: ExpenseRepository) {
    super();
    this.repository = repository;
  }

  getInitialState(): ExpenseDeleteState {
    return {
      type: 'hidden',
      expenseId: null,
    };
  }
  getNextState(
    state: ExpenseDeleteState,
    action: ExpenseDeleteAction
  ): ExpenseDeleteState {
    return match([state, action])
      .returnType<ExpenseDeleteState>()
      .with(
        [{ type: 'hidden' }, { type: 'SHOW_CONFIRMATION' }],
        ([_state, { expenseId }]) => ({ type: 'shown', expenseId })
      )
      .with([{ type: 'shown' }, { type: 'HIDE_CONFIRMATION' }], ([state]) => ({
        ...state,
        type: 'hidden',
        expenseId: null,
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
          ExpenseId: null,
        })
      )
      .otherwise(() => state);
  }
  onStateChange(
    state: ExpenseDeleteState,
    dispatch: (action: ExpenseDeleteAction) => void
  ): void {
    match(state)
      .with({ type: 'deleting' }, ({ expenseId }) => {
        this.repository
          .deleteExpenseById(expenseId ?? NaN)
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
