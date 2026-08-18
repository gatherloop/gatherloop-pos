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

export const Resolved: Story = {
  args: {
    variant: { type: 'resolved', table: { id: 1, label: 'Meja 01' } },
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
