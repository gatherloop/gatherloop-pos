import type { Meta, StoryObj } from '@storybook/react';
import { Paragraph } from 'tamagui';
import { TableResolveScreen } from './TableResolveScreen';

const meta: Meta<typeof TableResolveScreen> = {
  title: 'Order/TableResolveScreen',
  component: TableResolveScreen,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof TableResolveScreen>;

export const Resolving: Story = {
  args: {
    variant: { type: 'resolving' },
  },
};

export const ResolvedFloor1: Story = {
  args: {
    variant: {
      type: 'resolved',
      table: { id: 1, label: 'Meja 01', floorNumber: 1 },
    },
    children: <Paragraph>Menu akan segera hadir di sini.</Paragraph>,
  },
};

export const ResolvedFloor2: Story = {
  args: {
    variant: {
      type: 'resolved',
      table: { id: 2, label: 'Meja 03', floorNumber: 2 },
    },
    children: <Paragraph>Menu akan segera hadir di sini.</Paragraph>,
  },
};

// A long label proves the muted floor text wraps to a second line rather
// than pushing off-screen (FR-8).
export const ResolvedLongLabel: Story = {
  args: {
    variant: {
      type: 'resolved',
      table: {
        id: 3,
        label: 'Meja VIP Lantai Atas Dekat Jendela',
        floorNumber: 2,
      },
    },
    children: <Paragraph>Menu akan segera hadir di sini.</Paragraph>,
  },
};

// D6: a fabricated or deleted table code lands here instead of silently
// opening an orderable menu.
export const InvalidQr: Story = {
  args: {
    variant: { type: 'invalidQr' },
  },
};

// D17: landing on `/order` with no code at all.
export const NoQr: Story = {
  args: {
    variant: { type: 'noQr' },
  },
};

export const Error: Story = {
  args: {
    variant: { type: 'error', onRetryButtonPress: () => undefined },
  },
};
