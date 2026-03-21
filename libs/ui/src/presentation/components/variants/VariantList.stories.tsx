import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { VariantList } from './VariantList';
import { mockVariants } from '../../../../.storybook/mocks/mockData';

const defaultArgs = {
  searchValue: '',
  onSearchValueChange: fn(),
  onRetryButtonPress: fn(),
  onPageChange: fn(),
  onEditMenuPress: fn(),
  onDeleteMenuPress: fn(),
  onItemPress: fn(),
  currentPage: 1,
  totalItem: 2,
  itemPerPage: 10,
};

const meta: Meta<typeof VariantList> = {
  title: 'Features/Variants/VariantList',
  component: VariantList,
  args: defaultArgs,
};

export default meta;
type Story = StoryObj<typeof VariantList>;

export const Loaded: Story = {
  args: {
    variant: { type: 'loaded', items: mockVariants },
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
