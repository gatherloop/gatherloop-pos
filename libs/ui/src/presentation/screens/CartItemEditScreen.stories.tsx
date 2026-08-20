import type { Meta, StoryObj } from '@storybook/react';
import { CartItemEditScreen } from './CartItemEditScreen';

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
  name: 'Es Kopi Susu - Large, Iced',
  price: 18000,
  materials: [],
  product: esKopiSusu,
  createdAt: '2024-03-20T00:00:00.000Z',
  values: [
    {
      id: 1,
      variantId: 1,
      optionValueId: 1,
      optionValue: { id: 1, name: 'Large' },
    },
    {
      id: 2,
      variantId: 1,
      optionValueId: 2,
      optionValue: { id: 2, name: 'Iced' },
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
  note: 'tanpa es',
  price: 18000,
  subtotal: 36000,
  createdAt: '2024-03-20T00:00:00.000Z',
};

const meta: Meta<typeof CartItemEditScreen> = {
  title: 'Cart/CartItemEditScreen',
  component: CartItemEditScreen,
  args: {
    isOpen: true,
    onOpenChange: () => {
      // Storybook action stand-in
    },
    onAmountChange: () => {
      // Storybook action stand-in
    },
    onNoteChange: () => {
      // Storybook action stand-in
    },
    onSavePress: () => {
      // Storybook action stand-in
    },
    isSaving: false,
  },
};

export default meta;
type Story = StoryObj<typeof CartItemEditScreen>;

export const WithOptionsAndNote: Story = {
  args: { item, amount: item.amount, note: item.note },
};

export const NoOptionsNoNote: Story = {
  args: {
    item: {
      ...item,
      note: '',
      variant: { ...variant, values: [] },
    },
    amount: 1,
    note: '',
  },
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
    amount: item.amount,
    note: item.note,
  },
};

export const Saving: Story = {
  args: { item, amount: item.amount, note: item.note, isSaving: true },
};
