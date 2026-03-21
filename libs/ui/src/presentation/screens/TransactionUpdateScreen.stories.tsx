import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { TransactionUpdateScreen } from './TransactionUpdateScreen';
import type { TransactionForm } from '../../domain';
import { mockWallets, mockProducts, mockTransaction } from '../../../.storybook/mocks/mockData';

const UpdateStory = () => {
  const form = useForm<TransactionForm>({
    defaultValues: {
      name: mockTransaction.name,
      orderNumber: mockTransaction.orderNumber,
      transactionItems: [],
      transactionCoupons: [],
    },
  });
  const itemsFieldArray = useFieldArray({ control: form.control, name: 'transactionItems', keyName: 'key' });
  const couponsFieldArray = useFieldArray({ control: form.control, name: 'transactionCoupons', keyName: 'key' });

  return (
    <TransactionUpdateScreen
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
    />
  );
};

const meta: Meta<typeof TransactionUpdateScreen> = {
  title: 'Screens/Transactions/TransactionUpdateScreen',
  component: TransactionUpdateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof TransactionUpdateScreen>;

export const Default: Story = { render: () => <UpdateStory /> };
