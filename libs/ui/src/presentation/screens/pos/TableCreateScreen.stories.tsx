import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TableCreateScreen } from './TableCreateScreen';

const meta: Meta<typeof TableCreateScreen> = {
  title: 'Screens/Tables/TableCreateScreen',
  component: TableCreateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof TableCreateScreen>;

export const Default: Story = {
  args: {
    defaultValues: { label: '', floorNumber: 1 },
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
