/* eslint-disable react-hooks/rules-of-hooks */
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { FormProvider, useForm } from 'react-hook-form';
import { Field } from './Field';
import { InputNumber } from './InputNumber';

const withFormProvider: Decorator = (Story) => {
  const form = useForm({
    defaultValues: { quantity: 0, price: 0, discount: 0, rating: 3 },
  });
  return (
    <FormProvider {...form}>
      <Story />
    </FormProvider>
  );
};

const meta: Meta<typeof InputNumber> = {
  title: 'Base/Form/InputNumber',
  component: InputNumber,
  decorators: [withFormProvider],
  args: {
    name: 'quantity',
    min: 0,
    step: 1,
  },
};

export default meta;
type Story = StoryObj<typeof InputNumber>;

export const Default: Story = {};

export const WithinField: Story = {
  render: (args) => (
    <Field name="quantity" label="Quantity">
      <InputNumber {...args} />
    </Field>
  ),
  args: {
    min: 0,
    max: 100,
  },
};

export const PriceInput: Story = {
  render: (args) => (
    <Field name="price" label="Price (Rp)">
      <InputNumber {...args} />
    </Field>
  ),
  args: {
    name: 'price',
    min: 0,
    step: 1000,
  },
};

export const WithFractionDigits: Story = {
  render: (args) => (
    <Field name="discount" label="Discount (%)">
      <InputNumber {...args} />
    </Field>
  ),
  args: {
    name: 'discount',
    min: 0,
    max: 100,
    fractionDigit: 2,
    step: 0.5,
  },
};

export const WithMinMax: Story = {
  render: (args) => (
    <Field name="rating" label="Rating (1–5)">
      <InputNumber {...args} />
    </Field>
  ),
  args: {
    name: 'rating',
    min: 1,
    max: 5,
    step: 1,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

// PRD docs/prd-stock-check-form-mobile.md FR-3: compact call sites request
// larger stepper buttons and an explicit 44dp touch-target floor.
export const LargeTouchTargets: Story = {
  render: (args) => (
    <Field name="quantity" label="Quantity">
      <InputNumber {...args} />
    </Field>
  ),
  args: {
    min: 0,
    max: 100,
    buttonSize: '$3',
    buttonMinSize: 44,
    minWidth: 72,
  },
};

export const NumericKeyboardOverride: Story = {
  render: (args) => (
    <Field name="discount" label="Discount (%) — forced numeric keyboard">
      <InputNumber {...args} />
    </Field>
  ),
  args: {
    name: 'discount',
    min: 0,
    max: 100,
    fractionDigit: 2,
    step: 0.5,
    inputMode: 'numeric',
    keyboardType: 'number-pad',
  },
};
