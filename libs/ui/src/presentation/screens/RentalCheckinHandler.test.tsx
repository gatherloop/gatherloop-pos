import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RentalCheckinHandler } from './RentalCheckinHandler';
import {
  MockAuthRepository,
  MockProductRepository,
  MockRentalRepository,
  MockVariantRepository,
} from '../../data/mock';
import {
  AuthLogoutUsecase,
  RentalCheckinUsecase,
  TransactionItemSelectUsecase,
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
    productShouldFail?: boolean;
    rentalShouldFail?: boolean;
  } = {}
) => {
  const rentalRepo = new MockRentalRepository();
  const productRepo = new MockProductRepository();
  const variantRepo = new MockVariantRepository();

  if (options.productShouldFail) productRepo.setShouldFail(true);
  if (options.rentalShouldFail) rentalRepo.setShouldFail(true);

  return {
    authLogoutUsecase: new AuthLogoutUsecase(new MockAuthRepository()),
    rentalCheckinUsecase: new RentalCheckinUsecase(rentalRepo),
    transactionItemSelectUsecase: new TransactionItemSelectUsecase(
      productRepo,
      variantRepo,
      { products: [], totalItem: 0 }
    ),
  };
};

describe('RentalCheckinHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await act(async () => {
      await flushPromises();
    });
  });

  describe('loading and data states', () => {
    it('should show product loading state initially', async () => {
      render(<RentalCheckinHandler {...createProps()} />);
      expect(screen.getByText('Fetching Products...')).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });

    it('should show product list after successful fetch', async () => {
      render(<RentalCheckinHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Product 1' })).toBeTruthy();
      expect(screen.getByRole('heading', { name: 'Product 2' })).toBeTruthy();
    });

    it('should show error state when product fetch fails', async () => {
      render(
        <RentalCheckinHandler {...createProps({ productShouldFail: true })} />
      );

      await act(async () => {
        await flushPromises();
      });

      expect(
        screen.getByRole('heading', { name: 'Failed to Fetch Products' })
      ).toBeTruthy();
    });
  });

  describe('form fields', () => {
    it('should show customer name input field', async () => {
      render(<RentalCheckinHandler {...createProps()} />);
      expect(screen.getByRole('textbox', { name: 'Customer Name' })).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });

    it('should show submit button', async () => {
      render(<RentalCheckinHandler {...createProps()} />);
      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
      await act(async () => {
        await flushPromises();
      });
    });
  });

  describe('form validation', () => {
    it('should show error message when customer name is empty on submit', async () => {
      const user = userEvent.setup();
      render(<RentalCheckinHandler {...createProps()} />);

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(
        screen.getByText('String must contain at least 1 character(s)')
      ).toBeTruthy();
    });

    it('should not navigate when form validation fails', async () => {
      const user = userEvent.setup();
      render(<RentalCheckinHandler {...createProps()} />);

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });

  describe('navigation', () => {
    it('should navigate to "/rentals" after successful checkin', async () => {
      const user = userEvent.setup();
      render(<RentalCheckinHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      // Select a product to add a rental item (required by form validation)
      // Use fireEvent to directly trigger the click which bubbles to the XStack's onClick
      await act(async () => {
        fireEvent.click(screen.getByRole('heading', { name: 'Product 1' }));
      });

      await act(async () => {
        await flushPromises();
      });

      // Dialog is open — click the first Submit (inside dialog, before the form's Submit)
      await user.click(screen.getAllByRole('button', { name: 'Submit' })[0]);

      await act(async () => {
        await flushPromises();
      });

      // Fill in the rental code (required by form validation: code.min(1))
      const codeInput = screen.getByPlaceholderText('Code');
      await user.type(codeInput, 'RENTAL001');

      const nameInput = screen.getByRole('textbox', { name: 'Customer Name' });
      await user.type(nameInput, 'John Doe');

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).toHaveBeenCalledWith('/rentals');
    });

    it('should not navigate without user interaction', async () => {
      render(<RentalCheckinHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(mockRouterPush).not.toHaveBeenCalled();
    });
  });

  describe('toast notifications', () => {
    it('should show success toast after successful checkin', async () => {
      const user = userEvent.setup();
      render(<RentalCheckinHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      // Select a product to add a rental item (required by form validation)
      await act(async () => {
        fireEvent.click(screen.getByRole('heading', { name: 'Product 1' }));
      });

      await act(async () => {
        await flushPromises();
      });

      // Dialog is open — click the first Submit (inside dialog)
      await user.click(screen.getAllByRole('button', { name: 'Submit' })[0]);

      await act(async () => {
        await flushPromises();
      });

      // Fill in the rental code (required by form validation: code.min(1))
      const codeInput1 = screen.getByPlaceholderText('Code');
      await user.type(codeInput1, 'RENTAL001');

      const nameInput1 = screen.getByRole('textbox', { name: 'Customer Name' });
      await user.type(nameInput1, 'John Doe');

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockToastShow).toHaveBeenCalledWith('Checkin Rental Success');
    });

    it('should show error toast when checkin fails', async () => {
      const user = userEvent.setup();
      render(<RentalCheckinHandler {...createProps({ rentalShouldFail: true })} />);

      await act(async () => {
        await flushPromises();
      });

      // Select a product to add a rental item (required by form validation)
      await act(async () => {
        fireEvent.click(screen.getByRole('heading', { name: 'Product 1' }));
      });

      await act(async () => {
        await flushPromises();
      });

      // Dialog is open — click the first Submit (inside dialog)
      await user.click(screen.getAllByRole('button', { name: 'Submit' })[0]);

      await act(async () => {
        await flushPromises();
      });

      // Fill in the rental code (required by form validation: code.min(1))
      const codeInput2 = screen.getByPlaceholderText('Code');
      await user.type(codeInput2, 'RENTAL001');

      const nameInput2 = screen.getByRole('textbox', { name: 'Customer Name' });
      await user.type(nameInput2, 'John Doe');

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(mockToastShow).toHaveBeenCalledWith('Checkin Rental Error');
    });
  });

  describe('error banner', () => {
    it('should show error banner when checkin fails', async () => {
      const user = userEvent.setup();
      render(<RentalCheckinHandler {...createProps({ rentalShouldFail: true })} />);

      await act(async () => {
        await flushPromises();
      });

      await act(async () => {
        fireEvent.click(screen.getByRole('heading', { name: 'Product 1' }));
      });

      await act(async () => {
        await flushPromises();
      });

      await user.click(screen.getAllByRole('button', { name: 'Submit' })[0]);

      await act(async () => {
        await flushPromises();
      });

      const codeInput = screen.getByPlaceholderText('Code');
      await user.type(codeInput, 'RENTAL001');

      const nameInput = screen.getByRole('textbox', { name: 'Customer Name' });
      await user.type(nameInput, 'John Doe');

      await user.click(screen.getByRole('button', { name: 'Submit' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByText('Failed to submit. Please try again.')).toBeTruthy();
    });

    it('should not show error banner before any submission', async () => {
      render(<RentalCheckinHandler {...createProps()} />);

      await act(async () => {
        await flushPromises();
      });

      expect(screen.queryByText('Failed to submit. Please try again.')).toBeNull();
    });
  });

  describe('error recovery', () => {
    it('should refetch products when retry button is pressed', async () => {
      const user = userEvent.setup();
      const productRepo = new MockProductRepository();
      productRepo.setShouldFail(true);

      render(
        <RentalCheckinHandler
          authLogoutUsecase={new AuthLogoutUsecase(new MockAuthRepository())}
          rentalCheckinUsecase={new RentalCheckinUsecase(new MockRentalRepository())}
          transactionItemSelectUsecase={new TransactionItemSelectUsecase(
            productRepo,
            new MockVariantRepository(),
            { products: [], totalItem: 0 }
          )}
        />
      );

      await act(async () => {
        await flushPromises();
      });

      expect(
        screen.getByRole('heading', { name: 'Failed to Fetch Products' })
      ).toBeTruthy();

      productRepo.setShouldFail(false);

      await user.click(screen.getByRole('button', { name: 'Retry' }));

      await act(async () => {
        await flushPromises();
      });

      expect(screen.getByRole('heading', { name: 'Product 1' })).toBeTruthy();
    });
  });
});
