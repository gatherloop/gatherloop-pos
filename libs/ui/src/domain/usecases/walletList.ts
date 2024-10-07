import { match, P } from 'ts-pattern';
import { Wallet } from '../entities';
import { WalletRepository } from '../repositories';
import { Usecase } from './IUsecase';

type Context = {
  wallets: Wallet[];
  errorMessage: string | null;
};

export type WalletListState = (
  | { type: 'idle' }
  | { type: 'loading' }
  | { type: 'loaded' }
  | { type: 'error' }
  | { type: 'revalidating' }
) &
  Context;

export type WalletListAction =
  | { type: 'FETCH' }
  | { type: 'FETCH_SUCCESS'; wallets: Wallet[] }
  | { type: 'FETCH_ERROR'; message: string }
  | { type: 'REVALIDATE_FINISH'; wallets: Wallet[] };

export class WalletListUsecase extends Usecase<
  WalletListState,
  WalletListAction
> {
  repository: WalletRepository;

  constructor(repository: WalletRepository) {
    super();
    this.repository = repository;
  }

  getInitialState() {
    const wallets = this.repository.getWalletList();

    const state: WalletListState = {
      type: wallets.length >= 1 ? 'loaded' : 'idle',
      errorMessage: null,
      wallets,
    };

    return state;
  }

  getNextState(state: WalletListState, action: WalletListAction) {
    return match([state, action])
      .returnType<WalletListState>()
      .with(
        [{ type: P.union('idle', 'error') }, { type: 'FETCH' }],
        ([state]) => ({ ...state, type: 'loading' })
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
    state: WalletListState,
    dispatch: (action: WalletListAction) => void
  ) {
    match(state)
      .with({ type: 'idle' }, () => dispatch({ type: 'FETCH' }))
      .with({ type: 'loading' }, () =>
        this.repository
          .fetchWalletList()
          .then((wallets) => dispatch({ type: 'FETCH_SUCCESS', wallets }))
          .catch(() =>
            dispatch({
              type: 'FETCH_ERROR',
              message: 'Failed to fetch wallets',
            })
          )
      )
      .with({ type: 'revalidating' }, ({ wallets }) => {
        this.repository
          .fetchWalletList()
          .then((wallets) => dispatch({ type: 'REVALIDATE_FINISH', wallets }))
          .catch(() => dispatch({ type: 'REVALIDATE_FINISH', wallets }));
      })
      .otherwise(() => {
        // TODO: IMPLEMENT SOMETHING
      });
  }
}
