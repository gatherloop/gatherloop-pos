import type { Meta, StoryObj } from '@storybook/react';
import { CartLineItem } from './CartLineItem';

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

const item = {
  id: 1,
  cartId: 1,
  variantId: 1,
  variant,
  amount: 2,
  note: 'less sugar',
  price: 18000,
  subtotal: 36000,
  createdAt: '2024-03-20T00:00:00.000Z',
};

const meta: Meta<typeof CartLineItem> = {
  title: 'Cart/CartLineItem',
  component: CartLineItem,
  args: {
    onAmountChange: () => {
      // Storybook action stand-in
    },
    onRemovePress: () => {
      // Storybook action stand-in
    },
  },
};

export default meta;
type Story = StoryObj<typeof CartLineItem>;

export const Default: Story = {
  args: { item },
};

export const NoNote: Story = {
  args: { item: { ...item, note: '' } },
};

export const Disabled: Story = {
  args: { item, disabled: true },
};

export const LongProductName: Story = {
  args: {
    item: {
      ...item,
      variant: {
        ...variant,
        product: {
          ...esKopiSusu,
          name: 'Es Kopi Susu Gula Aren Signature Large Extra Shot',
        },
      },
    },
  },
};
