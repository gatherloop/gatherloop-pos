import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TableQrCode } from './TableQrCode';

const meta: Meta<typeof TableQrCode> = {
  title: 'Features/Tables/TableQrCode',
  component: TableQrCode,
  args: {
    code: '3F7H9K2M5P',
    label: 'Meja 01',
    onPrintPress: fn(),
    onRegenerateCodePress: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof TableQrCode>;

export const Default: Story = {};

export const WithoutActions: Story = {
  args: {
    onPrintPress: undefined,
    onRegenerateCodePress: undefined,
  },
};
