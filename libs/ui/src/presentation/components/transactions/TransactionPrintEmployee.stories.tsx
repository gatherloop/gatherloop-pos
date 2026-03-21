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
          name: 'Cappuccino',
          price: 35000,
        },
        amount: 2,
        price: 35000,
        discountAmount: 0,
        subtotal: 70000,
        note: 'Extra hot please',
      },
    ],
  },
};
