import { match } from 'ts-pattern';
import { WalletForm } from '../entities';
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
) &
  Context;

export type WalletUpdateAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; values: WalletForm }
  | { type: 'FETCH_ERROR'; errorMessage: string }
  | { type: 'SUBMIT'; values: WalletForm }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; errorMessage: string };

export class WalletUpdateUsecase extends Usecase<
  WalletUpdateState,
  WalletUpdateAction
> {
  repository: WalletRepository;

  constructor(repository: WalletRepository) {
    super();
    this.repository = repository;
  }

  getInitialState(): WalletUpdateState {
    const walletId = this.repository.getWalletByIdServerParams();
    const wallet = walletId ? this.repository.getWalletById(walletId) : null;
    return {
      type: wallet !== null ? 'loaded' : 'idle',
      errorMessage: null,
      values: {
        name: wallet?.name ?? '',
        balance: wallet?.balance ?? 0,
        paymentCostPercentage: wallet?.paymentCostPercentage ?? 0,
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
          type: 'loaded',
          errorMessage,
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
        const walletId = this.repository.getWalletByIdServerParams() ?? NaN;
        this.repository
          .fetchWalletById(walletId)
          .then((wallet) =>
            dispatch({
              type: 'FETCH_SUCCESS',
              values: {
                name: wallet.name,
                balance: wallet.balance,
                paymentCostPercentage: wallet.paymentCostPercentage,
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
        const walletId = this.repository.getWalletByIdServerParams() ?? NaN;
        this.repository
          .updateWallet(values, walletId)
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
