import {
  WalletTransferListUsecase,
  WalletTransferListAction,
  WalletTransferListState,
  WalletTransferListParams,
} from './walletTransferList';
import { MockWalletRepository } from '../../data/mock';
import { UsecaseTester, flushPromises } from '../../utils/usecase';

describe('WalletTransferListUsecase', () => {
  describe('success flow', () => {
    it('should transition loading -> loaded -> revalidating -> loaded', async () => {
      const repository = new MockWalletRepository();
      const usecase = new WalletTransferListUsecase(repository, {
        walletId: 1,
        walletTransfers: [],
      });
      const walletTransferList = new UsecaseTester<
        WalletTransferListUsecase,
        WalletTransferListState,
        WalletTransferListAction,
        WalletTransferListParams
      >(usecase);

      expect(walletTransferList.state).toEqual({
        type: 'loading',
        walletTransfers: [],
        errorMessage: null,
      });

      await flushPromises();
      expect(walletTransferList.state).toEqual({
        type: 'loaded',
        walletTransfers: repository.walletTransfers,
        errorMessage: null,
      });

      walletTransferList.dispatch({ type: 'FETCH' });
      expect(walletTransferList.state).toEqual({
        type: 'revalidating',
        walletTransfers: repository.walletTransfers,
        errorMessage: null,
      });

      await flushPromises();
      expect(walletTransferList.state).toEqual({
        type: 'loaded',
        walletTransfers: repository.walletTransfers,
        errorMessage: null,
      });
    });
  });

  describe('failed flow', () => {
    it('should transition loading -> error -> loading -> loaded', async () => {
      const repository = new MockWalletRepository();
      repository.setShouldFail(true);
      const usecase = new WalletTransferListUsecase(repository, {
        walletId: 1,
        walletTransfers: [],
      });
      const walletTransferList = new UsecaseTester<
        WalletTransferListUsecase,
        WalletTransferListState,
        WalletTransferListAction,
        WalletTransferListParams
      >(usecase);

      expect(walletTransferList.state).toEqual({
        type: 'loading',
        walletTransfers: [],
        errorMessage: null,
      });

      await flushPromises();
      expect(walletTransferList.state).toEqual({
        type: 'error',
        walletTransfers: [],
        errorMessage: 'Failed to fetch wallets',
      });

      repository.setShouldFail(false);
      walletTransferList.dispatch({ type: 'FETCH' });
      expect(walletTransferList.state).toEqual({
        type: 'loading',
        walletTransfers: [],
        errorMessage: null,
      });

      await flushPromises();
      expect(walletTransferList.state).toEqual({
        type: 'loaded',
        walletTransfers: repository.walletTransfers,
        errorMessage: null,
      });
    });
  });

  it('show loaded state when initial data is given', async () => {
    const repository = new MockWalletRepository();

    const walletTransfers = [repository.walletTransfers[0]];

    const usecase = new WalletTransferListUsecase(repository, {
      walletId: 1,
      walletTransfers,
    });

    const walletTransferList = new UsecaseTester<
      WalletTransferListUsecase,
      WalletTransferListState,
      WalletTransferListAction,
      WalletTransferListParams
    >(usecase);

    expect(walletTransferList.state).toEqual({
      type: 'loaded',
      walletTransfers,
      errorMessage: null,
    });
  });
});
