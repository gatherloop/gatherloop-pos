import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { CalculationList } from './CalculationList';
import { mockCalculations } from '../../../../.storybook/mocks/mockData';

const defaultArgs = {
  onRetryButtonPress: fn(),
  onEditMenuPress: fn(),
  onDeleteMenuPress: fn(),
  onCompleteMenuPress: fn(),
  onItemPress: fn(),
};

const meta: Meta<typeof CalculationList> = {
  title: 'Features/Calculations/CalculationList',
  component: CalculationList,
  args: defaultArgs,
};

export default meta;
type Story = StoryObj<typeof CalculationList>;

export const Loaded: Story = {
  args: {
    variant: { type: 'loaded', items: mockCalculations },
  },
};

export const Loading: Story = {
  args: {
    variant: { type: 'loading' },
  },
};

export const Error: Story = {
  args: {
    variant: { type: 'error' },
  },
};
