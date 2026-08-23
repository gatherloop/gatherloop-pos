import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Text } from 'tamagui';
import { TransactionCreateScreen } from './TransactionCreateScreen';
import type { TransactionForm } from '../../domain';
import {
  mockWallet,
  mockWallets,
  mockProducts,
  mockVariants,
} from '../../../.storybook/mocks/mockData';

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

const CreateStory = ({
  values = defaultValues,
  isSubmitSuccess = false,
  isPaymentAlertOpen = false,
}: {
  values?: TransactionForm;
  isSubmitSuccess?: boolean;
  isPaymentAlertOpen?: boolean;
} = {}) => {
  const form = useForm<TransactionForm>({ defaultValues: values });
  const itemsFieldArray = useFieldArray({ control: form.control, name: 'transactionItems', keyName: 'key' });
  const couponsFieldArray = useFieldArray({ control: form.control, name: 'transactionCoupons', keyName: 'key' });
  const payForm = useForm({ defaultValues: { wallet: mockWallet, paidAmount: 0 } });

  return (
    <TransactionCreateScreen
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={false}
      isSubmitting={false}
      isSubmitSuccess={isSubmitSuccess}
      onLogoutPress={fn()}
      isCouponSheetOpen={false}
      onCouponSheetOpenChange={fn()}
      onItemCouponSheetOpen={fn()}
      onRemoveItemCoupon={fn()}
      itemsFieldArray={itemsFieldArray}
      couponsFieldArray={couponsFieldArray}
      transactionItemSelect={{
        amount: 1,
        currentPage: 1,
        itemPerPage: 10,
        onAmountChange: fn(),
        onOptionValuesChange: fn(),
        onPageChange: fn(),
        onRetryButtonPress: fn(),
        onSearchValueChange: fn(),
        onSelectProduct: fn(),
        onSubmit: fn(),
        onUnselectProduct: fn(),
        products: mockProducts,
        searchValue: '',
        selectedOptionValues: [],
        totalItem: mockProducts.length,
        variant: { type: 'loaded' },
      }}
      couponList={{
        onItemPress: fn(),
        onRetryButtonPress: fn(),
        variant: { type: 'empty' },
      }}
      transactionPayment={{
        form: payForm,
        isButtonDisabled: false,
        onCancel: fn(),
        isOpen: isPaymentAlertOpen,
        onSubmit: fn(),
        transactionTotal: 70000,
        walletSelectOptions: mockWallets.map((w) => ({ label: w.name, value: w })),
      }}
    />
  );
};

const meta: Meta<typeof TransactionCreateScreen> = {
  title: 'Screens/Transactions/TransactionCreateScreen',
  component: TransactionCreateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof TransactionCreateScreen>;

export const Default: Story = { render: () => <CreateStory /> };

// PRD FR-7: a successful submit closes the compact cart sheet before the
// payment alert opens on top of it — no `AlertDialog` stacked over a
// `Sheet` at a conflicting z-index.
export const CompactSubmitSuccessWithPayment: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
  render: () => (
    <CreateStory
      values={filledValues}
      isSubmitSuccess={true}
      isPaymentAlertOpen={true}
    />
  ),
};
