/* eslint-disable react-hooks/rules-of-hooks */
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { Input } from 'tamagui';
import { Field } from './Field';
import { InputText } from './InputText';

const withFormProvider: Decorator = (Story) => {
  const form = useForm({ defaultValues: { username: '', email: '' } });
  return (
    <FormProvider {...form}>
      <Story />
    </FormProvider>
  );
};

const meta: Meta<typeof Field> = {
  title: 'Base/Form/Field',
  component: Field,
  decorators: [withFormProvider],
  args: {
    name: 'username',
    label: 'Username',
    children: <InputText name="username" placeholder="Enter username" />,
  },
};

export default meta;
type Story = StoryObj<typeof Field>;

export const Default: Story = {};

export const WithEmailField: Story = {
  args: {
    name: 'email',
    label: 'Email Address',
    children: <Input id="email" placeholder="Enter email" keyboardType="email-address" />,
  },
};

export const Required: Story = {
  args: {
    name: 'username',
    label: 'Username *',
    children: <InputText name="username" placeholder="Required field" />,
  },
};
