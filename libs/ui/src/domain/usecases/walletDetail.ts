import { match } from 'ts-pattern';
import { Wallet } from '../entities';
import { WalletRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  errorMessage: string | null;
  wallet: Wallet | null;
};

export type WalletDetailState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
) &
  Context;

export type WalletDetailAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; wallet: Wallet }
  | { type: 'FETCH_ERROR'; errorMessage: string };

export class WalletDetailUsecase extends Usecase<
  WalletDetailState,
  WalletDetailAction
> {
  repository: WalletRepository;

  constructor(repository: WalletRepository) {
    super();
    this.repository = repository;
  }

  getInitialState(): WalletDetailState {
    const walletId = this.repository.getWalletByIdServerParams();
    const wallet = walletId ? this.repository.getWalletById(walletId) : null;
    return {
      type: wallet !== null ? 'loaded' : 'idle',
      errorMessage: null,
      wallet,
    };
  }

  getNextState(
    state: WalletDetailState,
    action: WalletDetailAction
  ): WalletDetailState {
    return match([state, action])
      .returnType<WalletDetailState>()
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
        ([state, { wallet }]) => ({
          ...state,
          type: 'loaded',
          wallet,
        })
      )
      .otherwise(() => state);
  }

  onStateChange(
    state: WalletDetailState,
    dispatch: (action: WalletDetailAction) => void
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
              wallet,
            })
          )
          .catch(() =>
            dispatch({
              type: 'FETCH_ERROR',
              errorMessage: 'Failed to fetch wallet',
            })
          );
      })
      .otherwise(() => {
        // TODO: IMPLEMENT SOMETHING
      });
  }
}
