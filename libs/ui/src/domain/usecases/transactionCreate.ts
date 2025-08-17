import { match } from 'ts-pattern';
import { TransactionForm } from '../entities';
import { TransactionRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  errorMessage: string | null;
  values: TransactionForm;
  transactionId: number | null;
};

export type TransactionCreateState = (
  | { type: 'loaded' }
  | { type: 'submitting' }
  | { type: 'submitSuccess' }
  | { type: 'submitError' }
) &
  Context;

export type TransactionCreateAction =
  | { type: 'SUBMIT'; values: TransactionForm }
  | { type: 'SUBMIT_SUCCESS'; transactionId: number }
  | { type: 'SUBMIT_ERROR'; errorMessage: string }
  | { type: 'SUBMIT_CANCEL' };

export class TransactionCreateUsecase extends Usecase<
  TransactionCreateState,
  TransactionCreateAction
> {
  params: undefined;
  repository: TransactionRepository;

  constructor(repository: TransactionRepository) {
    super();
    this.repository = repository;
  }

  getInitialState(): TransactionCreateState {
    return {
      type: 'loaded',
      errorMessage: null,
      transactionId: null,
      values: {
        name: '',
        transactionItems: [],
        transactionCoupons: [],
      },
    };
  }

  getNextState(
    state: TransactionCreateState,
    action: TransactionCreateAction
  ): TransactionCreateState {
    return match([state, action])
      .returnType<TransactionCreateState>()
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
        ([state, action]) => ({
          ...state,
          type: 'submitSuccess',
          transactionId: action.transactionId,
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
    state: TransactionCreateState,
    dispatch: (action: TransactionCreateAction) => void
  ): void {
    match(state)
      .with({ type: 'submitting' }, ({ values }) => {
        this.repository
          .createTransaction(values)
          .then(({ transactionId }) =>
            dispatch({ type: 'SUBMIT_SUCCESS', transactionId })
          )
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
