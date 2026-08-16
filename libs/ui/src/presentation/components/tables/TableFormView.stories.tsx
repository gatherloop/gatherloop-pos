import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm } from 'react-hook-form';
import { TableFormView } from './TableFormView';
import type { TableForm } from '../../../domain';

const defaultValues: TableForm = {
  label: '',
};

const LoadedStory = () => {
  const form = useForm<TableForm>({ defaultValues });
  return (
    <TableFormView
      variant={{ type: 'loaded' }}
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={false}
      isSubmitting={false}
    />
  );
};

const PopulatedStory = () => {
  const form = useForm<TableForm>({
    defaultValues: { label: 'Meja 01' },
  });
  return (
    <TableFormView
      variant={{ type: 'loaded' }}
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={false}
      isSubmitting={false}
    />
  );
};

const meta: Meta<typeof TableFormView> = {
  title: 'Features/Tables/TableFormView',
  component: TableFormView,
};

export default meta;
type Story = StoryObj<typeof TableFormView>;

export const Loaded: Story = {
  render: () => <LoadedStory />,
};

export const Populated: Story = {
  render: () => <PopulatedStory />,
};

const LoadingStory = () => {
  const form = useForm<TableForm>({ defaultValues });
  return (
    <TableFormView
      variant={{ type: 'loading' }}
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={true}
      isSubmitting={false}
    />
  );
};

const ErrorStory = () => {
  const form = useForm<TableForm>({ defaultValues });
  return (
    <TableFormView
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
