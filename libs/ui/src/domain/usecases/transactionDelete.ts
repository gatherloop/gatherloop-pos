import { match } from 'ts-pattern';
import { TransactionRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  transactionId: number | null;
};

export type TransactionDeleteState = (
  | { type: 'hidden' }
  | { type: 'shown' }
  | { type: 'deleting' }
  | { type: 'deletingSuccess' }
  | { type: 'deletingError' }
) &
  Context;

export type TransactionDeleteAction =
  | { type: 'SHOW_CONFIRMATION'; transactionId: number }
  | { type: 'HIDE_CONFIRMATION' }
  | { type: 'DELETE' }
  | { type: 'DELETE_SUCCESS' }
  | { type: 'DELETE_ERROR' }
  | { type: 'DELETE_CANCEL' };

export class TransactionDeleteUsecase extends Usecase<
  TransactionDeleteState,
  TransactionDeleteAction
> {
  params: undefined;
  repository: TransactionRepository;

  constructor(repository: TransactionRepository) {
    super();
    this.repository = repository;
  }

  getInitialState(): TransactionDeleteState {
    return {
      type: 'hidden',
      transactionId: null,
    };
  }
  getNextState(
    state: TransactionDeleteState,
    action: TransactionDeleteAction
  ): TransactionDeleteState {
    return match([state, action])
      .returnType<TransactionDeleteState>()
      .with(
        [{ type: 'hidden' }, { type: 'SHOW_CONFIRMATION' }],
        ([_state, { transactionId }]) => ({ type: 'shown', transactionId })
      )
      .with([{ type: 'shown' }, { type: 'HIDE_CONFIRMATION' }], ([state]) => ({
        ...state,
        type: 'hidden',
        transactionId: null,
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
          TransactionId: null,
        })
      )
      .otherwise(() => state);
  }
  onStateChange(
    state: TransactionDeleteState,
    dispatch: (action: TransactionDeleteAction) => void
  ): void {
    match(state)
      .with({ type: 'deleting' }, ({ transactionId }) => {
        this.repository
          .deleteTransactionById(transactionId ?? NaN)
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
