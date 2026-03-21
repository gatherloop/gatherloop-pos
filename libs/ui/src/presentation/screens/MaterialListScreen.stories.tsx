import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { MaterialListScreen } from './MaterialListScreen';
import { mockMaterials } from '../../../.storybook/mocks/mockData';

const defaultArgs = {
  onLogoutPress: fn(),
  onEditMenuPress: fn(),
  onDeleteMenuPress: fn(),
  onItemPress: fn(),
  onRetryButtonPress: fn(),
  searchValue: '',
  onSearchValueChange: fn(),
  currentPage: 1,
  onPageChange: fn(),
  totalItem: 3,
  itemPerPage: 10,
  isDeleteModalOpen: false,
  isDeleteButtonDisabled: false,
  onDeleteCancel: fn(),
  onDeleteConfirm: fn(),
};

const meta: Meta<typeof MaterialListScreen> = {
  title: 'Screens/Materials/MaterialListScreen',
  component: MaterialListScreen,
  parameters: { layout: 'fullscreen' },
  args: defaultArgs,
};

export default meta;
type Story = StoryObj<typeof MaterialListScreen>;

export const Loaded: Story = {
  args: { variant: { type: 'loaded', items: mockMaterials } },
};

export const Loading: Story = {
  args: { variant: { type: 'loading' } },
};

export const Empty: Story = {
  args: { variant: { type: 'empty' }, totalItem: 0 },
};

export const Error: Story = {
  args: { variant: { type: 'error' } },
};

export const DeleteModalOpen: Story = {
  args: {
    variant: { type: 'loaded', items: mockMaterials },
    isDeleteModalOpen: true,
  },
};
