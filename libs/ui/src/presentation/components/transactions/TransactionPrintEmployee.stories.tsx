import type { Meta, StoryObj } from '@storybook/react';
import { TransactionPrintEmployee } from './TransactionPrintEmployee';
import { mockTransaction } from '../../../../.storybook/mocks/mockData';

const meta: Meta<typeof TransactionPrintEmployee> = {
  title: 'Features/Transactions/TransactionPrintEmployee',
  component: TransactionPrintEmployee,
  args: {
    id: mockTransaction.id,
    name: mockTransaction.name,
    createdAt: mockTransaction.createdAt,
    transactionItems: mockTransaction.transactionItems,
  },
};

export default meta;
type Story = StoryObj<typeof TransactionPrintEmployee>;

export const Default: Story = {};

export const MultipleItems: Story = {
  args: {
    transactionItems: [
      ...mockTransaction.transactionItems,
      {
        id: 2,
        variant: {
          ...mockTransaction.transactionItems[0].variant,
          id: 2,
          name: 'Samsung Galaxy S23',
          price: 12000000,
        },
        amount: 3,
        price: 12000000,
        discountAmount: 0,
        subtotal: 36000000,
        note: 'Check stock first',
      },
    ],
  },
};
