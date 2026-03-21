import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Text } from 'tamagui';
import { TransactionCreateScreen } from './TransactionCreateScreen';
import type { TransactionForm } from '../../domain';
import { mockWallet, mockWallets, mockProducts } from '../../../.storybook/mocks/mockData';

const defaultValues: TransactionForm = {
  name: 'Order #001',
  orderNumber: 1,
  transactionItems: [],
  transactionCoupons: [],
};

const CreateStory = () => {
  const form = useForm<TransactionForm>({ defaultValues });
  const itemsFieldArray = useFieldArray({ control: form.control, name: 'transactionItems', keyName: 'key' });
  const couponsFieldArray = useFieldArray({ control: form.control, name: 'transactionCoupons', keyName: 'key' });
  const payForm = useForm({ defaultValues: { wallet: mockWallet, paidAmount: 0 } });

  return (
    <TransactionCreateScreen
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={false}
      onLogoutPress={fn()}
      isCouponSheetOpen={false}
      onCouponSheetOpenChange={fn()}
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
        isOpen: false,
        onSubmit: fn(),
        transactionTotal: 0,
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
