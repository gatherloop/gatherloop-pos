import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { TransactionUpdateScreen } from './TransactionUpdateScreen';
import type { TransactionForm } from '../../domain';
import { mockProducts, mockTransaction } from '../../../.storybook/mocks/mockData';

const defaultValues: TransactionForm = {
  name: mockTransaction.name,
  orderNumber: mockTransaction.orderNumber,
  transactionItems: [],
  transactionCoupons: [],
};

const UpdateStory = () => {
  return (
    <TransactionUpdateScreen
      variant={{ type: 'loaded' }}
      defaultValues={defaultValues}
      onSubmit={fn()}
      isSubmitDisabled={false}
      isSubmitting={false}
      isSubmitSuccess={false}
      onLogoutPress={fn()}
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
