import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { CategoryUpdateScreen } from './CategoryUpdateScreen';

const meta: Meta<typeof CategoryUpdateScreen> = {
  title: 'Screens/Categories/CategoryUpdateScreen',
  component: CategoryUpdateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof CategoryUpdateScreen>;

export const Default: Story = {
  args: {
    defaultValues: { name: 'Beverages', station: 'BAR' },
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
    defaultValues: { name: '', station: 'NONE' },
    isSubmitDisabled: true,
    variant: { type: 'loading' },
  },
};
