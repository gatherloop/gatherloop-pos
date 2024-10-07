import { match, P } from 'ts-pattern';
import { Wallet, WalletTransferForm } from '../entities';
import { WalletRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  errorMessage: string | null;
  values: WalletTransferForm;
  wallets: Wallet[];
};

export type WalletTransferCreateState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'error' }
  | { type: 'loaded' }
  | { type: 'submitting' }
  | { type: 'submitSuccess' }
) &
  Context;

export type WalletTransferCreateAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; wallets: Wallet[] }
  | { type: 'FETCH_ERROR'; message: string }
  | { type: 'SUBMIT'; values: WalletTransferForm }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; errorMessage: string };

export class WalletTransferCreateUsecase extends Usecase<
  WalletTransferCreateState,
  WalletTransferCreateAction
> {
  repository: WalletRepository;

  constructor(repository: WalletRepository) {
    super();
    this.repository = repository;
  }

  getInitialState(): WalletTransferCreateState {
    const wallets = this.repository.getWalletList();
    const fromWalletId = this.repository.getWalletByIdServerParams();
    return {
      type: wallets.length > 0 ? 'loaded' : 'idle',
      errorMessage: null,
      values: {
        amount: 0,
        fromWalletId: fromWalletId ?? NaN,
        toWalletId: NaN,
      },
      wallets,
    };
  }
  getNextState(
    state: WalletTransferCreateState,
    action: WalletTransferCreateAction
  ): WalletTransferCreateState {
    return match([state, action])
      .returnType<WalletTransferCreateState>()
      .with(
        [{ type: P.union('idle', 'error') }, { type: 'FETCH' }],
        ([state]) => ({
          ...state,
          type: 'loading',
        })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_SUCCESS' }],
        ([state, { wallets }]) => ({
          ...state,
          type: 'loaded',
          wallets,
        })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_ERROR' }],
        ([state, { message }]) => ({
          ...state,
          type: 'error',
          errorMessage: message,
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
          type: 'loaded',
          errorMessage,
        })
      )
      .otherwise(() => state);
  }

  onStateChange(
    state: WalletTransferCreateState,
    dispatch: (action: WalletTransferCreateAction) => void
  ): void {
    match(state)
      .with({ type: 'idle' }, () => {
        dispatch({ type: 'FETCH' });
      })
      .with({ type: 'loading' }, () => {
        this.repository
          .fetchWalletList()
          .then((wallets) => dispatch({ type: 'FETCH_SUCCESS', wallets }))
          .catch(() =>
            dispatch({
              type: 'FETCH_ERROR',
              message: 'Failed to Fetch Wallets',
            })
          );
      })
      .with({ type: 'submitting' }, ({ values }) => {
        this.repository
          .createWalletTransfer(values)
          .then(() => dispatch({ type: 'SUBMIT_SUCCESS' }))
          .catch(() =>
            dispatch({ type: 'SUBMIT_ERROR', errorMessage: 'Submit failed' })
          );
      })
      .otherwise(() => {
        // TODO: IMPLEMENT SOMETHING
      });
  }
}
