import { Field, FieldWatch, InputNumber, InputText, Sheet } from '../base';
import { Button, Form, H3, H5, Paragraph, XStack, YStack } from 'tamagui';
import { H4 } from 'tamagui';
import { Plus, Trash } from '@tamagui/lucide-icons';
import { VariantListItem } from '../variants';
import { TransactionForm } from '../../../domain';
import {
  FormProvider,
  UseFieldArrayReturn,
  UseFormReturn,
} from 'react-hook-form';
import { ReactNode } from 'react';
import { useKeyboardShortcut } from '../../../utils';

export type TransactionFormViewProps = {
  form: UseFormReturn<TransactionForm>;
  onSubmit: (form: TransactionForm) => void;
  isVariantSheetOpen: boolean;
  onVariantSheetOpenChange: (isOpen: boolean) => void;
  isSubmitDisabled: boolean;
  TransactionItemSelect: () => ReactNode;
  fieldArray: UseFieldArrayReturn<TransactionForm, 'transactionItems', 'key'>;
};

export const TransactionFormView = ({
  form,
  onSubmit,
  isVariantSheetOpen,
  onVariantSheetOpenChange,
  isSubmitDisabled,
  TransactionItemSelect,
  fieldArray,
}: TransactionFormViewProps) => {
  useKeyboardShortcut({
    ctrl: { ' ': () => onVariantSheetOpenChange(true) },
  });
  return (
    <YStack>
      <FormProvider {...form}>
        <Form onSubmit={form.handleSubmit(onSubmit)} gap="$3">
          <Field name="name" label="Customer Name">
            <InputText />
          </Field>
          <YStack>
            <YStack gap="$3">
              <Sheet
                isOpen={isVariantSheetOpen}
                onOpenChange={onVariantSheetOpenChange}
              >
                <YStack gap="$3" flex={1} padding="$5">
                  {TransactionItemSelect()}
                </YStack>
              </Sheet>

              <XStack justifyContent="space-between" alignItems="center">
                <H4>Transaction Items</H4>
                <Button
                  size="$3"
                  icon={Plus}
                  variant="outlined"
                  onPress={() => onVariantSheetOpenChange(true)}
                  circular
                />
              </XStack>
              <YStack gap="$3">
                {fieldArray.fields.map(({ variant, key }, index) => {
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
                          onPress={() => fieldArray.remove(index)}
                          theme="red"
                          color="$red8"
                          circular
                        />
                        <VariantListItem
                          flex={1}
                          name={variant.name}
                          price={variant.price}
                          productName={variant.product.name}
                        />
                      </XStack>

                      <XStack
                        gap="$5"
                        justifyContent="flex-end"
                        alignItems="flex-end"
                      >
                        <YStack gap="$3">
                          <Paragraph textAlign="left">Price</Paragraph>
                          <H4 textTransform="none" textAlign="left">
                            Rp. {variant.price.toLocaleString('id')}
                          </H4>
                        </YStack>
                        <YStack gap="$3">
                          <Paragraph textAlign="center">Amount</Paragraph>
                          <InputNumber
                            name={`transactionItems.${index}.amount`}
                            min={1}
                            maxWidth={50}
                          />
                        </YStack>

                        <YStack gap="$3">
                          <Paragraph textAlign="center">
                            Discount Amount
                          </Paragraph>
                          <InputNumber
                            name={`transactionItems.${index}.discountAmount`}
                            min={0}
                            maxWidth={150}
                            step={500}
                          />
                        </YStack>

                        <YStack>
                          <Paragraph textAlign="right">Subtotal</Paragraph>
                          <FieldWatch
                            control={form.control}
                            name={[`transactionItems.${index}`]}
                          >
                            {([{ variant, amount, discountAmount }]) => (
                              <H4 textTransform="none" textAlign="right">
                                Rp.{' '}
                                {(
                                  variant.price * amount -
                                  discountAmount
                                ).toLocaleString('id')}
                              </H4>
                            )}
                          </FieldWatch>
                        </YStack>
                      </XStack>
                    </XStack>
                  );
                })}
              </YStack>
            </YStack>
          </YStack>
          <YStack alignItems="flex-end">
            <H5 textTransform="none">Total</H5>
            <FieldWatch control={form.control} name={['transactionItems']}>
              {([transactionItems]) => (
                <H3>
                  Rp.{' '}
                  {transactionItems
                    .reduce(
                      (prev, curr) =>
                        prev +
                        (curr.amount * curr.variant.price -
                          curr.discountAmount),
                      0
                    )
                    .toLocaleString('id')}
                </H3>
              )}
            </FieldWatch>
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
