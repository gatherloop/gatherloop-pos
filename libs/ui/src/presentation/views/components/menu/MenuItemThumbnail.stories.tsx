import type { Meta, StoryObj } from '@storybook/react';
import { MenuItemThumbnail } from './MenuItemThumbnail';

const meta: Meta<typeof MenuItemThumbnail> = {
  title: 'Components/Menu/MenuItemThumbnail',
  component: MenuItemThumbnail,
  args: {
    width: 120,
    height: 120,
  },
};

export default meta;
type Story = StoryObj<typeof MenuItemThumbnail>;

export const HasImage: Story = {
  args: {
    imageUrl: 'https://picsum.photos/120/120',
    station: 'KITCHEN',
  },
};

export const EmptyKitchen: Story = {
  args: {
    imageUrl: '',
    station: 'KITCHEN',
  },
};

export const EmptyBar: Story = {
  args: {
    imageUrl: '',
    station: 'BAR',
  },
};

export const EmptyNone: Story = {
  args: {
    imageUrl: '',
    station: 'NONE',
  },
};

export const BrokenUrl: Story = {
  args: {
    imageUrl: 'https://example.com/does-not-exist.jpg',
    station: 'BAR',
  },
};
