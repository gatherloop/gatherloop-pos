import {
  Button,
  Card,
  H4,
  ScrollView,
  Spinner,
  XStack,
  YStack,
} from 'tamagui';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, UseFormReturn } from 'react-hook-form';
import { MutableRefObject, ReactNode, useState } from 'react';
import { RentalCheckinForm, Ticket, rentalCheckinFormSchema } from '../../../../domain';
import { RentalCheckinCartView } from './RentalCheckinCartView';
import {
  FieldArray,
  FieldWatch,
  FloatingCartButton,
  FormVariant,
  FormView,
  Sheet,
  useIsCompactLayout,
} from '../base';
import { X } from '@tamagui/lucide-icons';

const rentalCheckinFormResolver = zodResolver(
  rentalCheckinFormSchema,
  {},
  { raw: true }
);

export type RentalCheckinFormViewProps = {
  variant: FormVariant;
  defaultValues: RentalCheckinForm;
  onSubmit: (form: RentalCheckinForm) => void;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  isSubmitSuccess: boolean;
  RentalItemSelect: () => ReactNode;
  tickets: Ticket[];
  formRef?: MutableRefObject<UseFormReturn<RentalCheckinForm> | null>;
  serverError?: string;
};

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
  variant,
  defaultValues,
  onSubmit,
  isSubmitDisabled,
  isSubmitting,
  isSubmitSuccess,
  RentalItemSelect,
  tickets,
  formRef,
  serverError,
}: RentalCheckinFormViewProps) => {
  const isCompactLayout = useIsCompactLayout();
  const [isCartSheetOpen, setIsCartSheetOpen] = useState(false);

  const [wasSubmitSuccess, setWasSubmitSuccess] = useState(isSubmitSuccess);
  if (isSubmitSuccess !== wasSubmitSuccess) {
    setWasSubmitSuccess(isSubmitSuccess);
    if (isSubmitSuccess) setIsCartSheetOpen(false);
  }

  return (
    <FormView
      variant={variant}
      defaultValues={defaultValues}
      resolver={rentalCheckinFormResolver}
      onSubmit={onSubmit}
      loadingTitle="Loading Checkin..."
      errorTitle="Failed to Load Checkin"
      formRef={formRef}
      formProps={isCompactLayout ? { flex: 1, gap: undefined } : { gap: '$3' }}
    >
      {(form) => {
        const onToggleCustomizeCheckinDateTime = (checked: boolean) => {
          if (checked) {
            const date = new Date();
            form.setValue('checkinAt', {
              date: date.getDate(),
              month: date.getMonth(),
              year: date.getFullYear(),
              hour: date.getHours(),
              minute: date.getMinutes(),
            });
          } else {
            form.setValue('checkinAt', null);
          }
        };

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

        return (
          <FieldArray<RentalCheckinForm, 'rentals', 'key'>
            name="rentals"
            keyName="key"
            control={form.control}
          >
            {(rentalsFieldArray) => {
              if (isCompactLayout) {
                return (
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

                    <Sheet
                      isOpen={isCartSheetOpen}
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
                  </YStack>
                );
              }

              return (
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
                  <XStack justifyContent="flex-end" gap="$3">
                    {submitButton}
                  </XStack>
                </YStack>
              );
            }}
          </FieldArray>
        );
      }}
    </FormView>
  );
};
