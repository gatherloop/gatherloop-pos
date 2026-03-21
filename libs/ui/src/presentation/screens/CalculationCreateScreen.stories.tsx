import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm } from 'react-hook-form';
import { CalculationCreateScreen } from './CalculationCreateScreen';
import type { CalculationForm } from '../../domain';
import { mockWallets } from '../../../.storybook/mocks/mockData';

const walletSelectOptions = mockWallets.map((w) => ({ label: w.name, value: w.id }));

const defaultValues: CalculationForm = {
  walletId: 1,
  totalWallet: 0,
  calculationItems: [],
};

const CreateStory = () => {
  const form = useForm<CalculationForm>({ defaultValues });
  return (
    <CalculationCreateScreen
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={false}
      onLogoutPress={fn()}
      onRetryButtonPress={fn()}
      getTotalWallet={fn(() => 0)}
      variant={{ type: 'loaded' }}
      walletSelectOptions={walletSelectOptions}
    />
  );
};

const LoadingStory = () => {
  const form = useForm<CalculationForm>({ defaultValues });
  return (
    <CalculationCreateScreen
      form={form}
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

const meta: Meta<typeof CalculationCreateScreen> = {
  title: 'Screens/Calculations/CalculationCreateScreen',
  component: CalculationCreateScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof CalculationCreateScreen>;

export const Default: Story = { render: () => <CreateStory /> };
export const Loading: Story = { render: () => <LoadingStory /> };
