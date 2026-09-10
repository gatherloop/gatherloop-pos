import type { Meta, StoryObj } from '@storybook/react';
import { CheckoutSummaryView } from './CheckoutSummaryView';

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
  table: { id: 1, label: 'Meja 1', floorNumber: 1 },
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

const meta: Meta<typeof CheckoutSummaryView> = {
  title: 'Components/Checkout/CheckoutSummaryView',
  component: CheckoutSummaryView,
  args: {
    cart,
    isPaying: false,
    onPayPress: () => {
      // Storybook action stand-in
    },
  },
};

export default meta;
type Story = StoryObj<typeof CheckoutSummaryView>;

export const Default: Story = {};

export const Paying: Story = {
  args: { isPaying: true },
};
