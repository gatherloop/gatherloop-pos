import {
  Button,
  Card,
  Form,
  Paragraph,
  Separator,
  Spinner,
  XStack,
  YStack,
} from 'tamagui';
import { FormErrorBanner } from '../base';
import { H4 } from 'tamagui';
import { Calendar, QrCode, Trash } from '@tamagui/lucide-icons';
import { PricingTier, RentalCheckoutForm } from '../../../domain';
import {
  FormProvider,
  UseFieldArrayReturn,
  UseFormReturn,
} from 'react-hook-form';
import { ReactNode } from 'react';
import dayjs from 'dayjs';

function calculateSubtotal(
  tiers: PricingTier[],
  checkinAt: string,
  now: Date
): number {
  if (tiers.length === 0) return 0;
  const durationMinutes = Math.ceil(
    (now.getTime() - new Date(checkinAt).getTime()) / 60000
  );
  for (const tier of tiers) {
    if (tier.upToMinutes >= durationMinutes) return tier.price;
  }
  return tiers[tiers.length - 1].price;
}

function formatDuration(checkinAt: string, now: Date): string {
  const totalMinutes = Math.ceil(
    (now.getTime() - new Date(checkinAt).getTime()) / 60000
  );
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

export type RentalCheckoutFormViewProps = {
  form: UseFormReturn<RentalCheckoutForm>;
  onSubmit: (form: RentalCheckoutForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  RentalItemSelect: () => ReactNode;
  rentalsFieldArray: UseFieldArrayReturn<RentalCheckoutForm, 'rentals', 'key'>;
  serverError?: string;
};

export const RentalCheckoutFormView = ({
  form,
  onSubmit,
  isSubmitDisabled,
  isSubmitting,
  RentalItemSelect,
  rentalsFieldArray,
  serverError,
}: RentalCheckoutFormViewProps) => {
  const now = new Date();
  const grandTotal = rentalsFieldArray.fields.reduce((sum, rental) => {
    return (
      sum +
      calculateSubtotal(rental.pricingTiers, rental.checkinAt, now)
    );
  }, 0);

  return (
    <YStack>
      <FormProvider {...form}>
        <Form onSubmit={form.handleSubmit(onSubmit)} gap="$3">
          <FormErrorBanner message={serverError} />
          <XStack gap="$5">
            <YStack flex={1}>{RentalItemSelect()}</YStack>
            <YStack gap="$3" width={400} flex={1}>
              <Card padded>
                <YStack gap="$3">
                  <H4>Items</H4>
                  <YStack gap="$3">
                    {rentalsFieldArray.fields.map(
                      ({ variant, checkinAt, code, name, pricingTiers, key }, index) => {
                        const subtotal = calculateSubtotal(
                          pricingTiers,
                          checkinAt,
                          now
                        );
                        const duration = formatDuration(checkinAt, now);

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
                                onPress={() => rentalsFieldArray.remove(index)}
                                theme="red"
                                color="$red8"
                                circular
                              />
                              <YStack flex={1}>
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
                                {pricingTiers.length > 0 && (
                                  <XStack justifyContent="space-between" marginTop="$1">
                                    <Paragraph size="$2" color="$gray10">
                                      {duration}
                                    </Paragraph>
                                    <Paragraph size="$3" fontWeight="bold">
                                      Rp. {subtotal.toLocaleString('id')}
                                    </Paragraph>
                                  </XStack>
                                )}
                              </YStack>
                            </XStack>
                            <Separator />
                          </YStack>
                        );
                      }
                    )}
                  </YStack>
                  {rentalsFieldArray.fields.length > 0 && (
                    <XStack justifyContent="space-between" paddingTop="$2">
                      <Paragraph fontWeight="bold">Grand Total</Paragraph>
                      <Paragraph fontWeight="bold">
                        Rp. {grandTotal.toLocaleString('id')}
                      </Paragraph>
                    </XStack>
                  )}
                </YStack>
              </Card>
              <XStack justifyContent="flex-end" gap="$3">
                <Button
                  disabled={isSubmitDisabled}
                  onPress={form.handleSubmit(onSubmit)}
                  size="$5"
                  theme="blue"
                  icon={isSubmitting ? <Spinner /> : undefined}
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
