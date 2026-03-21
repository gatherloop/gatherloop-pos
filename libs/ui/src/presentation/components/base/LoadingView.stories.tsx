import type { Meta, StoryObj } from '@storybook/react';
import { LoadingView } from './LoadingView';

const meta: Meta<typeof LoadingView> = {
  title: 'Base/LoadingView',
  component: LoadingView,
  args: {
    title: 'Loading...',
  },
};

export default meta;
type Story = StoryObj<typeof LoadingView>;

export const Default: Story = {};

export const FetchingData: Story = {
  args: {
    title: 'Fetching data, please wait...',
  },
};

export const Saving: Story = {
  args: {
    title: 'Saving your changes...',
  },
};
