import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { Button, Input, XStack, YStack } from 'tamagui';
import { Plus, Trash } from '@tamagui/lucide-icons';
import { FieldArray } from './FieldArray';

type FormValues = {
  items: { name: string; quantity: number }[];
};

const FieldArrayDemo = () => {
  const form = useForm<FormValues>({
    defaultValues: {
      items: [
        { name: 'Product A', quantity: 1 },
        { name: 'Product B', quantity: 2 },
      ],
    },
  });
  return (
    <FormProvider {...form}>
      <YStack gap="$3" padding="$4">
        <FieldArray name="items" keyName="id" control={form.control}>
          {({ fields, append, remove }) => (
            <YStack gap="$3">
              {fields.map((field, index) => (
                <XStack key={field.id} gap="$2" alignItems="center">
                  <Input
                    flex={1}
                    placeholder="Name"
                    defaultValue={field.name}
                  />
                  <Input
                    width={80}
                    placeholder="Qty"
                    defaultValue={String(field.quantity)}
                    keyboardType="numeric"
                  />
                  <Button
                    icon={Trash}
                    size="$2"
                    variant="outlined"
                    onPress={() => remove(index)}
                    circular
                  />
                </XStack>
              ))}
              <Button
                icon={Plus}
                alignSelf="flex-start"
                onPress={() => append({ name: '', quantity: 1 })}
              >
                Add Item
              </Button>
            </YStack>
          )}
        </FieldArray>
      </YStack>
    </FormProvider>
  );
};

const EmptyFieldArrayDemo = () => {
  const form = useForm<FormValues>({
    defaultValues: { items: [] },
  });
  return (
    <FormProvider {...form}>
      <YStack gap="$3" padding="$4">
        <FieldArray name="items" keyName="id" control={form.control}>
          {({ fields, append }) => (
            <YStack gap="$3">
              {fields.length === 0 && (
                <Button disabled variant="outlined">
                  No items yet
                </Button>
              )}
              {fields.map((field, index) => (
                <Input
                  key={field.id}
                  placeholder={`Item ${index + 1}`}
                  defaultValue={field.name}
                />
              ))}
              <Button
                icon={Plus}
                alignSelf="flex-start"
                onPress={() => append({ name: '', quantity: 1 })}
              >
                Add Item
              </Button>
            </YStack>
          )}
        </FieldArray>
      </YStack>
    </FormProvider>
  );
};

const meta: Meta<typeof FieldArray> = {
  title: 'Base/Form/FieldArray',
  component: FieldArray,
};

export default meta;
type Story = StoryObj<typeof FieldArray>;

export const WithItems: Story = {
  render: () => <FieldArrayDemo />,
};

export const EmptyList: Story = {
  render: () => <EmptyFieldArrayDemo />,
};
