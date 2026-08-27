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
import { RentalCheckoutForm, rentalCheckoutFormSchema } from '../../../domain';
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
import { formatRupiah } from '../../../utils/currency';
import { X } from '@tamagui/lucide-icons';

// `rentalCheckoutFormSchema` is a partial validator (only enforces "at least
// one rental"), so `{ raw: true }` is required to keep the full `Rental`
// objects intact instead of being stripped down to `z.any()`.
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
  /**
   * Escape hatch so `RentalCheckoutHandler` can push a rental picked in the
   * sibling `rentalList` controller into this form. Null until this view's
   * `loaded` branch mounts.
   */
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
      // Mirrors the two layouts the old hand-rolled `<Form>` elements used:
      // compact needs to flex-fill its container for the floating cart
      // button positioning, desktop just wants breathing room between
      // fields.
      formProps={isCompactLayout ? { flex: 1, gap: undefined } : { gap: '$3' }}
    >
      {(form) => (
        <FieldArray<RentalCheckoutForm, 'rentals', 'key'>
          name="rentals"
          keyName="key"
          control={form.control}
        >
          {(rentalsFieldArray) => {
            // Mirrors the button's own visibility rule (PRD Open Question 2): once the
            // last rental is removed there is nothing left to submit, so the sheet is
            // forced closed rather than stranding staff on an empty cart with a dead
            // Submit button. A successful submit forces it closed too, so it can't be
            // left mounted painting its overlay over the destination screen on native
            // during the redirect (PRD FR-3, mirroring `RentalCheckinFormView`'s
            // close-on-success behavior). Derived during render instead of an effect
            // so the sheet never flashes open on the frame before it closes.
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
              // One `now`/one reduce shared by the button label and the sheet footer
              // (PRD Core Rule 5, "Constraint: one `now` per render pass") so the two
              // surfaces can never disagree on the total.
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
                    // Reserves room below the picker so the floating cart button
                    // never covers the last `RentalListItem` or the `Pagination`
                    // control (PRD FR-2). Applied here, not inside `RentalList`,
                    // which is shared with `RentalListScreen` and has no button.
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
