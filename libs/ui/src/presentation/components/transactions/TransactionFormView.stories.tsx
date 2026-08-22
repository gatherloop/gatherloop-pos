import type { Meta, StoryObj } from '@storybook/react';
import { fn, userEvent, within } from '@storybook/test';
import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Text } from 'tamagui';
import { TransactionFormView } from './TransactionFormView';
import type { TransactionForm } from '../../../domain';
import { mockVariants } from '../../../../.storybook/mocks/mockData';

const defaultValues: TransactionForm = {
  name: 'Order #001',
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

const TransactionFormStory = ({
  values = defaultValues,
}: {
  values?: TransactionForm;
} = {}) => {
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
      isSubmitting={false}
      isSubmitSuccess={false}
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
      isSubmitting={false}
      isSubmitSuccess={false}
      TransactionItemSelect={() => <Text color="$color">+ Add Item</Text>}
      TransactionCouponList={() => <Text color="$color">Coupon List Here</Text>}
      itemsFieldArray={itemsFieldArray}
      couponsFieldArray={couponsFieldArray}
    />
  );
};

// PRD FR-5: on compact, applying a coupon swaps the cart sheet's own content
// to the coupon list with a back header, instead of opening a second sheet.
// Stateful (unlike the other stories) so the `play` interaction below can
// drive the real open-cart -> add-coupon flow.
const CompactCouponSwapStory = () => {
  const form = useForm<TransactionForm>({ defaultValues: filledValues });
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
  const [isCouponSheetOpen, setIsCouponSheetOpen] = useState(false);
  return (
    <TransactionFormView
      form={form}
      onSubmit={fn()}
      isCouponSheetOpen={isCouponSheetOpen}
      onCouponSheetOpenChange={setIsCouponSheetOpen}
      onItemCouponSheetOpen={() => setIsCouponSheetOpen(true)}
      onRemoveItemCoupon={fn()}
      isSubmitDisabled={false}
      isSubmitting={false}
      isSubmitSuccess={false}
      TransactionItemSelect={() => <Text color="$color">+ Add Item</Text>}
      TransactionCouponList={() => (
        <Text color="$color">Coupon List Here</Text>
      )}
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

// Compact layout (PRD FR-3): at ≤800px the picker fills the screen and the
// cart moves into a sheet behind a floating button.
export const CompactEmptyCart: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
  render: () => <TransactionFormStory />,
};

export const CompactWithItems: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
  render: () => <TransactionFormStory values={filledValues} />,
};

export const CompactCouponSheetOpen: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
  render: () => <CompactCouponSwapStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText(/View Cart/));
    await userEvent.click(canvas.getByRole('button', { name: 'Add Coupon' }));
  },
};
