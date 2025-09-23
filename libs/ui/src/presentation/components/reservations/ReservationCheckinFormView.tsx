import { Field, InputText } from '../base';
import { Button, Card, Form, Paragraph, XStack, YStack } from 'tamagui';
import { H4 } from 'tamagui';
import { Trash } from '@tamagui/lucide-icons';
import { ReservationCheckinForm } from '../../../domain';
import {
  FormProvider,
  UseFieldArrayReturn,
  UseFormReturn,
} from 'react-hook-form';
import { ReactNode } from 'react';
import { Separator } from 'tamagui';

export type ReservationCheckinFormViewProps = {
  form: UseFormReturn<ReservationCheckinForm>;
  onSubmit: (form: ReservationCheckinForm) => void;
  isSubmitDisabled: boolean;
  ReservationItemSelect: () => ReactNode;
  reservationsFieldArray: UseFieldArrayReturn<
    ReservationCheckinForm,
    'reservations',
    'key'
  >;
};

export const ReservationCheckinFormView = ({
  form,
  onSubmit,
  isSubmitDisabled,
  ReservationItemSelect,
  reservationsFieldArray,
}: ReservationCheckinFormViewProps) => {
  return (
    <YStack>
      <FormProvider {...form}>
        <Form onSubmit={form.handleSubmit(onSubmit)} gap="$3">
          <YStack>
            <YStack gap="$3">
              <Field name="name" label="Customer Name" maxWidth={300} flex={1}>
                <InputText />
              </Field>

              <XStack gap="$3">
                <YStack flex={1}>{ReservationItemSelect()}</YStack>

                <Card padded width={350} flex={1}>
                  <YStack gap="$3">
                    <H4>Items</H4>
                    {reservationsFieldArray.fields.map(
                      ({ variant, key }, index) => {
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
                                  onPress={() =>
                                    reservationsFieldArray.remove(index)
                                  }
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
                                      .map(
                                        ({ optionValue }) => optionValue.name
                                      )
                                      .join(' - ')}
                                  </Paragraph>
                                </YStack>
                              </XStack>

                              <Paragraph textTransform="none" textAlign="left">
                                Rp. {variant.price.toLocaleString('id')}
                              </Paragraph>
                            </XStack>
                            <InputText
                              name={`reservations.${index}.code`}
                              placeholder="Code"
                              flex={1}
                            />
                            <Separator />
                          </YStack>
                        );
                      }
                    )}
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
