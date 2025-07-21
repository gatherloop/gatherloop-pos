import { match } from 'ts-pattern';
import { Wallet, WalletForm } from '../entities';
import { WalletRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  errorMessage: string | null;
  values: WalletForm;
};

export type WalletUpdateState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'submitting' }
  | { type: 'submitSuccess' }
  | { type: 'submitError' }
) &
  Context;

export type WalletUpdateAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; values: WalletForm }
  | { type: 'FETCH_ERROR'; errorMessage: string }
  | { type: 'SUBMIT'; values: WalletForm }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; errorMessage: string }
  | { type: 'SUBMIT_CANCEL' };

export type WalletUpdateParams = {
  walletId: number;
  wallet: Wallet | null;
};

export class WalletUpdateUsecase extends Usecase<
  WalletUpdateState,
  WalletUpdateAction,
  WalletUpdateParams
> {
  params: WalletUpdateParams;
  repository: WalletRepository;

  constructor(repository: WalletRepository, params: WalletUpdateParams) {
    super();
    this.repository = repository;
    this.params = params;
  }

  getInitialState(): WalletUpdateState {
    return {
      type: this.params.wallet !== null ? 'loaded' : 'idle',
      errorMessage: null,
      values: {
        name: this.params.wallet?.name ?? '',
        balance: this.params.wallet?.balance ?? 0,
        paymentCostPercentage: this.params.wallet?.paymentCostPercentage ?? 0,
        isCashless: this.params.wallet?.isCashless ?? false,
      },
    };
  }

  getNextState(
    state: WalletUpdateState,
    action: WalletUpdateAction
  ): WalletUpdateState {
    return match([state, action])
      .returnType<WalletUpdateState>()
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
    state: WalletUpdateState,
    dispatch: (action: WalletUpdateAction) => void
  ): void {
    match(state)
      .with({ type: 'idle' }, () => {
        dispatch({ type: 'FETCH' });
      })
      .with({ type: 'loading' }, () => {
        this.repository
          .fetchWalletById(this.params.walletId)
          .then((wallet) =>
            dispatch({
              type: 'FETCH_SUCCESS',
              values: {
                name: wallet.name,
                balance: wallet.balance,
                paymentCostPercentage: wallet.paymentCostPercentage,
                isCashless: wallet.isCashless,
              },
            })
          )
          .catch(() =>
            dispatch({
              type: 'FETCH_ERROR',
              errorMessage: 'Failed to fetch wallet',
            })
          );
      })
      .with({ type: 'submitting' }, ({ values }) => {
        this.repository
          .updateWallet(values, this.params.walletId)
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
