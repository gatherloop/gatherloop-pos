/* eslint-disable react-hooks/rules-of-hooks */
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { FormProvider, useForm } from 'react-hook-form';
import { Field } from './Field';
import { Switch } from './Switch';

const withFormProvider: Decorator = (Story) => {
  const form = useForm({
    defaultValues: { isActive: false, isPublished: true, notifications: false },
  });
  return (
    <FormProvider {...form}>
      <Story />
    </FormProvider>
  );
};

const meta: Meta<typeof Switch> = {
  title: 'Base/Form/Switch',
  component: Switch,
  decorators: [withFormProvider],
  args: {
    name: 'isActive',
  },
};

export default meta;
type Story = StoryObj<typeof Switch>;

export const Default: Story = {};

export const WithinField: Story = {
  render: (args) => (
    <Field name="isActive" label="Active">
      <Switch {...args} />
    </Field>
  ),
};

export const CheckedByDefault: Story = {
  render: (args) => (
    <Field name="isPublished" label="Published">
      <Switch {...args} />
    </Field>
  ),
  args: {
    name: 'isPublished',
  },
};

export const Disabled: Story = {
  render: (args) => (
    <Field name="notifications" label="Notifications">
      <Switch {...args} />
    </Field>
  ),
  args: {
    name: 'notifications',
    disabled: true,
  },
};

export const Large: Story = {
  args: {
    size: '$5',
  },
};
