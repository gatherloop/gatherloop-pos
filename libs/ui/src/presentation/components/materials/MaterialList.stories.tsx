import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { MaterialList } from './MaterialList';
import { mockMaterials } from '../../../../.storybook/mocks/mockData';

const defaultArgs = {
  searchValue: '',
  onSearchValueChange: fn(),
  onRetryButtonPress: fn(),
  onPageChange: fn(),
  onEditMenuPress: fn(),
  onDeleteMenuPress: fn(),
  onItemPress: fn(),
  currentPage: 1,
  totalItem: 3,
  itemPerPage: 10,
};

const meta: Meta<typeof MaterialList> = {
  title: 'Features/Materials/MaterialList',
  component: MaterialList,
  args: defaultArgs,
};

export default meta;
type Story = StoryObj<typeof MaterialList>;

export const Loaded: Story = {
  args: {
    variant: { type: 'loaded', items: mockMaterials },
  },
};

export const Loading: Story = {
  args: {
    variant: { type: 'loading' },
  },
};

export const Empty: Story = {
  args: {
    variant: { type: 'empty' },
    totalItem: 0,
  },
};

export const Error: Story = {
  args: {
    variant: { type: 'error' },
  },
};

export const WithSearch: Story = {
  args: {
    variant: { type: 'loaded', items: mockMaterials.slice(0, 1) },
    searchValue: 'Steel',
    totalItem: 1,
  },
};
