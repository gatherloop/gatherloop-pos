/* eslint-disable react-hooks/rules-of-hooks */
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { FormProvider, useForm } from 'react-hook-form';
import { Field } from './Field';
import { SegmentedControl } from './SegmentedControl';

const diningOptionItems = [
  { label: 'Dine In', value: 'dine_in' },
  { label: 'Takeaway', value: 'takeaway' },
];

const withFormProvider: Decorator = (Story) => {
  const form = useForm({
    defaultValues: { diningOption: 'dine_in', fulfillment: 'preparing' },
  });
  return (
    <FormProvider {...form}>
      <Story />
    </FormProvider>
  );
};

const meta: Meta<typeof SegmentedControl> = {
  title: 'Components/Base/Form/SegmentedControl',
  component: SegmentedControl,
  decorators: [withFormProvider],
  args: {
    name: 'diningOption',
    items: diningOptionItems,
    onValueChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof SegmentedControl>;

export const Default: Story = {};

export const WithinField: Story = {
  render: (args) => (
    <Field name="diningOption" label="Dining Option">
      <SegmentedControl {...args} />
    </Field>
  ),
};

export const TakeawaySelected: Story = {
  render: (args) => (
    <Field name="diningOption" label="Dining Option">
      <SegmentedControl {...args} />
    </Field>
  ),
  decorators: [
    (Story) => {
      const form = useForm({ defaultValues: { diningOption: 'takeaway' } });
      return (
        <FormProvider {...form}>
          <Story />
        </FormProvider>
      );
    },
  ],
};

export const ThreeOptions: Story = {
  render: (args) => (
    <Field name="fulfillment" label="Fulfillment">
      <SegmentedControl {...args} />
    </Field>
  ),
  args: {
    name: 'fulfillment',
    items: [
      { label: 'Preparing', value: 'preparing' },
      { label: 'Ready', value: 'ready' },
      { label: 'Completed', value: 'completed' },
    ],
  },
};
