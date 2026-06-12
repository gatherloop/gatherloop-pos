import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm } from 'react-hook-form';
import { TicketUpdateScreen } from './TicketUpdateScreen';
import type { TicketForm } from '../../domain';

const UpdateStory = () => {
  const form = useForm<TicketForm>({
    defaultValues: { code: '0xA3F19C82', name: 'Ticket 01' },
  });
  return (
    <TicketUpdateScreen
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
  const form = useForm<TicketForm>({ defaultValues: { code: '', name: '' } });
  return (
    <TicketUpdateScreen
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={true}
      isSubmitting={false}
      onLogoutPress={fn()}
      variant={{ type: 'loading' }}
    />
  );
};

const meta: Meta<typeof TicketUpdateScreen> = {
  title: 'Screens/Tickets/TicketUpdateScreen',
  component: TicketUpdateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof TicketUpdateScreen>;

export const Default: Story = { render: () => <UpdateStory /> };
export const Loading: Story = { render: () => <LoadingStory /> };
