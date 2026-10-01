import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TagUpdateScreen } from './TagUpdateScreen';

const meta: Meta<typeof TagUpdateScreen> = {
  title: 'Screens/POS/TagUpdateScreen',
  component: TagUpdateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof TagUpdateScreen>;

export const Default: Story = {
  args: {
    defaultValues: {
      name: 'Best Seller',
      color: 'orange',
      isHighlighted: true,
      sortOrder: 2,
    },
    onSubmit: fn(),
    isSubmitDisabled: false,
    isSubmitting: false,
    onLogoutPress: fn(),
    variant: { type: 'loaded' },
  },
};

export const Loading: Story = {
  args: {
    ...Default.args,
    defaultValues: {
      name: '',
      color: 'gray',
      isHighlighted: false,
      sortOrder: 0,
    },
    isSubmitDisabled: true,
    variant: { type: 'loading' },
  },
};
