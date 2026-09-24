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
  isAvailable: true,
  availabilityTracking: 'none' as const,
  isSellable: true,
};

const esKopiSusuDenganEs = {
  ...esKopiSusu,
  options: [
    ...esKopiSusu.options,
    {
      id: 2,
      name: 'Es',
      values: [
        { id: 3, name: 'Normal' },
        { id: 4, name: 'Less Ice' },
      ],
    },
  ],
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
  isAvailable: true,
  availabilityTracking: 'none' as const,
  isSellable: true,
};

const softCookies = {
  id: 3,
  name: 'Soft Cookies',
  description: 'Cookies lembut isi 2 rasa',
  category: makanan,
  imageUrl: '',
  saleType: 'purchase' as const,
  status: 'published' as const,
  options: [
    {
      id: 3,
      name: 'Rasa',
      values: [
        { id: 5, name: 'Choco' },
        { id: 6, name: 'Red Velvet' },
      ],
    },
  ],
  createdAt: '2024-03-22T00:00:00.000Z',
  isAvailable: true,
  availabilityTracking: 'variant' as const,
  isSellable: true,
};

const meta: Meta<typeof MenuItemDetailScreen> = {
  title: 'Screens/Order/MenuItemDetailScreen',
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
    optionValueAvailability: {},
    amount: 1,
    onAmountChange: () => {
      // Storybook action stand-in
    },
    note: '',
    onNoteChange: () => {
      // Storybook action stand-in
    },
    missingOptionNames: [],
    validationMessage: null,
    onAddToCartPress: () => {
      // Storybook action stand-in
    },
    onRetryButtonPress: () => {
      // Storybook action stand-in
    },
    lockedNotice: null,
  },
};

export default meta;
type Story = StoryObj<typeof MenuItemDetailScreen>;

export const Loading: Story = {
  args: { variant: { type: 'loading' }, ctaState: 'incomplete' },
};

export const IncompleteUntouched: Story = {
  args: {
    variant: {
      type: 'ready',
      product: esKopiSusu,
      price: null,
      variantErrorMessage: null,
      isVariantSellable: null,
    },
    ctaState: 'incomplete',
    missingOptionNames: ['Ukuran'],
  },
};

export const IncompleteWithError: Story = {
  args: {
    variant: {
      type: 'ready',
      product: esKopiSusuDenganEs,
      price: null,
      variantErrorMessage: null,
      isVariantSellable: null,
    },
    ctaState: 'incomplete',
    missingOptionNames: ['Ukuran', 'Es'],
    validationMessage: 'Lengkapi pilihan Ukuran dan Es',
  },
};

export const Ready: Story = {
  args: {
    variant: {
      type: 'ready',
      product: esKopiSusu,
      price: 18000,
      variantErrorMessage: null,
      isVariantSellable: true,
    },
    selectedOptionValueIds: [1],
    amount: 2,
    ctaState: 'ready',
  },
};

export const NearRemainingQuantity: Story = {
  args: {
    variant: {
      type: 'ready',
      product: softCookies,
      price: 20000,
      variantErrorMessage: null,
      isVariantSellable: true,
      remainingQuantity: 3,
    },
    selectedOptionValueIds: [5],
    amount: 3,
    ctaState: 'ready',
  },
};

export const NoOptions: Story = {
  args: {
    variant: {
      type: 'ready',
      product: nasiGoreng,
      price: 25000,
      variantErrorMessage: null,
      isVariantSellable: true,
    },
    ctaState: 'ready',
  },
};

export const Resolving: Story = {
  args: {
    variant: {
      type: 'ready',
      product: esKopiSusu,
      price: null,
      variantErrorMessage: null,
      isVariantSellable: null,
    },
    selectedOptionValueIds: [1],
    ctaState: 'resolving',
  },
};

export const VariantError: Story = {
  args: {
    variant: {
      type: 'ready',
      product: esKopiSusu,
      price: null,
      variantErrorMessage: 'Gagal memuat varian',
      isVariantSellable: null,
    },
    selectedOptionValueIds: [1],
    ctaState: 'incomplete',
  },
};

export const Error: Story = {
  args: { variant: { type: 'error' }, ctaState: 'incomplete' },
};

export const SoldOutOptionValue: Story = {
  args: {
    variant: {
      type: 'ready',
      product: softCookies,
      price: null,
      variantErrorMessage: null,
      isVariantSellable: null,
    },
    optionValueAvailability: { 5: true, 6: false },
    ctaState: 'incomplete',
  },
};

export const SoldOutVariant: Story = {
  args: {
    variant: {
      type: 'ready',
      product: softCookies,
      price: null,
      variantErrorMessage: null,
      isVariantSellable: false,
    },
    selectedOptionValueIds: [6],
    optionValueAvailability: { 5: true, 6: false },
    ctaState: 'ready',
  },
};

export const LockedByPendingPayment: Story = {
  args: {
    variant: {
      type: 'ready',
      product: esKopiSusu,
      price: 18000,
      variantErrorMessage: null,
      isVariantSellable: true,
    },
    selectedOptionValueIds: [1],
    amount: 2,
    ctaState: 'ready',
    lockedNotice: {
      onContinuePress: () => {
        // Storybook action stand-in
      },
      cancelAction: {
        label: 'Batalkan & tambah item',
        onPress: () => {
          // Storybook action stand-in
        },
      },
    },
  },
};
