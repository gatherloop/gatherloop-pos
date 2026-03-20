import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { FormProvider, useForm } from 'react-hook-form';
import { ErrorMessage } from './ErrorMessage';

const withValidationError: Decorator = (Story) => {
  const form = useForm({ defaultValues: { username: '' } });
  // Manually set an error to show the ErrorMessage
  form.setError('username', {
    type: 'required',
    message: 'Username is required',
  });
  return (
    <FormProvider {...form}>
      <Story />
    </FormProvider>
  );
};

const withNoError: Decorator = (Story) => {
  const form = useForm({ defaultValues: { username: 'john_doe' } });
  return (
    <FormProvider {...form}>
      <Story />
    </FormProvider>
  );
};

const meta: Meta<typeof ErrorMessage> = {
  title: 'Base/Form/ErrorMessage',
  component: ErrorMessage,
  args: {
    name: 'username',
  },
};

export default meta;
type Story = StoryObj<typeof ErrorMessage>;

export const WithError: Story = {
  decorators: [withValidationError],
};

export const NoError: Story = {
  decorators: [withNoError],
};

export const RequiredError: Story = {
  decorators: [
    (Story) => {
      const form = useForm({ defaultValues: { email: '' } });
      form.setError('email', { type: 'required', message: 'Email is required' });
      return (
        <FormProvider {...form}>
          <Story />
        </FormProvider>
      );
    },
  ],
  args: {
    name: 'email',
  },
};

export const MinLengthError: Story = {
  decorators: [
    (Story) => {
      const form = useForm({ defaultValues: { password: '' } });
      form.setError('password', {
        type: 'minLength',
        message: 'Password must be at least 8 characters',
      });
      return (
        <FormProvider {...form}>
          <Story />
        </FormProvider>
      );
    },
  ],
  args: {
    name: 'password',
  },
};
