import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Text } from 'tamagui';
import { TransactionFormView } from './TransactionFormView';
import type { TransactionForm } from '../../../domain';
import { mockCoupon, mockCoupons, mockVariant, mockVariants } from '../../../../.storybook/mocks/mockData';

const defaultValues: TransactionForm = {
  name: 'Order #001',
  orderNumber: 1,
  transactionItems: [],
  transactionCoupons: [],
};

const mobileDefaultValues: TransactionForm = {
  name: 'Order #002',
  orderNumber: 2,
  transactionItems: [
    {
      id: 1,
      variant: {
        ...mockVariant,
        name: 'Deluxe Iced Caramel Macchiato with Extra Whipped Cream - Large',
      },
      amount: 2,
      price: 35000,
      discountAmount: 0,
      note: '',
      coupon: { id: 1, coupon: mockCoupon },
    },
    {
      id: 2,
      variant: mockVariants[1],
      amount: 1,
      price: 40000,
      discountAmount: 4000,
      note: 'Extra hot, less ice',
    },
    {
      id: 3,
      variant: mockVariant,
      amount: 3,
      price: 35000,
      discountAmount: 0,
      note: '',
    },
  ],
  transactionCoupons: [{ id: 1, coupon: mockCoupons[1] }],
};

const TransactionFormStory = ({
  values = defaultValues,
}: {
  values?: TransactionForm;
}) => {
  const form = useForm<TransactionForm>({ defaultValues: values });
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
      onSubmit={fn()}
      isCouponSheetOpen={false}
      onCouponSheetOpenChange={fn()}
      onItemCouponSheetOpen={fn()}
      onRemoveItemCoupon={fn()}
      isSubmitDisabled={false}
      TransactionItemSelect={() => <Text color="$color">+ Add Item</Text>}
      TransactionCouponList={() => null}
      itemsFieldArray={itemsFieldArray}
      couponsFieldArray={couponsFieldArray}
    />
  );
};

const CouponSheetOpenStory = () => {
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
      onSubmit={fn()}
      isCouponSheetOpen={true}
      onCouponSheetOpenChange={fn()}
      onItemCouponSheetOpen={fn()}
      onRemoveItemCoupon={fn()}
      isSubmitDisabled={false}
      TransactionItemSelect={() => <Text color="$color">+ Add Item</Text>}
      TransactionCouponList={() => <Text color="$color">Coupon List Here</Text>}
      itemsFieldArray={itemsFieldArray}
      couponsFieldArray={couponsFieldArray}
    />
  );
};

const meta: Meta<typeof TransactionFormView> = {
  title: 'Features/Transactions/TransactionFormView',
  component: TransactionFormView,
};

export default meta;
type Story = StoryObj<typeof TransactionFormView>;

export const Default: Story = {
  render: () => <TransactionFormStory />,
};

export const CouponSheetOpen: Story = {
  render: () => <CouponSheetOpenStory />,
};

// Phase 5 of docs/prd-transaction-mobile-ux.md (FR-5): at 360px the picker and
// summary card stack full-width, item rows wrap instead of truncating product
// names, and the amount stepper stays a usable touch target. Covers 3 items
// (one with an item coupon) plus one order coupon.
export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
  render: () => <TransactionFormStory values={mobileDefaultValues} />,
};
