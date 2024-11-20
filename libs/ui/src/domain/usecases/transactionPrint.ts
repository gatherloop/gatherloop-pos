import { match } from 'ts-pattern';
import { Transaction } from '../entities';
import { TransactionRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  errorMessage: string | null;
  transaction: Transaction | null;
};

export type TransactionPrintState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
) &
  Context;

export type TransactionPrintAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; transaction: Transaction }
  | { type: 'FETCH_ERROR'; errorMessage: string };

export class TransactionPrintUsecase extends Usecase<
  TransactionPrintState,
  TransactionPrintAction
> {
  repository: TransactionRepository;

  constructor(repository: TransactionRepository) {
    super();
    this.repository = repository;
  }

  getInitialState(): TransactionPrintState {
    const transactionId = this.repository.getTransactionByIdServerParams();
    const transaction = transactionId
      ? this.repository.getTransactionById(transactionId)
      : null;
    return {
      type: transaction !== null ? 'loaded' : 'idle',
      errorMessage: null,
      transaction,
    };
  }

  getNextState(
    state: TransactionPrintState,
    action: TransactionPrintAction
  ): TransactionPrintState {
    return match([state, action])
      .returnType<TransactionPrintState>()
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
        ([state, { transaction }]) => ({
          ...state,
          type: 'loaded',
          transaction,
        })
      )
      .otherwise(() => state);
  }

  onStateChange(
    state: TransactionPrintState,
    dispatch: (action: TransactionPrintAction) => void
  ): void {
    match(state)
      .with({ type: 'idle' }, () => {
        dispatch({ type: 'FETCH' });
      })
      .with({ type: 'loading' }, () => {
        const transactionId =
          this.repository.getTransactionByIdServerParams() ?? NaN;
        this.repository
          .fetchTransactionById(transactionId)
          .then((transaction) =>
            dispatch({
              type: 'FETCH_SUCCESS',
              transaction,
            })
          )
          .catch(() =>
            dispatch({
              type: 'FETCH_ERROR',
              errorMessage: 'Failed to fetch transaction',
            })
          );
      })
      // .with({ type: 'loaded' }, () => window.print())
      .otherwise(() => {
        // TODO: IMPLEMENT SOMETHING
      });
  }
}
