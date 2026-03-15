import {
  WalletTransferListUsecase,
  WalletTransferListAction,
  WalletTransferListState,
  WalletTransferListParams,
} from './walletTransferList';
import { MockWalletRepository } from '../../data/mock';
import { UsecaseTester } from '../../utils/usecase';

describe('WalletTransferListUsecase', () => {
  describe('success flow', () => {
    const repository = new MockWalletRepository();
    const usecase = new WalletTransferListUsecase(repository, {
      walletId: 1,
      walletTransfers: [],
    });
    let walletTransferList: UsecaseTester<
      WalletTransferListUsecase,
      WalletTransferListState,
      WalletTransferListAction,
      WalletTransferListParams
    >;

    it('initialize with loading state', () => {
      walletTransferList = new UsecaseTester<
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
    });

    it('transition to loaded state after success fetch', async () => {
      await Promise.resolve();
      expect(walletTransferList.state).toEqual({
        type: 'loaded',
        walletTransfers: repository.walletTransfers,
        errorMessage: null,
      });
    });

    it('transition to revalidating state when FETCH action is dispatched', () => {
      walletTransferList.dispatch({ type: 'FETCH' });
      expect(walletTransferList.state).toEqual({
        type: 'revalidating',
        walletTransfers: repository.walletTransfers,
        errorMessage: null,
      });
    });

    it('transition to loaded state after success fetch', async () => {
      await Promise.resolve();
      expect(walletTransferList.state).toEqual({
        type: 'loaded',
        walletTransfers: repository.walletTransfers,
        errorMessage: null,
      });
    });
  });

  describe('failed flow', () => {
    const repository = new MockWalletRepository();
    repository.setShouldFail(true);
    const usecase = new WalletTransferListUsecase(repository, {
      walletId: 1,
      walletTransfers: [],
    });
    let walletTransferList: UsecaseTester<
      WalletTransferListUsecase,
      WalletTransferListState,
      WalletTransferListAction,
      WalletTransferListParams
    >;

    it('initialize with loading state', () => {
      walletTransferList = new UsecaseTester<
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
    });

    it('transition to error state after failed fetch', async () => {
      await Promise.resolve();
      expect(walletTransferList.state).toEqual({
        type: 'error',
        walletTransfers: [],
        errorMessage: 'Failed to fetch wallets',
      });
    });

    it('transition to loading state after FETCH action is dispatched', () => {
      repository.setShouldFail(false);
      walletTransferList.dispatch({ type: 'FETCH' });
      expect(walletTransferList.state).toEqual({
        type: 'loading',
        walletTransfers: [],
        errorMessage: null,
      });
    });

    it('transition to loaded state after success fetch', async () => {
      await Promise.resolve();
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
