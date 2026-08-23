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

// PRD docs/prd-stock-check-form-mobile.md FR-7 (Phase 5): the content well
// drops from `$5` to `$3` padding at `$sm` (≤800px) — 40dp to 24dp on a
// 360dp phone. Compared side-by-side with `Default` (which renders at the
// `desktop` viewport unaffected), this story is the visual record that the
// well shrinks on compact and stays put above the breakpoint.
export const CompactPadding: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
  render: (args) => <Layout {...args}>{defaultChildren}</Layout>,
};
