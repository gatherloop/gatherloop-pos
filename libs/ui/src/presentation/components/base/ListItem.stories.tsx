import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { Pencil, Tag, Trash } from '@tamagui/lucide-icons';
import { ListItem } from './ListItem';

const meta: Meta<typeof ListItem> = {
  title: 'Base/ListItem',
  component: ListItem,
  args: {
    title: 'Product Name',
    subtitle: 'Product subtitle or description',
  },
};

export default meta;
type Story = StoryObj<typeof ListItem>;

export const Default: Story = {};

export const WithThumbnail: Story = {
  args: {
    thumbnailSrc: 'https://picsum.photos/120/120',
  },
};

export const WithFooterItems: Story = {
  args: {
    footerItems: [
      { label: 'Price', value: 'Rp 50.000', icon: Tag },
      { label: 'Stock', value: '10 pcs' },
    ],
  },
};

export const WithMenus: Story = {
  args: {
    menus: [
      { title: 'Edit', icon: Pencil, onPress: fn() },
      { title: 'Delete', icon: Trash, onPress: fn() },
    ],
  },
};

export const WithThumbnailAndMenus: Story = {
  args: {
    thumbnailSrc: 'https://picsum.photos/120/120',
    menus: [
      { title: 'Edit', icon: Pencil, onPress: fn() },
      { title: 'Delete', icon: Trash, onPress: fn() },
    ],
    footerItems: [
      { label: 'Price', value: 'Rp 50.000', icon: Tag },
      { label: 'Stock', value: '10 pcs' },
    ],
  },
};

export const WithHiddenMenu: Story = {
  args: {
    menus: [
      { title: 'Edit', icon: Pencil, onPress: fn(), isShown: true },
      { title: 'Delete', icon: Trash, onPress: fn(), isShown: false },
    ],
  },
};

export const Clickable: Story = {
  args: {
    onPress: fn(),
    cursor: 'pointer',
  },
};

// FR-1 in docs/prd-transaction-mobile-ux.md: on $xs, footer items collapse to
// a single "label: value" line with no icon chip, so four items still fit in
// a compact, wrapping row instead of stacking into a ~260px tall block.
export const MobileFourFooterItems: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
  args: {
    footerItems: [
      { label: 'ORDER NUMBER', value: '12', icon: Tag },
      { label: 'TRANSACTION DATE', value: '20/01/2024 - 10:00' },
      { label: 'PAYMENT DATE', value: '20/01/2024 - 10:30' },
      { label: 'WALLET', value: 'Cash' },
    ],
  },
};
