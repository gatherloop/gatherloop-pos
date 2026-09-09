import type { Meta, StoryObj } from '@storybook/react';
import { TableScanScreen } from './TableScanScreen';

const meta: Meta<typeof TableScanScreen> = {
  title: 'Screens/Order/TableScanScreen',
  component: TableScanScreen,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof TableScanScreen>;

export const Default: Story = {};
