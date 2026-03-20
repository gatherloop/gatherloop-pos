import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { Button, Paragraph, YStack } from 'tamagui';
import { Plus } from '@tamagui/lucide-icons';
import { Layout } from './Layout';

const defaultChildren = (
  <YStack flex={1} gap="$3">
    <Paragraph>Page content goes here.</Paragraph>
    <Paragraph>
      This is a sample layout with a sidebar, navbar, and main content area.
    </Paragraph>
  </YStack>
);

const meta: Meta<typeof Layout> = {
  title: 'Base/Layout',
  component: Layout,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    title: 'Dashboard',
    onLogoutPress: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof Layout>;

export const Default: Story = {
  render: (args) => <Layout {...args}>{defaultChildren}</Layout>,
};

export const WithBackButton: Story = {
  args: {
    title: 'Product Detail',
    showBackButton: true,
  },
  render: (args) => <Layout {...args}>{defaultChildren}</Layout>,
};

export const WithRightAction: Story = {
  args: {
    title: 'Products',
  },
  render: (args) => (
    <Layout
      {...args}
      rightActionItem={
        <Button icon={Plus} size="$3" onPress={fn()}>
          Add Product
        </Button>
      }
    >
      {defaultChildren}
    </Layout>
  ),
};

export const ProductsPage: Story = {
  args: {
    title: 'Products',
  },
  render: (args) => (
    <Layout
      {...args}
      rightActionItem={
        <Button icon={Plus} size="$3" onPress={fn()}>
          Add Product
        </Button>
      }
    >
      <YStack flex={1} gap="$3">
        <Paragraph fontWeight="bold">Product List</Paragraph>
        <Paragraph>10 items found</Paragraph>
      </YStack>
    </Layout>
  ),
};
