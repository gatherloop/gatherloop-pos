import {
  Button,
  Card,
  Form,
  Paragraph,
  Separator,
  XStack,
  YStack,
} from 'tamagui';
import { H4 } from 'tamagui';
import { Calendar, QrCode, Trash } from '@tamagui/lucide-icons';
import { ReservationCheckoutForm } from '../../../domain';
import {
  FormProvider,
  UseFieldArrayReturn,
  UseFormReturn,
} from 'react-hook-form';
import { ReactNode } from 'react';
import dayjs from 'dayjs';

export type ReservationCheckoutFormViewProps = {
  form: UseFormReturn<ReservationCheckoutForm>;
  onSubmit: (form: ReservationCheckoutForm) => void;
  isSubmitDisabled: boolean;
  ReservationItemSelect: () => ReactNode;
  reservationsFieldArray: UseFieldArrayReturn<
    ReservationCheckoutForm,
    'reservations',
    'key'
  >;
};

export const ReservationCheckoutFormView = ({
  form,
  onSubmit,
  isSubmitDisabled,
  ReservationItemSelect,
  reservationsFieldArray,
}: ReservationCheckoutFormViewProps) => {
  return (
    <YStack>
      <FormProvider {...form}>
        <Form onSubmit={form.handleSubmit(onSubmit)} gap="$3">
          <XStack gap="$5">
            <YStack flex={1}>{ReservationItemSelect()}</YStack>
            <YStack gap="$3" width={400} flex={1}>
              <Card padded>
                <YStack gap="$3">
                  <H4>Items</H4>
                  <YStack gap="$3">
                    {reservationsFieldArray.fields.map(
                      ({ variant, checkinAt, code, name, key }, index) => {
                        return (
                          <YStack
                            key={key}
                            gap="$3"
                            justifyContent="space-between"
                          >
                            <XStack gap="$3" flex={1} alignItems="center">
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
                                <Paragraph>{name}</Paragraph>
                                <Paragraph>
                                  {`${variant.product.name} - ${variant.values
                                    .map(({ optionValue }) => optionValue.name)
                                    .join(' - ')}`}
                                </Paragraph>
                                <XStack gap="$3">
                                  <XStack gap="$3" alignItems="center">
                                    <YStack
                                      backgroundColor="$background"
                                      theme="active"
                                      padding="$2"
                                      borderRadius="$12"
                                    >
                                      <QrCode size="$1" />
                                    </YStack>
                                    <Paragraph>{code}</Paragraph>
                                  </XStack>
                                  <XStack gap="$3" alignItems="center">
                                    <YStack
                                      backgroundColor="$background"
                                      theme="active"
                                      padding="$2"
                                      borderRadius="$12"
                                    >
                                      <Calendar size="$1" />
                                    </YStack>
                                    <Paragraph>
                                      {dayjs(checkinAt).format(
                                        'DD/MM/YYYY - HH:mm'
                                      )}
                                    </Paragraph>
                                  </XStack>
                                </XStack>
                              </YStack>
                            </XStack>
                            <Separator />
                          </YStack>
                        );
                      }
                    )}
                  </YStack>
                </YStack>
              </Card>
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
            </YStack>
          </XStack>
        </Form>
      </FormProvider>
    </YStack>
  );
};
