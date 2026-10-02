import type { Meta, StoryObj } from '@storybook/react';
import { CategoryChipList } from './CategoryChipList';

const tags = [
  {
    id: 1,
    name: 'New',
    color: 'green' as const,
    isHighlighted: true,
    sortOrder: 1,
    variantCount: 2,
    createdAt: '',
  },
  {
    id: 2,
    name: 'Best Seller',
    color: 'orange' as const,
    isHighlighted: true,
    sortOrder: 2,
    variantCount: 3,
    createdAt: '',
  },
];

const meta: Meta<typeof CategoryChipList> = {
  title: 'Components/Menu/CategoryChipList',
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

export const WithTagChips: Story = {
  args: {
    selectedCategoryId: null,
    tags,
    selectedTagId: null,
  },
};

export const TagSelected: Story = {
  args: {
    selectedCategoryId: null,
    tags,
    selectedTagId: 2,
  },
};
