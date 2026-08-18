import type { Meta, StoryObj } from '@storybook/react';
import { MenuItemThumbnail } from './MenuItemThumbnail';

const meta: Meta<typeof MenuItemThumbnail> = {
  title: 'Menu/MenuItemThumbnail',
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

// D16: an empty `imageUrl` falls back to a station-keyed glyph instead of an
// empty box.
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

// D16: `onError` falls back to the same placeholder as an empty `imageUrl`
// — this URL 404s, so the browser fires `onError` on load.
export const BrokenUrl: Story = {
  args: {
    imageUrl: 'https://example.com/does-not-exist.jpg',
    station: 'BAR',
  },
};
