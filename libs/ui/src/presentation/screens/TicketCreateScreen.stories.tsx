import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm } from 'react-hook-form';
import { TicketCreateScreen } from './TicketCreateScreen';
import type { TicketForm } from '../../domain';

const defaultValues: TicketForm = { code: '', name: '' };

const CreateStory = () => {
  const form = useForm<TicketForm>({ defaultValues });
  return (
    <TicketCreateScreen
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={false}
      isSubmitting={false}
      onLogoutPress={fn()}
      variant={{ type: 'loaded' }}
    />
  );
};

const LoadingStory = () => {
  const form = useForm<TicketForm>({ defaultValues });
  return (
    <TicketCreateScreen
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={true}
      isSubmitting={false}
      onLogoutPress={fn()}
      variant={{ type: 'loading' }}
    />
  );
};

const meta: Meta<typeof TicketCreateScreen> = {
  title: 'Screens/Tickets/TicketCreateScreen',
  component: TicketCreateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof TicketCreateScreen>;

export const Default: Story = { render: () => <CreateStory /> };
export const Loading: Story = { render: () => <LoadingStory /> };
