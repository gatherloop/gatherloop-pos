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
          name: 'Iced Coffee Latte - Hot Large',
          price: 40000,
        },
        amount: 1,
        price: 40000,
        discountAmount: 0,
        subtotal: 40000,
        note: '',
      },
    ],
    total: 110000,
  },
};
