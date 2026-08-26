import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { FormProvider, useForm, useFieldArray } from 'react-hook-form';
import { Text } from 'tamagui';
import { TransactionCartView } from './TransactionCartView';
import type { TransactionForm } from '../../../domain';
import {
  mockCoupon,
  mockVariants,
} from '../../../../.storybook/mocks/mockData';

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
    {
      id: 2,
      variant: mockVariants[1],
      amount: 1,
      price: 40000,
      discountAmount: 4000,
      note: 'Less ice',
      coupon: { coupon: mockCoupon },
    },
  ],
  transactionCoupons: [{ coupon: mockCoupon }],
};

const TransactionCartStory = ({
  defaultValues,
  isCouponSheetOpen = false,
  serverError,
}: {
  defaultValues: TransactionForm;
  isCouponSheetOpen?: boolean;
  serverError?: string;
}) => {
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
    <FormProvider {...form}>
      <TransactionCartView
        form={form}
        isCouponSheetOpen={isCouponSheetOpen}
        onCouponSheetOpenChange={fn()}
        onItemCouponSheetOpen={fn()}
        onRemoveItemCoupon={fn()}
        TransactionCouponList={() => <Text color="$color">Coupon List Here</Text>}
        itemsFieldArray={itemsFieldArray}
        couponsFieldArray={couponsFieldArray}
        serverError={serverError}
      />
    </FormProvider>
  );
};

const meta: Meta<typeof TransactionCartView> = {
  title: 'Features/Transactions/TransactionCartView',
  component: TransactionCartView,
};

export default meta;
type Story = StoryObj<typeof TransactionCartView>;

export const Empty: Story = {
  render: () => <TransactionCartStory defaultValues={emptyValues} />,
};

export const WithItemsAndCoupon: Story = {
  render: () => <TransactionCartStory defaultValues={filledValues} />,
};

export const CouponSheetOpen: Story = {
  render: () => (
    <TransactionCartStory
      defaultValues={filledValues}
      isCouponSheetOpen={true}
    />
  ),
};

export const WithServerError: Story = {
  render: () => (
    <TransactionCartStory
      defaultValues={emptyValues}
      serverError="Failed to submit. Please try again."
    />
  ),
};
