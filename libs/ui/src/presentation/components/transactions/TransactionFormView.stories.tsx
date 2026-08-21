import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Text } from 'tamagui';
import { TransactionFormView } from './TransactionFormView';
import type { TransactionForm } from '../../../domain';
import {
  mockVariant,
  mockVariants,
  mockCoupon,
  mockCoupons,
} from '../../../../.storybook/mocks/mockData';

const defaultValues: TransactionForm = {
  name: 'Order #001',
  orderNumber: 1,
  transactionItems: [],
  transactionCoupons: [],
};

const threeItemsWithCouponsDefaultValues: TransactionForm = {
  name: 'Order #001',
  orderNumber: 1,
  transactionItems: [
    {
      variant: mockVariant,
      amount: 2,
      price: mockVariant.price,
      discountAmount: 3500,
      note: '',
      coupon: { coupon: mockCoupon },
    },
    {
      variant: mockVariants[1],
      amount: 1,
      price: mockVariants[1].price,
      discountAmount: 0,
      note: '',
    },
    {
      variant: mockVariant,
      amount: 3,
      price: mockVariant.price,
      discountAmount: 0,
      note: '',
    },
  ],
  transactionCoupons: [{ coupon: mockCoupons[1] }],
};

const TransactionFormStory = () => {
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

const MobileThreeItemsWithCouponsStory = () => {
  const form = useForm<TransactionForm>({
    defaultValues: threeItemsWithCouponsDefaultValues,
  });
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
// summary card stack full-width, item rows wrap instead of truncating the
// product name, and the amount stepper/subtotal sit on their own row.
export const MobileThreeItemsWithCoupons: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
  render: () => <MobileThreeItemsWithCouponsStory />,
};
