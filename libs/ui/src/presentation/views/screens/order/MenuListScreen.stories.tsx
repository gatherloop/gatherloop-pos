import type { Meta, StoryObj } from '@storybook/react';
import { MenuListScreen } from './MenuListScreen';

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
  options: [],
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

const meta: Meta<typeof MenuListScreen> = {
  title: 'Screens/Order/MenuListScreen',
  component: MenuListScreen,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    tableVariant: {
      type: 'resolved',
      table: { id: 1, label: 'Meja 01', floorNumber: 1 },
    },
    searchValue: '',
    onSearchValueChange: () => {
      // Storybook action stand-in
    },
    chipCategories: [minuman, makanan],
    selectedCategoryId: null,
    onSelectCategory: () => {
      // Storybook action stand-in
    },
    onRetryButtonPress: () => {
      // Storybook action stand-in
    },
    onItemPress: () => {
      // Storybook action stand-in
    },
    startingPriceByProductId: { 1: 18000, 2: 25000 },
    itemDetail: null,
  },
};

export default meta;
type Story = StoryObj<typeof MenuListScreen>;

export const Loading: Story = {
  args: { variant: { type: 'loading' } },
};

export const Loaded: Story = {
  args: {
    variant: {
      type: 'loaded',
      groups: [
        { category: minuman, products: [esKopiSusu] },
        { category: makanan, products: [nasiGoreng] },
      ],
    },
  },
};

export const Searching: Story = {
  args: {
    ...Loaded.args,
    searchValue: 'kopi',
    isSearching: true,
  },
};

export const Empty: Story = {
  args: { variant: { type: 'empty' } },
};

export const Error: Story = {
  args: { variant: { type: 'error' } },
};

export const ResolvingTable: Story = {
  args: { tableVariant: { type: 'resolving' }, variant: { type: 'loading' } },
};

export const ItemSheetOpen: Story = {
  args: {
    ...Loaded.args,
    itemDetail: {
      isOpen: true,
      onOpenChange: () => {
        // Storybook action stand-in
      },
      variant: {
        type: 'ready',
        product: esKopiSusu,
        price: 18000,
        variantErrorMessage: null,
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
      ctaState: 'incomplete',
      missingOptionNames: [],
      validationMessage: null,
      onAddToCartPress: () => {
        // Storybook action stand-in
      },
      onRetryButtonPress: () => {
        // Storybook action stand-in
      },
    },
  },
};
