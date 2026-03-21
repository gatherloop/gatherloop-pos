import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { useForm } from 'react-hook-form';
import { LoginForm as LoginFormView } from './LoginFormView';
import type { AuthLoginForm } from '../../../domain';

const defaultValues: AuthLoginForm = {
  username: '',
  password: '',
};

const DefaultStory = () => {
  const form = useForm<AuthLoginForm>({ defaultValues });
  return (
    <LoginFormView
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={false}
    />
  );
};

const PrefilledStory = () => {
  const form = useForm<AuthLoginForm>({
    defaultValues: { username: 'admin', password: '' },
  });
  return (
    <LoginFormView
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={false}
    />
  );
};

const meta: Meta<typeof LoginFormView> = {
  title: 'Features/Auth/LoginForm',
  component: LoginFormView,
};

export default meta;
type Story = StoryObj<typeof LoginFormView>;

export const Default: Story = {
  render: () => <DefaultStory />,
};

export const Prefilled: Story = {
  render: () => <PrefilledStory />,
};

const SubmitDisabledStory = () => {
  const form = useForm<AuthLoginForm>({ defaultValues });
  return (
    <LoginFormView
      form={form}
      onSubmit={fn()}
      isSubmitDisabled={true}
    />
  );
};

export const SubmitDisabled: Story = {
  render: () => <SubmitDisabledStory />,
};
