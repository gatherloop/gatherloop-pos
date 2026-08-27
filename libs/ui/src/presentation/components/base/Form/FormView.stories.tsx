import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from 'tamagui';
import { FormView } from './FormView';
import { Field } from './Field';
import { InputText } from './InputText';
import { FormErrorBanner } from './FormErrorBanner';

type Values = { name: string };

const schema = z.object({ name: z.string().min(1) });

const meta: Meta<typeof FormView<Values>> = {
  title: 'Base/Form/FormView',
  component: FormView,
  args: {
    resolver: zodResolver(schema),
    onSubmit: fn(),
    loadingTitle: 'Fetching...',
    errorTitle: 'Failed to Fetch',
    children: (form) => (
      <>
        <FormErrorBanner message={undefined} />
        <Field name="name" label="Name">
          <InputText />
        </Field>
        <Button onPress={form.handleSubmit(fn())}>Submit</Button>
      </>
    ),
  },
};

export default meta;
type Story = StoryObj<typeof FormView<Values>>;

export const Loading: Story = {
  args: {
    variant: { type: 'loading' },
    defaultValues: { name: '' },
  },
};

export const Loaded: Story = {
  args: {
    variant: { type: 'loaded' },
    defaultValues: { name: 'Fetched value' },
  },
};

export const Error: Story = {
  args: {
    variant: { type: 'error', onRetryButtonPress: fn() },
    defaultValues: { name: '' },
  },
};
