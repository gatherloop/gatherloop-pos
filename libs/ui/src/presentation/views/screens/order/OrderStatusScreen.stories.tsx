import type { Meta, StoryObj } from '@storybook/react';
import { OrderStatusScreen } from './OrderStatusScreen';

const paidPayment = {
  reference: 'ORD0000000000001',
  status: 'paid' as const,
  method: 'qris' as const,
  amount: 54000,
  qrContent: '00020101021226610014ID.CO.QRIS.WWW',
  expiredAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  paidAt: new Date().toISOString(),
  customerName: 'Budi',
  tableLabel: 'Meja 1',
  transactionNumber: 12,
  fulfillmentStatus: 'preparing' as const,
  canCancel: false,
  cancelReason: null,
  items: [
    {
      name: 'Es Kopi Susu',
      amount: 2,
      price: 18000,
      subtotal: 36000,
      note: 'less sugar',
      options: [{ name: 'Ukuran', value: 'Regular' }],
    },
    {
      name: 'Roti Bakar',
      amount: 1,
      price: 18000,
      subtotal: 18000,
      note: '',
      options: [],
    },
    {
      name: 'Pancong',
      amount: 1,
      price: 18000,
      subtotal: 18000,
      note: '',
      options: [],
    },
    {
      name: 'Cappuccino',
      amount: 1,
      price: 15000,
      subtotal: 15000,
      note: '',
      options: [],
    },
    {
      name: 'Coffee Latte',
      amount: 1,
      price: 15000,
      subtotal: 15000,
      note: '',
      options: [],
    },
    {
      name: 'Coffee Latte',
      amount: 1,
      price: 15000,
      subtotal: 15000,
      note: '',
      options: [],
    },
    {
      name: 'Coffee Latte',
      amount: 1,
      price: 15000,
      subtotal: 15000,
      note: '',
      options: [],
    },
    {
      name: 'Coffee Latte',
      amount: 1,
      price: 15000,
      subtotal: 15000,
      note: '',
      options: [],
    },
    {
      name: 'Coffee Latte',
      amount: 1,
      price: 15000,
      subtotal: 15000,
      note: '',
      options: [],
    },
    {
      name: 'Coffee Latte',
      amount: 1,
      price: 15000,
      subtotal: 15000,
      note: '',
      options: [],
    },
    {
      name: 'Coffee Latte',
      amount: 1,
      price: 15000,
      subtotal: 15000,
      note: '',
      options: [],
    },
    {
      name: 'Coffee Latte',
      amount: 1,
      price: 15000,
      subtotal: 15000,
      note: '',
      options: [],
    },
  ],
};

const pendingPayment = {
  ...paidPayment,
  status: 'pending' as const,
  paidAt: null,
  canCancel: true,
};

const pendingCashPayment = {
  ...pendingPayment,
  method: 'cash' as const,
  qrContent: '',
  transactionNumber: 12,
};

const meta: Meta<typeof OrderStatusScreen> = {
  title: 'Screens/Order/OrderStatusScreen',
  component: OrderStatusScreen,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    onBackToMenuPress: () => {
      // Storybook action stand-in
    },
    onBackToCartPress: () => {
      // Storybook action stand-in
    },
  },
};

export default meta;
type Story = StoryObj<typeof OrderStatusScreen>;

export const Loading: Story = {
  args: { variant: { type: 'loading' } },
};

const noopCancelConfirmation = {
  isOpen: false,
  method: 'qris' as const,
  isCancelling: false,
  onConfirm: () => {
    // Storybook action stand-in
  },
  onDismiss: () => {
    // Storybook action stand-in
  },
};

export const AwaitingPayment: Story = {
  args: {
    variant: {
      type: 'awaitingPayment',
      payment: pendingPayment,
      onCountdownElapsed: () => {
        // Storybook action stand-in
      },
      canCancel: true,
      onCancelPress: () => {
        // Storybook action stand-in
      },
      cancelConfirmation: noopCancelConfirmation,
      cancelErrorMessage: null,
    },
  },
};

