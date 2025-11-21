import { Field, InputText } from '../base';
import { Button, Card, Form, Input, Paragraph, XStack, YStack } from 'tamagui';
import { H4 } from 'tamagui';
import { Trash } from '@tamagui/lucide-icons';
import { RentalCheckinForm } from '../../../domain';
import {
  FormProvider,
  UseFieldArrayReturn,
  UseFormReturn,
} from 'react-hook-form';
import { ReactNode, useRef } from 'react';
import { Separator } from 'tamagui';

export type RentalCheckinFormViewProps = {
  form: UseFormReturn<RentalCheckinForm>;
  onSubmit: (form: RentalCheckinForm) => void;
  isSubmitDisabled: boolean;
  RentalItemSelect: () => ReactNode;
  rentalsFieldArray: UseFieldArrayReturn<RentalCheckinForm, 'rentals', 'key'>;
};

export const RentalCheckinFormView = ({
  form,
  onSubmit,
  isSubmitDisabled,
  RentalItemSelect,
  rentalsFieldArray,
}: RentalCheckinFormViewProps) => {
  const inputCodeRefs = useRef<(Input | null)[]>([]);
  return (
    <YStack>
      <FormProvider {...form}>
        <Form onSubmit={form.handleSubmit(onSubmit)} gap="$3">
          <YStack>
            <YStack gap="$3">
              <XStack gap="$3">
                <YStack flex={1}>{RentalItemSelect()}</YStack>

                <Card padded width={350} flex={1}>
                  <YStack gap="$3">
                    <Field
                      name="name"
                      label="Customer Name"
                      maxWidth={300}
                      flex={1}
                    >
                      <InputText />
                    </Field>
                    <H4>Items</H4>
                    {rentalsFieldArray.fields.map(({ variant, key }, index) => {
                      return (
                        <YStack key={key} gap="$3">
                          <XStack
                            gap="$3"
                            flex={1}
                            alignItems="center"
                            justifyContent="space-between"
                          >
                            <XStack gap="$3">
                              <Button
                                icon={Trash}
                                size="$3"
                                onPress={() => rentalsFieldArray.remove(index)}
                                theme="red"
                                color="$red8"
                                circular
                              />
                              <YStack>
                                <Paragraph size="$5">
                                  {variant.product.name}
                                </Paragraph>
                                <Paragraph>
                                  {variant.values
                                    .map(({ optionValue }) => optionValue.name)
                                    .join(' - ')}
                                </Paragraph>
                              </YStack>
                            </XStack>

                            <Paragraph textTransform="none" textAlign="left">
                              Rp. {variant.price.toLocaleString('id')}
                            </Paragraph>
                          </XStack>
                          <InputText
                            name={`rentals.${index}.code`}
                            placeholder="Code"
                            flex={1}
                            ref={(element) => {
                              inputCodeRefs.current[index] = element;
                            }}
                            onSubmitEditing={() => {
                              if (index < rentalsFieldArray.fields.length - 1) {
                                inputCodeRefs.current[index + 1]?.focus();
                              }
                            }}
                          />
                          <Separator />
                        </YStack>
                      );
                    })}
                  </YStack>
                </Card>
              </XStack>
            </YStack>
          </YStack>
          <XStack justifyContent="flex-end" gap="$3">
            <Button
              disabled={isSubmitDisabled}
              onPress={form.handleSubmit(onSubmit)}
              size="$5"
              theme="blue"
            >
              Submit
            </Button>
          </XStack>
        </Form>
      </FormProvider>
    </YStack>
  );
};
