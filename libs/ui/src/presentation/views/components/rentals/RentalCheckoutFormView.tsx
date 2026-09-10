import {
  Button,
  Card,
  H4,
  Paragraph,
  ScrollView,
  Spinner,
  XStack,
  YStack,
} from 'tamagui';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, UseFormReturn } from 'react-hook-form';
import { MutableRefObject, ReactNode, useState } from 'react';
import { RentalCheckoutForm, rentalCheckoutFormSchema } from '../../../../domain';
import { RentalCheckoutCartView } from './RentalCheckoutCartView';
import { calculateSubtotal } from './rentalPricing';
import {
  FieldArray,
  FloatingCartButton,
  FormErrorBanner,
  FormVariant,
  FormView,
  Sheet,
  useIsCompactLayout,
} from '../base';
import { formatRupiah } from '../../../../utils/currency';
import { X } from '@tamagui/lucide-icons';

const rentalCheckoutFormResolver = zodResolver(
  rentalCheckoutFormSchema,
  {},
  { raw: true }
);

export type RentalCheckoutFormViewProps = {
  variant: FormVariant;
  defaultValues: RentalCheckoutForm;
  onSubmit: (form: RentalCheckoutForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  isSubmitSuccess: boolean;
  RentalItemSelect: (selectedRentalIds: number[]) => ReactNode;
  formRef?: MutableRefObject<UseFormReturn<RentalCheckoutForm> | null>;
  serverError?: string;
};

export const RentalCheckoutFormView = ({
  variant,
  defaultValues,
  onSubmit,
  isSubmitDisabled,
  isSubmitting,
  isSubmitSuccess,
  RentalItemSelect,
  formRef,
  serverError,
}: RentalCheckoutFormViewProps) => {
  const now = new Date();
  const isCompactLayout = useIsCompactLayout();
  const [isCartSheetOpen, setIsCartSheetOpen] = useState(false);

  return (
    <FormView
      variant={variant}
      defaultValues={defaultValues}
      resolver={rentalCheckoutFormResolver}
      onSubmit={onSubmit}
      loadingTitle="Loading Checkout..."
      errorTitle="Failed to Load Checkout"
      formRef={formRef}
      formProps={isCompactLayout ? { flex: 1, gap: undefined } : { gap: '$3' }}
    >
      {(form) => (
        <FieldArray<RentalCheckoutForm, 'rentals', 'key'>
          name="rentals"
          keyName="key"
          control={form.control}
        >
          {(rentalsFieldArray) => {
            const isCartSheetVisible =
              isCartSheetOpen &&
              rentalsFieldArray.fields.length > 0 &&
              !isSubmitSuccess;

            const submitButton = (
              <Button
                disabled={isSubmitDisabled}
                onPress={form.handleSubmit(onSubmit)}
                size="$5"
                theme="blue"
                icon={isSubmitting ? <Spinner /> : undefined}
              >
                Submit
              </Button>
            );

            if (isCompactLayout) {
              const grandTotal = rentalsFieldArray.fields.reduce(
                (sum, rental) => {
                  return (
                    sum +
                    calculateSubtotal(rental.pricingTiers, rental.checkinAt, now)
                  );
                },
                0
              );

              return (
                <YStack flex={1} position="relative">
                  <YStack
                    flex={1}
                    paddingBottom={
                      rentalsFieldArray.fields.length > 0 ? 90 : undefined
                    }
                  >
                    {RentalItemSelect(
                      rentalsFieldArray.fields.map((rental) => rental.id)
                    )}
                  </YStack>

                  {rentalsFieldArray.fields.length > 0 && (
                    <FloatingCartButton
                      label={`${rentalsFieldArray.fields.length} ${
                        rentalsFieldArray.fields.length === 1 ? 'item' : 'items'
                      } · ${formatRupiah(grandTotal)} · View Cart`}
                      onPress={() => setIsCartSheetOpen(true)}
                    />
                  )}

                  <Sheet
                    isOpen={isCartSheetVisible}
                    onOpenChange={setIsCartSheetOpen}
                  >
                    <FormProvider {...form}>
                      <YStack flex={1}>
                        <XStack
                          padding="$3"
                          alignItems="center"
                          justifyContent="space-between"
                          borderBottomWidth={1}
                          borderBottomColor="$borderColor"
                        >
                          <H4>Cart</H4>
                          <Button
                            icon={X}
                            size="$3"
                            circular
                            accessibilityLabel="Close Cart"
                            onPress={() => setIsCartSheetOpen(false)}
                          />
                        </XStack>

                        <ScrollView flex={1}>
                          <YStack padding="$3" flex={1}>
                            <RentalCheckoutCartView
                              rentalsFieldArray={rentalsFieldArray}
                              now={now}
                              showGrandTotal={false}
                              serverError={serverError}
                            />
                          </YStack>
                        </ScrollView>

                        <YStack
                          padding="$3"
                          gap="$3"
                          borderTopWidth={1}
                          borderTopColor="$borderColor"
                        >
                          <XStack justifyContent="space-between">
                            <Paragraph fontWeight="bold">Grand Total</Paragraph>
                            <Paragraph fontWeight="bold">
                              {formatRupiah(grandTotal)}
                            </Paragraph>
                          </XStack>
                          {submitButton}
                        </YStack>
                      </YStack>
                    </FormProvider>
                  </Sheet>
                </YStack>
              );
            }

            return (
              <>
                <FormErrorBanner message={serverError} />
                <XStack gap="$5">
                  <YStack flex={1}>
                    {RentalItemSelect(
                      rentalsFieldArray.fields.map((rental) => rental.id)
                    )}
                  </YStack>
                  <YStack gap="$3" width={400} flex={1}>
                    <Card padded>
                      <YStack gap="$3">
                        <H4>Items</H4>
                        <RentalCheckoutCartView
                          rentalsFieldArray={rentalsFieldArray}
                          now={now}
                        />
                      </YStack>
                    </Card>
                    <XStack justifyContent="flex-end" gap="$3">
                      {submitButton}
                    </XStack>
                  </YStack>
                </XStack>
              </>
            );
          }}
        </FieldArray>
      )}
    </FormView>
  );
};
