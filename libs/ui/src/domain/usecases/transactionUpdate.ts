import { match } from 'ts-pattern';
import { TransactionForm } from '../entities';
import { TransactionRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  errorMessage: string | null;
  values: TransactionForm;
};

export type TransactionUpdateState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'submitting' }
  | { type: 'submitSuccess' }
  | { type: 'submitError' }
) &
  Context;

export type TransactionUpdateAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; values: TransactionForm }
  | { type: 'FETCH_ERROR'; errorMessage: string }
  | { type: 'SUBMIT'; values: TransactionForm }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; errorMessage: string }
  | { type: 'SUBMIT_CANCEL' };

export class TransactionUpdateUsecase extends Usecase<
  TransactionUpdateState,
  TransactionUpdateAction
> {
  repository: TransactionRepository;

  constructor(repository: TransactionRepository) {
    super();
    this.repository = repository;
  }

  getInitialState(): TransactionUpdateState {
    const transactionId = this.repository.getTransactionByIdServerParams();
    const transaction = transactionId
      ? this.repository.getTransactionById(transactionId)
      : null;
    return {
      type: transaction !== null ? 'loaded' : 'idle',
      errorMessage: null,
      values: {
        name: transaction?.name ?? '',
        transactionItems: transaction?.transactionItems ?? [],
      },
    };
  }

  getNextState(
    state: TransactionUpdateState,
    action: TransactionUpdateAction
  ): TransactionUpdateState {
    return match([state, action])
      .returnType<TransactionUpdateState>()
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
    state: TransactionUpdateState,
    dispatch: (action: TransactionUpdateAction) => void
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
              values: {
                name: transaction.name,
                transactionItems: transaction.transactionItems.map((item) => ({
                  amount: item.amount,
                  productId: item.product.id,
                  product: item.product,
                  discountAmount: item.discountAmount,
                })),
              },
            })
          )
          .catch(() =>
            dispatch({
              type: 'FETCH_ERROR',
              errorMessage: 'Failed to fetch transaction',
            })
          );
      })
      .with({ type: 'submitting' }, ({ values }) => {
        const transactionId =
          this.repository.getTransactionByIdServerParams() ?? NaN;
        this.repository
          .updateTransaction(values, transactionId)
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
