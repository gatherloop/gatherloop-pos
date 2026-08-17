import type { Meta, StoryObj } from '@storybook/react';
import { MenuProductCard } from './MenuProductCard';

const category = {
  id: 1,
  name: 'Minuman',
  station: 'BAR' as const,
  createdAt: '2024-03-20T00:00:00.000Z',
};

const meta: Meta<typeof MenuProductCard> = {
  title: 'Menu/MenuProductCard',
  component: MenuProductCard,
  args: {
    onPress: () => {
      // Storybook action stand-in
    },
  },
};

export default meta;
type Story = StoryObj<typeof MenuProductCard>;

export const WithDescriptionAndPrice: Story = {
  args: {
    product: {
      id: 1,
      name: 'Es Kopi Susu',
      description: 'Kopi susu gula aren dengan es',
      category,
      imageUrl: '',
      saleType: 'purchase',
      status: 'published',
      options: [],
      createdAt: '2024-03-20T00:00:00.000Z',
    },
    startingPrice: 18000,
  },
};

// D16: an empty description reserves no space instead of collapsing the
// layout.
export const NoDescription: Story = {
  args: {
    product: {
      id: 2,
      name: 'Nasi Goreng',
      description: '',
      category: { ...category, name: 'Makanan', station: 'KITCHEN' },
      imageUrl: '',
      saleType: 'purchase',
      status: 'published',
      options: [],
      createdAt: '2024-03-20T00:00:00.000Z',
    },
    startingPrice: 25000,
  },
};

export const NoPrice: Story = {
  args: {
    product: {
      id: 3,
      name: 'Teh Manis',
      description: '',
      category,
      imageUrl: '',
      saleType: 'purchase',
      status: 'published',
      options: [],
      createdAt: '2024-03-20T00:00:00.000Z',
    },
    startingPrice: null,
  },
};

export const WithImage: Story = {
  args: {
    product: {
      id: 4,
      name: 'Es Kopi Susu',
      description: 'Kopi susu gula aren dengan es',
      category,
      imageUrl: 'https://picsum.photos/120/120',
      saleType: 'purchase',
      status: 'published',
      options: [],
      createdAt: '2024-03-20T00:00:00.000Z',
    },
    startingPrice: 18000,
  },
};
