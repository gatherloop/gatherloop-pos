import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TableListScreen } from './TableListScreen';
import { mockTables } from '../../../.storybook/mocks/mockData';

const defaultArgs = {
  onLogoutPress: fn(),
  onEditMenuPress: fn(),
  onDeleteMenuPress: fn(),
  onItemPress: fn(),
  onRetryButtonPress: fn(),
  isDeleteModalOpen: false,
  isDeleteButtonDisabled: false,
  onDeleteCancel: fn(),
  onDeleteConfirm: fn(),
};

const meta: Meta<typeof TableListScreen> = {
  title: 'Screens/Tables/TableListScreen',
  component: TableListScreen,
  parameters: { layout: 'fullscreen' },
  args: defaultArgs,
};

export default meta;
type Story = StoryObj<typeof TableListScreen>;

export const Loaded: Story = {
  args: { variant: { type: 'loaded', tables: mockTables } },
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
    variant: { type: 'loaded', tables: mockTables },
    isDeleteModalOpen: true,
  },
};
