import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WalletTransferListHandler } from './WalletTransferListHandler';
import { MockAuthRepository, MockWalletRepository } from '../../data/mock';
import {
  AuthLogoutUsecase,
  WalletDetailUsecase,
  WalletTransferListUsecase,
} from '../../domain';
import { flushPromises } from '../../utils/testUtils';

const mockRouterPush = jest.fn();
jest.mock('solito/router', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: jest.fn(), back: jest.fn() }),
}));

jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: jest.fn() }),
}));

const createProps = (
  options: {
    walletId?: number;
    walletRepo?: MockWalletRepository;
    shouldFail?: boolean;
  } = {}
) => {
  const walletId = options.walletId ?? 1;
  const walletRepo = options.walletRepo ?? new MockWalletRepository();
  if (options.shouldFail) walletRepo.setShouldFail(true);

  return {
    walletId,
    authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
    walletDetailUsecase: new WalletDetailUsecase(walletRepo, {
      walletId,
      wallet: null,
    }),
    walletTransferListUsecase: new WalletTransferListUsecase(walletRepo, {
      walletId,
      walletTransfers: [],
    }),
  };
};

describe('WalletTransferListHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading and data states', () => {
    it('should show skeleton list during initial loading', async () => {
      render(<WalletTransferListHandler {...createProps()} />);
      expect(screen.getByTestId('skeleton-list')).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });

    it('should show wallet detail after fetch', async () => {
      render(<WalletTransferListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Cash' })).toBeTruthy();
    });

    it('should show transfer list after fetch', async () => {
      render(<WalletTransferListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      // MockWalletRepository has a transfer to 'Bank Transfer'
      expect(screen.getByRole('heading', { name: 'Bank Transfer' })).toBeTruthy();
    });

    it('should show error state when transfer fetch fails', async () => {
      render(<WalletTransferListHandler {...createProps({ shouldFail: true })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Transfer Histories' })).toBeTruthy();
    });

    it('should not show skeleton after data is loaded', async () => {
      render(<WalletTransferListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByTestId('skeleton-list')).toBeNull();
    });

    it('should show empty state when no transfers exist', async () => {
      const walletRepo = new MockWalletRepository();
      walletRepo.walletTransfers = [];

      render(<WalletTransferListHandler {...createProps({ walletRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Oops, Transfer History is Empty' })).toBeTruthy();
    });

    it('should show create CTA button in empty state', async () => {
      const walletRepo = new MockWalletRepository();
      walletRepo.walletTransfers = [];
      render(<WalletTransferListHandler {...createProps({ walletRepo })} />);
      await act(async () => {
        await flushPromises();
      });
      expect(screen.getByRole('button', { name: 'Create Transfer' })).toBeTruthy();
    });

    it('should navigate to create page when CTA button is pressed', async () => {
      const user = userEvent.setup();
      const walletRepo = new MockWalletRepository();
      walletRepo.walletTransfers = [];
      render(<WalletTransferListHandler {...createProps({ walletRepo })} />);
      await act(async () => {
        await flushPromises();
      });
      await user.click(screen.getByRole('button', { name: 'Create Transfer' }));
      expect(mockRouterPush).toHaveBeenCalledWith('/wallets/1/transfers/create');
    });
  });

  describe('error recovery', () => {
    it('should refetch transfers when retry button is pressed', async () => {
      const user = userEvent.setup();
      const walletRepo = new MockWalletRepository();
      walletRepo.setShouldFail(true);

      render(<WalletTransferListHandler {...createProps({ walletRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Transfer Histories' })).toBeTruthy();

      walletRepo.setShouldFail(false);

      await user.click(screen.getByRole('button', { name: 'Retry' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Bank Transfer' })).toBeTruthy();
    });
  });
});