export const AwaitingPaymentCancelDisabled: Story = {
  args: {
    variant: {
      type: 'awaitingPayment',
      payment: pendingPayment,
      onCountdownElapsed: () => {
        // Storybook action stand-in
      },
      canCancel: false,
      onCancelPress: () => {
        // Storybook action stand-in
      },
      cancelConfirmation: noopCancelConfirmation,
      cancelErrorMessage: null,
    },
  },
};

export const AwaitingPaymentConfirmingCancel: Story = {
  args: {
    variant: {
      type: 'awaitingPayment',
      payment: pendingPayment,
      onCountdownElapsed: () => {
        // Storybook action stand-in
      },
      canCancel: true,
      onCancelPress: () => {
        // Storybook action stand-in
      },
      cancelConfirmation: {
        ...noopCancelConfirmation,
        isOpen: true,
        method: 'qris',
      },
      cancelErrorMessage: null,
    },
  },
};

export const AwaitingPaymentCancelling: Story = {
  args: {
    variant: {
      type: 'awaitingPayment',
      payment: pendingPayment,
      onCountdownElapsed: () => {
        // Storybook action stand-in
      },
      canCancel: true,
      onCancelPress: () => {
        // Storybook action stand-in
      },
      cancelConfirmation: {
        ...noopCancelConfirmation,
        isOpen: true,
        isCancelling: true,
        method: 'qris',
      },
      cancelErrorMessage: null,
    },
  },
};

export const AwaitingPaymentCancelError: Story = {
  args: {
    variant: {
      type: 'awaitingPayment',
      payment: pendingPayment,
      onCountdownElapsed: () => {
        // Storybook action stand-in
      },
      canCancel: true,
      onCancelPress: () => {
        // Storybook action stand-in
      },
      cancelConfirmation: noopCancelConfirmation,
      cancelErrorMessage: 'Gagal membatalkan pembayaran. Silakan coba lagi.',
    },
  },
};

export const AwaitingCashPayment: Story = {
  args: {
    variant: {
      type: 'awaitingCashPayment',
      payment: pendingCashPayment,
      cashierLocation: 'Lantai 1',
      onCountdownElapsed: () => {
        // Storybook action stand-in
      },
      canCancel: true,
      onCancelPress: () => {
        // Storybook action stand-in
      },
      cancelConfirmation: noopCancelConfirmation,
      cancelErrorMessage: null,
    },
  },
};

export const AwaitingCashPaymentConfirmingCancel: Story = {
  args: {
    variant: {
      type: 'awaitingCashPayment',
      payment: pendingCashPayment,
      cashierLocation: 'Lantai 1',
      onCountdownElapsed: () => {
        // Storybook action stand-in
      },
      canCancel: true,
      onCancelPress: () => {
        // Storybook action stand-in
      },
      cancelConfirmation: {
        ...noopCancelConfirmation,
        isOpen: true,
        method: 'cash',
      },
      cancelErrorMessage: null,
    },
  },
};

export const Preparing: Story = {
  args: {
    variant: {
      type: 'preparing',
      payment: paidPayment,
      isPolling: false,
    },
  },
};

export const Ready: Story = {
  args: {
    variant: {
      type: 'ready',
      payment: { ...paidPayment, fulfillmentStatus: 'ready' },
    },
  },
};

export const Expired: Story = {
  args: { variant: { type: 'expired', method: 'qris' } },
};

export const ExpiredCash: Story = {
  args: { variant: { type: 'expired', method: 'cash' } },
};

export const Cancelled: Story = {
  args: {
    variant: {
      type: 'cancelled',
      cancelReason: 'guest',
      onActionPress: () => {
        // Storybook action stand-in
      },
    },
  },
};

export const CancelledSuperseded: Story = {
  args: {
    variant: {
      type: 'cancelled',
      cancelReason: 'superseded',
      onActionPress: () => {
        // Storybook action stand-in
      },
    },
  },
};

export const NotFound: Story = {
  args: { variant: { type: 'notFound' } },
};

export const Error: Story = {
  args: {
    variant: {
      type: 'error',
      onRetryPress: () => {
        // Storybook action stand-in
      },
    },
  },
};

export const WithHistoryButton: Story = {
  args: {
    variant: {
      type: 'preparing',
      payment: paidPayment,
      isPolling: false,
    },
    onHistoryPress: () => {
      // Storybook action stand-in
    },
  },
};
