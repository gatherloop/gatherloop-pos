import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CalculationUpdateHandler } from './CalculationUpdateHandler';
import {
  MockAuthRepository,
  MockCalculationRepository,
  MockWalletRepository,
} from '../../data/mock';
import { AuthLogoutUsecase, CalculationUpdateUsecase } from '../../domain';
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
    calculationId?: number;
    shouldFail?: boolean;
    preloaded?: boolean;
  } = {}
) => {
  const calculationId = options.calculationId ?? 1;
  const calculationRepo = new MockCalculationRepository();
  const walletRepo = new MockWalletRepository();

  if (options.shouldFail) {
    calculationRepo.setShouldFail(true);
    walletRepo.setShouldFail(true);
  }

  const preloadedCalculation = options.preloaded
    ? calculationRepo.calculations.find((c) => c.id === calculationId) ?? null
    : null;
  const preloadedWallets = options.preloaded ? walletRepo.wallets : [];

  return {
    authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
    calculationUpdateUsecase: new CalculationUpdateUsecase(
      calculationRepo,
      walletRepo,
      {
        calculationId,
        calculation: preloadedCalculation,
        wallets: preloadedWallets,
      }
    ),
  };
};

describe('CalculationUpdateHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading and data states', () => {
    it('should show loading state while fetching calculation', () => {
      render(<CalculationUpdateHandler {...createProps()} />);
      expect(screen.getByText('Fetching Calculation...')).toBeTruthy();
    });

    it('should show the form after calculation data loads', async () => {
      render(<CalculationUpdateHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
    });

    it('should render the form immediately when calculation is preloaded', () => {
      render(<CalculationUpdateHandler {...createProps({ preloaded: true })} />);
      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
    });

    it('should show error state when fetch fails', async () => {
      render(<CalculationUpdateHandler {...createProps({ shouldFail: true })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Calculation' })).toBeTruthy();
    });

    it('should show wallet select options in the form', async () => {
      render(<CalculationUpdateHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByText('Cash')).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should navigate to "/calculations" after successful update', async () => {
      const user = userEvent.setup();
      render(<CalculationUpdateHandler {...createProps({ preloaded: true })} />);

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).toHaveBeenCalledWith('/calculations');
    });

    it('should not navigate when update fails', async () => {
      const user = userEvent.setup();
      const calculationRepo = new MockCalculationRepository();
      const walletRepo = new MockWalletRepository();
      const preloadedCalculation = calculationRepo.calculations[0];
      const preloadedWallets = walletRepo.wallets;
      calculationRepo.setShouldFail(true);

      render(
        <CalculationUpdateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          calculationUpdateUsecase={new CalculationUpdateUsecase(
            calculationRepo,
            walletRepo,
            {
              calculationId: preloadedCalculation.id,
              calculation: preloadedCalculation,
              wallets: preloadedWallets,
            }
          )}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });

    it('should not navigate without user interaction', async () => {
      render(<CalculationUpdateHandler {...createProps({ preloaded: true })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });

  describe('submit disabled for completed calculation', () => {
    it('should disable submit button when calculation is already complete', async () => {
      const calculationRepo = new MockCalculationRepository();
      const walletRepo = new MockWalletRepository();
      // Mark calculation as complete
      calculationRepo.calculations[0].completedAt = '2024-03-20T12:00:00.000Z';
      const preloadedCalculation = calculationRepo.calculations[0];
      const preloadedWallets = walletRepo.wallets;

      render(
        <CalculationUpdateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          calculationUpdateUsecase={new CalculationUpdateUsecase(
            calculationRepo,
            walletRepo,
            {
              calculationId: preloadedCalculation.id,
              calculation: preloadedCalculation,
              wallets: preloadedWallets,
            }
          )}
        />
      );

      const submitButton = screen.getByRole('button', { name: 'Submit' });
      expect((submitButton as HTMLButtonElement).disabled).toBe(true);
    });
  });

  describe('toast notifications', () => {
    it('should show success toast after successful update', async () => {
      const user = userEvent.setup();
      render(<CalculationUpdateHandler {...createProps({ preloaded: true })} />);

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockToastShow).toHaveBeenCalledWith('Update Calculation Success');
    });

    it('should show error toast when update fails', async () => {
      const user = userEvent.setup();
      const calculationRepo = new MockCalculationRepository();
      const walletRepo = new MockWalletRepository();
      const preloadedCalculation = calculationRepo.calculations[0];
      const preloadedWallets = walletRepo.wallets;
      calculationRepo.setShouldFail(true);

      render(
        <CalculationUpdateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          calculationUpdateUsecase={new CalculationUpdateUsecase(
            calculationRepo,
            walletRepo,
            {
              calculationId: preloadedCalculation.id,
              calculation: preloadedCalculation,
              wallets: preloadedWallets,
            }
          )}
        />
      );

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockToastShow).toHaveBeenCalledWith('Update Calculation Error');
    });
  });

  describe('error recovery', () => {
    it('should retry fetching when retry button is pressed after error', async () => {
      const user = userEvent.setup();
      const calculationRepo = new MockCalculationRepository();
      const walletRepo = new MockWalletRepository();
      calculationRepo.setShouldFail(true);
      walletRepo.setShouldFail(true);

      render(
        <CalculationUpdateHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          calculationUpdateUsecase={new CalculationUpdateUsecase(
            calculationRepo,
            walletRepo,
            { calculationId: 1, calculation: null, wallets: [] }
          )}
        />
      );

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Failed to Fetch Calculation' })).toBeTruthy();

      calculationRepo.setShouldFail(false);
      walletRepo.setShouldFail(false);

      await user.click(screen.getByRole('button', { name: 'Retry' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
    });
  });
});
