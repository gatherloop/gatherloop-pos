import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TableList } from './TableList';
import { mockTables } from '../../../../.storybook/mocks/mockData';

const defaultArgs = {
  onRetryButtonPress: fn(),
  onDeleteMenuPress: fn(),
  onEditMenuPress: fn(),
  onItemPress: fn(),
};

const meta: Meta<typeof TableList> = {
  title: 'Features/Tables/TableList',
  component: TableList,
  args: defaultArgs,
};

export default meta;
type Story = StoryObj<typeof TableList>;

export const Loaded: Story = {
  args: {
    variant: { type: 'loaded', tables: mockTables },
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
