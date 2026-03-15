import {
  WalletListUsecase,
  WalletListAction,
  WalletListState,
  WalletListParams,
} from './walletList';
import { MockWalletRepository } from '../../data/mock';
import { UsecaseTester } from '../../utils/usecase';

describe('WalletListUsecase', () => {
  describe('success flow', () => {
    const repository = new MockWalletRepository();
    const usecase = new WalletListUsecase(repository, { wallets: [] });
    let walletList: UsecaseTester<
      WalletListUsecase,
      WalletListState,
      WalletListAction,
      WalletListParams
    >;

    it('initialize with loading state', () => {
      walletList = new UsecaseTester<
        WalletListUsecase,
        WalletListState,
        WalletListAction,
        WalletListParams
      >(usecase);

      expect(walletList.state).toEqual({
        type: 'loading',
        wallets: [],
        errorMessage: null,
      });
    });

    it('transition to loaded state after success fetch', async () => {
      await Promise.resolve();
      expect(walletList.state).toEqual({
        type: 'loaded',
        wallets: repository.wallets,
        errorMessage: null,
      });
    });

    it('transition to revalidating state when FETCH action is dispatched', () => {
      walletList.dispatch({ type: 'FETCH' });
      expect(walletList.state).toEqual({
        type: 'revalidating',
        wallets: repository.wallets,
        errorMessage: null,
      });
    });

    it('transition to loaded state after success fetch', async () => {
      await Promise.resolve();
      expect(walletList.state).toEqual({
        type: 'loaded',
        wallets: repository.wallets,
        errorMessage: null,
      });
    });
  });

  describe('failed flow', () => {
    const repository = new MockWalletRepository();
    repository.setShouldFail(true);
    const usecase = new WalletListUsecase(repository, { wallets: [] });
    let walletList: UsecaseTester<
      WalletListUsecase,
      WalletListState,
      WalletListAction,
      WalletListParams
    >;

    it('initialize with loading state', () => {
      walletList = new UsecaseTester<
        WalletListUsecase,
        WalletListState,
        WalletListAction,
        WalletListParams
      >(usecase);

      expect(walletList.state).toEqual({
        type: 'loading',
        wallets: [],
        errorMessage: null,
      });
    });

    it('transition to error state after failed fetch', async () => {
      await Promise.resolve();
      expect(walletList.state).toEqual({
        type: 'error',
        wallets: [],
        errorMessage: 'Failed to fetch wallets',
      });
    });

    it('transition to loading state after FETCH action is dispatched', () => {
      repository.setShouldFail(false);
      walletList.dispatch({ type: 'FETCH' });
      expect(walletList.state).toEqual({
        type: 'loading',
        wallets: [],
        errorMessage: null,
      });
    });

    it('transition to loaded state after success fetch', async () => {
      await Promise.resolve();
      expect(walletList.state).toEqual({
        type: 'loaded',
        wallets: repository.wallets,
        errorMessage: null,
      });
    });
  });

  it('show loaded state when initial data is given', async () => {
    const repository = new MockWalletRepository();

    const wallets = [repository.wallets[0]];

    const usecase = new WalletListUsecase(repository, { wallets });

    const walletList = new UsecaseTester<
      WalletListUsecase,
      WalletListState,
      WalletListAction,
      WalletListParams
    >(usecase);

    expect(walletList.state).toEqual({
      type: 'loaded',
      wallets,
      errorMessage: null,
    });
  });
});
