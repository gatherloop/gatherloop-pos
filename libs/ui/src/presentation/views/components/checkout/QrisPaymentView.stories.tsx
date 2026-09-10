import type { Meta, StoryObj } from '@storybook/react';
import { QrisPaymentView } from './QrisPaymentView';

const meta: Meta<typeof QrisPaymentView> = {
  title: 'Components/Checkout/QrisPaymentView',
  component: QrisPaymentView,
  args: {
    qrContent: '00020101021226610014ID.CO.QRIS.WWW',
    amount: 36000,
    expiredAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    reference: 'ORD0000000000001',
    onCountdownElapsed: () => {
      // Storybook action stand-in
    },
  },
};

export default meta;
type Story = StoryObj<typeof QrisPaymentView>;

export const Default: Story = {};

export const AboutToExpire: Story = {
  args: { expiredAt: new Date(Date.now() + 10 * 1000).toISOString() },
};
