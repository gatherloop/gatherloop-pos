import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { BudgetCreateScreen } from './BudgetCreateScreen';

const meta: Meta<typeof BudgetCreateScreen> = {
  title: 'Screens/Budgets/BudgetCreateScreen',
  component: BudgetCreateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof BudgetCreateScreen>;

export const Default: Story = {
  args: {
    defaultValues: { name: '', percentage: 0 },
    onSubmit: fn(),
    isSubmitDisabled: false,
    isSubmitting: false,
    onLogoutPress: fn(),
  },
};
