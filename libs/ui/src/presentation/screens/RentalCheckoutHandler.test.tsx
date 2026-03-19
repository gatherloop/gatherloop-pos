import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RentalCheckoutHandler } from './RentalCheckoutHandler';
import {
  MockAuthRepository,
  MockRentalListQueryRepository,
  MockRentalRepository,
} from '../../data/mock';
import {
  AuthLogoutUsecase,
  RentalCheckoutUsecase,
  RentalListUsecase,
} from '../../domain';
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
    rentalRepo?: MockRentalRepository;
    shouldFail?: boolean;
  } = {}
) => {
  const rentalRepo = options.rentalRepo ?? new MockRentalRepository();
  if (options.shouldFail) rentalRepo.setShouldFail(true);

  return {
    authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
    rentalCheckoutUsecase: new RentalCheckoutUsecase(rentalRepo),
    rentalListUsecase: new RentalListUsecase(
      rentalRepo,
      new MockRentalListQueryRepository(),
      { rentals: [], totalItem: 0 }
    ),
  };
};

describe('RentalCheckoutHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading and data states', () => {
    it('should show rental list after successful fetch', async () => {
      render(<RentalCheckoutHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByText('Rental 1')).toBeTruthy();
      expect(screen.getByText('Rental 2')).toBeTruthy();
    });

    it('should show error state when rental fetch fails', async () => {
      // Clear rentals so changingParams dispatches FETCH (not REVALIDATE), enabling error state
      const rentalRepo = new MockRentalRepository();
      rentalRepo.rentals = [];
      rentalRepo.setShouldFail(true);

      render(<RentalCheckoutHandler {...createProps({ rentalRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(
        screen.getByRole('heading', { name: 'Failed to Fetch Rentals' })
      ).toBeTruthy();
    });

    it('should show empty state when no rentals exist', async () => {
      const rentalRepo = new MockRentalRepository();
      rentalRepo.rentals = [];

      render(<RentalCheckoutHandler {...createProps({ rentalRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(
        screen.getByRole('heading', { name: 'Oops, Rental is Empty' })
      ).toBeTruthy();
    });
  });

  describe('form', () => {
    it('should show submit button', () => {
      render(<RentalCheckoutHandler {...createProps()} />);
      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
    });
  });

  describe('navigation', () => {
    it('should navigate to "/transactions/{transactionId}" after successful checkout', async () => {
      const user = userEvent.setup();
      render(<RentalCheckoutHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      // Press a rental item to add it to the checkout form
      await user.click(screen.getByText('Rental 1'));

      await act(async () => {
        await flushPromises();
      });

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      // MockRentalRepository.checkoutRentals returns { transactionId: 1 }
      expect(mockRouterPush).toHaveBeenCalledWith('/transactions/1');
    });

    it('should not navigate without user interaction', async () => {
      render(<RentalCheckoutHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });

    it('should not navigate when checkout fails', async () => {
      const user = userEvent.setup();
      const rentalRepo = new MockRentalRepository();

      render(
        <RentalCheckoutHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          rentalCheckoutUsecase={new RentalCheckoutUsecase(rentalRepo)}
          rentalListUsecase={new RentalListUsecase(
            rentalRepo,
            new MockRentalListQueryRepository(),
            { rentals: [], totalItem: 0 }
          )}
        />
      );

      await act(async () => {
        await flushPromises();
      });

      await user.click(screen.getByText('Rental 1'));

      await act(async () => {
        await flushPromises();
      });

      rentalRepo.setShouldFail(true);

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });

  describe('toast notifications', () => {
    it('should show success toast after successful checkout', async () => {
      const user = userEvent.setup();
      render(<RentalCheckoutHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      await user.click(screen.getByText('Rental 1'));

      await act(async () => {
        await flushPromises();
      });

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockToastShow).toHaveBeenCalledWith('Checkout Rental Success');
    });

    it('should show error toast when checkout fails', async () => {
      const user = userEvent.setup();
      const rentalRepo = new MockRentalRepository();

      render(
        <RentalCheckoutHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          rentalCheckoutUsecase={new RentalCheckoutUsecase(rentalRepo)}
          rentalListUsecase={new RentalListUsecase(
            rentalRepo,
            new MockRentalListQueryRepository(),
            { rentals: [], totalItem: 0 }
          )}
        />
      );

      await act(async () => {
        await flushPromises();
      });

      await user.click(screen.getByText('Rental 1'));

      await act(async () => {
        await flushPromises();
      });

      rentalRepo.setShouldFail(true);

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockToastShow).toHaveBeenCalledWith('Checkout Rental Error');
    });
  });

  describe('error recovery', () => {
    it('should refetch rentals when retry button is pressed', async () => {
      const user = userEvent.setup();
      // Clear rentals so changingParams dispatches FETCH, enabling error state
      const rentalRepo = new MockRentalRepository();
      rentalRepo.rentals = [];
      rentalRepo.setShouldFail(true);

      render(<RentalCheckoutHandler {...createProps({ rentalRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(
        screen.getByRole('heading', { name: 'Failed to Fetch Rentals' })
      ).toBeTruthy();

      // Restore rentals and clear failure flag before retrying
      rentalRepo.reset();
      rentalRepo.setShouldFail(false);

      await user.click(screen.getByRole('button', { name: 'Retry' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByText('Rental 1')).toBeTruthy();
    });
  });
});
