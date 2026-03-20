import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Paragraph } from 'tamagui';
import { Tabs } from './Tabs';

const meta: Meta<typeof Tabs> = {
  title: 'Base/Tabs',
  component: Tabs,
  args: {
    defaultValue: 'tab1',
    tabs: [
      {
        value: 'tab1',
        label: 'Overview',
        content: <Paragraph padding="$3">Overview content goes here.</Paragraph>,
      },
      {
        value: 'tab2',
        label: 'Details',
        content: <Paragraph padding="$3">Details content goes here.</Paragraph>,
      },
      {
        value: 'tab3',
        label: 'History',
        content: <Paragraph padding="$3">History content goes here.</Paragraph>,
      },
    ],
  },
};

export default meta;
type Story = StoryObj<typeof Tabs>;

export const Default: Story = {};

export const SecondTabActive: Story = {
  args: {
    defaultValue: 'tab2',
  },
};

export const WithHiddenTab: Story = {
  args: {
    tabs: [
      {
        value: 'tab1',
        label: 'Visible Tab',
        content: <Paragraph padding="$3">This tab is visible.</Paragraph>,
      },
      {
        value: 'tab2',
        label: 'Hidden Tab',
        content: <Paragraph padding="$3">This tab is hidden.</Paragraph>,
        isShown: false,
      },
      {
        value: 'tab3',
        label: 'Another Tab',
        content: <Paragraph padding="$3">Another visible tab.</Paragraph>,
      },
    ],
  },
};

export const TwoTabs: Story = {
  args: {
    tabs: [
      {
        value: 'info',
        label: 'Info',
        content: <Paragraph padding="$3">Information content.</Paragraph>,
      },
      {
        value: 'settings',
        label: 'Settings',
        content: <Paragraph padding="$3">Settings content.</Paragraph>,
      },
    ],
    defaultValue: 'info',
  },
};
