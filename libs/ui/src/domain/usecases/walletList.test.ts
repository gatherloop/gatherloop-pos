import {
  WalletListUsecase,
  WalletListAction,
  WalletListState,
  WalletListParams,
} from './walletList';
import { MockWalletRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('WalletListUsecase', () => {
  describe('success flow', () => {
    it('should transition loading -> loaded -> revalidating -> loaded', async () => {
      const repository = new MockWalletRepository();
      const usecase = new WalletListUsecase(repository, { wallets: [] });
      const walletList = new UsecaseTester<
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

      await flushPromises();
      expect(walletList.state).toEqual({
        type: 'loaded',
        wallets: repository.wallets,
        errorMessage: null,
      });

      walletList.dispatch({ type: 'FETCH' });
      expect(walletList.state).toEqual({
        type: 'revalidating',
        wallets: repository.wallets,
        errorMessage: null,
      });

      await flushPromises();
      expect(walletList.state).toEqual({
        type: 'loaded',
        wallets: repository.wallets,
        errorMessage: null,
      });
    });
  });

  describe('failed flow', () => {
    it('should transition loading -> error -> loading -> loaded', async () => {
      const repository = new MockWalletRepository();
      repository.setShouldFail(true);
      const usecase = new WalletListUsecase(repository, { wallets: [] });
      const walletList = new UsecaseTester<
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

      await flushPromises();
      expect(walletList.state).toEqual({
        type: 'error',
        wallets: [],
        errorMessage: 'Failed to fetch wallets',
      });

      repository.setShouldFail(false);
      walletList.dispatch({ type: 'FETCH' });
      expect(walletList.state).toEqual({
        type: 'loading',
        wallets: [],
        errorMessage: null,
      });

      await flushPromises();
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
