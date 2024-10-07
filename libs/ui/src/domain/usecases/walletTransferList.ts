import { match, P } from 'ts-pattern';
import { WalletTransfer } from '../entities';
import { WalletRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  walletTransfers: WalletTransfer[];
  errorMessage: string | null;
};

export type WalletTransferListState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'revalidating' }
) &
  Context;

export type WalletTransferListAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; walletTransfers: WalletTransfer[] }
  | { type: 'FETCH_ERROR'; message: string }
  | { type: 'REVALIDATE_FINISH'; walletTransfers: WalletTransfer[] };

export class WalletTransferListUsecase extends Usecase<
  WalletTransferListState,
  WalletTransferListAction
> {
  repository: WalletRepository;

  constructor(repository: WalletRepository) {
    super();
    this.repository = repository;
  }

  getInitialState() {
    const walletId = this.repository.getWalletByIdServerParams() ?? NaN;
    const walletTransfers = this.repository.getWalletTransferList(walletId);

    const state: WalletTransferListState = {
      type: walletTransfers.length >= 1 ? 'loaded' : 'idle',
      errorMessage: null,
      walletTransfers,
    };

    return state;
  }

  getNextState(
    state: WalletTransferListState,
    action: WalletTransferListAction
  ) {
    return match([state, action])
      .returnType<WalletTransferListState>()
      .with(
        [{ type: P.union('idle', 'error') }, { type: 'FETCH' }],
        ([state]) => ({ ...state, type: 'loading' })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_SUCCESS' }],
        ([state, { walletTransfers }]) => ({
          ...state,
          type: 'loaded',
          walletTransfers,
        })
      )
      .with(
        [{ type: 'loading' }, { type: 'FETCH_ERROR' }],
        ([state, { message }]) => ({
          ...state,
          type: 'error',
          message,
        })
      )
      .with([{ type: 'loaded' }, { type: 'FETCH' }], ([state]) => ({
        ...state,
        type: 'revalidating',
      }))
      .with(
        [{ type: 'revalidating' }, { type: 'REVALIDATE_FINISH' }],
        ([state, { type: _type, ...params }]) => ({
          ...state,
          ...params,
          type: 'loaded',
        })
      )
      .otherwise(() => state);
  }

  onStateChange(
    state: WalletTransferListState,
    dispatch: (action: WalletTransferListAction) => void
  ) {
    match(state)
      .with({ type: 'idle' }, () => dispatch({ type: 'FETCH' }))
      .with({ type: 'loading' }, () =>
        this.repository
          .fetchWalletTransferList(
            this.repository.getWalletByIdServerParams() ?? NaN
          )
          .then((walletTransfers) =>
            dispatch({ type: 'FETCH_SUCCESS', walletTransfers })
          )
          .catch(() =>
            dispatch({
              type: 'FETCH_ERROR',
              message: 'Failed to fetch wallets',
            })
          )
      )
      .with({ type: 'revalidating' }, ({ walletTransfers }) => {
        this.repository
          .fetchWalletTransferList(
            this.repository.getWalletByIdServerParams() ?? NaN
          )
          .then((walletTransfers) =>
            dispatch({ type: 'REVALIDATE_FINISH', walletTransfers })
          )
          .catch(() =>
            dispatch({ type: 'REVALIDATE_FINISH', walletTransfers })
          );
      })
      .otherwise(() => {
        // TODO: IMPLEMENT SOMETHING
      });
  }
}
