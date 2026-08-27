import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from 'tamagui';
import { Field } from './Field';
import { InputText } from './InputText';
import { FormView } from './FormView';

type DemoForm = { name: string };

const demoFormResolver = zodResolver(
  z.object({ name: z.string().min(1) }) satisfies z.ZodType<DemoForm>
);

const meta: Meta<typeof FormView<DemoForm>> = {
  title: 'Base/Form/FormView',
  component: FormView,
};

export default meta;
type Story = StoryObj<typeof FormView<DemoForm>>;

export const Loading: Story = {
  args: {
    variant: { type: 'loading' },
    defaultValues: { name: '' },
    resolver: demoFormResolver,
    onSubmit: fn(),
    loadingTitle: 'Fetching Demo...',
    errorTitle: 'Failed to Fetch Demo',
    children: (form) => (
      <>
        <Field name="name" label="Name">
          <InputText />
        </Field>
        <Button onPress={form.handleSubmit(fn())}>Submit</Button>
      </>
    ),
  },
};

export const Error: Story = {
  args: {
    ...Loading.args,
    variant: { type: 'error', onRetryButtonPress: fn() },
  },
};

export const Loaded: Story = {
  args: {
    ...Loading.args,
    variant: { type: 'loaded' },
    defaultValues: { name: 'Fetched' },
  },
};
