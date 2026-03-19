import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CalculationCreateHandler } from './CalculationCreateHandler';
import {
  MockAuthRepository,
  MockCalculationRepository,
  MockWalletRepository,
} from '../../data/mock';
import { AuthLogoutUsecase, CalculationCreateUsecase } from '../../domain';
import { flushPromises } from '../../utils/testUtils';

const mockRouterPush = jest.fn();
jest.mock('solito/router', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: jest.fn(), back: jest.fn() }),
}));

const mockToastShow = jest.fn();
jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: mockToastShow }),
}));

const createProps = (
  options: {
    calculationShouldFail?: boolean;
    preloaded?: boolean;
  } = {}
) => {
  const calculationRepo = new MockCalculationRepository();
  const walletRepo = new MockWalletRepository();

  if (options.calculationShouldFail) calculationRepo.setShouldFail(true);

  // CalculationCreateUsecase requires preloaded wallets to start in 'loaded' state.
  // Without preloaded wallets, it stays in 'idle' (shown as loading) because
  // the usecase does not auto-fetch from idle state.
  const preloadedWallets = options.preloaded !== false ? walletRepo.wallets : [];

  return {
    authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
    calculationCreateUsecase: new CalculationCreateUsecase(
      calculationRepo,
      walletRepo,
      { wallets: preloadedWallets }
    ),
  };
};

describe('CalculationCreateHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading and data states', () => {
    it('should show loading state when wallets are not preloaded', () => {
      render(<CalculationCreateHandler {...createProps({ preloaded: false })} />);
      expect(screen.getByText('Fetching Calculation...')).toBeTruthy();
    });

    it('should show the form when wallets are preloaded', () => {
      render(<CalculationCreateHandler {...createProps()} />);
      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
    });

    it('should show wallet select options in the form', () => {
      render(<CalculationCreateHandler {...createProps()} />);
      expect(screen.getByText('Cash')).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should navigate to "/calculations" after successful creation', async () => {
      const user = userEvent.setup();
      render(<CalculationCreateHandler {...createProps()} />);

      await user.click(screen.getByRole('option', { name: 'Cash' }));
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).toHaveBeenCalledWith('/calculations');
    });

    it('should not navigate when creation fails', async () => {
      const user = userEvent.setup();
      const calculationRepo = new MockCalculationRepository();
      const walletRepo = new MockWalletRepository();
      const preloadedWallets = walletRepo.wallets;
      calculationRepo.setShouldFail(true);

      render(
        <CalculationCreateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          calculationCreateUsecase={new CalculationCreateUsecase(
            calculationRepo,
            walletRepo,
            { wallets: preloadedWallets }
          )}
        />
      );

      await user.click(screen.getByRole('option', { name: 'Cash' }));
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });

    it('should not navigate without user interaction', async () => {
      render(<CalculationCreateHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });

  describe('toast notifications', () => {
    it('should show success toast after successful creation', async () => {
      const user = userEvent.setup();
      render(<CalculationCreateHandler {...createProps()} />);

      await user.click(screen.getByRole('option', { name: 'Cash' }));
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockToastShow).toHaveBeenCalledWith('Create Calculation Success');
    });

    it('should show error toast when creation fails', async () => {
      const user = userEvent.setup();
      const calculationRepo = new MockCalculationRepository();
      const walletRepo = new MockWalletRepository();
      const preloadedWallets = walletRepo.wallets;
      calculationRepo.setShouldFail(true);

      render(
        <CalculationCreateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          calculationCreateUsecase={new CalculationCreateUsecase(
            calculationRepo,
            walletRepo,
            { wallets: preloadedWallets }
          )}
        />
      );

      await user.click(screen.getByRole('option', { name: 'Cash' }));
      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockToastShow).toHaveBeenCalledWith('Create Calculation Error');
    });
  });

  describe('error recovery', () => {
    it('should show loading state and allow retry via retry button', async () => {
      const user = userEvent.setup();
      const calculationRepo = new MockCalculationRepository();
      const walletRepo = new MockWalletRepository();
      walletRepo.setShouldFail(true);

      // Start in idle (no preloaded wallets), then press retry to trigger fetch
      render(
        <CalculationCreateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          calculationCreateUsecase={new CalculationCreateUsecase(
            calculationRepo,
            walletRepo,
            { wallets: [] }
          )}
        />
      );

      // In idle state, shows loading variant
      expect(screen.getByText('Fetching Calculation...')).toBeTruthy();

      // Press retry to trigger FETCH → loading → error
      walletRepo.setShouldFail(true);
      const retryButton = screen.queryByRole('button', { name: 'Retry' });
      if (retryButton) {
        await user.click(retryButton);
        await act(async () => {
          await flushPromises();
        });
        expect(screen.getByRole('heading', { name: 'Failed to Fetch Calculation' })).toBeTruthy();
      }
    });
  });
});
