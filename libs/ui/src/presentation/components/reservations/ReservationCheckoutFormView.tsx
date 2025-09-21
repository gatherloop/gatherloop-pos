import { Sheet } from '../base';
import { Button, Form, XStack, YStack } from 'tamagui';
import { H4 } from 'tamagui';
import { Plus, Trash } from '@tamagui/lucide-icons';
import { ReservationCheckoutForm } from '../../../domain';
import {
  FormProvider,
  UseFieldArrayReturn,
  UseFormReturn,
} from 'react-hook-form';
import { ReactNode } from 'react';
import { useKeyboardShortcut } from '../../../utils';
import { ReservationListItem } from './ReservationListItem';

export type ReservationCheckoutFormViewProps = {
  form: UseFormReturn<ReservationCheckoutForm>;
  onSubmit: (form: ReservationCheckoutForm) => void;
  isReservationSheetOpen: boolean;
  onReservationSheetOpenChange: (isOpen: boolean) => void;
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
  isReservationSheetOpen,
  onReservationSheetOpenChange,
  isSubmitDisabled,
  ReservationItemSelect,
  reservationsFieldArray,
}: ReservationCheckoutFormViewProps) => {
  useKeyboardShortcut({
    ctrl: { ' ': () => onReservationSheetOpenChange(true) },
  });
  return (
    <YStack>
      <FormProvider {...form}>
        <Form onSubmit={form.handleSubmit(onSubmit)} gap="$3">
          <YStack>
            <YStack gap="$3">
              <Sheet
                isOpen={isReservationSheetOpen}
                onOpenChange={onReservationSheetOpenChange}
              >
                <YStack gap="$3" flex={1} padding="$5">
                  {ReservationItemSelect()}
                </YStack>
              </Sheet>

              <XStack justifyContent="space-between" alignItems="center">
                <H4>Reservation Items</H4>
                <Button
                  size="$3"
                  icon={Plus}
                  variant="outlined"
                  onPress={() => onReservationSheetOpenChange(true)}
                  circular
                />
              </XStack>
              <YStack gap="$3">
                {reservationsFieldArray.fields.map(
                  ({ variant, checkinAt, code, key }, index) => {
                    return (
                      <XStack
                        key={key}
                        gap="$5"
                        $lg={{ flexDirection: 'column' }}
                      >
                        <XStack gap="$3" flex={1} alignItems="center">
                          <Button
                            icon={Trash}
                            size="$3"
                            onPress={() => reservationsFieldArray.remove(index)}
                            theme="red"
                            color="$red8"
                            circular
                          />
                          <ReservationListItem
                            flex={1}
                            checkinAt={checkinAt}
                            code={code}
                            variantName={variant.name}
                          />
                        </XStack>
                      </XStack>
                    );
                  }
                )}
              </YStack>
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
