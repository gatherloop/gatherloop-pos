import { match } from 'ts-pattern';
import { TransactionRepository } from '../repositories';
import { Usecase } from './IUsecase';

export type TransactionCompleteActionType = 'complete' | 'uncomplete';

type Context = {
  transactionId: number | null;
  action: TransactionCompleteActionType | null;
};

export type TransactionCompleteState = (
  | { type: 'hidden' }
  | { type: 'shown' }
  | { type: 'completing' }
  | { type: 'completingSuccess' }
  | { type: 'completingError' }
) &
  Context;

export type TransactionCompleteAction =
  | {
      type: 'SHOW_CONFIRMATION';
      transactionId: number;
      action: TransactionCompleteActionType;
    }
  | { type: 'HIDE_CONFIRMATION' }
  | { type: 'COMPLETE' }
  | { type: 'COMPLETE_SUCCESS' }
  | { type: 'COMPLETE_ERROR' }
  | { type: 'COMPLETE_CANCEL' };

export class TransactionCompleteUsecase extends Usecase<
  TransactionCompleteState,
  TransactionCompleteAction
> {
  transactionRepository: TransactionRepository;
  params: undefined;

  constructor(transactionRepository: TransactionRepository) {
    super();
    this.transactionRepository = transactionRepository;
  }

  getInitialState(): TransactionCompleteState {
    return {
      type: 'hidden',
      transactionId: null,
      action: null,
    };
  }

  getNextState(
    state: TransactionCompleteState,
    action: TransactionCompleteAction
  ): TransactionCompleteState {
    return match([state, action])
      .returnType<TransactionCompleteState>()
      .with(
        [{ type: 'hidden' }, { type: 'SHOW_CONFIRMATION' }],
        ([state, { transactionId, action }]) => ({
          ...state,
          type: 'shown',
          transactionId,
          action,
        })
      )
      .with([{ type: 'shown' }, { type: 'HIDE_CONFIRMATION' }], ([state]) => ({
        ...state,
        type: 'hidden',
        transactionId: null,
        action: null,
      }))
      .with([{ type: 'shown' }, { type: 'COMPLETE' }], ([state]) => ({
        ...state,
        type: 'completing',
      }))
      .with(
        [{ type: 'completing' }, { type: 'COMPLETE_ERROR' }],
        ([state]) => ({
          ...state,
          type: 'completingError',
        })
      )
      .with(
        [{ type: 'completingError' }, { type: 'COMPLETE_CANCEL' }],
        ([state]) => ({
          ...state,
          type: 'shown',
        })
      )
      .with(
        [{ type: 'completing' }, { type: 'COMPLETE_SUCCESS' }],
        ([state]) => ({
          ...state,
          type: 'completingSuccess',
        })
      )
      .with(
        [{ type: 'completingSuccess' }, { type: 'HIDE_CONFIRMATION' }],
        ([state]) => ({
          ...state,
          type: 'hidden',
          transactionId: null,
          action: null,
        })
      )
      .otherwise(() => state);
  }

  onStateChange(
    state: TransactionCompleteState,
    dispatch: (action: TransactionCompleteAction) => void
  ): void {
    match(state)
      .with({ type: 'completing' }, ({ transactionId, action }) => {
        if (transactionId === null || action === null) return;
        const request =
          action === 'complete'
            ? this.transactionRepository.completeTransaction(transactionId)
            : this.transactionRepository.uncompleteTransaction(transactionId);
        request
          .then(() => dispatch({ type: 'COMPLETE_SUCCESS' }))
          .catch(() => dispatch({ type: 'COMPLETE_ERROR' }));
      })
      .with({ type: 'completingSuccess' }, () => {
        dispatch({ type: 'HIDE_CONFIRMATION' });
      })
      .with({ type: 'completingError' }, () => {
        dispatch({ type: 'COMPLETE_CANCEL' });
      })
      .otherwise(() => {
        // no-op
      });
  }
}
