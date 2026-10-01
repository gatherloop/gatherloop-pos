import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TagListScreen } from './TagListScreen';
import { mockTags } from '../../../../../.storybook/mocks/mockData';

const defaultArgs = {
  onLogoutPress: fn(),
  onEditMenuPress: fn(),
  onAssignMenuPress: fn(),
  onDeleteMenuPress: fn(),
  onItemPress: fn(),
  onRetryButtonPress: fn(),
  isDeleteButtonDisabled: false,
  isDeleteModalOpen: false,
  onDeleteCancel: fn(),
  onDeleteConfirm: fn(),
};

const meta: Meta<typeof TagListScreen> = {
  title: 'Screens/POS/TagListScreen',
  component: TagListScreen,
  parameters: { layout: 'fullscreen' },
  args: defaultArgs,
};

export default meta;
type Story = StoryObj<typeof TagListScreen>;

export const Loaded: Story = {
  args: { variant: { type: 'loaded', tags: mockTags } },
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
    variant: { type: 'loaded', tags: mockTags },
    isDeleteModalOpen: true,
    deleteVariantCount: 5,
  },
};
