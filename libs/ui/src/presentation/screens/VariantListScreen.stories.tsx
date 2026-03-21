import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { VariantListScreen } from './VariantListScreen';
import { mockVariants } from '../../../.storybook/mocks/mockData';

const defaultArgs = {
  onLogoutPress: fn(),
  onEditMenuPress: fn(),
  onDeleteMenuPress: fn(),
  onItemPress: fn(),
  onRetryButtonPress: fn(),
  variants: mockVariants,
  searchValue: '',
  onSearchValueChange: fn(),
  currentPage: 1,
  onPageChange: fn(),
  totalItem: 2,
  itemPerPage: 10,
  isDeleteModalOpen: false,
  isDeleteButtonDisabled: false,
  onDeleteCancel: fn(),
  onDeleteConfirm: fn(),
};

const meta: Meta<typeof VariantListScreen> = {
  title: 'Screens/Variants/VariantListScreen',
  component: VariantListScreen,
  parameters: { layout: 'fullscreen' },
  args: defaultArgs,
};

export default meta;
type Story = StoryObj<typeof VariantListScreen>;

export const Loaded: Story = {
  args: { variant: { type: 'loaded', items: mockVariants } },
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
    variant: { type: 'loaded', items: mockVariants },
    isDeleteModalOpen: true,
  },
};
