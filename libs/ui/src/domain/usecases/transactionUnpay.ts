import { match } from 'ts-pattern';
import { TransactionRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  transactionId: number | null;
};

export type TransactionUnpayState = (
  | { type: 'hidden' }
  | { type: 'shown' }
  | { type: 'unpaying' }
  | { type: 'unpayingSuccess' }
  | { type: 'unpayingError' }
) &
  Context;

export type TransactionUnpayAction =
  | {
      type: 'SHOW_CONFIRMATION';
      transactionId: number;
    }
  | { type: 'HIDE_CONFIRMATION' }
  | { type: 'UNPAY' }
  | { type: 'UNPAY_SUCCESS' }
  | { type: 'UNPAY_ERROR' }
  | { type: 'UNPAY_CANCEL' };

export class TransactionUnpayUsecase extends Usecase<
  TransactionUnpayState,
  TransactionUnpayAction
> {
  transactionRepository: TransactionRepository;
  params: undefined;

  constructor(transactionRepository: TransactionRepository) {
    super();
    this.transactionRepository = transactionRepository;
  }

  getInitialState(): TransactionUnpayState {
    return {
      type: 'hidden',
      transactionId: null,
    };
  }

  getNextState(
    state: TransactionUnpayState,
    action: TransactionUnpayAction
  ): TransactionUnpayState {
    return match([state, action])
      .returnType<TransactionUnpayState>()
      .with(
        [{ type: 'hidden' }, { type: 'SHOW_CONFIRMATION' }],
        ([state, { transactionId }]) => ({
          ...state,
          type: 'shown',
          transactionId,
        })
      )
      .with([{ type: 'shown' }, { type: 'HIDE_CONFIRMATION' }], ([state]) => ({
        ...state,
        type: 'hidden',
        transactionId: null,
      }))

      .with([{ type: 'shown' }, { type: 'UNPAY' }], ([state]) => ({
        ...state,
        type: 'unpaying',
      }))
      .with([{ type: 'unpaying' }, { type: 'UNPAY_ERROR' }], ([state]) => ({
        ...state,
        type: 'unpayingError',
      }))
      .with(
        [{ type: 'unpayingError' }, { type: 'UNPAY_CANCEL' }],
        ([state]) => ({
          ...state,
          type: 'shown',
        })
      )
      .with([{ type: 'unpaying' }, { type: 'UNPAY_SUCCESS' }], ([state]) => ({
        ...state,
        type: 'unpayingSuccess',
      }))
      .with(
        [{ type: 'unpayingSuccess' }, { type: 'HIDE_CONFIRMATION' }],
        ([state]) => ({
          ...state,
          type: 'hidden',
          transactionId: null,
        })
      )
      .otherwise(() => state);
  }

  onStateChange(
    state: TransactionUnpayState,
    dispatch: (action: TransactionUnpayAction) => void
  ): void {
    match(state)
      .with({ type: 'unpaying' }, ({ transactionId }) => {
        if (transactionId) {
          this.transactionRepository
            .unpayTransaction(transactionId)
            .then(() => dispatch({ type: 'UNPAY_SUCCESS' }))
            .catch(() => dispatch({ type: 'UNPAY_ERROR' }));
        }
      })
      .with({ type: 'unpayingSuccess' }, () => {
        dispatch({ type: 'HIDE_CONFIRMATION' });
      })
      .with({ type: 'unpayingError' }, () => {
        dispatch({ type: 'UNPAY_CANCEL' });
      })
      .otherwise(() => {
        // TODO: IMPLEMENT SOMETHING
      });
  }
}
