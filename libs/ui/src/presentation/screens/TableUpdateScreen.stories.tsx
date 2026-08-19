import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm } from 'react-hook-form';
import { TableUpdateScreen } from './TableUpdateScreen';
import type { TableForm } from '../../domain';
import { mockTable } from '../../../.storybook/mocks/mockData';

const defaultValues: TableForm = {
  label: mockTable.label,
  floorNumber: mockTable.floorNumber,
};

const defaultProps = {
  onSubmit: fn(),
  isSubmitDisabled: false,
  isSubmitting: false,
  onLogoutPress: fn(),
  onPrintPress: fn(),
  onRegenerateCodePress: fn(),
  isRegenerateAlertOpen: false,
  isRegenerateButtonDisabled: false,
  onRegenerateCancel: fn(),
  onRegenerateConfirm: fn(),
};

const LoadedStory = () => {
  const form = useForm<TableForm>({ defaultValues });
  return (
    <TableUpdateScreen
      {...defaultProps}
      form={form}
      variant={{ type: 'loaded' }}
      table={mockTable}
    />
  );
};

const LoadingStory = () => {
  const form = useForm<TableForm>({ defaultValues });
  return (
    <TableUpdateScreen
      {...defaultProps}
      form={form}
      isSubmitDisabled={true}
      variant={{ type: 'loading' }}
      table={null}
    />
  );
};

const RegenerateAlertOpenStory = () => {
  const form = useForm<TableForm>({ defaultValues });
  return (
    <TableUpdateScreen
      {...defaultProps}
      form={form}
      variant={{ type: 'loaded' }}
      table={mockTable}
      isRegenerateAlertOpen
    />
  );
};

const meta: Meta<typeof TableUpdateScreen> = {
  title: 'Screens/Tables/TableUpdateScreen',
  component: TableUpdateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof TableUpdateScreen>;

export const Default: Story = { render: () => <LoadedStory /> };
export const Loading: Story = { render: () => <LoadingStory /> };
export const RegenerateAlertOpen: Story = {
  render: () => <RegenerateAlertOpenStory />,
};
