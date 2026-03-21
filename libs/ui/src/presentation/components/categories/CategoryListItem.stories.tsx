import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { CategoryListItem } from './CategoryListItem';

const meta: Meta<typeof CategoryListItem> = {
  title: 'Features/Categories/CategoryListItem',
  component: CategoryListItem,
  args: {
    name: 'Beverages',
    onEditMenuPress: fn(),
    onDeleteMenuPress: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof CategoryListItem>;

export const Default: Story = {};

export const LongName: Story = {
  args: {
    name: 'Specialty Coffee & Artisan Beverages — Premium Quality',
  },
};
