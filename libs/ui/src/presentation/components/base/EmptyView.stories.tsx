import type { Meta, StoryObj } from '@storybook/react';
import { EmptyView } from './ErrorView';

const meta: Meta<typeof EmptyView> = {
  title: 'Base/EmptyView',
  component: EmptyView,
  args: {
    title: 'No Items Found',
    subtitle: 'There are no items to display at the moment.',
  },
};

export default meta;
type Story = StoryObj<typeof EmptyView>;

export const Default: Story = {};

export const CustomMessage: Story = {
  args: {
    title: 'Empty List',
    subtitle: 'Add your first item to get started.',
  },
};
