import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ErrorView } from './EmptyView';

const meta: Meta<typeof ErrorView> = {
  title: 'Base/ErrorView',
  component: ErrorView,
  args: {
    title: 'Something Went Wrong',
    subtitle: 'An error occurred while loading data.',
    onRetryButtonPress: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ErrorView>;

export const Default: Story = {};

export const NetworkError: Story = {
  args: {
    title: 'Network Error',
    subtitle: 'Please check your internet connection and try again.',
  },
};

export const NotFound: Story = {
  args: {
    title: 'Not Found',
    subtitle: 'The requested resource could not be found.',
  },
};
