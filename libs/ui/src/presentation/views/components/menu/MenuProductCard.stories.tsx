import type { Meta, StoryObj } from '@storybook/react';
import { ProductTag, Tag } from '../../../../domain';
import { MenuProductCard } from './MenuProductCard';

const category = {
  id: 1,
  name: 'Minuman',
  station: 'BAR' as const,
  createdAt: '2024-03-20T00:00:00.000Z',
};

const makeTag = (overrides: Partial<Tag> & Pick<Tag, 'id' | 'name'>): Tag => ({
  color: 'blue',
  isHighlighted: true,
  sortOrder: overrides.id,
  variantCount: 0,
  createdAt: '2024-03-20T00:00:00.000Z',
  ...overrides,
});

const makeProductTag = (
  tag: Tag,
  scope: ProductTag['scope'],
  variantIds: number[] = []
): ProductTag => ({
  tag,
  scope,
  variantIds,
  taggedAt: '2024-03-20T00:00:00.000Z',
});

const bestSeller = makeTag({ id: 1, name: 'Best Seller', color: 'orange' });
const newTag = makeTag({ id: 2, name: 'New', color: 'green' });
const recommended = makeTag({ id: 3, name: 'Recommended', color: 'purple' });

const pancong = {
  id: 6,
  name: 'Pancong',
  description: 'Kue pancong isi 3 rasa',
  category: { ...category, name: 'Makanan', station: 'KITCHEN' as const },
  imageUrl: '',
  saleType: 'purchase' as const,
  status: 'published' as const,
  options: [],
  createdAt: '2024-03-20T00:00:00.000Z',
  isAvailable: true,
  availabilityTracking: 'none' as const,
  isSellable: true,
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
      tags: [],
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
      tags: [],
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
      tags: [],
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
      tags: [],
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
      tags: [],
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
      tags: [],
    },
    startingPrice: 8000,
  },
};

export const ProductScopeTag: Story = {
  args: {
    product: {
      ...pancong,
      tags: [makeProductTag(bestSeller, 'product')],
    },
    startingPrice: 8000,
  },
};

export const VariantScopeTag: Story = {
  args: {
    product: {
      ...pancong,
      tags: [
        makeProductTag(bestSeller, 'product'),
        makeProductTag(newTag, 'variant', [11]),
      ],
    },
    variantNameById: { 11: 'Ice Cream' },
    startingPrice: 8000,
  },
};

export const VariantScopeTagOnly: Story = {
  args: {
    product: {
      ...pancong,
      tags: [makeProductTag(newTag, 'variant', [11])],
    },
    variantNameById: { 11: 'Ice Cream' },
    startingPrice: 8000,
  },
};

export const MultipleVariantsTagged: Story = {
  args: {
    product: {
      ...pancong,
      tags: [makeProductTag(newTag, 'variant', [11, 12])],
    },
    variantNameById: { 11: 'Ice Cream', 12: 'Matcha' },
    startingPrice: 8000,
  },
};

export const TagOverflow: Story = {
  args: {
    product: {
      ...pancong,
      tags: [
        makeProductTag(bestSeller, 'product'),
        makeProductTag(newTag, 'variant', [11]),
        makeProductTag(recommended, 'product'),
      ],
    },
    variantNameById: { 11: 'Ice Cream' },
    startingPrice: 8000,
  },
};
