import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm } from 'react-hook-form';
import { TableCreateScreen } from './TableCreateScreen';
import type { TableForm } from '../../domain';

const defaultValues: TableForm = { label: '', floorNumber: 1 };

const CreateStory = () => {
  const form = useForm<TableForm>({ defaultValues });
  return (
    <TableCreateScreen
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
  const form = useForm<TableForm>({ defaultValues });
  return (
    <TableCreateScreen
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={true}
      isSubmitting={false}
      onLogoutPress={fn()}
      variant={{ type: 'loading' }}
    />
  );
};

const meta: Meta<typeof TableCreateScreen> = {
  title: 'Screens/Tables/TableCreateScreen',
  component: TableCreateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof TableCreateScreen>;

export const Default: Story = { render: () => <CreateStory /> };
export const Loading: Story = { render: () => <LoadingStory /> };
