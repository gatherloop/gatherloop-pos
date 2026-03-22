/* eslint-disable react-hooks/rules-of-hooks */
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { FormProvider, useForm } from 'react-hook-form';
import { Field } from './Field';
import { Select } from './Select';

const categoryItems = [
  { label: 'Beverages', value: 'beverages' },
  { label: 'Snacks', value: 'snacks' },
  { label: 'Merchandise', value: 'merchandise' },
  { label: 'Seasonal Menu', value: 'seasonal' },
];

const statusItems = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Draft', value: 'draft' },
];

const withFormProvider: Decorator = (Story) => {
  const form = useForm({
    defaultValues: { category: 'beverages', status: 'active', saleType: null },
  });
  return (
    <FormProvider {...form}>
      <Story />
    </FormProvider>
  );
};

const meta: Meta<typeof Select> = {
  title: 'Base/Form/Select',
  component: Select,
  decorators: [withFormProvider],
  args: {
    name: 'category',
    items: categoryItems,
    onValueChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {};

export const WithinField: Story = {
  render: (args) => (
    <Field name="category" label="Category">
      <Select {...args} />
    </Field>
  ),
  args: {
    items: categoryItems,
  },
};

export const StatusSelect: Story = {
  render: (args) => (
    <Field name="status" label="Status">
      <Select {...args} />
    </Field>
  ),
  args: {
    name: 'status',
    items: statusItems,
  },
};

export const Disabled: Story = {
  args: {
    items: categoryItems,
    disabled: true,
  },
};

export const ManyOptions: Story = {
  render: (args) => (
    <Field name="category" label="Category">
      <Select {...args} />
    </Field>
  ),
  args: {
    items: [
      { label: 'Option 1', value: '1' },
      { label: 'Option 2', value: '2' },
      { label: 'Option 3', value: '3' },
      { label: 'Option 4', value: '4' },
      { label: 'Option 5', value: '5' },
      { label: 'Option 6', value: '6' },
      { label: 'Option 7', value: '7' },
      { label: 'Option 8', value: '8' },
    ],
  },
};
