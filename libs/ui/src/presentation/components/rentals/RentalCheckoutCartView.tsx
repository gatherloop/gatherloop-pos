import { Button, Paragraph, Separator, XStack, YStack } from 'tamagui';
import { FormErrorBanner } from '../base';
import { Calendar, QrCode, Trash } from '@tamagui/lucide-icons';
import { RentalCheckoutForm } from '../../../domain';
import { UseFieldArrayReturn } from 'react-hook-form';
import dayjs from 'dayjs';
import { calculateSubtotal, formatDuration } from './rentalPricing';

export type RentalCheckoutCartViewProps = {
  rentalsFieldArray: UseFieldArrayReturn<RentalCheckoutForm, 'rentals', 'key'>;
  now: Date;
  showGrandTotal?: boolean;
  serverError?: string;
};

export const RentalCheckoutCartView = ({
  rentalsFieldArray,
  now,
  showGrandTotal = true,
  serverError,
}: RentalCheckoutCartViewProps) => {
  const grandTotal = rentalsFieldArray.fields.reduce((sum, rental) => {
    return sum + calculateSubtotal(rental.pricingTiers, rental.checkinAt, now);
  }, 0);

  return (
    <YStack gap="$3">
      <FormErrorBanner message={serverError} />
      <YStack gap="$3">
        {rentalsFieldArray.fields.map(
          ({ variant, checkinAt, code, name, pricingTiers, key }, index) => {
            const subtotal = calculateSubtotal(pricingTiers, checkinAt, now);
            const duration = formatDuration(checkinAt, now);

            return (
              <YStack key={key} gap="$3" justifyContent="space-between">
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
                          {dayjs(checkinAt).format('DD/MM/YYYY - HH:mm')}
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
      {showGrandTotal && rentalsFieldArray.fields.length > 0 && (
        <XStack justifyContent="space-between" paddingTop="$2">
          <Paragraph fontWeight="bold">Grand Total</Paragraph>
          <Paragraph fontWeight="bold">
            Rp. {grandTotal.toLocaleString('id')}
          </Paragraph>
        </XStack>
      )}
    </YStack>
  );
};
