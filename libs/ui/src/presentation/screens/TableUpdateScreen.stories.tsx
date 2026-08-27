import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TableUpdateScreen } from './TableUpdateScreen';
import { mockTable } from '../../../.storybook/mocks/mockData';

const meta: Meta<typeof TableUpdateScreen> = {
  title: 'Screens/Tables/TableUpdateScreen',
  component: TableUpdateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof TableUpdateScreen>;

export const Default: Story = {
  args: {
    defaultValues: {
      label: mockTable.label,
      floorNumber: mockTable.floorNumber,
    },
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
    variant: { type: 'loaded' },
    table: mockTable,
  },
};

export const Loading: Story = {
  args: {
    ...Default.args,
    isSubmitDisabled: true,
    variant: { type: 'loading' },
    table: null,
  },
};

export const RegenerateAlertOpen: Story = {
  args: {
    ...Default.args,
    isRegenerateAlertOpen: true,
  },
};
