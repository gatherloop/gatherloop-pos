import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WalletCreateHandler } from './WalletCreateHandler';
import { MockAuthRepository, MockWalletRepository } from '../../data/mock';
import { AuthLogoutUsecase, WalletCreateUsecase } from '../../domain';
import { flushPromises } from '../../utils/testUtils';

const mockRouterPush = jest.fn();
jest.mock('solito/router', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: jest.fn(), back: jest.fn() }),
}));

const mockToastShow = jest.fn();
jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: mockToastShow }),
}));

const createProps = (options: { shouldFail?: boolean } = {}) => {
  const walletRepo = new MockWalletRepository();
  if (options.shouldFail) walletRepo.setShouldFail(true);
  return {
    authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
    walletCreateUsecase: new WalletCreateUsecase(walletRepo),
  };
};

describe('WalletCreateHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('form rendering', () => {
    it('should render the create form', () => {
      render(<WalletCreateHandler {...createProps()} />);
      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
    });

    it('should render the name input field', () => {
      render(<WalletCreateHandler {...createProps()} />);
      expect(screen.getByRole('textbox', { name: 'Name' })).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should navigate to "/wallets" after successful creation', async () => {
      const user = userEvent.setup();
      render(<WalletCreateHandler {...createProps()} />);

      await user.type(screen.getByRole('textbox', { name: 'Name' }), 'New Wallet');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).toHaveBeenCalledWith('/wallets');
    });

    it('should not navigate when creation fails', async () => {
      const user = userEvent.setup();
      render(<WalletCreateHandler {...createProps({ shouldFail: true })} />);

      await user.type(screen.getByRole('textbox', { name: 'Name' }), 'New Wallet');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });

    it('should not navigate without any user interaction', async () => {
      render(<WalletCreateHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('should show error when name field is empty and submit is clicked', async () => {
      const user = userEvent.setup();
      render(<WalletCreateHandler {...createProps()} />);

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByText('String must contain at least 1 character(s)')).toBeTruthy();
    });

    it('should not navigate when validation fails', async () => {
      const user = userEvent.setup();
      render(<WalletCreateHandler {...createProps()} />);

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });

  describe('toast notifications', () => {
    it('should show success toast after successful creation', async () => {
      const user = userEvent.setup();
      render(<WalletCreateHandler {...createProps()} />);

      await user.type(screen.getByRole('textbox', { name: 'Name' }), 'New Wallet');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockToastShow).toHaveBeenCalledWith('Create Wallet Success');
    });

    it('should show error toast when creation fails', async () => {
      const user = userEvent.setup();
      render(<WalletCreateHandler {...createProps({ shouldFail: true })} />);

      await user.type(screen.getByRole('textbox', { name: 'Name' }), 'New Wallet');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockToastShow).toHaveBeenCalledWith('Create Wallet Error');
    });
  });

  describe('error banner', () => {
    it('should show error banner when creation fails', async () => {
      const user = userEvent.setup();
      render(<WalletCreateHandler {...createProps({ shouldFail: true })} />);

      await user.type(screen.getByRole('textbox', { name: 'Name' }), 'New Wallet');
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByText('Failed to submit. Please try again.')).toBeTruthy();
    });

    it('should not show error banner before any submission', () => {
      render(<WalletCreateHandler {...createProps()} />);
      expect(screen.queryByText('Failed to submit. Please try again.')).toBeNull();
    });
  });
});
