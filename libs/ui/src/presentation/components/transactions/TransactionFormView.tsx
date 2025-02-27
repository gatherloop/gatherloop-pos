import {
  Field,
  FieldArray,
  FieldWatch,
  InputNumber,
  InputText,
  Sheet,
} from '../base';
import { Button, Form, H3, H5, Paragraph, XStack, YStack } from 'tamagui';
import { H4 } from 'tamagui';
import { Plus, Trash } from '@tamagui/lucide-icons';
import { ProductListItem } from '../products';
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
  isProductSheetOpen: boolean;
  onProductSheetOpenChange: (isOpen: boolean) => void;
  isSubmitDisabled: boolean;
  ProductList: (
    fieldArray: UseFieldArrayReturn<TransactionForm, 'transactionItems', 'key'>
  ) => ReactNode;
};

export const TransactionFormView = ({
  form,
  onSubmit,
  isProductSheetOpen,
  onProductSheetOpenChange,
  isSubmitDisabled,
  ProductList,
}: TransactionFormViewProps) => {
  useKeyboardShortcut({
    ctrl: { ' ': () => onProductSheetOpenChange(true) },
  });
  return (
    <YStack>
      <FormProvider {...form}>
        <Form onSubmit={form.handleSubmit(onSubmit)} gap="$3">
          <Field name="name" label="Customer Name">
            <InputText />
          </Field>
          <YStack>
            <FieldArray
              control={form.control}
              name="transactionItems"
              keyName="key"
            >
              {(fieldArray) => (
                <YStack gap="$3">
                  <Sheet
                    isOpen={isProductSheetOpen}
                    onOpenChange={onProductSheetOpenChange}
                  >
                    <YStack gap="$3" flex={1} padding="$5">
                      <YStack>
                        <H4 textAlign="center">Choose Products</H4>
                        <Paragraph textAlign="center">
                          Product will automatically added to transaction
                        </Paragraph>
                      </YStack>
                      {ProductList(fieldArray)}
                    </YStack>
                  </Sheet>

                  <XStack justifyContent="space-between" alignItems="center">
                    <H4>Transaction Items</H4>
                    <Button
                      size="$3"
                      icon={Plus}
                      variant="outlined"
                      onPress={() => onProductSheetOpenChange(true)}
                      circular
                    />
                  </XStack>
                  <YStack gap="$3">
                    {fieldArray.fields.map(({ product, key }, index) => {
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
                            <ProductListItem
                              flex={1}
                              name={product.name}
                              price={product.price}
                              categoryName={product.category.name}
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
                                Rp. {product.price.toLocaleString('id')}
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
                                {([{ product, amount, discountAmount }]) => (
                                  <H4 textTransform="none" textAlign="right">
                                    Rp.{' '}
                                    {(
                                      product.price * amount -
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
              )}
            </FieldArray>
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
                        (curr.amount * curr.product.price -
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
