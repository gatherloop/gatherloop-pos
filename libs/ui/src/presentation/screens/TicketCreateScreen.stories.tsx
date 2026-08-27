import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TicketCreateScreen } from './TicketCreateScreen';

const meta: Meta<typeof TicketCreateScreen> = {
  title: 'Screens/Tickets/TicketCreateScreen',
  component: TicketCreateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof TicketCreateScreen>;

export const Default: Story = {
  args: {
    defaultValues: { code: '', name: '' },
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
