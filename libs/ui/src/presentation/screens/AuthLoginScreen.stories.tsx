import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm } from 'react-hook-form';
import { AuthLoginScreen } from './AuthLoginScreen';
import type { AuthLoginForm } from '../../domain';

const LoginStory = () => {
  const form = useForm<AuthLoginForm>({ defaultValues: { username: '', password: '' } });
  return (
    <AuthLoginScreen
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={false}
    />
  );
};

const LoadingStory = () => {
  const form = useForm<AuthLoginForm>({ defaultValues: { username: 'admin', password: '••••••' } });
  return (
    <AuthLoginScreen
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={true}
    />
  );
};

const meta: Meta<typeof AuthLoginScreen> = {
  title: 'Screens/Auth/AuthLoginScreen',
  component: AuthLoginScreen,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof AuthLoginScreen>;

export const Default: Story = { render: () => <LoginStory /> };
export const Submitting: Story = { render: () => <LoadingStory /> };
