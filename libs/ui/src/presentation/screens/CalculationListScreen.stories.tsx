import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { CalculationListScreen } from './CalculationListScreen';
import { mockCalculations } from '../../../.storybook/mocks/mockData';

const defaultArgs = {
  onLogoutPress: fn(),
  onEditMenuPress: fn(),
  onDeleteMenuPress: fn(),
  onCompleteMenuPress: fn(),
  onItemPress: fn(),
  onRetryButtonPress: fn(),
  isDeleteModalOpen: false,
  isDeleteButtonDisabled: false,
  onDeleteCancel: fn(),
  onDeleteButtonConfirmPress: fn(),
  isCompleteModalOpen: false,
  isCompleteButtonDisabled: false,
  onCompleteCancel: fn(),
  onCompleteButtonConfirmPress: fn(),
};

const meta: Meta<typeof CalculationListScreen> = {
  title: 'Screens/Calculations/CalculationListScreen',
  component: CalculationListScreen,
  parameters: { layout: 'fullscreen' },
  args: defaultArgs,
};

export default meta;
type Story = StoryObj<typeof CalculationListScreen>;

export const Loaded: Story = {
  args: { variant: { type: 'loaded', items: mockCalculations } },
};

export const Loading: Story = {
  args: { variant: { type: 'loading' } },
};

export const Empty: Story = {
  args: { variant: { type: 'empty' } },
};

export const Error: Story = {
  args: { variant: { type: 'error' } },
};

export const DeleteModalOpen: Story = {
  args: {
    variant: { type: 'loaded', items: mockCalculations },
    isDeleteModalOpen: true,
  },
};

export const CompleteModalOpen: Story = {
  args: {
    variant: { type: 'loaded', items: mockCalculations },
    isCompleteModalOpen: true,
  },
};
