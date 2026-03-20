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
      { title: 'Edit', icon: Edit, onPress: fn(), isShown: true },
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
