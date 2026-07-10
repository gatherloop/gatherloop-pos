import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { H4 } from 'tamagui';
import { DashboardScreen } from './DashboardScreen';

const meta: Meta<typeof DashboardScreen> = {
  title: 'Screens/Dashboard/DashboardScreen',
  component: DashboardScreen,
  parameters: { layout: 'fullscreen' },
  args: {
    onLogoutPress: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof DashboardScreen>;

export const Loaded: Story = {
  args: {
    children: <H4>Example Widget</H4>,
  },
};
