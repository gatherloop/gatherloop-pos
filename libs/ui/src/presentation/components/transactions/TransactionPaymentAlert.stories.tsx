import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm } from 'react-hook-form';
import { TransactionPaymentAlert } from './TransactionPaymentAlert';
import type { Wallet } from '../../../domain';
import { mockWallets } from '../../../../.storybook/mocks/mockData';

const walletSelectOptions = mockWallets.map((w) => ({ label: w.name, value: w }));

const manyWallets: Wallet[] = [
  ...mockWallets,
  { ...mockWallets[0], id: 4, name: 'Petty Cash' },
  { ...mockWallets[1], id: 5, name: 'GoPay' },
  { ...mockWallets[2], id: 6, name: 'OVO' },
];
const manyWalletSelectOptions = manyWallets.map((w) => ({
  label: w.name,
  value: w,
}));

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

const ManyWalletsStory = () => {
  const form = useForm<{ wallet: Wallet; paidAmount: number }>({
    defaultValues: { wallet: manyWallets[0], paidAmount: 30000000 },
  });
  return (
    <TransactionPaymentAlert
      isOpen={true}
      onCancel={fn()}
      form={form}
      onSubmit={fn()}
      walletSelectOptions={manyWalletSelectOptions}
      transactionTotal={30000000}
      isButtonDisabled={false}
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

// Phase 9 of docs/prd-transaction-mobile-ux.md (FR-9): at 360px Wallet/Total
// and Paid Amount/Change each stack vertically, the dialog fits the viewport
// with an internal scroll, and both actions stay reachable full-width.
export const Mobile: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
  render: () => <OpenStory />,
};

// Phase 9: with 6 wallets the dialog content scrolls internally so the
// Cancel/Submit actions never go off-screen at 360px.
export const MobileManyWallets: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
  render: () => <ManyWalletsStory />,
};
