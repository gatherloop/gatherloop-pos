import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { CategoryListScreen } from './CategoryListScreen';
import { mockCategories } from '../../../.storybook/mocks/mockData';

const defaultArgs = {
  onLogoutPress: fn(),
  onEditMenuPress: fn(),
  onDeleteMenuPress: fn(),
  onItemPress: fn(),
  onRetryButtonPress: fn(),
  isDeleteButtonDisabled: false,
  isDeleteModalOpen: false,
  onDeleteCancel: fn(),
  onDeleteConfirm: fn(),
};

const meta: Meta<typeof CategoryListScreen> = {
  title: 'Screens/Categories/CategoryListScreen',
  component: CategoryListScreen,
  parameters: { layout: 'fullscreen' },
  args: defaultArgs,
};

export default meta;
type Story = StoryObj<typeof CategoryListScreen>;

export const Loaded: Story = {
  args: { variant: { type: 'loaded', items: mockCategories } },
};

export const Loading: Story = {
  args: { variant: { type: 'loading' } },
};

export const Empty: Story = {
  args: { variant: { type: 'empty' } },
};

export const Error: Story = {
  args: { variant: { type: 'error' } },
};

export const DeleteModalOpen: Story = {
  args: {
    variant: { type: 'loaded', items: mockCategories },
    isDeleteModalOpen: true,
  },
};
