import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TicketUpdateScreen } from './TicketUpdateScreen';

const meta: Meta<typeof TicketUpdateScreen> = {
  title: 'Screens/Tickets/TicketUpdateScreen',
  component: TicketUpdateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof TicketUpdateScreen>;

export const Default: Story = {
  args: {
    defaultValues: { code: '0xA3F19C82', name: 'Ticket 01' },
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
    defaultValues: { code: '', name: '' },
    isSubmitDisabled: true,
    variant: { type: 'loading' },
  },
};
