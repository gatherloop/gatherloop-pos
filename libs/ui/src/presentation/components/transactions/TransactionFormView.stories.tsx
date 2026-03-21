import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Text } from 'tamagui';
import { TransactionFormView } from './TransactionFormView';
import type { TransactionForm } from '../../../domain';

const defaultValues: TransactionForm = {
  name: 'Order #001',
  orderNumber: 1,
  transactionItems: [],
  transactionCoupons: [],
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
