import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm, useFieldArray } from 'react-hook-form';
import { useMedia, Text } from 'tamagui';
import { TransactionFormView } from './TransactionFormView';
import type { TransactionForm } from '../../../domain';
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

const Wrapper = ({ defaultValues }: { defaultValues: TransactionForm }) => {
  const form = useForm<TransactionForm>({ defaultValues });
  const itemsFieldArray = useFieldArray({
    control: form.control,
    name: 'transactionItems',
    keyName: 'key',
  });
  const couponsFieldArray = useFieldArray({
    control: form.control,
    name: 'transactionCoupons',
    keyName: 'key',
  });

  return (
    <TransactionFormView
      form={form}
      onSubmit={jest.fn()}
      isCouponSheetOpen={false}
      onCouponSheetOpenChange={jest.fn()}
      onItemCouponSheetOpen={jest.fn()}
      onRemoveItemCoupon={jest.fn()}
      isSubmitDisabled={false}
      isSubmitting={false}
      TransactionItemSelect={() => <Text color="$color">Product Picker</Text>}
      TransactionCouponList={() => null}
      itemsFieldArray={itemsFieldArray}
      couponsFieldArray={couponsFieldArray}
    />
  );
};

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
  });
});
