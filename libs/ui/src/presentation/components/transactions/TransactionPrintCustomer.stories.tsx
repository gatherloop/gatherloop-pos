import type { Meta, StoryObj } from '@storybook/react';
import { TransactionPrintCustomer } from './TransactionPrintCustomer';
import { mockTransaction } from '../../../../.storybook/mocks/mockData';

const meta: Meta<typeof TransactionPrintCustomer> = {
  title: 'Features/Transactions/TransactionPrintCustomer',
  component: TransactionPrintCustomer,
  args: {
    name: mockTransaction.name,
    createdAt: mockTransaction.createdAt,
    paidAt: mockTransaction.paidAt ?? undefined,
    total: mockTransaction.total,
    transactionItems: mockTransaction.transactionItems,
  },
};

export default meta;
type Story = StoryObj<typeof TransactionPrintCustomer>;

export const Paid: Story = {};

export const Unpaid: Story = {
  args: {
    paidAt: undefined,
  },
};

export const MultipleItems: Story = {
  args: {
    transactionItems: [
      ...mockTransaction.transactionItems,
      {
        id: 2,
        variant: {
          ...mockTransaction.transactionItems[0].variant,
          id: 2,
          name: 'iPhone 14 - Black 256GB',
          price: 17000000,
        },
        amount: 1,
        price: 17000000,
        discountAmount: 0,
        subtotal: 17000000,
        note: '',
      },
    ],
    total: 47000000,
  },
};
