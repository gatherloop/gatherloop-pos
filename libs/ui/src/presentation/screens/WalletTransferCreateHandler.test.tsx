import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WalletTransferCreateHandler } from './WalletTransferCreateHandler';
import { MockAuthRepository, MockWalletRepository } from '../../data/mock';
import { AuthLogoutUsecase, WalletTransferCreateUsecase } from '../../domain';
import { flushPromises } from '../../utils/testUtils';

const mockRouterPush = jest.fn();
jest.mock('solito/router', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: jest.fn(), back: jest.fn() }),
}));

const mockToastShow = jest.fn();
jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: mockToastShow }),
}));

const createProps = (options: {
  walletId?: number;
  shouldFail?: boolean;
  preloaded?: boolean;
} = {}) => {
  const walletId = options.walletId ?? 1;
  const walletRepo = new MockWalletRepository();
  if (options.shouldFail) walletRepo.setShouldFail(true);

  // WalletTransferCreateUsecase auto-fetches from idle, but we can also preload
  const preloadedWallets = options.preloaded ? walletRepo.wallets : [];

  return {
    walletId,
    authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
    walletTransferCreateUsecase: new WalletTransferCreateUsecase(walletRepo, {
      fromWalletId: walletId,
      wallets: preloadedWallets,
    }),
  };
};

describe('WalletTransferCreateHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('form rendering', () => {
    it('should render the create transfer form immediately', async () => {
      render(<WalletTransferCreateHandler {...createProps()} />);
      // The form is always shown (no loading state in WalletTransferCreateScreen)
      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });

    it('should show wallet options after wallets are preloaded', async () => {
      render(<WalletTransferCreateHandler {...createProps({ preloaded: true, walletId: 1 })} />);
      // fromWalletId=1 (Cash) is excluded, only Bank Transfer (id=2) should appear
      expect(screen.getByText('Bank Transfer')).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });

    it('should show wallet options after auto-fetch', async () => {
      render(<WalletTransferCreateHandler {...createProps({ walletId: 1 })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByText('Bank Transfer')).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should navigate to wallet transfers page after successful transfer', async () => {
      const user = userEvent.setup();
      render(<WalletTransferCreateHandler {...createProps({ preloaded: true, walletId: 1 })} />);

      await user.click(screen.getByRole('option', { name: 'Bank Transfer' }));
      const amountInput = screen.getByRole('textbox', { name: 'Amount' });
      await user.clear(amountInput);
      await user.type(amountInput, '50000');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).toHaveBeenCalledWith('/wallets/1/transfers');
    });

    it('should not navigate without user interaction', async () => {
      render(<WalletTransferCreateHandler {...createProps({ preloaded: true })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });

  describe('toast notifications', () => {
    it('should show success toast after successful transfer', async () => {
      const user = userEvent.setup();
      render(<WalletTransferCreateHandler {...createProps({ preloaded: true, walletId: 1 })} />);

      await user.click(screen.getByRole('option', { name: 'Bank Transfer' }));
      const amountInput = screen.getByRole('textbox', { name: 'Amount' });
      await user.clear(amountInput);
      await user.type(amountInput, '50000');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockToastShow).toHaveBeenCalledWith('Transfer Success');
    });

    it('should show error toast when transfer fails', async () => {
      const user = userEvent.setup();
      const walletRepo = new MockWalletRepository();
      const preloadedWallets = walletRepo.wallets;
      walletRepo.setShouldFail(true);

      render(
        <WalletTransferCreateHandler
          walletId={1}
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          walletTransferCreateUsecase={new WalletTransferCreateUsecase(walletRepo, {
            fromWalletId: 1,
            wallets: preloadedWallets,
          })}
        />
      );

      await user.click(screen.getByRole('option', { name: 'Bank Transfer' }));
      const amountInput = screen.getByRole('textbox', { name: 'Amount' });
      await user.clear(amountInput);
      await user.type(amountInput, '50000');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockToastShow).toHaveBeenCalledWith('Transfer Error');
    });
  });

  describe('wallet filter', () => {
    it('should exclude fromWallet from transfer target options', async () => {
      // fromWalletId=1 (Cash) should not appear as a transfer target
      render(<WalletTransferCreateHandler {...createProps({ preloaded: true, walletId: 1 })} />);
      expect(screen.queryByText('Cash')).toBeNull();
      expect(screen.getByText('Bank Transfer')).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });
  });
});
