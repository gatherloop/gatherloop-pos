import type { Meta, StoryObj } from '@storybook/react';
import { MenuHighlightCard } from './MenuHighlightCard';

const meta: Meta<typeof MenuHighlightCard> = {
  title: 'Components/Menu/MenuHighlightCard',
  component: MenuHighlightCard,
  args: {
    station: 'KITCHEN',
    onPress: () => {
      // Storybook action stand-in
    },
  },
};

export default meta;
type Story = StoryObj<typeof MenuHighlightCard>;

export const ProductEntry: Story = {
  args: {
    name: 'Es Kopi Susu',
    imageUrl: 'https://picsum.photos/200/200',
    station: 'BAR',
    price: 18000,
  },
};

export const VariantEntry: Story = {
  args: {
    name: 'Pancong',
    variantName: 'Ice Cream',
    imageUrl: 'https://picsum.photos/200/201',
    price: 15000,
  },
};

export const WithoutImage: Story = {
  args: {
    name: 'Nasi Goreng',
    price: 25000,
  },
};

export const FullWidth: Story = {
  args: {
    ...VariantEntry.args,
    fullWidth: true,
  },
};
