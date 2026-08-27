import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { CalculationUpdateScreen } from './CalculationUpdateScreen';
import type { CalculationForm } from '../../domain';
import { mockWallets } from '../../../.storybook/mocks/mockData';

const walletSelectOptions = mockWallets.map((w) => ({ label: w.name, value: w.id }));

const updateDefaultValues: CalculationForm = {
  walletId: 1,
  totalWallet: 5000000,
  calculationItems: [
    { price: 100000, amount: 10 },
    { price: 50000, amount: 20 },
  ],
};

const loadingDefaultValues: CalculationForm = {
  walletId: 1,
  totalWallet: 0,
  calculationItems: [],
};

const UpdateStory = () => {
  return (
    <CalculationUpdateScreen
      defaultValues={updateDefaultValues}
      onSubmit={fn()}
      isSubmitDisabled={false}
      onLogoutPress={fn()}
      onRetryButtonPress={fn()}
      getTotalWallet={fn(() => 5000000)}
      variant={{ type: 'loaded' }}
      walletSelectOptions={walletSelectOptions}
    />
  );
};

const LoadingStory = () => {
  return (
    <CalculationUpdateScreen
      defaultValues={loadingDefaultValues}
      onSubmit={fn()}
      isSubmitDisabled={true}
      onLogoutPress={fn()}
      onRetryButtonPress={fn()}
      getTotalWallet={fn(() => 0)}
      variant={{ type: 'loading' }}
      walletSelectOptions={[]}
    />
  );
};

const meta: Meta<typeof CalculationUpdateScreen> = {
  title: 'Screens/Calculations/CalculationUpdateScreen',
  component: CalculationUpdateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof CalculationUpdateScreen>;

export const Default: Story = { render: () => <UpdateStory /> };
export const Loading: Story = { render: () => <LoadingStory /> };
