import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { CategoryList } from './CategoryList';
import { mockCategories } from '../../../../.storybook/mocks/mockData';

const defaultArgs = {
  onRetryButtonPress: fn(),
  onDeleteMenuPress: fn(),
  onEditMenuPress: fn(),
  onItemPress: fn(),
};

const meta: Meta<typeof CategoryList> = {
  title: 'Features/Categories/CategoryList',
  component: CategoryList,
  args: defaultArgs,
};

export default meta;
type Story = StoryObj<typeof CategoryList>;

export const Loaded: Story = {
  args: {
    variant: { type: 'loaded', categories: mockCategories },
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
  },
};

export const Error: Story = {
  args: {
    variant: { type: 'error' },
  },
};
