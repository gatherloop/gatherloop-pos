import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TicketList } from './TicketList';
import { mockTickets } from '../../../../.storybook/mocks/mockData';

const defaultArgs = {
  onRetryButtonPress: fn(),
  onDeleteMenuPress: fn(),
  onEditMenuPress: fn(),
  onItemPress: fn(),
};

const meta: Meta<typeof TicketList> = {
  title: 'Features/Tickets/TicketList',
  component: TicketList,
  args: defaultArgs,
};

export default meta;
type Story = StoryObj<typeof TicketList>;

export const Loaded: Story = {
  args: {
    variant: { type: 'loaded', tickets: mockTickets },
  },
};

export const Loading: Story = {
  args: {
    variant: { type: 'loading' },
  },
};

export const Empty: Story = {
  args: {
    variant: { type: 'empty' },
  },
};

export const Error: Story = {
  args: {
    variant: { type: 'error' },
  },
};
