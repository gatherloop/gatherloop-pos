import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TransactionPaymentAlert } from './TransactionPaymentAlert';
import { mockWallets } from '../../../../.storybook/mocks/mockData';

const walletSelectOptions = mockWallets.map((w) => ({ label: w.name, value: w }));

const meta: Meta<typeof TransactionPaymentAlert> = {
  title: 'Features/Transactions/TransactionPaymentAlert',
  component: TransactionPaymentAlert,
};

export default meta;
type Story = StoryObj<typeof TransactionPaymentAlert>;

export const Open: Story = {
  args: {
    isOpen: true,
    onCancel: fn(),
    onSubmit: fn(),
    walletSelectOptions,
    transactionTotal: 30000000,
    isButtonDisabled: false,
  },
};

export const Disabled: Story = {
  args: {
    ...Open.args,
    isButtonDisabled: true,
  },
};
