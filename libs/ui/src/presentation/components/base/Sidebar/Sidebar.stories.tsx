import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { Sidebar } from './Sidebar';

const meta: Meta<typeof Sidebar> = {
  title: 'Base/Sidebar',
  component: Sidebar,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    onLogoutPress: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof Sidebar>;

export const Default: Story = {};

export const WithLogoutHandler: Story = {
  args: {
    onLogoutPress: fn(),
  },
};
