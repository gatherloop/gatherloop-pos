import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useMedia, Text, Button } from 'tamagui';
import { TransactionFormView } from './TransactionFormView';
import type { Coupon, TransactionForm } from '../../../domain';
import { mockVariants } from '../../../../.storybook/mocks/mockData';

const emptyValues: TransactionForm = {
  name: '',
  orderNumber: 1,
  transactionItems: [],
  transactionCoupons: [],
};

const filledValues: TransactionForm = {
  name: 'Order #001',
  orderNumber: 1,
  transactionItems: [
    {
      id: 1,
      variant: mockVariants[0],
      amount: 2,
      price: 35000,
      discountAmount: 0,
      note: '',
    },
  ],
  transactionCoupons: [],
};

const Wrapper = ({
  defaultValues,
  isSubmitSuccess = false,
}: {
  defaultValues: TransactionForm;
  isSubmitSuccess?: boolean;
}) => (
  <TransactionFormView
    variant={{ type: 'loaded' }}
    defaultValues={defaultValues}
    onSubmit={jest.fn()}
    isSubmitDisabled={false}
    isSubmitting={false}
    isSubmitSuccess={isSubmitSuccess}
    TransactionItemSelect={() => <Text color="$color">Product Picker</Text>}
    TransactionCouponList={() => null}
  />
);

const mockCoupon: Coupon = {
  id: 1,
  code: 'WELCOME10',
  type: 'fixed',
  amount: 5000,
  createdAt: '2024-01-01T00:00:00.000Z',
};

const StatefulWrapper = ({
  defaultValues,
}: {
  defaultValues: TransactionForm;
}) => (
  <TransactionFormView
    variant={{ type: 'loaded' }}
    defaultValues={defaultValues}
    onSubmit={jest.fn()}
    isSubmitDisabled={false}
    isSubmitting={false}
    isSubmitSuccess={false}
    TransactionItemSelect={() => <Text color="$color">Product Picker</Text>}
    TransactionCouponList={(onItemPress) => (
      <Button onPress={() => onItemPress(mockCoupon)}>WELCOME10</Button>
    )}
  />
);

