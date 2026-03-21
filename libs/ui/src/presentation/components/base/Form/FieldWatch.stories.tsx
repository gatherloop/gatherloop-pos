import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { Input, Paragraph, XStack, YStack } from 'tamagui';
import { FieldWatch } from './FieldWatch';

type FormValues = {
  firstName: string;
  lastName: string;
  quantity: number;
  price: number;
};

const BasicWatchDemo = () => {
  const form = useForm<FormValues>({
    defaultValues: { firstName: 'John', lastName: 'Doe', quantity: 2, price: 50000 },
  });
  return (
    <FormProvider {...form}>
      <YStack gap="$3" padding="$4">
        <XStack gap="$2">
          <Input
            flex={1}
            placeholder="First name"
            defaultValue="John"
            onChangeText={(v) => form.setValue('firstName', v)}
          />
          <Input
            flex={1}
            placeholder="Last name"
            defaultValue="Doe"
            onChangeText={(v) => form.setValue('lastName', v)}
          />
        </XStack>
        <Paragraph>Watching name fields:</Paragraph>
        <FieldWatch
          control={form.control}
          name={['firstName', 'lastName'] as const}
        >
          {([first, last]) => (
            <Paragraph fontWeight="bold">
              Full Name: {first} {last}
            </Paragraph>
          )}
        </FieldWatch>
      </YStack>
    </FormProvider>
  );
};

const TotalCalculationDemo = () => {
  const form = useForm<FormValues>({
    defaultValues: { firstName: '', lastName: '', quantity: 3, price: 25000 },
  });
  return (
    <FormProvider {...form}>
      <YStack gap="$3" padding="$4">
        <XStack gap="$2">
          <Input
            flex={1}
            placeholder="Quantity"
            defaultValue="3"
            keyboardType="numeric"
            onChangeText={(v) => form.setValue('quantity', Number(v))}
          />
          <Input
            flex={1}
            placeholder="Price"
            defaultValue="25000"
            keyboardType="numeric"
            onChangeText={(v) => form.setValue('price', Number(v))}
          />
        </XStack>
        <Paragraph>Computed total:</Paragraph>
        <FieldWatch
          control={form.control}
          name={['quantity', 'price'] as const}
        >
          {([qty, price]) => (
            <Paragraph fontWeight="bold" color="$green10">
              Total: Rp {(qty * price).toLocaleString('id-ID')}
            </Paragraph>
          )}
        </FieldWatch>
      </YStack>
    </FormProvider>
  );
};

const meta: Meta<typeof FieldWatch> = {
  title: 'Base/Form/FieldWatch',
  component: FieldWatch,
};

export default meta;
type Story = StoryObj<typeof FieldWatch>;

export const WatchingNameFields: Story = {
  render: () => <BasicWatchDemo />,
};

export const ComputedTotal: Story = {
  render: () => <TotalCalculationDemo />,
};
