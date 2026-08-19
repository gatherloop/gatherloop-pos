import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TableListItem } from './TableListItem';

const meta: Meta<typeof TableListItem> = {
  title: 'Features/Tables/TableListItem',
  component: TableListItem,
  args: {
    code: '3F7H9K2M5P',
    label: 'Meja 01',
    floorNumber: 1,
    onEditMenuPress: fn(),
    onDeleteMenuPress: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof TableListItem>;

export const Default: Story = {};

export const WithoutMenus: Story = {
  args: {
    onEditMenuPress: undefined,
    onDeleteMenuPress: undefined,
  },
};
