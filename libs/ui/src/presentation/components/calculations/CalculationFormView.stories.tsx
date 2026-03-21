import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm } from 'react-hook-form';
import { CalculationFormView } from './CalculationFormView';
import type { CalculationForm } from '../../../domain';

const walletOptions = [
  { label: 'Cash', value: 1 },
  { label: 'Bank Transfer', value: 2 },
  { label: 'QRIS', value: 3 },
];

const defaultValues: CalculationForm = {
  walletId: 1,
  totalWallet: 0,
  calculationItems: [],
};

const LoadedStory = () => {
  const form = useForm<CalculationForm>({ defaultValues });
  return (
    <CalculationFormView
      variant={{ type: 'loaded' }}
      form={form}
      onSubmit={fn()}
      walletSelectOptions={walletOptions}
      getTotalWallet={(totalWallet) => totalWallet}
      isSubmitDisabled={false}
      onRetryButtonPress={fn()}
    />
  );
};

const PopulatedStory = () => {
  const form = useForm<CalculationForm>({
    defaultValues: {
      walletId: 1,
      totalWallet: 5000000,
      calculationItems: [
        { price: 100000, amount: 10 },
        { price: 50000, amount: 20 },
        { price: 20000, amount: 50 },
      ],
    },
  });
  return (
    <CalculationFormView
      variant={{ type: 'loaded' }}
      form={form}
      onSubmit={fn()}
      walletSelectOptions={walletOptions}
      getTotalWallet={(totalWallet) => totalWallet}
      isSubmitDisabled={false}
      onRetryButtonPress={fn()}
    />
  );
};

const meta: Meta<typeof CalculationFormView> = {
  title: 'Features/Calculations/CalculationFormView',
  component: CalculationFormView,
};

export default meta;
type Story = StoryObj<typeof CalculationFormView>;

export const Loaded: Story = {
  render: () => <LoadedStory />,
};

export const Populated: Story = {
  render: () => <PopulatedStory />,
};

export const Loading: Story = {
  render: () => {
    const form = useForm<CalculationForm>({ defaultValues });
    return (
      <CalculationFormView
        variant={{ type: 'loading' }}
        form={form}
        onSubmit={fn()}
        walletSelectOptions={walletOptions}
        getTotalWallet={(totalWallet) => totalWallet}
        isSubmitDisabled={true}
        onRetryButtonPress={fn()}
      />
    );
  },
};

export const Disabled: Story = {
  render: () => {
    const form = useForm<CalculationForm>({
      defaultValues: {
        walletId: 1,
        totalWallet: 5000000,
        calculationItems: [{ price: 100000, amount: 10 }],
      },
    });
    return (
      <CalculationFormView
        variant={{ type: 'loaded' }}
        form={form}
        onSubmit={fn()}
        walletSelectOptions={walletOptions}
        getTotalWallet={(totalWallet) => totalWallet}
        isSubmitDisabled={false}
        isFormDisabled={true}
        onRetryButtonPress={fn()}
      />
    );
  },
};
