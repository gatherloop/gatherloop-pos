import type { Meta, StoryObj } from '@storybook/react';
import { CheckoutScreen } from './CheckoutScreen';

const table = { id: 1, label: 'Meja 1', floorNumber: 1 };

const variant = {
  id: 1,
  name: 'Es Kopi Susu - Regular',
  price: 18000,
  materials: [],
  product: {
    id: 1,
    name: 'Es Kopi Susu',
    description: 'Kopi susu gula aren dengan es',
    category: {
      id: 1,
      name: 'Minuman',
      station: 'BAR' as const,
      createdAt: '2024-03-20T00:00:00.000Z',
    },
    imageUrl: '',
    saleType: 'purchase' as const,
    status: 'published' as const,
    options: [],
    createdAt: '2024-03-20T00:00:00.000Z',
  },
  createdAt: '2024-03-20T00:00:00.000Z',
  values: [
    {
      id: 1,
      variantId: 1,
      optionValueId: 1,
      optionValue: { id: 1, name: 'Regular' },
    },
  ],
  pricingTiers: [],
};

const cart = {
  id: 1,
  sessionId: 'session-1',
  tableId: 1,
  table,
  status: 'active' as const,
  items: [
    {
      id: 1,
      cartId: 1,
      variantId: 1,
      variant,
      amount: 2,
      note: 'less sugar',
      price: 18000,
      subtotal: 36000,
      createdAt: '2024-03-20T00:00:00.000Z',
    },
  ],
  itemCount: 2,
  total: 36000,
  createdAt: '2024-03-20T00:00:00.000Z',
};

const payment = {
  reference: 'ORD0000000000001',
  status: 'pending' as const,
  amount: 36000,
  qrContent: '00020101021226610014ID.CO.QRIS.WWW',
  expiredAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  paidAt: null,
  customerName: 'Budi',
  tableLabel: 'Meja 1',
  items: [],
};

const meta: Meta<typeof CheckoutScreen> = {
  title: 'Screens/Order/CheckoutScreen',
  component: CheckoutScreen,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    tableVariant: { type: 'resolved', table },
    onBackToCartPress: () => {
      // Storybook action stand-in
    },
  },
};

export default meta;
type Story = StoryObj<typeof CheckoutScreen>;

export const Disabled: Story = {
  args: { variant: { type: 'disabled' } },
};

export const LoadingCart: Story = {
  args: { variant: { type: 'loadingCart' } },
};

export const CartError: Story = {
  args: {
    variant: {
      type: 'cartError',
      onRetryPress: () => {
        // Storybook action stand-in
      },
    },
  },
};

export const EmptyCart: Story = {
  args: { variant: { type: 'emptyCart' } },
};

export const Summary: Story = {
  args: {
    variant: {
      type: 'summary',
      cart,
      onPayPress: () => {
        // Storybook action stand-in
      },
    },
  },
};

export const AskingName: Story = {
  args: {
    variant: {
      type: 'askingName',
      cart,
      name: '',
      nameErrorMessage: null,
      onNameChange: () => {
        // Storybook action stand-in
      },
      onSubmitPress: () => {
        // Storybook action stand-in
      },
      onCancelPress: () => {
        // Storybook action stand-in
      },
    },
  },
};

export const CreatingPayment: Story = {
  args: { variant: { type: 'creatingPayment', cart } },
};

export const AwaitingPayment: Story = {
  args: {
    variant: {
      type: 'awaitingPayment',
      payment,
      onCountdownElapsed: () => {
        // Storybook action stand-in
      },
    },
  },
};

export const Paid: Story = {
  args: {
    variant: { type: 'paid', payment: { ...payment, status: 'paid' } },
  },
};

export const Expired: Story = {
  args: {
    variant: {
      type: 'expired',
      onRetryPress: () => {
        // Storybook action stand-in
      },
    },
  },
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
