import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm } from 'react-hook-form';
import { TransactionPaymentAlert } from './TransactionPaymentAlert';
import type { Wallet } from '../../../domain';
import { mockWallets } from '../../../../.storybook/mocks/mockData';

const walletSelectOptions = mockWallets.map((w) => ({ label: w.name, value: w }));

const OpenStory = () => {
  const form = useForm<{ wallet: Wallet; paidAmount: number }>({
    defaultValues: { wallet: mockWallets[0], paidAmount: 30000000 },
  });
  return (
    <TransactionPaymentAlert
      isOpen={true}
      onCancel={fn()}
      form={form}
      onSubmit={fn()}
      walletSelectOptions={walletSelectOptions}
      transactionTotal={30000000}
      isButtonDisabled={false}
    />
  );
};

const DisabledStory = () => {
  const form = useForm<{ wallet: Wallet; paidAmount: number }>({
    defaultValues: { wallet: mockWallets[0], paidAmount: 30000000 },
  });
  return (
    <TransactionPaymentAlert
      isOpen={true}
      onCancel={fn()}
      form={form}
      onSubmit={fn()}
      walletSelectOptions={walletSelectOptions}
      transactionTotal={30000000}
      isButtonDisabled={true}
    />
  );
};

const meta: Meta<typeof TransactionPaymentAlert> = {
  title: 'Features/Transactions/TransactionPaymentAlert',
  component: TransactionPaymentAlert,
};

export default meta;
type Story = StoryObj<typeof TransactionPaymentAlert>;

export const Open: Story = {
  render: () => <OpenStory />,
};

export const Disabled: Story = {
  render: () => <DisabledStory />,
};
