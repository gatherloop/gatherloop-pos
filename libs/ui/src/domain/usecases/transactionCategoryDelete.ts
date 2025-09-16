import { match } from 'ts-pattern';
import { TransactionCategoryRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  transactionCategoryId: number | null;
};

export type TransactionCategoryDeleteState = (
  | { type: 'hidden' }
  | { type: 'shown' }
  | { type: 'deleting' }
  | { type: 'deletingSuccess' }
  | { type: 'deletingError' }
) &
  Context;

export type TransactionCategoryDeleteAction =
  | { type: 'SHOW_CONFIRMATION'; transactionCategoryId: number }
  | { type: 'HIDE_CONFIRMATION' }
  | { type: 'DELETE' }
  | { type: 'DELETE_SUCCESS' }
  | { type: 'DELETE_ERROR' }
  | { type: 'DELETE_CANCEL' };

export class TransactionCategoryDeleteUsecase extends Usecase<
  TransactionCategoryDeleteState,
  TransactionCategoryDeleteAction
> {
  params: undefined;
  repository: TransactionCategoryRepository;

  constructor(repository: TransactionCategoryRepository) {
    super();
    this.repository = repository;
  }

  getInitialState(): TransactionCategoryDeleteState {
    return {
      type: 'hidden',
      transactionCategoryId: null,
    };
  }
  getNextState(
    state: TransactionCategoryDeleteState,
    action: TransactionCategoryDeleteAction
  ): TransactionCategoryDeleteState {
    return match([state, action])
      .returnType<TransactionCategoryDeleteState>()
      .with(
        [{ type: 'hidden' }, { type: 'SHOW_CONFIRMATION' }],
        ([_state, { transactionCategoryId }]) => ({
          type: 'shown',
          transactionCategoryId,
        })
      )
      .with([{ type: 'shown' }, { type: 'HIDE_CONFIRMATION' }], ([state]) => ({
        ...state,
        type: 'hidden',
        transactionCategoryId: null,
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
          CategoryId: null,
        })
      )
      .otherwise(() => state);
  }
  onStateChange(
    state: TransactionCategoryDeleteState,
    dispatch: (action: TransactionCategoryDeleteAction) => void
  ): void {
    match(state)
      .with({ type: 'deleting' }, ({ transactionCategoryId }) => {
        this.repository
          .deleteTransactionCategoryById(transactionCategoryId ?? NaN)
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
