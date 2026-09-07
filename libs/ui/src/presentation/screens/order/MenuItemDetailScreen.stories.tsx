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

// FR-5: a two-option product exercises the combined "Lengkapi pilihan A dan
// B" message when both groups are unselected.
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
    missingOptionNames: [],
    validationMessage: null,
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
  args: { variant: { type: 'loading' }, ctaState: 'incomplete' },
};

// FR-5: options unselected, CTA reads "Tambah ke Keranjang" and is enabled,
// but the guest hasn't pressed it yet — no error shown.
export const IncompleteUntouched: Story = {
  args: {
    variant: {
      type: 'ready',
      product: esKopiSusu,
      price: null,
      variantErrorMessage: null,
    },
    ctaState: 'incomplete',
    missingOptionNames: ['Ukuran'],
  },
};

// FR-5: the guest pressed the CTA while options were incomplete — the
// missing group's label tints red and the inline message names it.
export const IncompleteWithError: Story = {
  args: {
    variant: {
      type: 'ready',
      product: esKopiSusuDenganEs,
      price: null,
      variantErrorMessage: null,
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
    },
    selectedOptionValueIds: [1],
    amount: 2,
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
    },
    selectedOptionValueIds: [1],
    ctaState: 'incomplete',
  },
};

export const Error: Story = {
  args: { variant: { type: 'error' }, ctaState: 'incomplete' },
};
