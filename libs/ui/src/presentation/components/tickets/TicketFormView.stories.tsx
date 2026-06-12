import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm } from 'react-hook-form';
import { TicketFormView } from './TicketFormView';
import type { TicketForm } from '../../../domain';

const defaultValues: TicketForm = {
  code: '',
  name: '',
};

const LoadedStory = () => {
  const form = useForm<TicketForm>({ defaultValues });
  return (
    <TicketFormView
      variant={{ type: 'loaded' }}
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={false}
      isSubmitting={false}
    />
  );
};

const PopulatedStory = () => {
  const form = useForm<TicketForm>({
    defaultValues: { code: '0xA3F19C82', name: 'Ticket 01' },
  });
  return (
    <TicketFormView
      variant={{ type: 'loaded' }}
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={false}
      isSubmitting={false}
    />
  );
};

const meta: Meta<typeof TicketFormView> = {
  title: 'Features/Tickets/TicketFormView',
  component: TicketFormView,
};

export default meta;
type Story = StoryObj<typeof TicketFormView>;

export const Loaded: Story = {
  render: () => <LoadedStory />,
};

export const Populated: Story = {
  render: () => <PopulatedStory />,
};

const LoadingStory = () => {
  const form = useForm<TicketForm>({ defaultValues });
  return (
    <TicketFormView
      variant={{ type: 'loading' }}
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={true}
      isSubmitting={false}
    />
  );
};

const ErrorStory = () => {
  const form = useForm<TicketForm>({ defaultValues });
  return (
    <TicketFormView
      variant={{ type: 'error', onRetryButtonPress: fn() }}
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={true}
      isSubmitting={false}
    />
  );
};

export const Loading: Story = {
  render: () => <LoadingStory />,
};

export const Error: Story = {
  render: () => <ErrorStory />,
};
