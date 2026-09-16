import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { AvailabilityMovement } from '../../../../domain';
import { AvailabilityMovementHistorySheet } from './AvailabilityMovementHistorySheet';

const movements: AvailabilityMovement[] = [
  {
    id: 1,
    variantId: 4,
    delta: -2,
    resultingQuantity: 4,
    reason: 'sale',
    transactionId: 501,
    createdAt: '2024-01-01T08:15:00.000Z',
  },
  {
    id: 2,
    variantId: 4,
    reason: 'switched_off',
    createdAt: '2024-01-01T07:00:00.000Z',
  },
  {
    id: 3,
    variantId: 4,
    delta: 6,
    resultingQuantity: 6,
    reason: 'manual_set',
    createdAt: '2024-01-01T06:00:00.000Z',
  },
];

const meta: Meta<typeof AvailabilityMovementHistorySheet> = {
  title: 'Components/Availability/AvailabilityMovementHistorySheet',
  component: AvailabilityMovementHistorySheet,
};

export default meta;
type Story = StoryObj<typeof AvailabilityMovementHistorySheet>;

export const Loaded: Story = {
  args: {
    isOpen: true,
    title: 'Choco history',
    variant: 'loaded',
    movements,
    onClose: fn(),
    onRetryPress: fn(),
  },
};

export const Empty: Story = {
  args: {
    ...Loaded.args,
    movements: [],
  },
};

export const Loading: Story = {
  args: {
    ...Loaded.args,
    variant: 'loading',
  },
};

export const ErrorState: Story = {
  args: {
    ...Loaded.args,
    variant: 'error',
    errorMessage: 'Failed to fetch availability history',
  },
};
