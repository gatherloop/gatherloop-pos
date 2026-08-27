import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { WalletCreateScreen } from './WalletCreateScreen';

const meta: Meta<typeof WalletCreateScreen> = {
  title: 'Screens/Wallets/WalletCreateScreen',
  component: WalletCreateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof WalletCreateScreen>;

export const Default: Story = {
  args: {
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
    onLogoutPress: fn(),
    variant: { type: 'loaded' },
  },
};
