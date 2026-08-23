import {
  Button,
  Card,
  Form,
  H4,
  ScrollView,
  Spinner,
  XStack,
  YStack,
} from 'tamagui';
import { RentalCheckinForm, Ticket } from '../../../domain';
import {
  FormProvider,
  UseFieldArrayReturn,
  UseFormReturn,
} from 'react-hook-form';
import { ReactNode, useState } from 'react';
import { RentalCheckinCartView } from './RentalCheckinCartView';
import { FieldWatch, FloatingCartButton, Sheet, useIsCompactLayout } from '../base';
import { X } from '@tamagui/lucide-icons';

export type RentalCheckinFormViewProps = {
  form: UseFormReturn<RentalCheckinForm>;
  onToggleCustomizeCheckinDateTime: (checked: boolean) => void;
  onSubmit: (form: RentalCheckinForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  isSubmitSuccess: boolean;
  RentalItemSelect: () => ReactNode;
  rentalsFieldArray: UseFieldArrayReturn<RentalCheckinForm, 'rentals', 'key'>;
  tickets: Ticket[];
  serverError?: string;
};

// `{n} ticket(s) · {m} code(s) left · View Cart`, collapsing to
// `{n} ticket(s) · View Cart` once every code is filled — the only number
// that tells staff whether they can submit, since checkin has no total
// (PRD "Confirmed Product & Technical Decisions").
const formatCartSummary = (
  ticketCount: number,
  codesLeft: number,
  withViewCart: boolean
) => {
  const ticketLabel = `${ticketCount} ${ticketCount === 1 ? 'ticket' : 'tickets'}`;
  const summary =
    codesLeft > 0
      ? `${ticketLabel} · ${codesLeft} ${
          codesLeft === 1 ? 'code' : 'codes'
        } left`
      : ticketLabel;
  return withViewCart ? `${summary} · View Cart` : summary;
};

export const RentalCheckinFormView = ({
  form,
  onToggleCustomizeCheckinDateTime,
  onSubmit,
  isSubmitDisabled,
  isSubmitting,
  isSubmitSuccess,
  RentalItemSelect,
  rentalsFieldArray,
  tickets,
  serverError,
}: RentalCheckinFormViewProps) => {
  const isCompactLayout = useIsCompactLayout();
  const [isCartSheetOpen, setIsCartSheetOpen] = useState(false);

  // A successful submit must close the cart sheet before the print
  // confirmation opens on top of it — an `AlertDialog` stacked over a
  // `modal` `Sheet` is the exact failure this guards against (PRD FR-4,
  // mirroring `TransactionFormView`'s close-on-success adjustment).
  // Adjusted during render (not in an effect) so it is guaranteed to land
  // before any effect — including the caller's own "submit succeeded"
  // effect that opens the print dialog.
  const [wasSubmitSuccess, setWasSubmitSuccess] = useState(isSubmitSuccess);
  if (isSubmitSuccess !== wasSubmitSuccess) {
    setWasSubmitSuccess(isSubmitSuccess);
    if (isSubmitSuccess) setIsCartSheetOpen(false);
  }

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
    return (
      <YStack flex={1}>
        <FormProvider {...form}>
          <Form onSubmit={form.handleSubmit(onSubmit)} flex={1}>
            <YStack flex={1} position="relative">
              <YStack flex={1}>{RentalItemSelect()}</YStack>

              {rentalsFieldArray.fields.length > 0 && (
                <FieldWatch control={form.control} name={['rentals']}>
                  {([rentals]) => {
                    const codesLeft = rentals.filter(
                      (rental) => !rental.code
                    ).length;
                    return (
                      <FloatingCartButton
                        label={formatCartSummary(
                          rentals.length,
                          codesLeft,
                          true
                        )}
                        onPress={() => setIsCartSheetOpen(true)}
                      />
                    );
                  }}
                </FieldWatch>
              )}
            </YStack>

            <Sheet isOpen={isCartSheetOpen} onOpenChange={setIsCartSheetOpen}>
              {/* Tamagui's modal `Sheet` portals its content, which on some
                  platforms (e.g. Android) does not carry the ambient React
                  context down from the outer `FormProvider` above. Everything
                  in here reads the form via `useFormContext()`, so
                  re-establish the provider inside the sheet (PRD "Constraint:
                  `FormProvider` inside the sheet"). */}
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
                      <RentalCheckinCartView
                        form={form}
                        rentalsFieldArray={rentalsFieldArray}
                        tickets={tickets}
                        onToggleCustomizeCheckinDateTime={
                          onToggleCustomizeCheckinDateTime
                        }
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
                    <FieldWatch control={form.control} name={['rentals']}>
                      {([rentals]) => {
                        const codesLeft = rentals.filter(
                          (rental) => !rental.code
                        ).length;
                        return (
                          <H4 textTransform="none">
                            {formatCartSummary(
                              rentals.length,
                              codesLeft,
                              false
                            )}
                          </H4>
                        );
                      }}
                    </FieldWatch>
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
          <YStack>
            <YStack gap="$3">
              <XStack gap="$3">
                <YStack flex={1}>{RentalItemSelect()}</YStack>

                <Card padded width={350} flex={1}>
                  <RentalCheckinCartView
                    form={form}
                    rentalsFieldArray={rentalsFieldArray}
                    tickets={tickets}
                    onToggleCustomizeCheckinDateTime={
                      onToggleCustomizeCheckinDateTime
                    }
                    serverError={serverError}
                  />
                </Card>
              </XStack>
            </YStack>
          </YStack>
          <XStack justifyContent="flex-end" gap="$3">
            {submitButton}
          </XStack>
        </Form>
      </FormProvider>
    </YStack>
  );
};
