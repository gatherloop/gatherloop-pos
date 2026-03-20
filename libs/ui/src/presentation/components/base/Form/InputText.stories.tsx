import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { FormProvider, useForm } from 'react-hook-form';
import { Field } from './Field';
import { InputText } from './InputText';

const withFormProvider: Decorator = (Story) => {
  const form = useForm({ defaultValues: { name: '', search: '', email: '' } });
  return (
    <FormProvider {...form}>
      <Story />
    </FormProvider>
  );
};

const meta: Meta<typeof InputText> = {
  title: 'Base/Form/InputText',
  component: InputText,
  decorators: [withFormProvider],
  args: {
    name: 'name',
    placeholder: 'Enter text...',
  },
};

export default meta;
type Story = StoryObj<typeof InputText>;

export const Default: Story = {};

export const WithinField: Story = {
  render: (args) => (
    <Field name="name" label="Full Name">
      <InputText {...args} />
    </Field>
  ),
  args: {
    placeholder: 'Enter full name',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    placeholder: 'This field is disabled',
  },
};

export const WithPlaceholder: Story = {
  args: {
    name: 'search',
    placeholder: 'Search products...',
  },
};

export const EmailInput: Story = {
  args: {
    name: 'email',
    placeholder: 'Enter email address',
    keyboardType: 'email-address',
  },
};
