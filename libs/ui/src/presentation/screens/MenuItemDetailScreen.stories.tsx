import type { Meta, StoryObj } from '@storybook/react';
import { MenuItemDetailScreen } from './MenuItemDetailScreen';

const minuman = {
  id: 1,
  name: 'Minuman',
  station: 'BAR' as const,
  createdAt: '2024-03-20T00:00:00.000Z',
};

const makanan = {
  id: 2,
  name: 'Makanan',
  station: 'KITCHEN' as const,
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
  options: [
    {
      id: 1,
      name: 'Ukuran',
      values: [
        { id: 1, name: 'Regular' },
        { id: 2, name: 'Large' },
      ],
    },
  ],
  createdAt: '2024-03-20T00:00:00.000Z',
};

const nasiGoreng = {
  id: 2,
  name: 'Nasi Goreng',
  description: '',
  category: makanan,
  imageUrl: '',
  saleType: 'purchase' as const,
  status: 'published' as const,
  options: [],
  createdAt: '2024-03-21T00:00:00.000Z',
};

const meta: Meta<typeof MenuItemDetailScreen> = {
  title: 'Menu/MenuItemDetailScreen',
  component: MenuItemDetailScreen,
  args: {
    isOpen: true,
    onOpenChange: () => {
      // Storybook action stand-in
    },
    selectedOptionValueIds: [],
    onSelectOptionValue: () => {
      // Storybook action stand-in
    },
    amount: 1,
    onAmountChange: () => {
      // Storybook action stand-in
    },
    note: '',
    onNoteChange: () => {
      // Storybook action stand-in
    },
    onAddToCartPress: () => {
      // Storybook action stand-in
    },
    onRetryButtonPress: () => {
      // Storybook action stand-in
    },
  },
};

export default meta;
type Story = StoryObj<typeof MenuItemDetailScreen>;

export const Loading: Story = {
  args: { variant: { type: 'loading' }, isAddToCartEnabled: false },
};

export const SelectingOptions: Story = {
  args: {
    variant: {
      type: 'ready',
      product: esKopiSusu,
      isResolvingVariant: false,
      price: null,
      variantErrorMessage: null,
    },
    isAddToCartEnabled: false,
  },
};

export const Ready: Story = {
  args: {
    variant: {
      type: 'ready',
      product: esKopiSusu,
      isResolvingVariant: false,
      price: 18000,
      variantErrorMessage: null,
    },
    selectedOptionValueIds: [1],
    amount: 2,
    isAddToCartEnabled: true,
  },
};

export const NoOptions: Story = {
  args: {
    variant: {
      type: 'ready',
      product: nasiGoreng,
      isResolvingVariant: false,
      price: 25000,
      variantErrorMessage: null,
    },
    isAddToCartEnabled: true,
  },
};

export const ResolvingVariant: Story = {
  args: {
    variant: {
      type: 'ready',
      product: esKopiSusu,
      isResolvingVariant: true,
      price: null,
      variantErrorMessage: null,
    },
    selectedOptionValueIds: [1],
    isAddToCartEnabled: false,
  },
};

export const VariantError: Story = {
  args: {
    variant: {
      type: 'ready',
      product: esKopiSusu,
      isResolvingVariant: false,
      price: null,
      variantErrorMessage: 'Gagal memuat varian',
    },
    selectedOptionValueIds: [1],
    isAddToCartEnabled: false,
  },
};

export const Error: Story = {
  args: { variant: { type: 'error' }, isAddToCartEnabled: false },
};
