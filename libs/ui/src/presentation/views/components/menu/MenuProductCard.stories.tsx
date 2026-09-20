import type { Meta, StoryObj } from '@storybook/react';
import { MenuProductCard } from './MenuProductCard';

const category = {
  id: 1,
  name: 'Minuman',
  station: 'BAR' as const,
  createdAt: '2024-03-20T00:00:00.000Z',
};

const meta: Meta<typeof MenuProductCard> = {
  title: 'Components/Menu/MenuProductCard',
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
      isAvailable: true,
      availabilityTracking: 'none',
      isSellable: true,
    },
    startingPrice: 18000,
  },
};

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
      isAvailable: true,
      availabilityTracking: 'none',
      isSellable: true,
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
      isAvailable: true,
      availabilityTracking: 'none',
      isSellable: true,
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
      isAvailable: true,
      availabilityTracking: 'none',
      isSellable: true,
    },
    startingPrice: 18000,
  },
};

export const WithMatchedLabels: Story = {
  args: {
    product: {
      id: 1,
      name: 'Teh',
      description: 'Teh khas nusantara',
      category,
      imageUrl: '',
      saleType: 'purchase',
      status: 'published',
      options: [
        {
          id: 1,
          name: 'Rasa',
          values: [
            { id: 1, name: 'Earl Grey' },
            { id: 2, name: 'Jasmine' },
          ],
        },
      ],
      createdAt: '2024-03-20T00:00:00.000Z',
      isAvailable: true,
      availabilityTracking: 'none',
      isSellable: true,
    },
    startingPrice: 10000,
    matchedLabels: ['Earl Grey'],
  },
};

export const SoldOut: Story = {
  args: {
    product: {
      id: 5,
      name: 'Pancong',
      description: 'Kue pancong isi 3 rasa',
      category: { ...category, name: 'Makanan', station: 'KITCHEN' },
      imageUrl: '',
      saleType: 'purchase',
      status: 'published',
      options: [],
      createdAt: '2024-03-20T00:00:00.000Z',
      isAvailable: true,
      availabilityTracking: 'product',
      availableQuantity: 0,
      isSellable: false,
    },
    startingPrice: 8000,
  },
};
