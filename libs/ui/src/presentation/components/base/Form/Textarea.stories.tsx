/* eslint-disable react-hooks/rules-of-hooks */
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { FormProvider, useForm } from 'react-hook-form';
import { Field } from './Field';
import { Textarea } from './Textarea';

const withFormProvider: Decorator = (Story) => {
  const form = useForm({ defaultValues: { description: '', notes: '' } });
  return (
    <FormProvider {...form}>
      <Story />
    </FormProvider>
  );
};

const meta: Meta<typeof Textarea> = {
  title: 'Base/Form/Textarea',
  component: Textarea,
  decorators: [withFormProvider],
  args: {
    name: 'description',
    placeholder: 'Enter description...',
  },
};

export default meta;
type Story = StoryObj<typeof Textarea>;

export const Default: Story = {};

export const WithinField: Story = {
  render: (args) => (
    <Field name="description" label="Description">
      <Textarea {...args} />
    </Field>
  ),
  args: {
    placeholder: 'Enter product description...',
    numberOfLines: 4,
  },
};

export const Notes: Story = {
  render: (args) => (
    <Field name="notes" label="Notes">
      <Textarea {...args} />
    </Field>
  ),
  args: {
    name: 'notes',
    placeholder: 'Add any additional notes...',
    numberOfLines: 6,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    placeholder: 'This field is disabled',
  },
};
