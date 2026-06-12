import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TicketListItem } from './TicketListItem';

const meta: Meta<typeof TicketListItem> = {
  title: 'Features/Tickets/TicketListItem',
  component: TicketListItem,
  args: {
    code: '0xA3F19C82',
    name: 'Ticket 01',
    onEditMenuPress: fn(),
    onDeleteMenuPress: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof TicketListItem>;

export const Default: Story = {};

export const WithoutMenus: Story = {
  args: {
    onEditMenuPress: undefined,
    onDeleteMenuPress: undefined,
  },
};
