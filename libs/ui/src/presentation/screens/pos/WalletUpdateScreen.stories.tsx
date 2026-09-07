import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { WalletUpdateScreen } from './WalletUpdateScreen';

const meta: Meta<typeof WalletUpdateScreen> = {
  title: 'Screens/Wallets/WalletUpdateScreen',
  component: WalletUpdateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof WalletUpdateScreen>;

export const Default: Story = {
  args: {
    defaultValues: {
      name: 'BCA',
      balance: 5000000,
      paymentCostPercentage: 0,
      isCashless: true,
      isPaymentTarget: true,
    },
    onSubmit: fn(),
    isSubmitDisabled: false,
    isSubmitting: false,
    onLogoutPress: fn(),
    variant: { type: 'loaded' },
  },
};

export const Loading: Story = {
  args: {
    ...Default.args,
    defaultValues: {
      name: '',
      balance: 0,
      paymentCostPercentage: 0,
      isCashless: false,
      isPaymentTarget: true,
    },
    isSubmitDisabled: true,
    variant: { type: 'loading' },
  },
};
