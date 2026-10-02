import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TagList } from './TagList';
import { mockTags } from '../../../../../.storybook/mocks/mockData';

const defaultArgs = {
  onRetryButtonPress: fn(),
  onDeleteMenuPress: fn(),
  onEditMenuPress: fn(),
  onAssignMenuPress: fn(),
  onItemPress: fn(),
};

const meta: Meta<typeof TagList> = {
  title: 'Components/Tags/TagList',
  component: TagList,
  args: defaultArgs,
};

export default meta;
type Story = StoryObj<typeof TagList>;

export const Loaded: Story = {
  args: {
    variant: { type: 'loaded', tags: mockTags },
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
