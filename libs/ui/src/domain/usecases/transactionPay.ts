import { match } from 'ts-pattern';
import { TransactionRepository, WalletRepository } from '../repositories';
import { Usecase } from './IUsecase';
import { Wallet } from '../entities';

type Context = {
  transactionId: number | null;
  transactionTotal: number;
  walletId: number | null;
  paidAmount: number;
  wallets: Wallet[];
};

export type TransactionPayState = (
  | { type: 'hidden' }
  | { type: 'shown' }
  | { type: 'paying' }
  | { type: 'payingSuccess' }
  | { type: 'payingError' }
) &
  Context;

export type TransactionPayAction =
  | { type: 'SET_WALLETS'; wallets: Wallet[] }
  | {
      type: 'SHOW_CONFIRMATION';
      transactionId: number;
      transactionTotal: number;
    }
  | { type: 'HIDE_CONFIRMATION' }
  | { type: 'PAY'; walletId: number; paidAmount: number }
  | { type: 'PAY_SUCCESS' }
  | { type: 'PAY_ERROR' }
  | { type: 'PAY_CANCEL' };

export type TransactionPayParams = {
  wallets: Wallet[];
};

export class TransactionPayUsecase extends Usecase<
  TransactionPayState,
  TransactionPayAction,
  TransactionPayParams
> {
  transactionRepository: TransactionRepository;
  walletRepository: WalletRepository;
  params: TransactionPayParams;

  constructor(
    transactionRepository: TransactionRepository,
    walletRepository: WalletRepository,
    params: TransactionPayParams
  ) {
    super();
    this.transactionRepository = transactionRepository;
    this.walletRepository = walletRepository;
    this.params = params;
  }

  getInitialState(): TransactionPayState {
    return {
      type: 'hidden',
      transactionId: null,
      transactionTotal: 0,
      walletId: null,
      wallets: this.params.wallets,
      paidAmount: 0,
    };
  }

  getNextState(
    state: TransactionPayState,
    action: TransactionPayAction
  ): TransactionPayState {
    return match([state, action])
      .returnType<TransactionPayState>()
      .with(
        [{ type: 'hidden' }, { type: 'SHOW_CONFIRMATION' }],
        ([state, { transactionId, transactionTotal }]) => ({
          ...state,
          type: 'shown',
          transactionId,
          transactionTotal,
          walletId: null,
          paidAmount: 0,
        })
      )
      .with([{ type: 'shown' }, { type: 'HIDE_CONFIRMATION' }], ([state]) => ({
        ...state,
        type: 'hidden',
        transactionId: null,
        transactionTotal: 0,
        walletId: null,
        paidAmount: 0,
      }))
      .with(
        [{ type: 'shown' }, { type: 'SET_WALLETS' }],
        ([state, { wallets }]) => ({
          ...state,
          type: 'shown',
          wallets,
        })
      )
      .with(
        [{ type: 'shown' }, { type: 'PAY' }],
        ([state, { walletId, paidAmount }]) => ({
          ...state,
          type: 'paying',
          walletId,
          paidAmount,
        })
      )
      .with([{ type: 'paying' }, { type: 'PAY_ERROR' }], ([state]) => ({
        ...state,
        type: 'payingError',
      }))
      .with([{ type: 'payingError' }, { type: 'PAY_CANCEL' }], ([state]) => ({
        ...state,
        type: 'shown',
      }))
      .with([{ type: 'paying' }, { type: 'PAY_SUCCESS' }], ([state]) => ({
        ...state,
        type: 'payingSuccess',
      }))
      .with(
        [{ type: 'payingSuccess' }, { type: 'HIDE_CONFIRMATION' }],
        ([state]) => ({
          ...state,
          type: 'hidden',
          transactionId: null,
          transactionTotal: 0,
          walletId: null,
          paidAmount: 0,
        })
      )
      .otherwise(() => state);
  }

  onStateChange(
    state: TransactionPayState,
    dispatch: (action: TransactionPayAction) => void
  ): void {
    match(state)
      .with({ type: 'shown' }, ({ wallets }) => {
        if (wallets.length === 0) {
          this.walletRepository
            .fetchWalletList()
            .then((wallets) => dispatch({ type: 'SET_WALLETS', wallets }));
        }
      })
      .with({ type: 'paying' }, ({ transactionId, walletId, paidAmount }) => {
        if (walletId && transactionId) {
          this.transactionRepository
            .payTransaction(transactionId, walletId, paidAmount)
            .then(() => dispatch({ type: 'PAY_SUCCESS' }))
            .catch(() => dispatch({ type: 'PAY_ERROR' }));
        }
      })
      .with({ type: 'payingSuccess' }, () => {
        dispatch({ type: 'HIDE_CONFIRMATION' });
      })
      .with({ type: 'payingError' }, () => {
        dispatch({ type: 'PAY_CANCEL' });
      })
      .otherwise(() => {
        // TODO: IMPLEMENT SOMETHING
      });
  }
}
