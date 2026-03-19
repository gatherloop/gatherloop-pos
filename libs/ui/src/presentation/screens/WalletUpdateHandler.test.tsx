import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WalletUpdateHandler } from './WalletUpdateHandler';
import { MockAuthRepository, MockWalletRepository } from '../../data/mock';
import { AuthLogoutUsecase, WalletUpdateUsecase } from '../../domain';
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

  const preloadedWallet = options.preloaded
    ? walletRepo.wallets.find((w) => w.id === walletId) ?? null
    : null;

  return {
    authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
    walletUpdateUsecase: new WalletUpdateUsecase(walletRepo, {
      walletId,
      wallet: preloadedWallet,
    }),
  };
};

describe('WalletUpdateHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading and data states', () => {
    it('should show loading state while fetching wallet', async () => {
      render(<WalletUpdateHandler {...createProps()} />);
      expect(screen.getByText('Fetching Wallet...')).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });

    it('should show the form after wallet data loads', async () => {
      render(<WalletUpdateHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
    });

    it('should render pre-filled form when wallet is preloaded', async () => {
      render(<WalletUpdateHandler {...createProps({ preloaded: true })} />);
      expect(screen.getByDisplayValue('Cash')).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });

    it('should show error state when wallet fetch fails', async () => {
      render(<WalletUpdateHandler {...createProps({ shouldFail: true })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Wallet' })).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should navigate to "/wallets" after successful update', async () => {
      const user = userEvent.setup();
      render(<WalletUpdateHandler {...createProps({ preloaded: true })} />);

      const nameInput = screen.getByRole('textbox', { name: 'Name' });
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Wallet');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).toHaveBeenCalledWith('/wallets');
    });

    it('should not navigate when update fails', async () => {
      const user = userEvent.setup();
      const walletRepo = new MockWalletRepository();
      const preloadedWallet = walletRepo.wallets[0];
      const walletUpdateUsecase = new WalletUpdateUsecase(walletRepo, {
        walletId: preloadedWallet.id,
        wallet: preloadedWallet,
      });
      walletRepo.setShouldFail(true);

      render(
        <WalletUpdateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          walletUpdateUsecase={walletUpdateUsecase}
        />
      );

      const nameInput = screen.getByRole('textbox', { name: 'Name' });
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Wallet');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });

    it('should not navigate without user interaction', async () => {
      render(<WalletUpdateHandler {...createProps({ preloaded: true })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('should show error message when name field is empty and submit is clicked', async () => {
      const user = userEvent.setup();
      render(<WalletUpdateHandler {...createProps({ preloaded: true })} />);

      const nameInput = screen.getByRole('textbox', { name: 'Name' });
      await user.clear(nameInput);
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByText('String must contain at least 1 character(s)')).toBeTruthy();
    });
  });

  describe('toast notifications', () => {
    it('should show success toast after successful update', async () => {
      const user = userEvent.setup();
      render(<WalletUpdateHandler {...createProps({ preloaded: true })} />);

      const nameInput = screen.getByRole('textbox', { name: 'Name' });
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Wallet');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockToastShow).toHaveBeenCalledWith('Update Wallet Success');
    });

    it('should show error toast when update fails', async () => {
      const user = userEvent.setup();
      const walletRepo = new MockWalletRepository();
      const preloadedWallet = walletRepo.wallets[0];
      const walletUpdateUsecase = new WalletUpdateUsecase(walletRepo, {
        walletId: preloadedWallet.id,
        wallet: preloadedWallet,
      });
      walletRepo.setShouldFail(true);

      render(
        <WalletUpdateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          walletUpdateUsecase={walletUpdateUsecase}
        />
      );

      const nameInput = screen.getByRole('textbox', { name: 'Name' });
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Wallet');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockToastShow).toHaveBeenCalledWith('Update Wallet Error');
    });
  });
});
