import {
  Button,
  Card,
  Form,
  H4,
  Paragraph,
  ScrollView,
  Spinner,
  XStack,
  YStack,
} from 'tamagui';
import { FormErrorBanner } from '../base';
import { RentalCheckoutForm } from '../../../domain';
import {
  FormProvider,
  UseFieldArrayReturn,
  UseFormReturn,
} from 'react-hook-form';
import { ReactNode, useEffect, useState } from 'react';
import { RentalCheckoutCartView } from './RentalCheckoutCartView';
import { calculateSubtotal } from './rentalPricing';
import { FloatingCartButton, Sheet, useIsCompactLayout } from '../base';
import { formatRupiah } from '../../../utils/currency';
import { X } from '@tamagui/lucide-icons';

export type RentalCheckoutFormViewProps = {
  form: UseFormReturn<RentalCheckoutForm>;
  onSubmit: (form: RentalCheckoutForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  isSubmitSuccess: boolean;
  RentalItemSelect: () => ReactNode;
  rentalsFieldArray: UseFieldArrayReturn<RentalCheckoutForm, 'rentals', 'key'>;
  serverError?: string;
};

export const RentalCheckoutFormView = ({
  form,
  onSubmit,
  isSubmitDisabled,
  isSubmitting,
  isSubmitSuccess,
  RentalItemSelect,
  rentalsFieldArray,
  serverError,
}: RentalCheckoutFormViewProps) => {
  const now = new Date();
  const isCompactLayout = useIsCompactLayout();
  const [isCartSheetOpen, setIsCartSheetOpen] = useState(false);

  // Mirrors the button's own visibility rule (PRD Open Question 2): once the
  // last rental is removed there is nothing left to submit, so the sheet
  // closes itself rather than stranding staff on an empty cart with a dead
  // Submit button.
  useEffect(() => {
    if (rentalsFieldArray.fields.length === 0) setIsCartSheetOpen(false);
  }, [rentalsFieldArray.fields.length]);

  // A successful submit must close the cart sheet before the redirect to the
  // transaction detail screen, or a modal `Sheet` left mounted can paint its
  // overlay over the destination on native (PRD FR-3, mirroring
  // `RentalCheckinFormView`'s close-on-success effect).
  useEffect(() => {
    if (isSubmitSuccess) setIsCartSheetOpen(false);
  }, [isSubmitSuccess]);

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
    // One `now`/one reduce shared by the button label and the sheet footer
    // (PRD Core Rule 5, "Constraint: one `now` per render pass") so the two
    // surfaces can never disagree on the total.
    const grandTotal = rentalsFieldArray.fields.reduce((sum, rental) => {
      return sum + calculateSubtotal(rental.pricingTiers, rental.checkinAt, now);
    }, 0);

    return (
      <YStack flex={1}>
        <FormProvider {...form}>
          <Form onSubmit={form.handleSubmit(onSubmit)} flex={1}>
            <YStack flex={1} position="relative">
              <YStack
                flex={1}
                // Reserves room below the picker so the floating cart button
                // never covers the last `RentalListItem` or the `Pagination`
                // control (PRD FR-2). Applied here, not inside `RentalList`,
                // which is shared with `RentalListScreen` and has no button.
                paddingBottom={
                  rentalsFieldArray.fields.length > 0 ? 90 : undefined
                }
              >
                {RentalItemSelect()}
              </YStack>

              {rentalsFieldArray.fields.length > 0 && (
                <FloatingCartButton
                  label={`${rentalsFieldArray.fields.length} ${
                    rentalsFieldArray.fields.length === 1 ? 'item' : 'items'
                  } · ${formatRupiah(grandTotal)} · View Cart`}
                  onPress={() => setIsCartSheetOpen(true)}
                />
              )}
            </YStack>

            <Sheet isOpen={isCartSheetOpen} onOpenChange={setIsCartSheetOpen}>
              {/* Tamagui's modal `Sheet` portals its content, which on some
                  platforms (e.g. Android) does not carry the ambient React
                  context down from the outer `FormProvider` above. The cart
                  view reads the form via field array props directly, but
                  `FormErrorBanner` and any future field read context, so
                  re-establish the provider inside the sheet (PRD
                  "Constraint: `FormProvider` inside the sheet"). */}
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
          </Form>
        </FormProvider>
      </YStack>
    );
  }

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
        </Form>
      </FormProvider>
    </YStack>
  );
};