describe('TransactionFormView', () => {
  afterEach(() => {
    (useMedia as jest.Mock).mockReturnValue({});
  });

  describe('desktop layout (media.sm undefined)', () => {
    it('renders the picker, cart body and Submit inline with no cart button', () => {
      render(<Wrapper defaultValues={emptyValues} />);

      expect(screen.getByText('Product Picker')).toBeTruthy();
      expect(
        screen.getByRole('textbox', { name: 'Customer Name' })
      ).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
      expect(screen.queryByText(/View Cart/)).toBeNull();
    });
  });

  describe('compact layout (media.sm true)', () => {
    beforeEach(() => {
      (useMedia as jest.Mock).mockReturnValue({ sm: true });
    });

    it('shows only the product picker when the cart is empty', () => {
      render(<Wrapper defaultValues={emptyValues} />);

      expect(screen.getByText('Product Picker')).toBeTruthy();
      expect(
        screen.queryByRole('textbox', { name: 'Customer Name' })
      ).toBeNull();
      expect(
        screen.queryByRole('textbox', { name: 'Order Number' })
      ).toBeNull();
      expect(screen.queryByRole('button', { name: 'Submit' })).toBeNull();
      expect(screen.queryByText(/View Cart/)).toBeNull();
    });

    it('shows the cart button with the item count and total once an item exists', () => {
      render(<Wrapper defaultValues={filledValues} />);

      expect(screen.getByText(/1 item · Rp 70.000 · View Cart/)).toBeTruthy();
    });

    it('opens the cart sheet with the full cart body and Submit when the button is pressed', async () => {
      const user = userEvent.setup();
      render(<Wrapper defaultValues={filledValues} />);

      await user.click(screen.getByText(/View Cart/));

      expect(
        screen.getByRole('textbox', { name: 'Customer Name' })
      ).toBeTruthy();
      expect(
        screen.getByRole('textbox', { name: 'Order Number' })
      ).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
    });

    it('closes the cart sheet when the close control is pressed', async () => {
      const user = userEvent.setup();
      render(<Wrapper defaultValues={filledValues} />);

      await user.click(screen.getByText(/View Cart/));
      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();

      await user.click(screen.getByRole('button', { name: 'Close Cart' }));
      expect(screen.queryByRole('button', { name: 'Submit' })).toBeNull();
    });

    it('swaps the sheet content to the coupon list when the Coupons Add button is pressed, with no second sheet', async () => {
      const user = userEvent.setup();
      render(<StatefulWrapper defaultValues={filledValues} />);

      await user.click(screen.getByText(/View Cart/));
      await user.click(screen.getByRole('button', { name: 'Add Coupon' }));

      expect(screen.getByText('WELCOME10')).toBeTruthy();
      expect(
        screen.getByRole('button', { name: 'Back to Cart' })
      ).toBeTruthy();
      expect(
        screen.queryByRole('textbox', { name: 'Customer Name' })
      ).toBeNull();
      expect(screen.queryByRole('button', { name: 'Submit' })).toBeNull();
      // Exactly one sheet header renders at a time — "Cart" is gone while
      // the coupon list is showing, proving the content swapped in place
      // rather than a second sheet mounting on top.
      expect(screen.queryByText('Cart')).toBeNull();
    });

    it('swaps the sheet content to the coupon list when an item-level Apply Coupon is pressed', async () => {
      const user = userEvent.setup();
      render(<StatefulWrapper defaultValues={filledValues} />);

      await user.click(screen.getByText(/View Cart/));
      await user.click(screen.getByRole('button', { name: 'Apply Coupon' }));

      expect(screen.getByText('WELCOME10')).toBeTruthy();
      expect(
        screen.getByRole('button', { name: 'Back to Cart' })
      ).toBeTruthy();
    });

    it('returns to the cart content when Back to Cart is pressed', async () => {
      const user = userEvent.setup();
      render(<StatefulWrapper defaultValues={filledValues} />);

      await user.click(screen.getByText(/View Cart/));
      await user.click(screen.getByRole('button', { name: 'Add Coupon' }));
      await user.click(screen.getByRole('button', { name: 'Back to Cart' }));

      expect(
        screen.getByRole('textbox', { name: 'Customer Name' })
      ).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
      expect(screen.queryByText('WELCOME10')).toBeNull();
    });

    it('returns to the cart content after selecting a coupon', async () => {
      const user = userEvent.setup();
      render(<StatefulWrapper defaultValues={filledValues} />);

      await user.click(screen.getByText(/View Cart/));
      await user.click(screen.getByRole('button', { name: 'Add Coupon' }));
      await user.click(screen.getByText('WELCOME10'));

      expect(
        screen.getByRole('textbox', { name: 'Customer Name' })
      ).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();
    });
  });

  describe('close-on-success (PRD FR-7)', () => {
    beforeEach(() => {
      (useMedia as jest.Mock).mockReturnValue({ sm: true });
    });

    it('closes the cart sheet once isSubmitSuccess flips to true', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <Wrapper defaultValues={filledValues} isSubmitSuccess={false} />
      );

      await user.click(screen.getByText(/View Cart/));
      expect(screen.getByRole('button', { name: 'Submit' })).toBeTruthy();

      rerender(
        <Wrapper defaultValues={filledValues} isSubmitSuccess={true} />
      );

      expect(screen.queryByRole('button', { name: 'Submit' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Close Cart' })).toBeNull();
    });

    it('does not open the sheet on its own when isSubmitSuccess is already true on mount', () => {
      render(<Wrapper defaultValues={filledValues} isSubmitSuccess={true} />);

      expect(screen.queryByRole('button', { name: 'Submit' })).toBeNull();
      expect(screen.getByText(/View Cart/)).toBeTruthy();
    });
  });
});
