import type { Meta, StoryObj } from '@storybook/react';
import { Product } from '../../../../domain/entities/Product';
import { Variant } from '../../../../domain/entities/Variant';
import { MenuHighlightSection } from './MenuHighlightSection';

const kitchen = {
  id: 2,
  name: 'Makanan',
  station: 'KITCHEN' as const,
  createdAt: '2024-03-20T00:00:00.000Z',
};

const tag = {
  id: 1,
  name: 'New',
  color: 'green' as const,
  isHighlighted: true,
  sortOrder: 1,
  variantCount: 2,
  createdAt: '2024-03-20T00:00:00.000Z',
};

const pancong: Product = {
  id: 1,
  name: 'Pancong',
  description: '',
  category: kitchen,
  imageUrl: 'https://picsum.photos/200/200',
  saleType: 'purchase',
  status: 'published',
  options: [],
  createdAt: '2024-03-20T00:00:00.000Z',
  isAvailable: true,
  availabilityTracking: 'none',
  isSellable: true,
  tags: [],
};

const iceCream: Variant = {
  id: 1,
  name: 'Ice Cream',
  price: 15000,
  imageUrl: 'https://picsum.photos/200/201',
  materials: [],
  product: pancong,
  createdAt: '2024-03-20T00:00:00.000Z',
  values: [],
  pricingTiers: [],
  isAvailable: true,
  isSellable: true,
  tags: [],
};

const nasiGoreng: Product = {
  ...pancong,
  id: 2,
  name: 'Nasi Goreng',
  imageUrl: '',
};

const meta: Meta<typeof MenuHighlightSection> = {
  title: 'Components/Menu/MenuHighlightSection',
  component: MenuHighlightSection,
  args: {
    tag,
    startingPriceByProductId: { 1: 8000, 2: 25000 },
    onEntryPress: () => {
      // Storybook action stand-in
    },
  },
};

export default meta;
type Story = StoryObj<typeof MenuHighlightSection>;

export const MixedEntries: Story = {
  args: {
    entries: [
      { kind: 'variant', product: pancong, variant: iceCream },
      { kind: 'product', product: nasiGoreng },
      {
        kind: 'variant',
        product: pancong,
        variant: { ...iceCream, id: 2, name: 'Chocolate', imageUrl: undefined },
      },
    ],
  },
};
