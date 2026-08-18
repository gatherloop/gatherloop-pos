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
