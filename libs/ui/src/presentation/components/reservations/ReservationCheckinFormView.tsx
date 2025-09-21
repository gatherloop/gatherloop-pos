import { Field, InputText, Sheet } from '../base';
import { Button, Form, XStack, YStack } from 'tamagui';
import { H4 } from 'tamagui';
import { Plus, Trash } from '@tamagui/lucide-icons';
import { VariantListItem } from '../variants';
import { ReservationCheckinForm } from '../../../domain';
import {
  FormProvider,
  UseFieldArrayReturn,
  UseFormReturn,
} from 'react-hook-form';
import { ReactNode } from 'react';
import { useKeyboardShortcut } from '../../../utils';

export type ReservationCheckinFormViewProps = {
  form: UseFormReturn<ReservationCheckinForm>;
  onSubmit: (form: ReservationCheckinForm) => void;
  isVariantSheetOpen: boolean;
  onVariantSheetOpenChange: (isOpen: boolean) => void;
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
  isVariantSheetOpen,
  onVariantSheetOpenChange,
  isSubmitDisabled,
  ReservationItemSelect,
  reservationsFieldArray,
}: ReservationCheckinFormViewProps) => {
  useKeyboardShortcut({
    ctrl: { ' ': () => onVariantSheetOpenChange(true) },
  });
  return (
    <YStack>
      <FormProvider {...form}>
        <Form onSubmit={form.handleSubmit(onSubmit)} gap="$3">
          <YStack>
            <YStack gap="$3">
              <Sheet
                isOpen={isVariantSheetOpen}
                onOpenChange={onVariantSheetOpenChange}
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
                  onPress={() => onVariantSheetOpenChange(true)}
                  circular
                />
              </XStack>
              <YStack gap="$3">
                {reservationsFieldArray.fields.map(
                  ({ variant, key }, index) => {
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
                          <VariantListItem
                            flex={1}
                            price={variant.price}
                            productImageUrl={variant.product.imageUrl}
                            productName={variant.product.name}
                            optionValues={variant.values.map(
                              (variantValue) => variantValue.optionValue
                            )}
                          />
                        </XStack>

                        <Field
                          name={`reservations.${index}.code`}
                          label="Code"
                          maxWidth={300}
                          flex={1}
                        >
                          <InputText />
                        </Field>
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
