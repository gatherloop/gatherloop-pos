import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TagCreateScreen } from './TagCreateScreen';

const meta: Meta<typeof TagCreateScreen> = {
  title: 'Screens/POS/TagCreateScreen',
  component: TagCreateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof TagCreateScreen>;

export const Default: Story = {
  args: {
    defaultValues: {
      name: '',
      color: 'gray',
      isHighlighted: false,
      sortOrder: 0,
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
    isSubmitDisabled: true,
    variant: { type: 'loading' },
  },
};
