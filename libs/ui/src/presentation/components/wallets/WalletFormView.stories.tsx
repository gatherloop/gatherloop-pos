import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { WalletFormView } from './WalletFormView';

const meta: Meta<typeof WalletFormView> = {
  title: 'Features/Wallets/WalletFormView',
  component: WalletFormView,
};

export default meta;
type Story = StoryObj<typeof WalletFormView>;

export const Loaded: Story = {
  args: {
    variant: { type: 'loaded' },
    defaultValues: {
      name: '',
      balance: 0,
      paymentCostPercentage: 0,
      isCashless: false,
      isPaymentTarget: true,
    },
    onSubmit: fn(),
    isSubmitDisabled: false,
    isSubmitting: false,
  },
};

export const Populated: Story = {
  args: {
    ...Loaded.args,
    defaultValues: {
      name: 'Cash',
      balance: 5000000,
      paymentCostPercentage: 0,
      isCashless: false,
      isPaymentTarget: true,
    },
  },
};

export const Loading: Story = {
  args: {
    ...Loaded.args,
    variant: { type: 'loading' },
    isSubmitDisabled: true,
  },
};

export const Error: Story = {
  args: {
    ...Loaded.args,
    variant: { type: 'error', onRetryButtonPress: fn() },
    isSubmitDisabled: true,
  },
};
