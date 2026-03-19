import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WalletListHandler } from './WalletListHandler';
import { MockAuthRepository, MockWalletRepository } from '../../data/mock';
import { AuthLogoutUsecase, WalletListUsecase } from '../../domain';
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
    walletRepo?: MockWalletRepository;
    authRepo?: MockAuthRepository;
  } = {}
) => {
  const walletRepo = options.walletRepo ?? new MockWalletRepository();
  const authRepo = options.authRepo ?? new MockAuthRepository();
  return {
    authLogoutUsecase: new AuthLogoutUsecase(authRepo),
    walletListUsecase: new WalletListUsecase(walletRepo, { wallets: [] }),
  };
};

describe('WalletListHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading and data states', () => {
    it('should show loading state initially', () => {
      render(<WalletListHandler {...createProps()} />);
      expect(screen.getByText('Fetching Wallets...')).toBeTruthy();
    });

    it('should show wallet list after successful fetch', async () => {
      render(<WalletListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Cash' })).toBeTruthy();
      expect(screen.getByRole('heading', { name: 'Bank Transfer' })).toBeTruthy();
    });

    it('should show error state when fetch fails', async () => {
      const walletRepo = new MockWalletRepository();
      walletRepo.setShouldFail(true);

      render(<WalletListHandler {...createProps({ walletRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Wallets' })).toBeTruthy();
    });

    it('should show empty state when no wallets exist', async () => {
      const walletRepo = new MockWalletRepository();
      walletRepo.wallets = [];

      render(<WalletListHandler {...createProps({ walletRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Oops, Wallet is Empty' })).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should navigate to wallet edit page when edit menu is pressed', async () => {
      const user = userEvent.setup();
      render(<WalletListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      const editMenuItems = screen.getAllByRole('button', { name: 'Edit' });
      await user.click(editMenuItems[0]);

      expect(mockRouterPush).toHaveBeenCalledWith('/wallets/1');
    });

    it('should navigate to wallet transfer page when transfer menu is pressed', async () => {
      const user = userEvent.setup();
      render(<WalletListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      const transferMenuItems = screen.getAllByRole('button', { name: 'Transfer' });
      await user.click(transferMenuItems[0]);

      expect(mockRouterPush).toHaveBeenCalledWith('/wallets/1/transfers');
    });

    it('should navigate to wallet transfer page when item is pressed', async () => {
      const user = userEvent.setup();
      render(<WalletListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      const walletItems = screen.getAllByRole('heading', { name: 'Cash' });
      await user.click(walletItems[0]);

      expect(mockRouterPush).toHaveBeenCalledWith('/wallets/1/transfers');
    });
  });

  describe('error recovery', () => {
    it('should refetch wallets when retry button is pressed', async () => {
      const user = userEvent.setup();
      const walletRepo = new MockWalletRepository();
      walletRepo.setShouldFail(true);

      render(<WalletListHandler {...createProps({ walletRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Wallets' })).toBeTruthy();

      walletRepo.setShouldFail(false);

      await user.click(screen.getByRole('button', { name: 'Retry' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Cash' })).toBeTruthy();
    });
  });
});
