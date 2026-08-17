import type { Meta, StoryObj } from '@storybook/react';
import { CategoryChipList } from './CategoryChipList';

const meta: Meta<typeof CategoryChipList> = {
  title: 'Menu/CategoryChipList',
  component: CategoryChipList,
  args: {
    categories: [
      { id: 1, name: 'Minuman', station: 'BAR', createdAt: '' },
      { id: 2, name: 'Makanan', station: 'KITCHEN', createdAt: '' },
      { id: 3, name: 'Cemilan', station: 'NONE', createdAt: '' },
    ],
  },
};

export default meta;
type Story = StoryObj<typeof CategoryChipList>;

export const AllSelected: Story = {
  args: {
    selectedCategoryId: null,
  },
};

export const CategorySelected: Story = {
  args: {
    selectedCategoryId: 2,
  },
};
