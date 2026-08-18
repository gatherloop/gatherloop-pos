import type { Meta, StoryObj } from '@storybook/react';
import { CartScreen } from './CartScreen';

const minuman = {
  id: 1,
  name: 'Minuman',
  station: 'BAR' as const,
  createdAt: '2024-03-20T00:00:00.000Z',
};

const esKopiSusu = {
  id: 1,
  name: 'Es Kopi Susu',
  description: 'Kopi susu gula aren dengan es',
  category: minuman,
  imageUrl: '',
  saleType: 'purchase' as const,
  status: 'published' as const,
  options: [],
  createdAt: '2024-03-20T00:00:00.000Z',
};

const variant = {
  id: 1,
  name: 'Es Kopi Susu - Regular',
  price: 18000,
  materials: [],
  product: esKopiSusu,
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
  table: { id: 1, label: 'Meja 1' },
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

const meta: Meta<typeof CartScreen> = {
  title: 'Cart/CartScreen',
  component: CartScreen,
  args: {
    isMutating: false,
    errorMessage: null,
    onAmountChange: () => {
      // Storybook action stand-in
    },
    onRemovePress: () => {
      // Storybook action stand-in
    },
    onClearPress: () => {
      // Storybook action stand-in
    },
    onAddMoreItemsPress: () => {
      // Storybook action stand-in
    },
    onCheckoutPress: () => {
      // Storybook action stand-in
    },
    onRetryButtonPress: () => {
      // Storybook action stand-in
    },
  },
};

export default meta;
type Story = StoryObj<typeof CartScreen>;

export const Loading: Story = {
  args: { variant: { type: 'loading' } },
};

export const Empty: Story = {
  args: { variant: { type: 'empty' } },
};

export const Loaded: Story = {
  args: { variant: { type: 'loaded', cart } },
};

export const Mutating: Story = {
  args: { variant: { type: 'loaded', cart }, isMutating: true },
};

export const MutationError: Story = {
  args: {
    variant: { type: 'loaded', cart },
    errorMessage: 'Gagal memperbarui keranjang',
  },
};

export const Error: Story = {
  args: { variant: { type: 'error' } },
};
