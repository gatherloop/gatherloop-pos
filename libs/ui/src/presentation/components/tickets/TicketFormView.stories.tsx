import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TicketFormView } from './TicketFormView';

const meta: Meta<typeof TicketFormView> = {
  title: 'Features/Tickets/TicketFormView',
  component: TicketFormView,
};

export default meta;
type Story = StoryObj<typeof TicketFormView>;

export const Loaded: Story = {
  args: {
    variant: { type: 'loaded' },
    defaultValues: { code: '', name: '' },
    onSubmit: fn(),
    isSubmitDisabled: false,
    isSubmitting: false,
  },
};

export const Populated: Story = {
  args: {
    ...Loaded.args,
    defaultValues: { code: '0xA3F19C82', name: 'Ticket 01' },
  },
};

export const Loading: Story = {
  args: {
    ...Loaded.args,
    variant: { type: 'loading' },
    isSubmitDisabled: true,
  },
};

export const Error: Story = {
  args: {
    ...Loaded.args,
    variant: { type: 'error', onRetryButtonPress: fn() },
    isSubmitDisabled: true,
  },
};

export const SubmitDisabled: Story = {
  args: {
    ...Loaded.args,
    isSubmitDisabled: true,
  },
};

export const Submitting: Story = {
  args: {
    ...Loaded.args,
    isSubmitDisabled: true,
    isSubmitting: true,
  },
};
