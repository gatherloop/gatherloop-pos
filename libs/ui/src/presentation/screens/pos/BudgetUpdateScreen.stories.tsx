import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { BudgetUpdateScreen } from './BudgetUpdateScreen';

const meta: Meta<typeof BudgetUpdateScreen> = {
  title: 'Screens/Budgets/BudgetUpdateScreen',
  component: BudgetUpdateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof BudgetUpdateScreen>;

export const Default: Story = {
  args: {
    defaultValues: { name: 'Restock', percentage: 30 },
    onSubmit: fn(),
    isSubmitDisabled: false,
    isSubmitting: false,
    onLogoutPress: fn(),
    variant: { type: 'loaded' },
  },
};

export const Loading: Story = {
  args: {
    ...Default.args,
    defaultValues: { name: '', percentage: 0 },
    isSubmitDisabled: true,
    variant: { type: 'loading' },
  },
};
