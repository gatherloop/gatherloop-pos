import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RentalListHandler } from './RentalListHandler';
import {
  MockAuthRepository,
  MockRentalListQueryRepository,
  MockRentalRepository,
} from '../../data/mock';
import {
  AuthLogoutUsecase,
  RentalDeleteUsecase,
  RentalListUsecase,
} from '../../domain';
import { flushPromises } from '../../utils/testUtils';

jest.mock('solito/router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
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
    rentalListUsecase: new RentalListUsecase(
      rentalRepo,
      new MockRentalListQueryRepository(),
      { rentals: [], totalItem: 0 }
    ),
    rentalDeleteUsecase: new RentalDeleteUsecase(rentalRepo),
  };
};

/** Returns a RentalRepository with checkinAt set to now so canDelete is true */
const createRecentRentalRepo = () => {
  const rentalRepo = new MockRentalRepository();
  rentalRepo.rentals = rentalRepo.rentals.map((r) => ({
    ...r,
    checkinAt: new Date().toISOString(),
  }));
  return rentalRepo;
};

describe('RentalListHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('loading and data states', () => {
    it('should show loading state initially', () => {
      render(<RentalListHandler {...createProps()} />);
      expect(screen.getByText('Fetching Rentals...')).toBeTruthy();
    });

    it('should show rental list after successful fetch', async () => {
      render(<RentalListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByText('Rental 1')).toBeTruthy();
      expect(screen.getByText('Rental 2')).toBeTruthy();
    });

    it('should show error state when fetch fails', async () => {
      render(<RentalListHandler {...createProps({ shouldFail: true })} />);

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

      render(<RentalListHandler {...createProps({ rentalRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(
        screen.getByRole('heading', { name: 'Oops, Rental is Empty' })
      ).toBeTruthy();
    });
  });

  describe('delete modal', () => {
    it('should not show delete modal initially', async () => {
      render(<RentalListHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByText('Delete Rental')).toBeNull();
    });

    it('should show delete modal when delete menu is pressed', async () => {
      const user = userEvent.setup();
      const rentalRepo = createRecentRentalRepo();

      render(<RentalListHandler {...createProps({ rentalRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      const deleteMenuItems = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteMenuItems[0]);

      expect(screen.getByText('Delete Rental')).toBeTruthy();
    });

    it('should hide delete modal when cancel is pressed', async () => {
      const user = userEvent.setup();
      const rentalRepo = createRecentRentalRepo();

      render(<RentalListHandler {...createProps({ rentalRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      const deleteMenuItems = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteMenuItems[0]);
      expect(screen.getByText('Delete Rental')).toBeTruthy();

      await user.click(screen.getByRole('button', { name: 'No' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByText('Delete Rental')).toBeNull();
    });

    it('should refetch rental list after successful delete', async () => {
      const user = userEvent.setup();
      const rentalRepo = createRecentRentalRepo();

      render(<RentalListHandler {...createProps({ rentalRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByText('Rental 1')).toBeTruthy();
      expect(screen.getByText('Rental 2')).toBeTruthy();

      const deleteMenuItems = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteMenuItems[0]);

      await user.click(screen.getByRole('button', { name: 'Yes' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByText('Delete Rental')).toBeNull();
      // After deleting one rental, only one remains
      expect(screen.getAllByText(/Rental [12]/).length).toBe(1);
    });

    it('should show toast after successful delete', async () => {
      const user = userEvent.setup();
      const rentalRepo = createRecentRentalRepo();

      render(<RentalListHandler {...createProps({ rentalRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      const deleteMenuItems = screen.getAllByRole('button', { name: 'Delete' });
      await user.click(deleteMenuItems[0]);
      await user.click(screen.getByRole('button', { name: 'Yes' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockToastShow).toHaveBeenCalledWith('Delete Rental Success');
    });
  });

  describe('error recovery', () => {
    it('should refetch rentals when retry button is pressed', async () => {
      const user = userEvent.setup();
      const rentalRepo = new MockRentalRepository();
      rentalRepo.setShouldFail(true);

      render(<RentalListHandler {...createProps({ rentalRepo })} />);

      await act(async () => {
        await flushPromises();
      });

      expect(
        screen.getByRole('heading', { name: 'Failed to Fetch Rentals' })
      ).toBeTruthy();

      rentalRepo.setShouldFail(false);

      await user.click(screen.getByRole('button', { name: 'Retry' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByText('Rental 1')).toBeTruthy();
    });
  });
});
