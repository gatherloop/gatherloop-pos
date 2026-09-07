import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { CategoryCreateScreen } from './CategoryCreateScreen';

const meta: Meta<typeof CategoryCreateScreen> = {
  title: 'Screens/Categories/CategoryCreateScreen',
  component: CategoryCreateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof CategoryCreateScreen>;

export const Default: Story = {
  args: {
    defaultValues: { name: '', station: 'NONE' },
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
