import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Paragraph, Text, XStack, YStack } from 'tamagui';
import { OrderLayout } from './OrderLayout';

const meta: Meta<typeof OrderLayout> = {
  title: 'Base/OrderLayout',
  component: OrderLayout,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof OrderLayout>;

export const Default: Story = {
  render: () => (
    <OrderLayout>
      <Paragraph>Menu content goes here.</Paragraph>
      <Paragraph>Single column, capped at phone width, D18.</Paragraph>
    </OrderLayout>
  ),
};

export const WithHeaderAndFooter: Story = {
  render: () => (
    <OrderLayout
      header={
        <XStack padding="$4" backgroundColor="$color2">
          <Text fontWeight="bold">Meja 1</Text>
        </XStack>
      }
      footer={
        <YStack padding="$4" backgroundColor="$color2">
          <Text>2 items · Rp 45.000 · Lihat keranjang</Text>
        </YStack>
      }
    >
      <Paragraph>Menu content scrolls between the sticky header and the floating cart bar.</Paragraph>
    </OrderLayout>
  ),
};

// FR-1 in docs/prd-order-app-ux-improvements.md: 30+ items on a 375×667
// viewport. The footer must stay pinned to the bottom of the viewport while
// this content scrolls behind it, and the last item must be fully readable
// rather than trapped under the bar.
export const LongContentWithFooter: Story = {
  parameters: {
    viewport: { defaultViewport: 'mobile' },
  },
  render: () => (
    <OrderLayout
      header={
        <XStack padding="$4" backgroundColor="$color2">
          <Text fontWeight="bold">Meja 1 · Lantai 2</Text>
        </XStack>
      }
      footer={
        <YStack padding="$4" backgroundColor="$color2">
          <Text>3 item · Rp 87.000 · Lihat Keranjang</Text>
        </YStack>
      }
    >
      {Array.from({ length: 30 }, (_, index) => (
        <Paragraph key={index}>Menu item {index + 1} of 30.</Paragraph>
      ))}
    </OrderLayout>
  ),
};
